import { calculateDeviations } from "../jobs/deviations.js"
import { debugWorker as debug, error } from "../common/debug.js"
import { track } from "../common/measure-performance.js"

try {
  const { dateOffset, started, ended, elapsedTime } = await track(
    calculateDeviations,
    (startTime) => debug(`Started Calculating Deviations @ ${new Date(startTime).toLocaleString("en-US")}`)
    
  )

  debug(`Started Calculating Deviations @ ${new Date(started + dateOffset).toLocaleString("en-US")}`)

  debug(`Finished Calculating Deviations @ ${new Date(ended + dateOffset).toLocaleString("en-US")}`)

  debug(`Elapsed Time: ${elapsedTime}`)
} catch(err) {
  error(err)
}
