import { Connection } from "./connection.js"
import migrations from "./migrations/index.js"
import { ensureMigrationTable, formatQuery } from "./helpers/index.js"

async function migrationExists(id) {
  const hasValueSQL = formatQuery(`
    SELECT EXISTS (
      SELECT
      FROM migrations.migrations
      WHERE
        id = $1
    )
  `)

  const { rows: [ { exists: migrationExists } ]} = await Connection.query(hasValueSQL, [ id ])

  return migrationExists
}

await Connection.transaction(ensureMigrationTable)

for(const [ file, key, { up } ] of migrations.files) {
  if(await migrationExists(key)) continue;

  console.log(`MIGRATING: ${file}`)

  const start = +(new Date())

  await Connection.transaction(async (client) => {
    await up(client)
    await client.query("INSERT INTO migrations.migrations (id) VALUES ($1)", [ key ])
  })

  const end = +(new Date())

  console.log(`MIGRATED ${file} IN ${end - start}ms`)
}

console.log("MIGRATIONS COMPLETE")
