export function getScheduledDates(date = new Date()) {
  const hours = process.env.USE_DATE_HOURS 
                  ? parseInt(process.env.USE_DATE_HOURS) 
                  : date.getHours();

  date.setHours(hours >= 24 ? 23 : hours >= 16 ? 18 : hours >= 6 ? 12 : 0, 0, 0, 0);

  const thirtyDaysAgo = new Date(date.getTime());
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  return {
    schedule: +date,
    date,
    now: new Date(),
    thirtyDaysAgo
  };
}
getScheduledDates();