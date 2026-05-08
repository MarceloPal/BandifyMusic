const pool = require('./index');

async function promoteToAdmin(email) {
  try {
    const res = await pool.query(
      "UPDATE usuarios SET role = 'admin' WHERE email = $1 RETURNING id, nombre, role",
      [email]
    );

    if (res.rowCount === 0) {
      console.log(`No se encontró ningún usuario con el email: ${email}`);
    } else {
      console.log(`¡Éxito! El usuario ${res.rows[0].nombre} (${email}) ahora es ${res.rows[0].role}.`);
    }
  } catch (err) {
    console.error('Error al actualizar el rol:', err.message);
  } finally {
    await pool.end();
  }
}

promoteToAdmin('ignacio@bandify.cl');
