import { performance } from "perf_hooks"

const oneSecond = 1000,
      oneMinute = 60 * oneSecond,
      oneHour = 60 * oneMinute,
      oneDay = 24 * oneHour

function getElapsedTime(delta) {
  let days = Math.floor(delta / oneDay)
  delta %= oneDay

  let hours = Math.floor(delta / oneHour)
  delta %= oneHour

  let minutes = Math.floor(delta / oneMinute)
  delta %= oneMinute

  let seconds = Math.floor(delta / oneSecond)
  delta %= oneSecond

  let milliseconds = delta.toFixed(3)

  return `${padZero(days)}:${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}.${milliseconds}`
}

function padZero(number) {
  return number.toString().padStart(2, '0')
}

async function track(cb, startMessage) {
  const started = performance.now()

  if(startMessage) startMessage(new Date(started))

  const result = await cb()
  const ended = performance.now()
  const elapsed = ended - started
  const elapsedTime = getElapsedTime(elapsed)

  return {
    started,
    ended,
    elapsed,
    elapsedTime,
    result
  }
}

export { performance, getElapsedTime, track }