export function getScheduledDates(date) {
  const now = new Date()
  const hours = typeof process.env.USE_DATE_HOURS === "undefined"
                  ? (date || now).getHours()
                  : (parseInt(process.env.USE_DATE_HOURS) || 0)

  date = date || new Date(now.getFullYear(), now.getMonth(), now.getDate())

  date = new Date(date)

  if(hours === 24) date.setHours(23, 0, 0, 0)
  else if(hours > 11) date.setHours(hours < 16 ? 12 : 18, 0, 0, 0)
  else date.setHours(hours < 6 ? 0 : 6, 0, 0, 0)

  const thirty = new Date(date)
  thirty.setDate(thirty.getDate() - 30)
  thirty.setHours(0, 0, 0, 0)
  
  return {
    schedule: +date,
    date,
    now,
    thirty
  }
}
