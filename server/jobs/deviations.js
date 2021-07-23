import { Connection } from "../db/connection.js"
import { getScheduledDates } from "../common/get-scheduled-dates.js"
import { debugWorker as debug, error } from "../common/debug.js"

function invalidNumber(num){
  return isNaN(num) || !isFinite(num)
}

export async function calculateDeviations(givenDate) {
  
  debug("Calculating Purchase Picks")

  // try {
  
  const { schedule, date } = getScheduledDates(givenDate)

  const dayStart = new Date(date)

  dayStart.setHours(0, 0, 0, 0)

  debug(" -- Fetching Fresh Stock Strikes")

  const { rows } = await Connection.query(
    `
      SELECT
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
      INNER JOIN
        scrape_trackers
        ON
          scrape_trackers.id = stock_tickers.scrape_id
      WHERE
        stock_tickers.barchart_pick = 't'
        AND
        scrape_trackers.schedule = $1
        AND
        NOT EXISTS (
          SELECT
            1
          FROM
            stock_tickers sub_tickers
          INNER JOIN
            scrape_trackers sub_trackers
              ON sub_trackers.id = sub_tickers.scrape_id
          WHERE
            sub_tickers.ticker = stock_tickers.ticker
            AND
            sub_tickers.barchart_pick = 't'
            AND
            sub_trackers.schedule < $1
        )
    `,
    [ +dayStart ]
    
  )

  debug(" -- Calculating Average")

  let total = 0.0

  const count = rows.length
  

  for(const row of rows) {
    const { odds } = row
    total = total + parseFloat(odds)
    total = total/100
    console.log(total)
  }

  const avg = total / count

  debug(" -- Calculating Deviation")

  let totalDeviation = 0.0

  for(const row of rows) {
    const { odds } = row
    const deviation = parseFloat(odds) - avg
    totalDeviation = totalDeviation + (deviation ** 2)
  }

  const variance = totalDeviation / count

  const standardDeviation = Math.sqrt(variance)

  debug(" -- Calculating Z-Scores")

  for(const row of rows) {
    const { id, odds } = row
    const zScore = (parseFloat(odds) - avg) / standardDeviation

    await Connection.query(
      `
        UPDATE
          stock_strikes
        SET
          zscore = $1
        WHERE
          id = $2
      `,
      [ zScore, id ]
    )
  }

  debug(" -- Picking Lowest Odds with Z-Score > 1")

  const { rows: pickedRows } = await Connection.query(
    
    `
      SELECT
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
      INNER JOIN
        scrape_trackers
        ON
          scrape_trackers.id = stock_tickers.scrape_id
      WHERE
        stock_strikes.zscore > 1
        AND
        stock_tickers.barchart_pick = 't'
        AND
        scrape_trackers.schedule = $1
        AND
        NOT EXISTS (
          SELECT
            1
          FROM
            stock_tickers sub_tickers
          INNER JOIN
            scrape_trackers sub_trackers
              ON sub_trackers.id = sub_tickers.scrape_id
          WHERE
            sub_tickers.ticker = stock_tickers.ticker
            AND
            sub_tickers.barchart_pick = 't'
            AND
            sub_trackers.schedule < $1
        )
      ORDER BY
        stock_strikes.odds ASC
      LIMIT 3
    `,
    [ +dayStart ],
  )

  debug(" -- Reseting Today's Picks")

  await Connection.query(
    `
      DELETE FROM
        purchase_picks
      WHERE
        picked_at >= $1
    `,
    [ dayStart ]
  )

  debug(" -- Inserting Picks")

  for(const row of pickedRows) {
    await Connection.query(
      `
        INSERT INTO
          purchase_picks (
            strike_id,
            picked_at
          )
        VALUES
          (
            $1,
            $2
          )
      `,
      [
        row.id,
        dayStart
      ]
    )
  }

  debug(`Tracking Schedule ${schedule} Complete`)

  await Connection.query(
    `
      UPDATE
        scrape_trackers
      SET
        completed = 't',
        completed_at = NOW()
      WHERE
        schedule = $1
    `,
    [ schedule ]
  )
  // } catch(err) {
  //   console.log("error")
  //   error(err)
  // }
}
calculateDeviations();