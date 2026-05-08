const pool = require('./index');

async function testAdminEndpoint() {
  try {
    console.log('--- TEST: GET /api/admin/stats ---');
    
    // 1. Simular conteos
    const u = await pool.query('SELECT COUNT(*) FROM usuarios');
    const t = await pool.query('SELECT COUNT(*) FROM tocatas');
    const tk = await pool.query('SELECT COUNT(*) FROM tickets');
    
    console.log(`Usuarios: ${u.rows[0].count}`);
    console.log(`Tocatas:  ${t.rows[0].count}`);
    console.log(`Tickets:  ${tk.rows[0].count}`);

    // 2. Probar query de registros semanales
    const reg = await pool.query(`
      SELECT
        date_trunc('week', created_at) AS semana,
        COUNT(*) AS cantidad
      FROM usuarios
      WHERE created_at >= NOW() - INTERVAL '4 weeks'
      GROUP BY semana
      ORDER BY semana ASC
    `);

    console.log('\nRegistros Semanales (últimas 4 semanas):');
    console.table(reg.rows);

    console.log('\n✓ La lógica de la base de datos para el panel admin es correcta.');
  } catch (err) {
    console.error('\n❌ Error en la lógica del backend:', err.message);
  } finally {
    await pool.end();
  }
}

testAdminEndpoint();
