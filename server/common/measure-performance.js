import performanceHooks from "perf_hooks"

const { performance } = performanceHooks,
      oneSecond = 1000,
      oneMinute = 60 * oneSecond,
      oneHour = 60 * oneMinute,
      oneDay = 24 * oneHour

export { performance }

export function getElapsedTime(delta) {
  // get total full seconds
  const days = Math.floor(delta / oneDay)

  delta -= days * oneDay

  const hours = Math.floor(delta / oneHour)

  delta -= hours * oneHour;

  const minutes = Math.floor(delta / oneMinute)

  delta -= minutes * oneMinute

  const seconds = Math.floor(delta / oneSecond)

  delta -= seconds * oneSecond

  const milliseconds = String(delta).replace(/\./, "μ")

  return `0${days}:0${hours}:0${minutes}:0${seconds}.${milliseconds}`.replace(/0([1-9][0-9]+[:.])/g, "$1").replace(/^00\:/, "")
}

export async function track(cb, startMessage) {
  const started = performance.now(),
        dateOffset = new Date() - Math.floor(started)

  if(startMessage) startMessage(started + dateOffset)

  const result = await cb(),
        ended = performance.now(),
        elapsed = Math.abs(started - ended),
        elapsedTime = getElapsedTime(elapsed)

  return {
    dateOffset,
    started,
    ended,
    elapsed,
    elapsedTime,
    result
  }
}
