import fetch from "node-fetch"
import puppeteer from "puppeteer"
import { Connection } from "../db/connection.js"
import { debugWorker as debug, error } from "../common/debug.js"
import { getScheduledDates } from "../common/get-scheduled-dates.js"
import { retry } from "../common/retry.js"
import { fetchBarchartList } from "./helpers/fetch-barchart-list.js"
import { fetchMotleyList } from "./helpers/fetch-motley-list.js"
import { fetchPickList } from "./helpers/fetch-pick-list.js"

const yahooLabels = [
        "Previous Close",
        "Open",
        "Bid",
        "Ask",
        "Day's Range",
        "52 Week Range",
        "Volume",
        "Avg. Volume",
        "Market Cap",
        "Beta (5Y Monthly)",
        "PE Ratio (TTM)",
        "EPS (TTM)",
        "Earnings Date",
        "Forward Dividend & Yield",
        "Ex-Dividend Date",
        "1y Target Est"
      ],
      months = {
        "Jan": 0,
        "Feb": 1,
        "Mar": 2,
        "Apr": 3,
        "May": 4,
        "Jun": 5,
        "Jul": 6,
        "Aug": 7,
        "Sep": 8,
        "Oct": 9,
        "Nov": 10,
        "Dec": 11
      },
      timeout = (process.env.NODE_ENV === "production") ? 20000 : 10000

function parseYahooDate(str) {
  const split = str.replace(/^\s*|\s*$/g, "").split(" "),
        date = new Date(parseInt(split[2] || 2021), months[split[0]], parseInt(split[1]))

  return isNaN(+date) ? null : date
}

function twentyPercent(value) {
  value = parseFloat(value) || 0
  return value * 0.2
}

function getNumber(value) {
  return `${value || 0.0}`.replace(/[^0-9.]/g, "") || 0
}

export async function getStockList(clear) {
  const { schedule } = getScheduledDates()

  clear = clear || process.env.CLEAR_EXISTING === "CLEAR"

  if(!clear) {
    const { rows: [ { exists } ] } = await Connection.query(`
      SELECT EXISTS (
        SELECT
        FROM scrape_trackers
        WHERE schedule = $1
      )
    `, [ schedule ])

    if(exists) return new Date(schedule);
  }

  const browser = await puppeteer.launch({
    args: [ "--no-sandbox", "--disable-setuid-sandbox" ],
    ignoreHTTPSErrors: true
  });

  try {
    debug("Initializing Browser")

    const page = await browser.newPage()

    await page.setDefaultNavigationTimeout(timeout)
    await page.setDefaultTimeout(timeout)

    // set viewport and user agent (just in case for nice viewing)
    await page.setViewport({ width: 1366, height: 768 })
    await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36")

    debug("Loading Barchart Stock List")

    const barchartList = await fetchBarchartList()
    const motleyPicks = await fetchMotleyList(page)
    const previousPicks = await fetchPickList()

    const tickers = new Set()

    const stocks = [ ...barchartList, ...motleyPicks, ...previousPicks ].filter(({ ticker }) => {
      const hasTicker = tickers.has(ticker)
      tickers.add(ticker)
      return !hasTicker && !!ticker
    })

    for(let i = stocks.length - 1; i > -1; i--) {
      const stock = stocks[i],
            { ticker } = stock,
            yahooStock = {}

      debug(`Fetching Stock ${stocks.length - i} of ${stocks.length}: ${ticker}`)

      try {
        debug(` -- Fetching Puppeteer Yahoo Page`)

        await retry(() => page.goto(`https://finance.yahoo.com/quote/${ticker}?p=${ticker}`), 3);
        await page.waitForSelector("#quote-summary > div > table")

        debug(` -- Evaluating Puppeteer Yahoo Page`)

        Object.assign(
          yahooStock,
          await page.evaluate(() => {
            function getNumber(value) {
              return `${value || 0.0}`.replace(/[^0-9.]/g, "") || 0
            }

            //Extract each episode's basic details
            const data = {},
                  rows = [ ...document.querySelectorAll("#quote-summary table tr") ].map((cell) => [ ...cell.querySelectorAll("td") ].map((td) => td.innerText))

            for(const [ label, value ] of rows) {
              data[label] = value
            }

            data["year_price_targets"] = {}

            try {
              const store = window.App.main.context.dispatcher.stores.QuoteSummaryStore.financialData
              const { targetMeanPrice, targetLowPrice, currentPrice, targetHighPrice, numberOfAnalystOpinions } = store
              data["year_price_targets"]["analysts"] = parseInt(numberOfAnalystOpinions.raw)
              data["year_price_targets"]["current"] = Number(parseFloat(getNumber(currentPrice.raw)).toFixed(2))
              data["year_price_targets"]["low"] = Number(parseFloat(getNumber(targetLowPrice.raw)).toFixed(2))
              data["year_price_targets"]["average"] = Number(parseFloat(getNumber(targetMeanPrice.raw)).toFixed(2))
              data["year_price_targets"]["high"] = Number(parseFloat(getNumber(targetHighPrice.raw)).toFixed(2))
            } catch(err) {
            }

            try {
              const infoHeader = document.getElementById("quote-header-info"),
                    noticeHeader = document.getElementById("quote-market-notice"),
                    companyName = infoHeader.querySelector("h1").innerText

              data["company"] = companyName.replace(/\s+\(.*\)\s*$/, "")

              data["price_at_close"] = Number(parseFloat(getNumber(noticeHeader.parentElement.firstElementChild.innerText)).toFixed(2))
            } catch(_) {}

            return data
          })
        )
      } catch(err) {
        debug(`ERROR: ${ticker}`)
        error(err)
        stocks.splice(i, 1)
        continue
      }

      debug(` -- Normalizing Yahoo Page Data`)

      for(const label of yahooLabels) {
        switch(label) {
          case "Ask":
          case "Bid":
            const [ price, count ] = String(yahooStock[label] || "").split("x")

            yahooStock[`${label} Price`] = Number(parseFloat(getNumber(String(price || "0.0"))).toFixed(2))
            yahooStock[`${label} Count`] = parseInt(getNumber(String(count || "0")))

            break
          case "Day's Range":
          case "52 Week Range":
            const [ low, high ] = String(yahooStock[label] || "").split("-")

            yahooStock[`${label} Low`] = Number(parseFloat(getNumber(String(low || "0.0"))).toFixed(2))
            yahooStock[`${label} High`] = Number(parseFloat(getNumber(String(high || "0.0"))).toFixed(2))

            break
          case "Earnings Date":
            const [ start, end ] = String(yahooStock[label] || "").split("-")

            if(start && end) {
              yahooStock[`${label} Start`] = parseYahooDate(start)
              yahooStock[`${label} End`] = parseYahooDate(end)
            } else if(start) {
              yahooStock[`${label} Start`] = parseYahooDate(start)
              yahooStock[`${label} End`] = yahooStock[`${label} Start`]
            } else {
              yahooStock[`${label} Start`] = null
              yahooStock[`${label} End`] = null
            }

            break
          case "Beta (5Y Monthly)":
          case "EPS (TTM)":
          case "Open":
          case "PE Ratio (TTM)":
          case "Previous Close":
          case "1y Target Est":
            yahooStock[label] = Number(parseFloat(getNumber(yahooStock[label])).toFixed(2))

            break
          case "Avg. Volume":
          case "Volume":
            yahooStock[label] = parseInt(getNumber(yahooStock[label] || 0.0))

            break
          case "Forward Dividend & Yield":
            const [ dvd, yld ] = String(yahooStock[label] || "").split("(")

            yahooStock["Forward Dividend"] = Number(getNumber(dvd.replace(/\s*/g, "")))
            yahooStock["Forward Yield"] = Number(getNumber(String(yld || "").replace(/\s*/g, "").replace(/\)/g, "")))

            break
          case "Market Cap":
            const og = yahooStock[label]
            yahooStock[label] = parseFloat(getNumber(yahooStock[label] || 0.0))

            if(/M$/.test(og)) yahooStock[label] = yahooStock[label] * 1000000
            else if(/B$/.test(og)) yahooStock[label] = yahooStock[label] * 1000000000
            else if(/T$/.test(og)) yahooStock[label] = yahooStock[label] * 1000000000000

            break
          case "Ex-Dividend Date":
            yahooStock[label] = parseYahooDate(yahooStock[label] || "")

            break
          default:
            yahooStock[label] = String(yahooStock[label] || "")
        }
      }

      debug(` -- Fetching Financial Data`)

      const financial_data = {}

      try {
        const finDataResult = await retry(async () => {
          const response = await fetch(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=financialData`),
                result = await response.json()

          return result
        }, 3)


        if(!finDataResult.quoteSummary || finDataResult.quoteSummary.error) throw new Error((finDataResult.quoteSummary && finDataResult.quoteSummary.error.description) || "An unknown error ocurred")

        const rawData = finDataResult.quoteSummary.result[0].financialData || {}

        for(const key in rawData) {
          if(typeof rawData[key] === "object") financial_data[key] = rawData[key].raw
          else financial_data[key] = rawData[key]
        }
      } catch(err) {
        debug(`ERROR: ${ticker}`)
        error(err)
        stocks.splice(i, 1)
        continue
      }

      yahooStock["year_price_targets"] = yahooStock["year_price_targets"] || {}

      const price = parseFloat(financial_data.currentPrice) || stock.price,
            barchart_price = stock.price,
            barchartStock = barchartList.find(barchart => barchart.ticker.toUpperCase() === ticker.toUpperCase()),
            motleyStock = motleyPicks.find(motley => motley.ticker.toUpperCase() === ticker.toUpperCase()),
            previousStock = previousPicks.find(previous => previous.ticker.toUpperCase() === ticker.toUpperCase())

      stock.price = price
      stock.barchart_pick = !!barchartStock
      stock.motley_pick = !!motleyStock
      stock.company = yahooStock["company"] || stock.company || ticker
      stock.price_at_close = yahooStock["price_at_close"] || stock.price_at_close
      stock.day_low = yahooStock["Day's Range Low"]
      stock.day_high = yahooStock["Day's Range High"]
      stock.one_year_analysts = yahooStock["year_price_targets"]["analysts"] || 0
      stock.one_year_low = yahooStock["year_price_targets"]["low"] || twentyPercent(price)
      stock.one_year_high = yahooStock["year_price_targets"]["high"] || (price + twentyPercent(price))
      stock.one_year_average = yahooStock["year_price_targets"]["average"] || price

      stock.data  = {
        financial_data,
        barchart_volatility: Number(stock.volatility) || null,
        motley_volatility: motleyStock ? motleyStock.volatility : null,
        previous_pick: !!previousStock,
        barchart_price: stock.price,
        ask_price: yahooStock["Ask Price"],
        ask_count: yahooStock["Ask Count"],
        bid_price: yahooStock["Bid Price"],
        bid_count: yahooStock["Bid Count"],
        year_range_low: yahooStock["52 Week Range Low"],
        year_range_high: yahooStock["52 Week Range High"],
        previous_close: yahooStock["Previous Close"],
        open: yahooStock["Open"],
        volume: yahooStock["Volume"],
        average_volume: yahooStock["Avg. Volume"],
        market_cap: yahooStock["Market Cap"],
        beta_volatility: yahooStock["Beta (5Y Monthly)"],
        pe_ratio: yahooStock["PE Ratio (TTM)"],
        eps: yahooStock["EPS (TTM)"],
        earnings_date_start: yahooStock["Earnings Date Start"],
        earnings_date_end: yahooStock["Earnings Date End"],
        forward_dividend: isNaN(yahooStock["Forward Dividend"]) ? 0 : yahooStock["Forward Dividend"],
        forward_yield: isNaN(yahooStock["Forward Yield"]) ? 0 : yahooStock["Forward Yield"],
        ex_dividend_date: yahooStock["Ex-Dividend Date"],
      }
    }

    debug("Saving Tickers to DB")

    await Connection.transaction(async (client) => {
      if(clear) {
        await client.query("DELETE FROM scrape_trackers WHERE schedule = $1", [ schedule ])
      }

      const { rows: [ { id: scrapeId } ]  } = await client.query(
        `
          INSERT INTO
            scrape_trackers (
              schedule,
              completed
            )
          VALUES
            (
              $1,
              $2
            )
          RETURNING
            id
        `,
        [
          schedule,
          false
        ]
      )

      for(const stock of stocks) {
        debug(stock)
        await client.query(
          `
            INSERT INTO
              stock_tickers (
                scrape_id,
                ticker,
                company,
                price,
                price_at_close,
                one_year_analysts,
                one_year_low,
                one_year_high,
                one_year_average,
                day_low,
                day_high,
                barchart_pick,
                motley_pick,
                data
              )
            VALUES
              (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10,
                $11,
                $12,
                $13,
                $14
              )
          `,
          [
            scrapeId,
            stock.ticker,
            stock.company,
            stock.price,
            stock.price_at_close,
            stock.one_year_analysts,
            stock.one_year_low,
            stock.one_year_high,
            stock.one_year_average,
            stock.day_low,
            stock.day_high,
            stock.barchart_pick,
            stock.motley_pick,
            stock.data
          ]
        )
      }
    })
  } finally {
    await browser.close()
  }

  return new Date(schedule)
}
