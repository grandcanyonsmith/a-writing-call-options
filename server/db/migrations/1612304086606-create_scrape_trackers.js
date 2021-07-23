async function up(client) {
  await client.query(`
    CREATE TABLE scrape_trackers (
      id            BIGINT GENERATED ALWAYS AS IDENTITY,
      schedule      BIGINT NOT NULL,
      completed     BOOLEAN NOT NULL DEFAULT 'f',
      started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at  TIMESTAMPTZ,
      PRIMARY KEY ( id )
    )
  `)

  await client.query(`
    CREATE UNIQUE INDEX
      scrape_trackers_schedule_idx
    ON
      scrape_trackers ( schedule )
  `)

  await client.query(`
    CREATE INDEX
      scrape_trackers_started_at_idx
    ON
      scrape_trackers ( started_at )
  `)

  await client.query(`
    CREATE INDEX
      scrape_trackers_completed_at_idx
    ON
      scrape_trackers ( completed_at )
  `)
}

async function down(client) {
  await client.query(`
    DROP TABLE IF EXISTS scrape_trackers CASCADE;
  `)
}

module.exports = { up, down }
