const pool = require('./index');

async function listUsers() {
  try {
    const res = await pool.query("SELECT email, role FROM usuarios");
    console.log('Usuarios en la base de datos:');
    console.table(res.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

listUsers();
