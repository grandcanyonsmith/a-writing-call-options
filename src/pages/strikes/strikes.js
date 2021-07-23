import { useState, useEffect } from "react"
import { useHistory } from "react-router-dom"
import { Loader } from "components/loader"
import "./strikes.css"



export function StrikesPage() {
  const [ loading, setLoading ] = useState(true),
        [ sortBy, setSortBy ] = useState(false),
        [ error, setError ] = useState(null),
        [ rows, setRows ] = useState([]),
        [ offset, setOffset ] = useState(0),
        history = useHistory()

  const redirectToStock = (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
    const target = ev.currentTarget,
          { ticker } = target.dataset

    history.push(`/stocks/${ticker}`)
  }

  const toggleSortBy = (ev) => {
          const column = ev.currentTarget.dataset.column

          setSortBy(column === sortBy ? false : column)

          setOffset(0)
        },
        previousPage = () => {
          setOffset(offset < 50 ? 0 : offset - 50)
        },
        nextPage = () => {
          setOffset(offset + 50)
        }

  useEffect(function() {
    let isCurrent = true

    async function getRows() {
      try {
        const response = await fetch(`/api/strikes?offset=${offset}${sortBy ? `&sort=${sortBy}` : ""}`),
              result = await response.json()

        // await new Promise(r => setTimeout(r, 10000))
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
  }, [ offset, sortBy ])

  return (
    <div className="strike-page">
      <a className="download" href="/api/strikes/csv" download>
        Download CSV
      </a>
      <div className="content">
        {
          loading
            ? (
                <Loader className="page-loader" />
              )
            : (
                error
                  ? (
                      <div className="error">
                        <pre>{ error.stack }</pre>
                      </div>
                    )
                  : (
                      <table className="datatable">
                        <thead>
                          <tr>
                            <th
                              data-column="ticker"
                              onClick={toggleSortBy}
                            >
                              Ticker { sortBy === "ticker" ? "▼" : "" }
                            </th>
                            <th
                              data-column="price"
                              onClick={toggleSortBy}
                            >
                              Price { sortBy === "price" ? "▼" : "" }
                            </th>
                            <th
                              data-column="strike"
                              onClick={toggleSortBy}
                            >
                              Strike { sortBy === "strike" ? "▼" : "" }
                            </th>
                            <th
                              data-column="apr"
                              onClick={toggleSortBy}
                            >
                              APR { sortBy === "apr" ? "▼" : "" }
                            </th>
                            <th
                              data-column="odds"
                              onClick={toggleSortBy}
                            >
                              Odds { sortBy === "odds" ? "▼" : "" }
                            </th>
                            <th
                              data-column="one_year_high"
                              onClick={toggleSortBy}
                            >
                              Estimated 1yr High { sortBy === "one_year_high" ? "▼" : "" }
                            </th>
                            <th
                              data-column="premium_return"
                              onClick={toggleSortBy}
                            >
                              Premium Return { sortBy === "premium_return" ? "▼" : "" }
                            </th>
                            <th
                              data-column="bid"
                              onClick={toggleSortBy}
                            >
                              Premium { sortBy === "bid" ? "▼" : "" }
                            </th>
                            <th
                              data-column="edg"
                              onClick={toggleSortBy}
                            >
                              EDG { sortBy === "edg" ? "▼" : "" }
                            </th>
                            <th
                              data-column="sep"
                              onClick={toggleSortBy}
                            >
                              SEP { sortBy === "sep" ? "▼" : "" }
                            </th>
                            <th
                              data-column="percent_out"
                              onClick={toggleSortBy}
                            >
                              % Out of the Money { sortBy === "percent_out" ? "▼" : "" }
                            </th>
                            <th
                              data-column="in_the_money"
                              onClick={toggleSortBy}
                            >
                              In The Money { sortBy === "in_the_money" ? "▼" : "" }
                            </th>
                            <th
                              data-column="expiration_date"
                              onClick={toggleSortBy}
                            >
                              Expires { sortBy === "expiration_date" ? "▼" : "" }
                            </th>
                            <th
                              data-column="symbol"
                              onClick={toggleSortBy}
                            >
                              Contract { sortBy === "symbol" ? "▼" : "" }
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {
                            rows.map(({ ticker, price, bid, one_year_high, strike, in_the_money, expiration_date, symbol, id, volatility_id, apr, edg, sep, percent_out, premium_return, odds }) => (
                              <tr
                                key={id}
                                onClick={redirectToStock}
                                data-ticker={ticker}
                              >
                                <td>
                                  { ticker }
                                </td>
                                <td>
                                  ${ parseFloat(price).toFixed(2) }
                                </td>
                                <td>
                                  ${ parseFloat(strike).toFixed(2) }
                                </td>
                                <td>
                                  { (parseFloat(apr) * 100.0).toFixed(5) }%
                                </td>
                                <td>
                                  { (parseFloat(odds) * 100.0).toFixed(5) }%
                                </td>
                                <td>
                                  ${ parseFloat(one_year_high).toFixed(2) }
                                </td>
                                <td>
                                  { (parseFloat(premium_return) * 100).toFixed(5) }%
                                </td>
                                <td>
                                  ${ parseFloat(bid).toFixed(2) }
                                </td>
                                <td>
                                  ${ parseFloat(edg).toFixed(2) }
                                </td>
                                <td>
                                  ${ parseFloat(sep).toFixed(2) }
                                </td>
                                <td>
                                  { (parseFloat(percent_out) * 100.0).toFixed(5) }%
                                </td>
                                <td>
                                  { in_the_money ? "Yes" : "No" }
                                </td>
                                <td>
                                  { new Date(expiration_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) }
                                </td>
                                <td>
                                  { symbol }
                                </td>
                              </tr>
                            ))
                          }
                        </tbody>
                        <tfoot>
                          <tr>
                            <th colSpan="7">
                              <button
                                onClick={previousPage}
                                disabled={!offset}
                              >
                                &lt; Previous
                              </button>
                            </th>
                            <th colSpan="7">
                              <button
                                onClick={nextPage}
                                disabled={!rows.length || rows.length < 50}
                              >
                                Next &gt;
                              </button>
                            </th>
                          </tr>
                        </tfoot>
                      </table>
                    )
              )
        }
      </div>
    </div>
  );
}
