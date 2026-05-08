const pool = require('./index');

async function createTicketsTable() {
  try {
    const sql = `CREATE TABLE IF NOT EXISTS tickets (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id     UUID        NOT NULL,
      buyer_id     UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      price_clp    INTEGER     NOT NULL CHECK (price_clp >= 0),
      purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await pool.query(sql);
    console.log('Tabla tickets creada o ya existía.');
  } catch (err) {
    console.error('Error creando tabla tickets:', err.message);
  } finally {
    await pool.end();
  }
}

createTicketsTable();
