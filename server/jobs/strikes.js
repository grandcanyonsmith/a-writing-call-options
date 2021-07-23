import { Connection } from "../db/connection.js"
import { getScheduledDates } from "../common/get-scheduled-dates.js"
import { daysBetweenDates } from "../common/days-between-dates.js"
import { debugWorker as debug, error } from "../common/debug.js"

function invalidNumber(num){
  return isNaN(num) || !isFinite(num)
}

export async function calculateStrikes(givenDate) {
  let tickerOffset = 0

  const { schedule, date, thirty } = getScheduledDates(givenDate)

  debug("Calculating Strike Metrics")

  while(true) {
    debug(" -- Fetching Tickers")

    const { rows: tickerRows } = await Connection.query(
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
        LIMIT 50
        OFFSET $2
      `,
      [
        schedule,
        tickerOffset
      ]
    )

    if(!tickerRows.length) break;

    tickerOffset = tickerOffset + 50

    const outerQueue = []

    for(const tickerRow of tickerRows) {
      outerQueue.push(async () => {
        let volatilityOffset = 0

        while(true) {
          debug(` -- Fetching Options for ${tickerRow.ticker}`)

          const { rows } = await Connection.query(`
            SELECT
              *
            FROM stock_volatilities
            WHERE
              ticker_id = $1
            AND
              option_type = 'call'
            LIMIT 50 OFFSET $2
          `, [ tickerRow.id, volatilityOffset ])

          if(!rows.length) break;

          volatilityOffset = volatilityOffset + 50

          const innerQueue = []

          for(const row of rows) {
            innerQueue.push(async () => {
              try {
                debug(`${tickerOffset} ${tickerRows.length} ${volatilityOffset} ${rows.length} ${tickerRow.ticker}: ${JSON.stringify(row)}`)

                const currentPrice = parseFloat(tickerRow.price),
                      premium = parseFloat(row.bid) || 0,
                      daysTilExp = daysBetweenDates(row.expiration_date, date),
                      edg = (parseFloat(tickerRow.one_year_high) - currentPrice) / 365.0,
                      sep = (edg * daysTilExp) + currentPrice,
                      percentOut = 1.0 - (sep / parseFloat(row.strike)),
                      premiumReturn = premium / currentPrice,
                      apr = (premiumReturn / daysTilExp) * 365,
                      odds = invalidNumber(apr) ? 0 : apr * percentOut

                await Connection.transaction(async (client) => {
                  await client.query("DELETE FROM stock_strikes WHERE volatility_id = $1", [ row.id ])

                  await client.query(
                    `
                      INSERT INTO
                        stock_strikes (
                          volatility_id,
                          premium_return,
                          apr,
                          edg,
                          sep,
                          percent_out,
                          odds
                        )
                      VALUES
                        (
                          $1,
                          $2,
                          $3,
                          $4,
                          $5,
                          $6,
                          $7
                        )
                    `,
                    [
                      row.id,
                      invalidNumber(premiumReturn) ? 0.0 : premiumReturn,
                      invalidNumber(apr) ? 0.0 : apr,
                      invalidNumber(edg) ? 0.0 : edg,
                      invalidNumber(sep) ? 0.0 : sep,
                      invalidNumber(percentOut) ? 0.0 : percentOut,
                      invalidNumber(odds) ? 0.0 : odds
                    ]
                  )
                })
              } catch(err) {
                error(err)
              }
            })
          }

          const innerRun = innerQueue.splice(0, 10)

          async function runInnerTask(cb) {
            try {
              await cb()
            } catch(err) {
              error(err)
            }

            if(innerQueue.length) await runInnerTask(innerQueue.shift())
          }

          await Promise.all(innerRun.map(runInnerTask))
        }
      })
    }

    const outerRun = outerQueue.splice(0, 10)

    async function runOuterTask(cb) {
      try {
        await cb()
      } catch(err) {
        error(err)
      }

      if(outerQueue.length) await runOuterTask(outerQueue.shift())
    }

    await Promise.all(outerRun.map(runOuterTask))
  }
}
