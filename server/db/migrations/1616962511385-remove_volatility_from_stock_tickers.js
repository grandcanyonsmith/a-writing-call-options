async function up(client) {
  await client.query(`
    ALTER TABLE stock_tickers
    DROP COLUMN volatility
  `)
}

async function down(client) {
}

module.exports = { up, down }
