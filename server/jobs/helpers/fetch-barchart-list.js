import fetch from "node-fetch"
import { debugWorker as debug, error } from "../../common/debug.js"

const headers = {
  "sec-ch-ua": `"Chromium";v="88", "Google Chrome";v="88", ";Not A Brand";v="99"`,
  "Accept": "application/json",
  "DNT": "1",
  "sec-ch-ua-mobile": "?0",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.104 Safari/537.36",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Dest": "empty"
}

function twoDigits(value) {
  return `0${value}`.slice(-2)
}

function formatDate(date) {
  return `${
    date.getFullYear()
  }-${
    twoDigits(date.getMonth() + 1)
  }-${
    twoDigits(date.getDate())
  }`
}

function subtractDays(date, days) {
  date = new Date(date)
  date.setDate(date.getDate() - days)
  return date
}

function formatParamValue(value, parens) {
  return (
    (typeof value === undefined)
      ? ""
      : (
          Array.isArray(value)
            ? (
                `${
                  parens ? "(" : ""
                }${
                  value.map(v => formatParamValue(v, true)).join(encodeURIComponent(","))
                }${
                  parens ? ")" : ""
                }`
              )
            : encodeURIComponent(String(value))
        )
  )
}

function formatParams(params) {
  let query = ""
  for(const [ key, value ] of params) {
    if(Array.isArray(key)) {
      const [ mainKey, values ] = key
      query = `${
        query
      }&${
        mainKey
      }${
        formatParamValue(values, true)
      }=${
        formatParamValue(value)
      }`
    } else {
      query = `${query}&${key}=${formatParamValue(value)}`
    }
  }
  return query.replace(/^\&/, "")
}

function createQueryParams() {
  const today = new Date()

  return [
    [
      "fields",
      [
        "symbol",
        "baseSymbol",
        "baseLastPrice",
        "baseSymbolType",
        "symbolType",
        "strikePrice",
        "expirationDate",
        "daysToExpiration",
        "bidPrice",
        "midpoint",
        "askPrice",
        "lastPrice",
        "volume",
        "openInterest",
        "volumeOpenInterestRatio",
        "volatility",
        "tradeTime",
        "symbolCode"
      ],
    ],
    [
      "orderBy",
      "volatility"
    ],
    [
      "orderDir",
      "desc"
    ],
    [
      "baseSymbolTypes",
      "stock"
    ],
    [
      [
        "between",
        [ "lastPrice", .10, "" ]
      ],
      ""
    ],
    [
      [
        "between",
        [ "daysToExpiration", 15, "" ]
      ],
      ""
    ],
    [
      [
        "between",
        [ "volatility", 60, "" ]
      ],
      ""
    ],
    [
      [
        "between",
        [
          "tradeTime",
          formatDate(subtractDays(today, 3)),
          formatDate(today)
        ]
      ],
      ""
    ],
    [
      "limit",
      "200"
    ],
    [
      [
        "between",
        [ "volume", 1000, "" ]
      ],
      ""
    ],
    [
      [
        "between",
        [ "openInterest", 100, "" ]
      ],
      ""
    ],
    [
      [
        "in",
        [
          "exchange",
          [ "AMEX", "NASDAQ", "NYSE" ]
        ],
      ],
      ""
    ],
    [
      [
        "in",
        [
          "symbolType",
          [ "Call" ]
        ],
      ],
      ""
    ],
    [
      "meta",
      [ "field.shortName", "field.type", "field.description" ]
    ],
    [
      "raw",
      1
    ]
  ]
}

export async function fetchBarchartList() {
  const queryParams = createQueryParams(),
        mainUrl = "https://www.barchart.com/options/highest-implied-volatility/highest?sector=stock",
        url = `https://www.barchart.com/proxies/core-api/v1/options/get?${formatParams(queryParams)}`
        console.log(url)
        

  debug(`-- Fetching Credentials`)

  const pageResponse = await fetch(mainUrl, { headers, credentials: "include" }),
        // pageResult = await pageResponse.text(),
        cookies = (pageResponse.headers.raw()["set-cookie"] || []).map(v => {
          const cookie = decodeURIComponent(v || ""),
                [_, key, str ] = cookie.match(/^([^=]+)\=(.*)$/) || [],
                value = (str || "").split("; ")[0]
          return { key, value }
        }),
        token = cookies.find(({ key }) => /^XSRF-TOKEN/.test(key)) || {}

  debug(`-- Fetching Stocks`)

  const response = await fetch(url, {
                          headers: {
                            ...headers,
                            "X-XSRF-TOKEN": token.value,
                            Cookie: cookies.map(({ key, value }) => `${key}=${encodeURIComponent(value)}`).join(";")
                          },
                          credentials: "include"
                        }),
        { data } = await response.json() || {}

  debug(`-- Filtering Duplicates and Stale Records`)

  const tickerSet = new Set()
  // console.log(data)
  // var length_of = data.length
  // console.log(length_of)

  return (data || [])
          .filter(({ raw }) => {
            if(raw && (raw.baseLastPrice > raw.lastPrice)) {
              const hasTicker = tickerSet.has(raw.baseSymbol)
              tickerSet.add(raw.baseSymbol)
              return !hasTicker
            }
            return false
          })
          .map(({ raw }) => ({
            ticker: raw.baseSymbol,
            price: raw.baseLastPrice,
            volatility: raw.volatility
          }))
}

/*
  EXAMPLE RESPONSE ROW
  {
    symbol: "GME|20210319|800.00C",
    baseSymbol: "GME",
    baseLastPrice: "40.59",
    baseSymbolType: 1,
    symbolType: "Call",
    strikePrice: "800.00",
    expirationDate: "03/19/21",
    daysToExpiration: "28",
    bidPrice: "0.23",
    midpoint: "0.24",
    askPrice: "0.25",
    lastPrice: "0.24",
    volume: "1,126",
    openInterest: "14,357",
    volumeOpenInterestRatio: "0.08",
    volatility: "409.58%",
    tradeTime: "02/19/21",
    raw: {
      symbol: "GME|20210319|800.00C",
      baseSymbol: "GME",
      baseLastPrice: 40.59,
      baseSymbolType: 1,
      symbolType: "Call",
      strikePrice: 800,
      expirationDate: "2021-03-19",
      daysToExpiration: 28,
      bidPrice: 0.23,
      midpoint: 0.24,
      askPrice: 0.25,
      lastPrice: 0.24,
      volume: 1126,
      openInterest: 14357,
      volumeOpenInterestRatio: 0.08,
      volatility: 4.0958,
      tradeTime: 1613769302
    }
  }

META DATA

  Short Names
  - symbol: "Symbol",
  - baseSymbol: "Symbol",
  - baseLastPrice: "Price",
  - baseSymbolType: "Type",
  - symbolType: "Type",
  - strikePrice: "Strike",
  - expirationDate: "Exp Date",
  - daysToExpiration: "DTE",
  - bidPrice: "Bid",
  - midpoint: "Midpoint",
  - askPrice: "Ask",
  - lastPrice: "Last",
  - volume: "Volume",
  - openInterest: "Open Int",
  - volumeOpenInterestRatio: "Vol/OI",
  - volatility: "IV",
  - tradeTime: "Time",
  - symbolCode: "Symbol Code"

  Descriptions
  - symbol: "",
  - baseSymbol: "The underlying equity.",
  - baseLastPrice: "The last price of the underlying equity.",
  - baseSymbolType: "A Call option gives you the right to buy a stock and a Put option gives you the right to sell a stock.",
  - symbolType: "A Call option gives you the right to buy a stock and a Put option gives you the right to sell a stock.",
  - strikePrice: "The price at which the holder of an options can buy (in the case of a call option) or sell (in the case of a put option) the underlying security when the option is exercised.",
  - expirationDate: "The option expiration date.",
  - daysToExpiration: "The number of days until the option expires.",
  - bidPrice: "The bid price.",
  - midpoint: "The midpoint between the bid and ask price.",
  - askPrice: "The ask price.",
  - lastPrice: "The last trade price.",
  - volume: "The total number of shares or contracts traded for the day.",
  - openInterest: "The total number of open option contracts that have been traded but not yet liquidated via offsetting trades.",
  - volumeOpenInterestRatio: "For the strike price: today"s volume / open interest. A higher ratio indicates unusual activity for the option.",
  - volatility: "Implied Volatility is the estimated volatility of the underlying stock over the period of the option.",
  - tradeTime: "",
  - symbolCode: ""

  Data Types
  - symbol: "string",
  - baseSymbol: "string",
  - baseLastPrice: "price",
  - baseSymbolType: "string",
  - symbolType: "string",
  - strikePrice: "price",
  - expirationDate: "date",
  - daysToExpiration: "integer",
  - bidPrice: "price",
  - midpoint: "price",
  - askPrice: "price",
  - lastPrice: "price",
  - volume: "integer",
  - openInterest: "integer",
  - volumeOpenInterestRatio: "float",
  - volatility: "percent",
  - tradeTime: "time",
  - symbolCode: null
  }

*/
fetchBarchartList();
