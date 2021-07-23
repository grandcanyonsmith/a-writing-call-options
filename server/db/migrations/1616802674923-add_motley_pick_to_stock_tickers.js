async function up(client) {
  await client.query(`
    ALTER TABLE stock_tickers
    ADD COLUMN motley_pick BOOLEAN NOT NULL DEFAULT 'f'
  `)

  await client.query(`
    CREATE INDEX
      stock_tickers_motley_pick_idx
    ON
      stock_tickers ( motley_pick )
  `)
}

async function down(client) {
  await client.query(`
    DROP INDEX IF EXISTS stock_tickers_motley_pick_idx
  `)

  await client.query(`
    ALTER TABLE stock_tickers
    DROP COLUMN IF EXISTS motley_pick
  `)
}

module.exports = { up, down }
