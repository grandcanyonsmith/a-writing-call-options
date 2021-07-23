async function up(client) {
  await client.query(`
    ALTER TABLE stock_tickers
    ADD COLUMN barchart_pick BOOLEAN NOT NULL DEFAULT 'f'
  `)

  await client.query(`
    CREATE INDEX
      stock_tickers_barchart_pick_idx
    ON
      stock_tickers ( barchart_pick )
  `)
}

async function down(client) {
  await client.query(`
    DROP INDEX IF EXISTS stock_tickers_barchart_pick_idx
  `)

  await client.query(`
    ALTER TABLE stock_tickers
    DROP COLUMN IF EXISTS barchart_pick
  `)
}

module.exports = { up, down }
