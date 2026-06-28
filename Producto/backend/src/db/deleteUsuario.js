const pool = require('./index');

async function deleteUsuarioById(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM mensajes       WHERE de_id = $1 OR para_id = $1', [id]);
    await client.query('DELETE FROM notificaciones WHERE usuario_id = $1', [id]);
    await client.query('DELETE FROM password_resets WHERE usuario_id = $1', [id]);
    await client.query('DELETE FROM tickets        WHERE buyer_id = $1', [id]);
    await client.query('DELETE FROM demos          WHERE usuario_id = $1', [id]);
    await client.query('DELETE FROM audio_jobs     WHERE usuario_id = $1', [id]);
    await client.query('DELETE FROM jobs           WHERE usuario_id = $1', [id]);
    await client.query('DELETE FROM tocatas        WHERE organizador_id = $1', [id]);
    await client.query('DELETE FROM perfiles       WHERE usuario_id = $1', [id]);
    await client.query('DELETE FROM usuarios       WHERE id = $1', [id]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { deleteUsuarioById };
