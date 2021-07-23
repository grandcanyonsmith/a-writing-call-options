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

let i = parseInt(process.env.ROLLBACK_COUNT) || 1

const files = migrations.files.reverse()

while(i > 0) {
  let found = false

  for(const [ file, key, { down } ] of files) {
    if(!await migrationExists(key)) continue;

    found = true

    console.log(`REVERTING: ${file}`)

    const start = +(new Date())

    await Connection.transaction(async (client) => {
      await down(client)
      await client.query("DELETE FROM migrations.migrations WHERE id = $1", [ key ])
    })

    const end = +(new Date())

    console.log(`REVERTED ${file} IN ${end - start}ms`)

    break
  }

  if(!found) break

  i--
}
