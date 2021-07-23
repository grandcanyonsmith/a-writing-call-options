import { calculateOptions } from "./jobs/options.js"
import { getStockList } from "./jobs/stocks.js"
import { calculateStrikes } from "./jobs/strikes.js"
import { calculateDeviations } from "./jobs/deviations.js"
import { debugWorker as debug, error } from "./common/debug.js"
import { performance, track, getElapsedTime } from "./common/measure-performance.js"

try {
  const started = performance.now(),
        dateOffset = new Date() - started

  const {
    dateOffset: stockDateOffset,
    started: startedStocks,
    ended: endedStocks,
    elapsedTime: elapsedStocks,
    result: date
  } = await track(getStockList)

  const {
    dateOffset: optionDateOffset,
    started: startedOptions,
    ended: endedOptions,
    elapsedTime: elapsedOptions
  } = await track(async () => await calculateOptions(date))

  const {
    dateOffset: strikeDateOffset,
    started: startedStrikes,
    ended: endedStrikes,
    elapsedTime: elapsedStrikes
  } = await track(async () => await calculateStrikes(date))

  const {
    dateOffset: deviationDateOffset,
    started: startedDeviations,
    ended: endedDeviations,
    elapsedTime: elapsedDeviations
  } = await track(async () => await calculateDeviations(date))

  const ended = performance.now(),
        elapsedTime = getElapsedTime(Math.abs(ended - started))

  debug(`Started Fetching Stocks @ ${new Date(startedStocks + stockDateOffset).toLocaleString("en-US")}`)
  debug(`Finished Fetching Stocks @ ${new Date(endedStocks + stockDateOffset).toLocaleString("en-US")}`)
  debug(`Elapsed Stock Time: ${elapsedStocks}`)

  debug(`Started Fetching Options @ ${new Date(startedOptions + optionDateOffset).toLocaleString("en-US")}`)
  debug(`Finished Fetching Options @ ${new Date(endedOptions + optionDateOffset).toLocaleString("en-US")}`)
  debug(`Elapsed Option Time: ${elapsedOptions}`)

  debug(`Started Calculating Strikes @ ${new Date(startedStrikes + strikeDateOffset).toLocaleString("en-US")}`)
  debug(`Finished Calculating Strikes @ ${new Date(endedStrikes + strikeDateOffset).toLocaleString("en-US")}`)
  debug(`Elapsed Strike Time: ${elapsedStrikes}`)

  debug(`Started Calculating Deviations @ ${new Date(startedDeviations + deviationDateOffset).toLocaleString("en-US")}`)
  debug(`Finished Calculating Deviations @ ${new Date(endedDeviations + deviationDateOffset).toLocaleString("en-US")}`)
  debug(`Elapsed Strike Time: ${elapsedDeviations}`)

  debug(`Started All Work @ ${new Date(started + dateOffset).toLocaleString("en-US")}`)
  debug(`Finished All Work @ ${new Date(ended + dateOffset).toLocaleString("en-US")}`)
  debug(`Total Elapsed Time: ${elapsedTime}`)
} catch(err) {
  error(err)
}
