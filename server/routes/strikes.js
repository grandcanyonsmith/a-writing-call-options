import express from "express"
import { Connection } from "../db/connection.js"
import { debugServer as debug } from "../common/debug.js"
import csv from "@fast-csv/format"
import { getLatestScrape } from "../common/get-latest-scrape.js"

export const strikesRoutes = express.Router();

const sortBy = {
        "ticker": "stock_tickers.ticker ASC,",
        "price": "stock_tickers.price ASC,",
        "strike": "stock_volatilities.strike ASC,",
        "apr": "stock_strikes.apr DESC,",
        "odds": "stock_strikes.odds DESC,",
        "one_year_high": "stock_tickers.one_year_high DESC,",
        "bid": "stock_volatilities.bid ASC,",
        "edg": "stock_strikes.edg DESC,",
        "sep": "stock_strikes.sep ASC,",
        "premium_return": "stock_strikes.premium_return DESC,",
        "percent_out": "stock_strikes.percent_out ASC,",
        "in_the_money": "stock_volatilities.in_the_money,",
        "expiration_date": "stock_volatilities.expiration_date ASC,",
        "symbol": "stock_volatilities.symbol ASC,",
      },
      csvOptions = {
        delimiter: ",",
        rowDelimiter: "\n",
        quote: `"`
      },
      csvHeaders = [
        "Ticker",
        "Price",
        "Strike",
        "APR",
        "Odds",
        "Estimated 1yr High",
        "Premium Return",
        "Premium",
        "EDG",
        "SEP",
        "% Out of the Money",
        "In The Money",
        "Expires",
        "Contract",
      
      ],
      query = `
        SELECT
          stock_tickers.ticker,
          stock_tickers.price,
          stock_tickers.one_year_high,
          stock_volatilities.strike,
          stock_volatilities.bid,
          stock_volatilities.in_the_money,
          stock_volatilities.expiration_date,
          stock_volatilities.symbol,
          stock_strikes.*
        FROM
          stock_strikes
        INNER JOIN
          stock_volatilities
          ON
            stock_volatilities.id = stock_strikes.volatility_id
        INNER JOIN
          stock_tickers
          ON
            stock_tickers.id = stock_volatilities.ticker_id
        WHERE
          odds > 0
          AND
          stock_tickers.scrape_id = $1
        ORDER BY
          odds DESC,
          percent_out DESC,
          expiration_date ASC,
          id ASC
        LIMIT 50
        OFFSET $2
      `

strikesRoutes.get("/csv", async function(req, res, next) {
  try {
    const { id } = await getLatestScrape(),
          now = new Date(),
          csvStream = csv.format(csvOptions)

    res.header("Content-Type", "text/csv")
    res.attachment(`stock-option-strikes-${+now}.csv`)
    csvStream.pipe(res)
    csvStream.write(csvHeaders)

    let offset = 0

    while(true) {
      const { rows } = await Connection.query(query, [ id, offset ])

      if(!rows.length) break

      offset = offset + 100

      for(const row of rows) {
        csvStream.write([
          row.ticker,
          parseFloat(row.price).toFixed(2),
          parseFloat(row.strike).toFixed(2),
          (parseFloat(row.apr) * 100.0).toFixed(5),
          (parseFloat(row.odds) * 100.0).toFixed(5),
          parseFloat(row.one_year_high).toFixed(2),
          (parseFloat(row.premium_return) * 100).toFixed(5),
          parseFloat(row.bid).toFixed(2),
          parseFloat(row.edg).toFixed(2),
          parseFloat(row.sep).toFixed(2),
          row.in_the_money ? "Yes" : "No",
          new Date(row.expiration_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
          row.symbol
        ])
      }

      if(rows.length < 50) break
    }

    csvStream.end()
  } catch(err) {
    next(err)
  }
});

/* GET strikes listing. */
strikesRoutes.get("*", async function(req, res, next) {
  try {
    const { id, startedAt } = await getLatestScrape(),
          offset = parseInt(req.query.offset) || 0,
          sort = sortBy[req.query.sort],
          sortedQuery = (
            sort
              ? query.replace(/ORDER BY/, `ORDER BY\n          ${sort}`)
              : query
          )

    debug(`Scrape Date: ${startedAt}`)
    debug(sortedQuery.replace(/\$1/g, id).replace(/\$2/g, offset))

    const { rows } = await Connection.query(
      sortedQuery,
      [
        id,
        offset
      ]
    )

    res.json(rows);
  } catch(err) {
    next(err)
  }
});
