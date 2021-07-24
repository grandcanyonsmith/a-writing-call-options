import { useState, useEffect } from "react"
import { Loader } from "components/loader"
import { useParams } from "react-router-dom"
import { daysBetweenDates } from "helpers/days-between-dates.js"
import { keysAreDefined } from "helpers/keys-are-defined.js"
import { forceNumber,
         formatMoney,
         formatPercentage,
         percentDiff,
         positiveOrNegative } from "helpers/number-helpers.js"

import "./show.css"

const dateLocaleOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric'
}

function getExpectedPrice(price, dailyGrowth, expiration) {
  try {
    expiration = new Date(expiration)
    if(isNaN(+expiration)) throw new Error("Invalid Expiration Date")

    const daysTilExp = daysBetweenDates(expiration, new Date()),
          totalGrowth = (parseFloat(dailyGrowth) || 0) * daysTilExp,
          endPrice = (parseFloat(price) || 0) + totalGrowth

    if(isNaN(endPrice)) throw new Error("Invalid Price or Growth Factor")

    return formatMoney(endPrice)
  } catch(err) {
    console.error(err)
    return "N/A"
  }
}

function OptionRow({ option, stock, onClick }) {
  let {
    bid,
    strike,
    // in_the_money,
    expiration_date,
    // symbol,
    id,
    // volatility_id,
    apr,
    edg,
    // sep,
    percent_out,
    premium_return,
    odds
  } = option || {}

  const price = parseFloat((stock || {}).price || 0)


  strike = parseFloat(strike) || 0
  bid = parseFloat(bid) || 0
  expiration_date = new Date(expiration_date)

  const maxProfit = (
    (
      ( strike - price )
      * 100
    )
    + ( bid * 100 )
  ) || 0

  const daysTilExp = daysBetweenDates(expiration_date, new Date())

  return (
    <tr
      key={id}
      onClick={onClick}
    >
      <td>
        { formatMoney(strike) }
      </td>
      <td>
        { expiration_date.toLocaleDateString("en-US", dateLocaleOptions) }
        <br/>
        ({ daysTilExp } Day{ daysTilExp > 1 ? "s" : "" })
      </td>
      <td>
        { formatPercentage(percent_out) }
      </td>
      <td>
        { formatMoney(bid) }
        <br/>
        ({ formatPercentage(premium_return) })
      </td>
      <td colSpan="2">
        { formatPercentage(apr) }
      </td>
      <td>
        { formatPercentage(odds) }
      </td>
      <td>
        { getExpectedPrice(price, edg, expiration_date) }
      </td>
      <td>
        { formatMoney(bid * 100) }
        <br/>
        ({ formatPercentage(premium_return) })
      </td>
      <td>
        { formatMoney(maxProfit) }
        <br/>
        ({ formatPercentage((maxProfit / (price * 100)) * 100) })
      </td>
    </tr>
  )
}

export function StocksShowPage() {
  const [ loading, setLoading ] = useState(true),
        [ loadingRows, setLoadingRows ] = useState(true),
        [ error, setError ] = useState(null),
        [ rowsError, setRowsError ] = useState(null),
        [ stock, setStock ] = useState({}),
        [ rows, setRows ] = useState([]),
        [ offset, setOffset ] = useState(0),
        [ tries, setTries ] = useState(0),
        [ sortingFunction, setSortingFunction ] = useState(undefined),
        { ticker } = useParams(),
        price = forceNumber(stock.price)

  let percentFromHigh = 0,
      fiftyTwoHigh = 0,
      earningsDate = null

  if(keysAreDefined(stock, "price", "data.year_range_high")) {
    fiftyTwoHigh = parseFloat(stock.data.year_range_high) || 0
    percentFromHigh = percentDiff(price, fiftyTwoHigh)
  }

  if(keysAreDefined(stock, "data.earnings_date_start")) {
    earningsDate = new Date(stock.data.earnings_date_start)
  }

  const previousPage = () => {
          setOffset(offset < 50 ? 0 : offset - 50)
        },
        nextPage = () => {
          setOffset(offset + 50)
        },
        retry = () => {
          setTries(tries + 1)
        }

  useEffect(function() {
    let isCurrent = true

    async function getStock() {
      try {
        if(!ticker) throw new Error("Ticker Not Given")

        const response = await fetch(`/api/stocks/${ticker}`),
              result = await response.json()

        if(!result) throw new Error(`Stock Not Found: ${ticker}`)

        setStock(result)
      } catch(err) {
        if(isCurrent) {
          setError(err)
        }
      }

      if(isCurrent) setLoading(false)
    }

    getStock()

    return () => isCurrent = false
  }, [ ticker, tries ])

  useEffect(function() {
    let isCurrent = true

    async function getRows() {
      try {
        if(!ticker) throw new Error("Ticker Not Given")

        const response = await fetch(`/api/stocks/${ticker}/options?offset=${offset || 0}`),
              result = await response.json()

        setRows(result)
      } catch(err) {
        if(isCurrent) {
          setRowsError(err)
        }
      }
      if(isCurrent) setLoadingRows(false)
    }

    getRows()

    return () => isCurrent = false
  }, [ ticker, offset, tries ])

  return (
    <section className="show-stock-page">
      {
        error
          ? (
              <header className="error">
                Error: { error.message }
                <button className="retry" onClick={retry}>
                  Retry
                </button>
              </header>
            )
          : (
              loading
                ? (
                    <header>
                      <div className="row">
                        <div className="column">
                          <h1 className="stock-ticker">
                            { ticker }
                          </h1>
                        </div>
                      </div>
                      <div className="row">
                        <div className="column loader">
                          <Loader />
                        </div>
                      </div>
                    </header>
                  )
                : (
                    <header>
                      <div className="row">
                        <div className="column">
                          <h1 className="stock-ticker">
                            { ticker }
                          </h1>
                          <h4 className="stock-price">
                            { formatMoney(price) }
                          </h4>
                        </div>
                        <div className="column">
                          <h5 className="white-header">
                            Requirement:
                          </h5>
                          <h5 key="price" className="stock-price">
                            { formatMoney(price * 100) }
                          </h5>
                        </div>
                      </div>
                      <div className="row wrap">
                        <div className="column">
                          <table className="borderless">
                            <tbody>
                              <tr>
                                <th>
                                  52-WH:
                                </th>
                                <td className="stock-price">
                                  { formatMoney(fiftyTwoHigh) }
                                </td>
                              </tr>
                              <tr>
                                <th>
                                  % from 52-WH:
                                </th>
                                <td className={`stock-price ${positiveOrNegative(percentFromHigh)}`}>
                                  { formatPercentage(percentFromHigh) }
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="column">
                          <table className="borderless">
                            <tbody>
                              <tr>
                                <th>
                                  PT:
                                </th>
                                <td className="stock-price">
                                  { formatMoney(stock.one_year_high) }
                                </td>
                              </tr>
                              <tr>
                                <th>
                                  Earnings:
                                </th>
                                <td>
                                  {
                                    earningsDate
                                      ? earningsDate.toLocaleDateString("en-US", dateLocaleOptions)
                                      : "Unknown"
                                  }
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </header>
                  )
            )
      }
      <div className="content">
        {
          rowsError
            ? (
                <div className="stock-options error">
                  Error: { rowsError.message }
                  <button className="retry" onClick={retry}>
                    Retry
                  </button>
                </div>
              )
            : (
                loadingRows
                  ? (
                      <div className="stock-options loader">
                        <Loader />
                      </div>
                    )
                  : (
                      <div className="stock-options">
                        <table className="datatable">
                          <thead>
                            <tr>
                              <th onClick={() => { 
                                setSortingFunction(() => (option1, option2) => { 
                                  return getSortingFunctionFromValues(parseInt(option1.strike) || 0, parseInt(option2.strike) || 0)
                                });
                              }}>
                                Strike Price
                              </th>
                              <th onClick={() => {
                                setSortingFunction(() => (option1, option2) => getSortingFunctionFromValues(option1.expiration_date, option2.expiration_date));
                              }}>
                                Expiration Date
                              </th>
                              <th onClick={() => {
                                setSortingFunction(() => (option1, option2) => getSortingFunctionFromValues(option1.percent_out, option2.percent_out));
                              }}>
                                % Out of the Money
                              </th>
                              <th onClick={() => {
                                setSortingFunction(() => (option1, option2) => getSortingFunctionFromValues(parseInt(option1.bid) || 0, parseInt(option2.bid) || 0))
                              }}>      
                                Premium
                              </th>
                              <th colSpan="2" onClick={() => {
                                setSortingFunction(() => (option1, option2) => getSortingFunctionFromValues(parseInt(option1.apr) || 0, parseInt(option2.apr) || 0))
                              }}>
                                Anualized Premium Return
                              </th>
                              <th onClick={() => {
                                setSortingFunction(() => (option1, option2) => getSortingFunctionFromValues(parseInt(option1.odds) || 0, parseInt(option2.odds) || 0))
                              }}>  
                                Smith Net Score
                              </th>
                              <th onClick={() => {
                                setSortingFunction(() => (option1, option2) => {
                                  let val1 = getExpectedPrice(
                                    parseFloat((stock || {}).price || 0), 
                                    option1.edg, 
                                    new Date(option1.expiration_date)
                                  );
                                  let val2 = getExpectedPrice(
                                    parseFloat((stock || {}).price || 0), 
                                    option2.edg, 
                                    new Date(option2.expiration_date)
                                  ); 
                                  if (val1[0] === "$"){
                                    val1 = val1.substring(1);
                                  }
                                  if (val2[0] === "$"){
                                    val2 = val2.substring(1);
                                  }
                                  console.log("val: ", typeof(val1), " ", val1);
                                  return getSortingFunctionFromValues(parseInt(val1) || 0, parseInt(val2) || 0)
                                })
                              }}>
                                Stock Expected Price
                              </th>
                              <th onClick={() => {
                                setSortingFunction(() => (option1, option2) => getSortingFunctionFromValues(option1.bid * 100, option2.bid * 100));
                              }}>  
                                Minimum Profit
                              </th>
                              <th onClick={() => {
                                const price = parseFloat((stock || {}).price || 0); 
                                const maxProfit = (option) => (
                                  (
                                    ( option.strike - price )
                                    * 100
                                  )
                                  + ( option.bid * 100 )
                                ) || 0
                                setSortingFunction(() => (option1, option2) => getSortingFunctionFromValues(maxProfit(option1), maxProfit(option2)));
                              }}>   
                                Maximum Profit
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {
                              rows.sort(sortingFunction).map((option) => { 
                                return <OptionRow key={option.id} stock={stock} option={option}/>
                              })
                            }
                          </tbody>
                          <tfoot>
                            <tr>
                              <th colSpan="5">
                                <button
                                  onClick={previousPage}
                                  disabled={!offset}
                                >
                                  &lt; PREVIOUS
                                </button>
                              </th>
                              <th colSpan="5">
                                <button
                                  onClick={nextPage}
                                  disabled={!rows.length || rows.length < 50}
                                >
                                  NEXT &gt;
                                </button>
                              </th>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )
              )
        }
      </div>
    </section>
  )
}

const getSortingFunctionFromValues = (value1, value2) => {
  return value1 < value2 ? -1 : (value1 === value2 ? 0 : 1)
}
