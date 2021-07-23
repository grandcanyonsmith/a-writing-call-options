async function up(client) {
  await client.query(`
    CREATE TABLE stock_volatilities (
      id                 BIGINT GENERATED ALWAYS AS IDENTITY,
      ticker_id          BIGINT NOT NULL,
      option_type        TEXT NOT NULL DEFAULT 'call',
      strike             DECIMAL(12,2) NOT NULL DEFAULT 0.0,
      volume             BIGINT NOT NULL DEFAULT 0,
      ask                DECIMAL(12,2) NOT NULL DEFAULT 0.0,
      bid                DECIMAL(12,2) NOT NULL DEFAULT 0.0,
      change             DECIMAL(20,16) NOT NULL DEFAULT 0.0,
      last_price         DECIMAL(12,2) NOT NULL DEFAULT 0.0,
      size               CITEXT NOT NULL DEFAULT 'REGULAR',
      symbol             CITEXT,
      currency           CITEXT NOT NULL DEFAULT 'USD',
      implied_volatility DECIMAL(20,16) NOT NULL DEFAULT 0.0,
      in_the_money       BOOLEAN NOT NULL DEFAULT 'f',
      open_interest      BIGINT NOT NULL DEFAULT 0,
      percent_change     DECIMAL(20,16) NOT NULL DEFAULT 0.0,
      expiration_date    TIMESTAMPTZ NOT NULL,
      last_trade_date    TIMESTAMPTZ NOT NULL,
      PRIMARY KEY ( id ),
      CONSTRAINT stock_ticker_fk
        FOREIGN KEY ( ticker_id )
          REFERENCES stock_tickers ( id )
            ON DELETE CASCADE
    )
  `)

  await client.query(`
    CREATE INDEX
      stock_volatilities_ticker_fk_idx
    ON
      stock_volatilities ( ticker_id )
  `)

  await client.query(`
    CREATE INDEX
      stock_volatilities_in_the_money_idx
    ON
      stock_volatilities ( in_the_money )
  `)

  await client.query(`
    CREATE INDEX
      stock_volatilities_bid_idx
    ON
      stock_volatilities ( bid )
  `)

  await client.query(`
    CREATE INDEX
      stock_volatilities_strike_idx
    ON
      stock_volatilities ( strike )
  `)

  await client.query(`
    CREATE INDEX
      stock_volatilities_expiration_date_idx
    ON
      stock_volatilities ( expiration_date )
  `)
}

async function down(client) {
  await client.query(`
    DROP TABLE IF EXISTS stock_volatilities CASCADE;
  `)
}

module.exports = { up, down }
