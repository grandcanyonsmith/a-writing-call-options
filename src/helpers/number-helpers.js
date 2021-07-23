export function commatize(fixedNum) {
  const [ main, decimal ] = fixedNum.split(".")
  return `${main.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${decimal}`
}

export function isNegative(value) {
  return forceNumber(value) < 0
}

export function positiveOrNegative(value) {
  return isNegative(value) ? "negative" : "positive"
}

export function forceNumber(value) {
  return parseFloat(value) || 0
}

export function formatMoney(value) {
  return `${isNegative(value) ? "-" : ""}$${commatize(Math.abs(forceNumber(value)).toFixed(2))}`
}

export function formatPercentage(value) {
  return `${isNegative(value) ? "-" : ""}${Math.abs(forceNumber(value) * 100).toFixed(2)}%`
}

export function invalidNumber(value) {
  return isNaN(value) || !isFinite(value)
}

export function percentDiff(value, target) {
  value = parseFloat(value) || 0
  target = parseFloat(target) || 0
  const percentOfTarget = value / target

  if(invalidNumber(percentOfTarget)) return 0

  return (percentOfTarget - 1)
}
