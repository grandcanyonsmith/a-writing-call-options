import { Connection } from "../db/connection.js"

export async function getLatestScrape() {
  try {
    
    const { rows: [ { id, schedule, completed, started_at, completed_at } ] } = await Connection.query(`
      SELECT
        *
      FROM scrape_trackers
      WHERE completed = 't'
      ORDER BY
        schedule DESC,
        id DESC
      LIMIT 1
      OFFSET 0
    `)
    
    return {
      id,
      completed,
      schedule,
      startedAt: new Date(started_at),
      completedAt: completed_at ? new Date(completed_at) : null
    }
  } catch(err) {
    console.error(err)
    return {}
  }
}
