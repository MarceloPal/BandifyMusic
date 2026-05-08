const express = require('express');
const pool = require('../db/index');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = authMiddleware;

const router = express.Router();

// GET /api/admin/stats
// Muestra: total de usuarios, total de tocatas, total de tickets vendidos, y registros por semana
router.get('/stats', authMiddleware, requireAdmin, async (req, res, next) => {
  try {
    // 1. Totales simples
    const totalUsuariosQuery = pool.query('SELECT COUNT(*) FROM usuarios');
    const totalTocatasQuery  = pool.query('SELECT COUNT(*) FROM tocatas');
    const totalTicketsQuery  = pool.query('SELECT COUNT(*) FROM tickets');

    // 2. Registros por semana (últimas 4 semanas)
    const registrosSemanalesQuery = pool.query(`
      SELECT
        date_trunc('week', created_at) AS semana,
        COUNT(*) AS cantidad
      FROM usuarios
      WHERE created_at >= NOW() - INTERVAL '4 weeks'
      GROUP BY semana
      ORDER BY semana ASC
    `);

    // 3. Reportes recientes
    const reportesQuery = pool.query(`
      SELECT r.*, u.nombre as emisor_nombre
      FROM reportes r
      LEFT JOIN usuarios u ON u.id = r.emisor_id
      ORDER BY r.created_at DESC
      LIMIT 10
    `);

    const [usuariosRes, tocatasRes, ticketsRes, registrosRes, reportesRes] = await Promise.all([
      totalUsuariosQuery,
      totalTocatasQuery,
      totalTicketsQuery,
      registrosSemanalesQuery,
      reportesQuery
    ]);

    res.json({
      totales: {
        usuarios: parseInt(usuariosRes.rows[0].count),
        tocatas: parseInt(tocatasRes.rows[0].count),
        tickets: parseInt(ticketsRes.rows[0].count)
      },
      registrosSemanales: registrosRes.rows.map(r => ({
        semana: r.semana,
        cantidad: parseInt(r.cantidad)
      })),
      reportes: reportesRes.rows
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/usuarios
// Lista todos los usuarios con información básica
router.get('/usuarios', authMiddleware, requireAdmin, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT id, nombre, email, role, es_premium, created_at, ciudad, instrumento
      FROM usuarios
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/tocatas
// Lista todas las tocatas
router.get('/tocatas', authMiddleware, requireAdmin, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT t.*, u.nombre as organizador_nombre
      FROM tocatas t
      LEFT JOIN usuarios u ON u.id = t.organizador_id
      ORDER BY t.fecha DESC
    `);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/usuarios/:id
router.delete('/usuarios/:id', authMiddleware, requireAdmin, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
    res.json({ message: 'Usuario eliminado con éxito' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/tocatas/:id
router.delete('/tocatas/:id', authMiddleware, requireAdmin, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM tocatas WHERE id = $1', [req.params.id]);
    res.json({ message: 'Tocata eliminada con éxito' });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/reportes/:id
// Actualiza el estado de un reporte (ej: 'resuelto', 'ignorado')
router.patch('/reportes/:id', authMiddleware, requireAdmin, async (req, res, next) => {
  try {
    const { estado } = req.body;
    if (!estado) return res.status(400).json({ error: 'Estado es requerido' });

    const result = await pool.query(
      'UPDATE reportes SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
