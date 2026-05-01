/**
 * Rutas de gestión de Demos (repertorio de tracks).
 *
 * GET    /demos        — lista los demos activos del usuario autenticado
 * PUT    /demos/:id    — actualiza nombre y/o cover_url de un demo
 * DELETE /demos/:id    — desactiva un demo (soft delete)
 */

const express        = require('express');
const pool           = require('../db/index');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /demos
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, s3_key, nombre, cover_url, audio_vector, audio_metadata, created_at
       FROM demos
       WHERE usuario_id = $1 AND activo = true
       ORDER BY created_at DESC`,
      [req.usuario.id]
    );

    // Parsear audio_vector (pgvector → JS array) y audio_metadata (JSONB o string)
    rows.forEach((r) => {
      if (r.audio_vector) {
        const str = String(r.audio_vector);
        r.audio_vector = str.replace(/[[\]]/g, '').split(',').map(Number);
      }
      if (r.audio_metadata && typeof r.audio_metadata === 'string') {
        try { r.audio_metadata = JSON.parse(r.audio_metadata); } catch { r.audio_metadata = null; }
      }
    });

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// PUT /demos/:id — actualizar nombre y/o cover_url
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { nombre, cover_url } = req.body;

    // Verificar propiedad
    const check = await pool.query(
      'SELECT id FROM demos WHERE id = $1 AND usuario_id = $2 AND activo = true',
      [req.params.id, req.usuario.id]
    );
    if (check.rows.length === 0) return res.status(404).json({ error: 'Demo no encontrado' });

    const campos = [];
    const vals   = [];
    let idx = 1;
    if (nombre    !== undefined) { campos.push(`nombre = $${idx++}`);    vals.push(nombre); }
    if (cover_url !== undefined) { campos.push(`cover_url = $${idx++}`); vals.push(cover_url); }

    if (!campos.length) return res.status(400).json({ error: 'Nada que actualizar' });

    vals.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE demos SET ${campos.join(', ')} WHERE id = $${idx} RETURNING id, nombre, cover_url, created_at`,
      vals
    );
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /demos/:id — soft delete
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const check = await pool.query(
      'SELECT id FROM demos WHERE id = $1 AND usuario_id = $2',
      [req.params.id, req.usuario.id]
    );
    if (check.rows.length === 0) return res.status(404).json({ error: 'Demo no encontrado' });

    await pool.query('UPDATE demos SET activo = false WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
