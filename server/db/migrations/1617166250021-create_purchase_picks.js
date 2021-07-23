async function up(client) {
  await client.query(`
    CREATE TABLE purchase_picks (
      id                 BIGINT GENERATED ALWAYS AS IDENTITY,
      strike_id          BIGINT NOT NULL,
      picked_at          TIMESTAMPTZ NOT NULL,
      created_at         TIMESTAMP(6) WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
      PRIMARY KEY ( id ),
      CONSTRAINT stock_strike_fk
        FOREIGN KEY ( strike_id )
          REFERENCES stock_strikes ( id )
            ON DELETE CASCADE
    )
  `)

  await client.query(`
    CREATE UNIQUE INDEX
      purchase_picks_strike_fk_idx
    ON
      purchase_picks ( strike_id )
  `)

  await client.query(`
    CREATE INDEX
      purchase_picks_date_idx
    ON
      purchase_picks ( picked_at )
  `)

  await client.query(`
    CREATE INDEX
      purchase_picks_created_idx
    ON
      purchase_picks ( created_at )
  `)
}

async function down(client) {
  await client.query(`
    DROP TABLE IF EXISTS purchase_picks CASCADE;
  `)
}

module.exports = { up, down }
