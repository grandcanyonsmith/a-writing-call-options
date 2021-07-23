import express from "express"
import { Connection } from "../db/connection.js"
import { debugServer as debug } from "../common/debug.js"
import { getLatestScrape } from "../common/get-latest-scrape.js"

export const purchasesRoutes = express.Router();

const purchaseStrikesQuery = `
  SELECT
    purchase_picks.picked_at,
    stock_tickers.ticker,
    stock_tickers.company,
    stock_tickers.price,
    stock_tickers.price_at_close,
    stock_tickers.one_year_analysts,
    stock_tickers.one_year_low,
    stock_tickers.one_year_high,
    stock_tickers.one_year_average,
    stock_tickers.day_low,
    stock_tickers.day_high,
    stock_tickers.data,
    stock_strikes.premium_return,
    stock_strikes.apr,
    stock_strikes.edg,
    stock_strikes.sep,
    stock_strikes.percent_out,
    stock_strikes.odds,
    stock_strikes.zscore,
    stock_volatilities.id,
    stock_volatilities.ticker_id,
    stock_volatilities.option_type,
    stock_volatilities.strike,
    stock_volatilities.volume,
    stock_volatilities.ask,
    stock_volatilities.bid,
    stock_volatilities.change,
    stock_volatilities.last_price,
    stock_volatilities.size,
    stock_volatilities.symbol,
    stock_volatilities.currency,
    stock_volatilities.implied_volatility,
    stock_volatilities.in_the_money,
    stock_volatilities.open_interest,
    stock_volatilities.expiration_date,
    stock_volatilities.last_trade_date,
    lastest_data.*
  FROM
    purchase_picks
  INNER JOIN
    stock_strikes
    ON
      stock_strikes.id = purchase_picks.strike_id
  INNER JOIN
    stock_volatilities
    ON
      stock_volatilities.id = stock_strikes.volatility_id
  INNER JOIN
    stock_tickers
    ON
      stock_tickers.id = stock_volatilities.ticker_id
  INNER JOIN
    (
      SELECT
        stock_tickers.price as latest_price,
        stock_tickers.price_at_close as latest_price_at_close,
        stock_tickers.one_year_analysts as latest_one_year_analysts,
        stock_tickers.one_year_low as latest_one_year_low,
        stock_tickers.one_year_high as latest_one_year_high,
        stock_tickers.one_year_average as latest_one_year_average,
        stock_tickers.day_low as latest_day_low,
        stock_tickers.day_high as latest_day_high,
        stock_tickers.data as latest_data,
        stock_strikes.premium_return as latest_premium_return,
        stock_strikes.apr as latest_apr,
        stock_strikes.edg as latest_edg,
        stock_strikes.sep as latest_sep,
        stock_strikes.percent_out as latest_percent_out,
        stock_strikes.odds as latest_odds,
        stock_strikes.zscore as latest_zscore,
        stock_volatilities.id as latest_volatility_id,
        stock_volatilities.ticker_id as latest_ticker_id,
        stock_volatilities.option_type as latest_option_type,
        stock_volatilities.strike as latest_strike,
        stock_volatilities.volume as latest_volume,
        stock_volatilities.ask as latest_ask,
        stock_volatilities.bid as latest_bid,
        stock_volatilities.change as latest_change,
        stock_volatilities.last_price as latest_last_price,
        stock_volatilities.size as latest_size,
        stock_volatilities.symbol as latest_symbol,
        stock_volatilities.currency as latest_currency,
        stock_volatilities.implied_volatility as latest_implied_volatility,
        stock_volatilities.in_the_money as latest_in_the_money,
        stock_volatilities.open_interest as latest_open_interest,
        stock_volatilities.expiration_date as latest_expiration_date,
        stock_volatilities.last_trade_date as latest_last_trade_date
      FROM
        stock_volatilities
      LEFT JOIN
        stock_strikes
        ON
          stock_strikes.volatility_id = stock_volatilities.id
      INNER JOIN
        stock_tickers
        ON
          stock_tickers.id = stock_volatilities.ticker_id
      INNER JOIN
        scrape_trackers
        ON
          scrape_trackers.id = stock_tickers.scrape_id
      LEFT OUTER JOIN
        (
          SELECT
            stock_tickers.ticker,
            scrape_trackers.schedule
          FROM
            stock_tickers
          INNER JOIN
            scrape_trackers
          ON
            scrape_trackers.id = stock_tickers.scrape_id
        ) sub_tickers
        ON
          (
            sub_tickers.ticker = stock_tickers.ticker
            AND
            sub_tickers.schedule > scrape_trackers.schedule
          )
      WHERE
        sub_tickers.ticker IS NULL
    ) lastest_data
    ON
      lastest_data.latest_symbol = stock_volatilities.symbol
  ORDER BY
    purchase_picks.picked_at
  LIMIT 50
  OFFSET $1
`

/* GET purchases listing. */
purchasesRoutes.get("*", async function(req, res, next) {
  try {
    const { id } = await getLatestScrape(),
          offset = parseInt(req.query.offset) || 0

    debug(purchaseStrikesQuery.replace(/\$1/g, `'${offset}'`))

    const { rows } = await Connection.query(purchaseStrikesQuery, [ offset ])

    res.json(rows);
  } catch(err) {
    next(err)
  }
});
