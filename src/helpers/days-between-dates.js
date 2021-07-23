export function daysBetweenDates(dateOne, dateTwo) {
  dateOne = new Date(dateOne)
  dateTwo = new Date(dateTwo)
  dateOne.setHours(0, 0, 0, 0)
  dateTwo.setHours(0, 0, 0, 0)

  return parseInt(
    (dateOne.getTime() - dateTwo.getTime())
    / (1000 * 60 * 60 * 24)
  )
}
