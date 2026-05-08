const bcrypt = require('bcryptjs');
const pool = require('./index');

async function createIgnacioAdmin() {
  const nombre = 'Ignacio Farias';
  const email = 'ignacio@bandify.cl';
  const password = 'bandify2026'; // Usando el password del seed
  const role = 'admin';

  try {
    const existent = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existent.rows.length > 0) {
      await pool.query("UPDATE usuarios SET role = 'admin' WHERE email = $1", [email]);
      console.log(`Usuario ${email} actualizado a admin.`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, role)
       VALUES ($1, $2, $3, $4)`,
      [nombre, email, passwordHash, role]
    );

    console.log('-----------------------------------------');
    console.log('¡IGNACIO CREADO COMO ADMINISTRADOR!');
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log('-----------------------------------------');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

createIgnacioAdmin();
