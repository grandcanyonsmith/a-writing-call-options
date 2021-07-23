import { formatQuery } from "./format-query.js"

export async function ensureMigrationTable(client) {
  const migrationTableCheck = formatQuery(`
    SELECT EXISTS (
      SELECT
      FROM information_schema.tables
      WHERE
        table_schema = 'migrations'
        AND
        table_name = 'migrations'
    )
  `)

  const { rows: [ { exists: tableExists } ]} = await client.query(migrationTableCheck)

  if(!tableExists) {
    await client.query("CREATE SCHEMA IF NOT EXISTS migrations")
    await client.query(formatQuery(`
      CREATE TABLE migrations.migrations (
        id BIGINT PRIMARY KEY
      )
    `))
  }
}
