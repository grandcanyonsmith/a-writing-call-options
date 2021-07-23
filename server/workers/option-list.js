import { calculateOptions } from "../jobs/options.js"
import { debugWorker as debug, error } from "../common/debug.js"
import { track } from "../common/measure-performance.js"

try {
  const { dateOffset, started, ended, elapsedTime } = await track(
    calculateOptions,
    (startTime) => debug(`Started Gathering Options @ ${new Date(startTime).toLocaleString("en-US")}`)
  )

  debug(`Started Gathering Options @ ${new Date(started + dateOffset).toLocaleString("en-US")}`)

  debug(`Finished Gathering Options @ ${new Date(ended + dateOffset).toLocaleString("en-US")}`)

  debug(`Elapsed Time: ${elapsedTime}`)
} catch(err) {
  error(err)
}
