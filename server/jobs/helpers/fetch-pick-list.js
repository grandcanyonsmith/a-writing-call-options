import { Connection } from "../../db/connection.js"
import { debugWorker as debug } from "../../common/debug.js"

export async function fetchPickList(page) {
  debug("Loading Previously Picked Stocks")

  const { rows } = await Connection.query(`
    SELECT
      stock_tickers.*
    FROM
      purchase_picks
    INNER JOIN
      stock_strikes
      ON stock_strikes.id = purchase_picks.strike_id
    INNER JOIN
      stock_volatilities
      ON stock_volatilities.id = stock_strikes.volatility_id
    INNER JOIN
      stock_tickers
      ON stock_tickers.id = stock_volatilities.ticker_id
    ORDER BY
      purchase_picks.created_at DESC
  `)

  return rows
}
