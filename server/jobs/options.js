import fetch from "node-fetch"
import { Connection } from "../db/connection.js"
import { debugWorker as debug, error } from "../common/debug.js"
import { getScheduledDates } from "../common/get-scheduled-dates.js"
import { retry } from "../common/retry.js"

const emptyResult = {
  expirationDates: [],
  options: []
}

export async function fetchOptions(ticker, date) {
  try {
    return await retry(async () => {
      const response = await fetch(`https://query1.finance.yahoo.com/v7/finance/options/${ticker}${date ? `?date=${date}` : ""}`),
            result = await response.json()

      if(!result["optionChain"] || !result["optionChain"]["result"]) return emptyResult
      return result["optionChain"]["result"][0] || emptyResult
    }, 2)
  } catch(err) {
    error(err)
    return emptyResult
  }
}

export async function calculateOptions(givenDate) {
  const { schedule } = getScheduledDates(givenDate)

  let offset = 0

  while(true) {
    const { rows } = await Connection.query(
      `
        SELECT
          stock_tickers.*
        FROM
          stock_tickers
        INNER JOIN
          scrape_trackers
          ON
            scrape_trackers.id = stock_tickers.scrape_id
        WHERE
          scrape_trackers.schedule = $1
        ORDER BY
          ticker
        LIMIT 50
        OFFSET $2
      `,
      [
        schedule,
        offset
      ]
    )

    if(!rows.length) break;

    offset = offset + 50

    const outerQueue = []

    for(const row of rows) {
      outerQueue.push(async () => {
        const innerQueue = []

        const { expirationDates: expirationsInUTCSeconds } = await fetchOptions(row.ticker)

        for(const expirationSeconds of expirationsInUTCSeconds) {
          innerQueue.push(async () => {
            const expirationDate = new Date(expirationSeconds * 1000)

            const { options } = await fetchOptions(row.ticker, expirationSeconds)

            for(const option of options) {
              /*
              * ask: 0
              * bid: 0
              * change: 0
              * contractSize: "REGULAR"
              * contractSymbol: "AMC210205C00000500"
              * currency: "USD"
              * expiration: 1612483200
              * impliedVolatility: 0.000010000000000000003
              * inTheMoney: true
              * lastPrice: 7.4
              * lastTradeDate: 1612299313
              * openInterest: 0
              * percentChange: 0
              * strike: 0.5
              * volume: 1690
              */
              for(const call of option.calls) {
                debug(`Saving ${row.ticker} Option Call: ${call.contractSymbol} (${expirationSeconds} | ${call.strike})`)

                try {
                  if(typeof call.bid === "undefined") throw new Error("Missing Bid")
                  if(typeof call.ask === "undefined") throw new Error("Missing Ask")

                  await Connection.transaction(async (client) => {
                    await client.query("DELETE FROM stock_volatilities WHERE ticker_id = $1 AND symbol = $2 AND option_type = 'call'", [ row.id, call.contractSymbol ])

                    await client.query(
                      `
                        INSERT INTO
                          stock_volatilities (
                            ticker_id,
                            option_type,
                            strike,
                            volume,
                            ask,
                            bid,
                            change,
                            last_price,
                            size,
                            symbol,
                            currency,
                            implied_volatility,
                            in_the_money,
                            open_interest,
                            percent_change,
                            expiration_date,
                            last_trade_date
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
                            $14,
                            $15,
                            $16,
                            $17
                          )
                      `,
                      [
                        row.id,
                        "call",
                        Number(parseFloat(call.strike).toFixed(2)),
                        call.volume || 0,
                        Number(parseFloat(call.ask).toFixed(2)),
                        Number(parseFloat(call.bid).toFixed(2)),
                        parseFloat(call.change),
                        Number(parseFloat(call.lastPrice).toFixed(2)),
                        call.contractSize,
                        call.contractSymbol,
                        call.currency,
                        parseFloat(call.impliedVolatility),
                        !!call.inTheMoney,
                        parseInt(call.openInterest) || 0,
                        parseFloat(call.percentChange) || 0,
                        expirationDate,
                        new Date(parseInt(call.lastTradeDate) * 1000)
                      ]
                    )
                  })
                } catch(err) {
                  debug(`https://query1.finance.yahoo.com/v7/finance/options/${row.ticker}?date=${expirationSeconds} | CALL | ${JSON.stringify(call)}`)
                  error(err)
                }
              }

              // for(const put of option.puts) {
              //   debug(`Saving ${row.ticker} Option Put: ${put.contractSymbol} (${expirationSeconds} | ${put.strike})`)
              //
              //   try {
              //     if(typeof put.bid === "undefined") throw new Error("Missing Bid")
              //     if(typeof call.ask === "undefined") throw new Error("Missing Ask")
              //
              //     await Connection.transaction(async (client) => {
              //       await client.query("DELETE FROM stock_volatilities WHERE ticker_id = $1 AND symbol = $2 AND option_type = 'put'", [ row.id, put.contractSymbol ])
              //
              //       await client.query(
              //         `
              //           INSERT INTO
              //             stock_volatilities (
              //               ticker_id,
              //               option_type,
              //               strike,
              //               volume,
              //               ask,
              //               bid,
              //               change,
              //               last_price,
              //               size,
              //               symbol,
              //               currency,
              //               implied_volatility,
              //               in_the_money,
              //               open_interest,
              //               percent_change,
              //               expiration_date,
              //               last_trade_date
              //             )
              //           VALUES
              //             (
              //               $1,
              //               $2,
              //               $3,
              //               $4,
              //               $5,
              //               $6,
              //               $7,
              //               $8,
              //               $9,
              //               $10,
              //               $11,
              //               $12,
              //               $13,
              //               $14,
              //               $15,
              //               $16,
              //               $17
              //             )
              //         `,
              //         [
              //           row.id,
              //           "put",
              //           Number(parseFloat(put.strike).toFixed(2)),
              //           put.volume || 0,
              //           Number(parseFloat(put.ask).toFixed(2)),
              //           Number(parseFloat(put.bid).toFixed(2)),
              //           parseFloat(put.change),
              //           parseFloat(put.lastPrice),
              //           put.contractSize,
              //           put.contractSymbol,
              //           put.currency,
              //           parseFloat(put.impliedVolatility),
              //           !!put.inTheMoney,
              //           parseInt(put.openInterest),
              //           parseFloat(put.percentChange),
              //           expirationDate,
              //           new Date(parseInt(put.lastTradeDate) * 1000)
              //         ]
              //       )
              //     })
              //   } catch(err) {
              //     debug(`https://query1.finance.yahoo.com/v7/finance/options/${row.ticker}?date=${expirationSeconds} | PUT | ${JSON.stringify(put)}`)
              //     error(err)
              //   }
              // }
            }
          })
        }

        const innerRun = innerQueue.splice(0, 5)

        async function runInnerTask(cb) {
          try {
            await cb()
          } catch(err) {
            error(err)
          }

          if(innerQueue.length) await runInnerTask(innerQueue.shift())
        }

        await Promise.all(innerRun.map(runInnerTask))
        await new Promise(r => setTimeout(r, 5000))
      })
    }

    const outerRun = outerQueue.splice(0, 5)

    async function runOuterTask(cb) {
      try {
        await cb()
      } catch(err) {
        error(err)
      }

      if(outerQueue.length) await runOuterTask(outerQueue.shift())
    }

    await Promise.all(outerRun.map(runOuterTask))
    await new Promise(r => setTimeout(r, 5000))
  }
}
