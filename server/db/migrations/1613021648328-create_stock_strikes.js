async function up(client) {
  await client.query(`
    CREATE TABLE stock_strikes (
      id                 BIGINT GENERATED ALWAYS AS IDENTITY,
      volatility_id      BIGINT NOT NULL,
      premium_return     DECIMAL(20,16) NOT NULL DEFAULT 0.0,
      apr                DECIMAL(20,16) NOT NULL DEFAULT 0.0,
      edg                DECIMAL(12,2) NOT NULL DEFAULT 0.0,
      sep                DECIMAL(12,2) NOT NULL DEFAULT 0.0,
      percent_out        DECIMAL(20,16) NOT NULL DEFAULT 0.0,
      odds               DECIMAL(20,16) NOT NULL DEFAULT 0.0,
      PRIMARY KEY ( id ),
      CONSTRAINT stock_volatility_fk
        FOREIGN KEY ( volatility_id )
          REFERENCES stock_volatilities ( id )
            ON DELETE CASCADE
    )
  `)

  await client.query(`
    CREATE UNIQUE INDEX
      stock_strikes_volatility_fk_idx
    ON
      stock_strikes ( volatility_id )
  `)

  await client.query(`
    CREATE INDEX
      stock_strikes_odds_idx
    ON
      stock_strikes ( odds )
  `)

  await client.query(`
    CREATE INDEX
      stock_strikes_premium_return_idx
    ON
      stock_strikes ( premium_return )
  `)

  await client.query(`
    CREATE INDEX
      stock_strikes_percent_out_idx
    ON
      stock_strikes ( percent_out )
  `)
}

async function down(client) {
  await client.query(`
    DROP TABLE IF EXISTS stock_strikes CASCADE;
  `)
}

module.exports = { up, down }
