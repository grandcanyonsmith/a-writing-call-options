import pg from "pg"

const { Pool } = pg

class ConnectionClass {
  get pool() {
    if(this._pool) return this._pool

    this._pool = new Pool({ connectionString: process.env.DATABASE_URL })
    // this._pool = new Pool({ connectionString: "postgresql://localhost/postgres" })
    return this._pool
  }

  async query(...args) {
    return await this.pool.query(...args)
  }

  async close() {
    await this.pool.end()
  }

  async transaction(callback) {
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')
      await callback(client)
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      await client.release()
    }
  }
}

export const Connection = new ConnectionClass()
