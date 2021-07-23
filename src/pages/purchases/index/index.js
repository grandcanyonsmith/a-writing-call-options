import { useState, useEffect } from "react"
import { useHistory } from "react-router-dom"
import { Loader } from "components/loader"
import { daysBetweenDates } from "helpers/days-between-dates.js"
import { forceNumber,
         formatMoney,
         formatPercentage,
         positiveOrNegative } from "helpers/number-helpers.js"

import "./index.css"

const dateLocaleOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric'
}

const today = new Date()

function showDate(date) {
  date = new Date(date)
  if(isNaN(+date)) return "N/A"
  return date.toLocaleDateString("en-US", dateLocaleOptions)
}

function formatChange(current, was, onlyDiff) {
  current = forceNumber(current)
  was = forceNumber(was)
  const difference = current - was
  const percentDiff = (current / was - 1).toFixed(2)
  const symbol = difference < 0 ? "-" : "+"
  const percentDisplay = Math.abs(forceNumber(percentDiff) * 100).toFixed(2)

  if(onlyDiff) return `${symbol}(${parseInt(percentDisplay)}%)`

  return `${symbol}${difference.toFixed(3)} (${percentDisplay}%)`
}

export function PurchasesIndexPage() {
  const [ loading, setLoading ] = useState(true),
        [ error, setError ] = useState(null),
        [ rows, setRows ] = useState([]),
        [ totalProfit, setTotalProfit ] = useState(null),
        [ offset, setOffset ] = useState(0),
        [ tries, setTries ] = useState(0),
        history = useHistory()

  const previousPage = () => {
    setOffset(offset < 50 ? 0 : offset - 50)
  }

  const nextPage = () => {
    setOffset(offset + 50)
  }

  const redirectToStock = (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
    const target = ev.currentTarget
    const { ticker } = target.dataset
    history.push(`/stocks/${ticker}`)
  }

  const retry = () => {
    setTries(tries + 1)
  }

  useEffect(function() {
    let isCurrent = true
    setLoading(true)
    setTotalProfit(null)
    async function getRows() {
      try {
        const response = await fetch(`/api/purchases?offset=${offset || 0}`),
        result = await response.json()
        setRows(result)
      } catch(err) {
        if(isCurrent) {
          setError(err)
        }
      }
      if(isCurrent) setLoading(false)
    }
    getRows()
    return () => isCurrent = false
  }, [ offset ])

  useEffect(function() {
    let isCurrent = true
    setTotalProfit(null)
    async function getTotalProfit() {
      try {
        let total = 0
        for(const row of rows) {
          total = total + (forceNumber(row.bid) * 100)
        }
        setTotalProfit(total)
      } catch(err) {
        if(isCurrent) setTotalProfit(null)
      }
    }
    getTotalProfit()
    return () => isCurrent = false
  }, [ rows ])

  return (
    error
      ? (
          <section className="index-purchase-page error">
            { error.message }
            <button className="retry" onClick={retry}>
              Retry
            </button>
          </section>
        )
      : (
          loading
            ? (
                <section className="index-purchase-page loader">
                  <div className="aspect-ratio">
                    <div className="aspect-ratio-inner">
                      <Loader />
                    </div>
                  </div>
                </section>
              )
            : (
                <section className="index-purchase-page">
                  <header>
                    <h3>
                      MOST VOLATILE OPTIONS
                    </h3>
                  </header>
                  <div className="content">
                    {
                      rows.map(row => {
                        const {
                          picked_at,
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
                          data,
                          premium_return,
                          apr,
                          edg,
                          sep,
                          percent_out,
                          odds,
                          zscore,
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
                          expiration_date,
                          last_trade_date,
                          latest_price,
                          latest_price_at_close,
                          latest_one_year_analysts,
                          latest_one_year_low,
                          latest_one_year_high,
                          latest_one_year_average,
                          latest_day_low,
                          latest_day_high,
                          latest_data,
                          latest_premium_return,
                          latest_apr,
                          latest_edg,
                          latest_sep,
                          latest_percent_out,
                          latest_odds,
                          latest_zscore,
                          latest_volatility_id,
                          latest_ticker_id,
                          latest_option_type,
                          latest_strike,
                          latest_volume,
                          latest_ask,
                          latest_bid,
                          latest_change,
                          latest_last_price,
                          latest_size,
                          latest_symbol,
                          latest_currency,
                          latest_implied_volatility,
                          latest_in_the_money,
                          latest_open_interest,
                          latest_expiration_date,
                          latest_last_trade_date
                        } = row || {}

                        const daysLeft = daysBetweenDates(expiration_date, today)

                        const maxProfit = forceNumber(
                          (
                            (
                              forceNumber(strike)
                              - forceNumber(price)
                            ) * 100
                          )
                          + ( bid * 100 )
                        )

                        return (
                          <div
                            key={ticker}
                            className="row clickable"
                            onClick={redirectToStock}
                            data-ticker={ticker}
                          >
                            <div className="column left">
                              <div className="row">
                                <div className="column">
                                  <div className="value-group">
                                    <h3>
                                      {ticker} <span className={positiveOrNegative(latest_price)}>
                                        { formatMoney(latest_price) }
                                      </span>
                                    </h3>
                                    <p className={positiveOrNegative(latest_price - price)}>
                                      { formatChange(latest_price, price) }
                                    </p>
                                  </div>
                                  <div className="value-group">
                                    <h4 className="options-contract">
                                      { showDate(latest_expiration_date) } @ { formatMoney(latest_strike) }
                                    </h4>
                                    <p className={positiveOrNegative(latest_bid - bid)}>
                                      { formatMoney(latest_bid) } <span className={positiveOrNegative(latest_bid - bid)}>
                                        { formatChange(latest_bid, bid) }
                                      </span>
                                    </p>
                                  </div>
                                  <div className="value-group">
                                    <p>
                                      { symbol }
                                    </p>
                                  </div>
                                </div>
                                <div className="column align-right">
                                  <div className="value-group small">
                                    <table class="hide-small" aria-hidden="true">
                                      <tbody>
                                        <tr>
                                          <th>
                                            IV:
                                          </th>
                                          <td>
                                            { formatPercentage(latest_implied_volatility) } <span className={positiveOrNegative(latest_implied_volatility - implied_volatility)}>
                                              { formatChange(latest_implied_volatility, implied_volatility, true) }
                                            </span>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                    <table>
                                      <tbody>
                                        <tr class="hide-large">
                                          <th>
                                            IV:
                                          </th>
                                          <td>
                                            { formatPercentage(latest_implied_volatility) } <span className={positiveOrNegative(latest_implied_volatility - implied_volatility)}>
                                              { formatChange(latest_implied_volatility, implied_volatility, true) }
                                            </span>
                                          </td>
                                        </tr>
                                        <tr>
                                          <th>
                                            Volume:
                                          </th>
                                          <td>
                                            { parseInt(latest_volume) }
                                          </td>
                                        </tr>
                                        <tr>
                                          <th>
                                            Days til exp:
                                          </th>
                                          <td>
                                            { daysLeft }
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="column right">
                              <h5 className="requirement-wrapper">
                                Since:
                                <br/>
                                { showDate(picked_at) }
                              </h5>
                              <dl>
                                <dt>
                                  Option:
                                </dt>
                                <dd>
                                  { formatMoney(bid) } <span className={positiveOrNegative(latest_bid - bid)}>
                                    { formatChange(latest_bid, bid, true) }
                                  </span>
                                </dd>
                                <dt>
                                  Stock:
                                </dt>
                                <dd>
                                  { formatMoney(price) } <span className={positiveOrNegative(latest_price - price)}>
                                    { formatChange(latest_price, price, true) }
                                  </span>
                                </dd>
                              </dl>
                            </div>
                          </div>
                        )
                      })
                    }
                  </div>
                  <div className="row bottom">
                    <button
                      onClick={previousPage}
                      className="column btn align-center"
                      disabled={!offset}
                    >
                      &lt; Previous
                    </button>
                    <button
                      onClick={nextPage}
                      className="column btn align-center"
                      disabled={!rows.length || (rows.length < 50)}
                    >
                      Next &gt;
                    </button>
                  </div>
                </section>
              )
        )

  )
}
