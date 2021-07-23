async function up(client) {
  await client.query(`
    CREATE EXTENSION IF NOT EXISTS citext;
  `)
}

async function down(client) {
}

module.exports = { up, down }
