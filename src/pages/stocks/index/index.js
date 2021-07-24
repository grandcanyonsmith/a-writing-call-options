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

export function StocksIndexPage() {
  const [ loading, setLoading ] = useState(true),
        [ error, setError ] = useState(null),
        [ rows, setRows ] = useState([]),
        [ totalProfit, setTotalProfit ] = useState(null),
        [ offset, setOffset ] = useState(0),
        [ tries, setTries ] = useState(0),
        history = useHistory()

  const previousPage = () => {
          setOffset(offset < 50 ? 0 : offset - 50)
        },
        nextPage = () => {
          setOffset(offset + 50)
        },
        redirectToStock = (ev) => {
          ev.preventDefault()
          ev.stopPropagation()
          const target = ev.currentTarget,
                { ticker } = target.dataset

          history.push(`/stocks/${ticker}`)
        },
        retry = () => {
          setTries(tries + 1)
        }

  useEffect(function() {
    let isCurrent = true

    setLoading(true)
    setTotalProfit(null)

    async function getRows() {
      try {
        const response = await fetch(`/api/stocks?offset=${offset || 0}`),
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
          <section className="index-stock-page error">
            { error.message }
            <button className="retry" onClick={retry}>
              Retry
            </button>
          </section>
        )
      : (
          loading
            ? (
                <section className="index-stock-page loader">
                  <div className="aspect-ratio">
                    <div className="aspect-ratio-inner">
                      <Loader />
                    </div>
                  </div>
                </section>
              )
            : (
                <section className="index-stock-page">
                  <header>
                    <h3>
                      Total Min. Profit: {
                        totalProfit
                          ? (
                              <span className={positiveOrNegative(totalProfit)}>
                                { formatMoney(totalProfit) }
                              </span>
                            )
                          : "N/A"
                        }
                    </h3>
                  </header>
                  <div className="content">
                    {
                      rows.map(row => {
                        const {
                          ticker,
                          price,
                          strike,
                          expiration_date,
                          bid,
                          premium_return,
                          odds,
                          average_odds,
                          percent_out,
                          apr,
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
                                  <div className="value-group stock-and-price">
                                    <h3>
                                      {ticker}
                                    </h3>
                                    <p className={positiveOrNegative(price)}  > (
                                      { formatMoney(price) }
                                    )
                                    </p>
                                  </div>
                                  <div className="value-group">
                                    <h4 className="options-contract">
                                      { showDate(expiration_date) }
                                      <br/>
                                      @ { formatMoney(strike) }
                                    </h4>
                                    <p className={positiveOrNegative(bid)}>
                                      { formatMoney(bid) }
                                      &nbsp;
                                      <span className={positiveOrNegative(premium_return)}>
                                        ({ formatPercentage(premium_return) })
                                      </span>
                                    </p>
                                  </div>
                                </div>
                                <div className="column align-right">
                                  <div className="value-group">
                                    <h3>
                                      Min Profit:
                                    </h3>
                                    <p className={positiveOrNegative(bid)}>
                                      { formatMoney(forceNumber(bid) * 100) }
                                    </p>
                                  </div>
                                  <div className="value-group">
                                    <h3>
                                      Max Profit:
                                    </h3>
                                    <p className={positiveOrNegative(maxProfit)}>
                                      { formatMoney(maxProfit) }
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="column right">
                              <h5 className="requirement-wrapper">
                                <div className="requirement">Requirement:</div>
                                <br/>
                                <div className="requirement-price">{ formatMoney(forceNumber(price) * 100) }</div>
                              </h5>
                              <ul>
                                <li>
                                  { daysLeft } day{ daysLeft > 1 ? "s" : "" }
                                </li>
                                <li>
                                  { formatPercentage(percent_out) } OTM
                                </li>
                                <li>
                                  { formatPercentage(apr) } APR
                                </li>
                                <li>
                                  { formatPercentage(odds) } Top SNS
                                </li>
                                <li>
                                  { formatPercentage(average_odds) } Avg SNS
                                </li>
                              </ul>
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
                      &lt; PREVIOUS
                    </button>
                    <button
                      onClick={nextPage}
                      className="column btn align-center"
                      disabled={!rows.length || (rows.length < 50)}
                    >
                      NEXT &gt;
                    </button>
                  </div>
                </section>
              )
        )

  )
}
