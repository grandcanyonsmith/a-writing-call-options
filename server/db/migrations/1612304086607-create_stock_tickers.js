async function up(client) {
  await client.query(`
    CREATE TABLE stock_tickers (
      id                BIGINT GENERATED ALWAYS AS IDENTITY,
      scrape_id         BIGINT NOT NULL,
      ticker            CITEXT NOT NULL,
      company           TEXT NOT NULL,
      price             DECIMAL(8,2) NOT NULL DEFAULT 0.00,
      price_at_close    DECIMAL(8,2) NOT NULL DEFAULT 0.00,
      volatility        DECIMAL(6,5) NOT NULL DEFAULT 0.0,
      one_year_analysts SMALLINT NOT NULL DEFAULT 0,
      one_year_low      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      one_year_high     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      one_year_average  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      day_low           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      day_high          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      data              JSONB NOT NULL DEFAULT '{}',
      PRIMARY KEY ( id ),
      CONSTRAINT scrape_tracker_fk
        FOREIGN KEY ( scrape_id )
          REFERENCES scrape_trackers ( id )
            ON DELETE CASCADE
    )
  `)

  await client.query(`
    CREATE UNIQUE INDEX
      stock_tickers_idx
    ON
      stock_tickers ( scrape_id, ticker )
  `)

  await client.query(`
    CREATE INDEX
      stock_tickers_tracker_fk_idx
    ON
      stock_tickers ( scrape_id )
  `)

  await client.query(`
    CREATE INDEX
      stock_tickers_ticker_idx
    ON
      stock_tickers ( ticker )
  `)
}

async function down(client) {
  await client.query(`
    DROP TABLE IF EXISTS stock_tickers CASCADE;
  `)
}

module.exports = { up, down }
