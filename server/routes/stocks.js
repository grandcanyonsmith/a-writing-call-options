import express from "express"
import { Connection } from "../db/connection.js"
import { debugServer as debug } from "../common/debug.js"
import { getLatestScrape } from "../common/get-latest-scrape.js"

export const stocksRoutes = express.Router();

const optionsQuery = `
  SELECT
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
    stock_tickers.ticker = $1
    AND
    odds > 0
    AND
    stock_tickers.scrape_id = $2
    AND
    stock_volatilities.in_the_money = 'f'
  ORDER BY
    odds DESC,
    percent_out DESC,
    expiration_date ASC,
    id ASC
  LIMIT 50
  OFFSET $3
`

/* GET stock options listings */
stocksRoutes.get("/:ticker/options", async function(req, res, next) {
  try {
    const ticker = String(req.params.ticker || "").toUpperCase(),
          { id, startedAt } = await getLatestScrape(),
          offset = parseInt(req.query.offset) || 0

    debug(`Scrape Date: ${startedAt}`)
    debug(optionsQuery.replace(/\$1/g, ticker).replace(/\$2/g, id).replace(/\$3/g, offset))

    const { rows } = await Connection.query(
      optionsQuery,
      [
        ticker,
        id,
        offset
      ]
    )
    res.json(rows);
  } catch(err) {
    next(err)
  }
});

const tickerQuery = `
  SELECT
    stock_tickers.*
  FROM
    stock_tickers
  WHERE
    stock_tickers.ticker = $1
    AND
    stock_tickers.scrape_id = $2
  LIMIT 1
`

/* GET stocks listing. */
stocksRoutes.get("/:ticker", async function(req, res, next) {
  try {
    const { id, startedAt } = await getLatestScrape(),
          ticker = String(req.params.ticker || "").toUpperCase()

    debug(`Scrape Date: ${startedAt}`)
    debug(tickerQuery.replace(/\$1/g, `'${ticker}'`).replace(/\$2/g, id))

    const { rows } = await Connection.query(
      tickerQuery,
      [
        ticker,
        id
      ]
    )

    const [ row ] = rows || []

    if(!row) throw new Error(`Stock not found: ${ticker}`)

    res.json(row);
  } catch(err) {
    next(err)
  }
})

const stockOddsQuery = `
  WITH ranked AS (
    SELECT
      stock_strikes.id,
      RANK () OVER (
        PARTITION BY stock_tickers.id
        ORDER BY odds DESC
      ) odds_rank
    FROM
      stock_strikes
    INNER JOIN
      stock_volatilities
      ON
        (
          stock_volatilities.id = stock_strikes.volatility_id
          AND
          stock_volatilities.in_the_money = 'f'
        )
    INNER JOIN
      stock_tickers
      ON
        stock_tickers.id = stock_volatilities.ticker_id
    WHERE
      stock_tickers.scrape_id = $1
      AND
      stock_tickers.motley_pick = 't'
      AND
      stock_volatilities.in_the_money = 'f'
  ),
  averaged AS (
    SELECT
      stock_tickers.id,
      AVG(odds) average_odds
    FROM
      stock_strikes
    INNER JOIN
      stock_volatilities
      ON
        (
          stock_volatilities.id = stock_strikes.volatility_id
          AND
          stock_volatilities.in_the_money = 'f'
        )
    INNER JOIN
      stock_tickers
      ON
        stock_tickers.id = stock_volatilities.ticker_id
    WHERE
      stock_tickers.scrape_id = $1
      AND
      stock_volatilities.in_the_money = 'f'
      AND
      stock_tickers.motley_pick = 't'
    GROUP BY
      stock_tickers.id
  )
  SELECT
    stock_tickers.ticker,
    stock_tickers.price,
    stock_tickers.one_year_high,
    stock_volatilities.strike,
    stock_volatilities.bid,
    stock_volatilities.in_the_money,
    stock_volatilities.expiration_date,
    stock_volatilities.symbol,
    stock_strikes.*,
    averaged.average_odds
  FROM
    stock_strikes
  INNER JOIN
    stock_volatilities
    ON
      (
        stock_volatilities.id = stock_strikes.volatility_id
        AND
        stock_volatilities.in_the_money = 'f'
      )
  INNER JOIN
    stock_tickers
    ON
      stock_tickers.id = stock_volatilities.ticker_id
  INNER JOIN
    ranked
    ON
      ranked.id = stock_strikes.id
  INNER JOIN
    averaged
    ON
      averaged.id = stock_tickers.id
  WHERE
    ranked.odds_rank = 1
  ORDER BY
    odds DESC,
    averaged.average_odds DESC,
    id ASC
  LIMIT 50
  OFFSET $2
`

/* GET stocks listing. */
stocksRoutes.get("*", async function(req, res, next) {
  try {
    const { id } = await getLatestScrape(),
          offset = parseInt(req.query.offset) || 0

    debug(stockOddsQuery.replace(/\$1/g, id).replace(/\$2/g, `'${offset}'`))

    const { rows } = await Connection.query(stockOddsQuery, [ id, offset ])

    res.json(rows);
  } catch(err) {
    next(err)
  }
});
