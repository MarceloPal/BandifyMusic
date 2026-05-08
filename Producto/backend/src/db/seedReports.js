const pool = require('./index');

async function seedReports() {
  try {
    // Obtener un usuario para que sea el emisor
    const userRes = await pool.query('SELECT id FROM usuarios LIMIT 1');
    if (userRes.rows.length === 0) {
      console.log('No hay usuarios para crear reportes de prueba.');
      return;
    }
    const emisorId = userRes.rows[0].id;

    // Obtener una tocata para reportar
    const tocataRes = await pool.query('SELECT id FROM tocatas LIMIT 1');
    const tocataId = tocataRes.rows.length > 0 ? tocataRes.rows[0].id : emisorId;

    const reportes = [
      [emisorId, 'tocata', tocataId, 'Contenido inapropiado en la descripción del evento.'],
      [emisorId, 'perfil', emisorId, 'Foto de perfil no cumple con las normas de la comunidad.'],
      [emisorId, 'demo', emisorId, 'Audio con derechos de autor de terceros.'],
      [null, 'mensaje', emisorId, 'Spam masivo detectado por el sistema.']
    ];

    for (const report of reportes) {
      await pool.query(
        'INSERT INTO reportes (emisor_id, tipo_contenido, contenido_id, motivo) VALUES ($1, $2, $3, $4)',
        report
      );
    }

    console.log('¡Reportes de prueba creados con éxito!');
  } catch (err) {
    console.error('Error al crear reportes:', err.message);
  } finally {
    await pool.end();
  }
}

seedReports();
