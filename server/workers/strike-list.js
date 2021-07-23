import { calculateStrikes } from "../jobs/strikes.js"
import { debugWorker as debug, error } from "../common/debug.js"
import { track } from "../common/measure-performance.js"

try {
  const { dateOffset, started, ended, elapsedTime } = await track(
    calculateStrikes,
    (startTime) => debug(`Started Calculating Strikes @ ${new Date(startTime).toLocaleString("en-US")}`)
  )

  debug(`Started Calculating Strikes @ ${new Date(started + dateOffset).toLocaleString("en-US")}`)

  debug(`Finished Calculating Strikes @ ${new Date(ended + dateOffset).toLocaleString("en-US")}`)

  debug(`Elapsed Time: ${elapsedTime}`)
} catch(err) {
  error(err)
}
