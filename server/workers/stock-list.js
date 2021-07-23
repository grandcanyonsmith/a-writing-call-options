import { getStockList } from "../jobs/stocks.js"
import { debugWorker as debug, error } from "../common/debug.js"
import { track } from "../common/measure-performance.js"

try {
  const { dateOffset, started, ended, elapsedTime } = await track(
    getStockList,
    (startTime) => debug(`Started Gathering Stocks @ ${new Date(startTime).toLocaleString("en-US")}`)
  )

  debug(`Started Gathering Stocks @ ${new Date(started + dateOffset).toLocaleString("en-US")}`)

  debug(`Finished Gathering Stocks @ ${new Date(ended + dateOffset).toLocaleString("en-US")}`)

  debug(`Elapsed Time: ${elapsedTime}`)
} catch(err) {
  error(err)
}
