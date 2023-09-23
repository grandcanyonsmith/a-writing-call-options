import { Connection } from "../db/connection.js"

export async function getLatestScrape() {
  try {
    const { rows: [ scrapeData ] } = await Connection.query(`
      SELECT
        *
      FROM scrape_trackers
      WHERE completed = true
      ORDER BY
        schedule DESC,
        id DESC
      LIMIT 1
    `)
    
    if (!scrapeData) {
      throw new Error('No data found');
    }

    const { id, schedule, completed, started_at, completed_at } = scrapeData;

    return {
      id,
      completed,
      schedule,
      startedAt: new Date(started_at),
      completedAt: completed_at ? new Date(completed_at) : null
    }
  } catch(err) {
    console.error(err)
    return null;
  }
}