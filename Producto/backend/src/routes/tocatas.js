const express = require('express');
const pool = require('../db/index');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /tocatas
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { ciudad, genero, fecha } = req.query;

    const condiciones = [];
    const valores     = [];
    let i = 1;

    if (ciudad) { condiciones.push(`t.ciudad = $${i++}`); valores.push(ciudad); }
    if (genero) { condiciones.push(`t.genero = $${i++}`); valores.push(genero); }
    if (fecha)  { condiciones.push(`t.fecha = $${i++}`);  valores.push(fecha); }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const resultado = await pool.query(
      `SELECT t.id, t.nombre, t.descripcion, t.fecha, t.ciudad, t.direccion,
              t.genero, t.lat, t.lng, t.created_at,
              t.afiche_url, t.contacto_email,
              u.id AS organizador_id, u.nombre AS organizador_nombre,
              u.email AS organizador_email
       FROM tocatas t
       JOIN usuarios u ON u.id = t.organizador_id
       ${where}
       ORDER BY t.fecha ASC`,
      valores
    );

    res.json(resultado.rows);
  } catch (error) {
    // Si afiche_url o contacto_email no existen aún, fallback sin ellas
    if (error.code === '42703') {
      try {
        const resultado = await pool.query(
          `SELECT t.id, t.nombre, t.descripcion, t.fecha, t.ciudad, t.direccion,
                  t.genero, t.lat, t.lng, t.created_at,
                  NULL AS afiche_url, NULL AS contacto_email,
                  u.id AS organizador_id, u.nombre AS organizador_nombre,
                  u.email AS organizador_email
           FROM tocatas t JOIN usuarios u ON u.id = t.organizador_id
           ORDER BY t.fecha ASC`
        );
        return res.json(resultado.rows);
      } catch (e2) { return next(e2); }
    }
    next(error);
  }
});

// POST /tocatas
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { nombre, descripcion, fecha, ciudad, direccion, genero, lat, lng, afiche_url, contacto_email } = req.body;

    if (!nombre || !fecha || !ciudad) {
      return res.status(400).json({ error: 'nombre, fecha y ciudad son obligatorios' });
    }

    let resultado;
    try {
      resultado = await pool.query(
        `INSERT INTO tocatas (organizador_id, nombre, descripcion, fecha, ciudad, direccion, genero, lat, lng, afiche_url, contacto_email)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [req.usuario.id, nombre, descripcion || null, fecha, ciudad, direccion || null,
         genero || null, lat || null, lng || null, afiche_url || null, contacto_email || null]
      );
    } catch (colErr) {
      if (colErr.code === '42703') {
        resultado = await pool.query(
          `INSERT INTO tocatas (organizador_id, nombre, descripcion, fecha, ciudad, direccion, genero, lat, lng)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [req.usuario.id, nombre, descripcion || null, fecha, ciudad, direccion || null, genero || null, lat || null, lng || null]
        );
      } else throw colErr;
    }

    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    next(error);
  }
});

// GET /tocatas/publicas — listado público de eventos futuros (sin auth, sin emails)
router.get('/publicas', async (req, res, next) => {
  try {
    const limite = Math.min(parseInt(req.query.limite, 10) || 6, 30);
    let resultado;
    try {
      resultado = await pool.query(
        `SELECT t.id, t.nombre, t.fecha, t.ciudad, t.direccion,
                t.genero, t.afiche_url,
                u.nombre AS organizador_nombre
         FROM tocatas t
         JOIN usuarios u ON u.id = t.organizador_id
         WHERE t.fecha >= CURRENT_DATE
         ORDER BY t.fecha ASC
         LIMIT $1`,
        [limite]
      );
    } catch (err) {
      // Fallback si afiche_url no existe aún
      if (err.code === '42703') {
        resultado = await pool.query(
          `SELECT t.id, t.nombre, t.fecha, t.ciudad, t.direccion,
                  t.genero, NULL AS afiche_url,
                  u.nombre AS organizador_nombre
           FROM tocatas t
           JOIN usuarios u ON u.id = t.organizador_id
           WHERE t.fecha >= CURRENT_DATE
           ORDER BY t.fecha ASC
           LIMIT $1`,
          [limite]
        );
      } else throw err;
    }
    res.json(resultado.rows);
  } catch (error) { next(error); }
});

// GET /tocatas/:id
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const resultado = await pool.query(
      `SELECT t.id, t.nombre, t.descripcion, t.fecha, t.ciudad, t.direccion,
              t.genero, t.lat, t.lng, t.created_at,
              t.afiche_url, t.contacto_email,
              u.id AS organizador_id, u.nombre AS organizador_nombre,
              u.email AS organizador_email, u.instrumento AS organizador_instrumento
       FROM tocatas t
       JOIN usuarios u ON u.id = t.organizador_id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (resultado.rows.length === 0) return res.status(404).json({ error: 'Tocata no encontrada' });
    res.json(resultado.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /tocatas/:id
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const resultado = await pool.query('SELECT id, organizador_id FROM tocatas WHERE id = $1', [req.params.id]);

    if (resultado.rows.length === 0) return res.status(404).json({ error: 'Tocata no encontrada' });
    if (resultado.rows[0].organizador_id !== req.usuario.id)
      return res.status(403).json({ error: 'Solo el organizador puede eliminar esta tocata' });

    await pool.query('DELETE FROM tocatas WHERE id = $1', [req.params.id]);
    res.json({ message: 'Tocata eliminada correctamente' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
