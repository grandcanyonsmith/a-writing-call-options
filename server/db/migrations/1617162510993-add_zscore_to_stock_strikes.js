async function up(client) {
  await client.query(`
    ALTER TABLE stock_strikes
    ADD COLUMN zscore DECIMAL(10,8) NOT NULL DEFAULT 0.0
  `)

  await client.query(`
    CREATE INDEX
      stock_strikes_zscore_idx
    ON
      stock_strikes ( zscore )
  `)
}

async function down(client) {
  await client.query(`
    DROP INDEX IF EXISTS stock_strikes_zscore_idx
  `)

  await client.query(`
    ALTER TABLE stock_strikes
    DROP COLUMN IF EXISTS zscore
  `)
}

module.exports = { up, down }
