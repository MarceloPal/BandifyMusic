const bcrypt = require('bcryptjs');
const pool = require('./index');

async function createAdmin() {
  const nombre = 'Admin Bandify';
  const email = 'admin@bandify.cl';
  const password = 'adminPassword2026';
  const role = 'admin';

  try {
    // Verificar si ya existe
    const existente = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existente.rows.length > 0) {
      console.log(`El usuario ${email} ya existe. Actualizando a rol admin...`);
      await pool.query("UPDATE usuarios SET role = 'admin' WHERE email = $1", [email]);
      console.log('¡Rol actualizado a admin!');
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const resultado = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, role`,
      [nombre, email, passwordHash, role]
    );

    const admin = resultado.rows[0];
    console.log('-----------------------------------------');
    console.log('¡USUARIO ADMINISTRADOR CREADO CON ÉXITO!');
    console.log(`Nombre:   ${admin.nombre}`);
    console.log(`Email:    ${admin.email}`);
    console.log(`Password: ${password}`);
    console.log(`Rol:      ${admin.role}`);
    console.log('-----------------------------------------');
    console.log('Usa estas credenciales para entrar al panel /admin');
  } catch (error) {
    console.error('Error al crear el administrador:', error.message);
  } finally {
    await pool.end();
  }
}

createAdmin();
