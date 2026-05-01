const express    = require('express');
const pool       = require('../db/index');
const authMiddleware = require('../middleware/auth');
const mailer     = require('../utils/mailer');

const router = express.Router();

// GET /mensajes — bandeja de entrada (legacy, mantener para compatibilidad)
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const resultado = await pool.query(
      `SELECT m.id, m.contenido, m.leido, m.created_at,
              u.id AS de_id, u.nombre AS de_nombre, u.ciudad AS de_ciudad
       FROM mensajes m
       JOIN usuarios u ON u.id = m.de_id
       WHERE m.para_id = $1
       ORDER BY m.created_at DESC`,
      [req.usuario.id]
    );
    res.json(resultado.rows);
  } catch (error) {
    next(error);
  }
});

// GET /mensajes/conversaciones
// Lista unificada de todas las conversaciones activas.
// Incluye:
//   partner_id      — ID del otro usuario
//   partner_nombre  — nombre del otro usuario
//   last_at         — fecha del último mensaje
//   last_mensaje    — contenido del último mensaje
//   yo_respondi     — true si el usuario actual envió AL MENOS un mensaje en esta conv.
//   sin_leer        — cantidad de mensajes recibidos no leídos
router.get('/conversaciones', authMiddleware, async (req, res, next) => {
  try {
    const miId = req.usuario.id;

    const resultado = await pool.query(
      `WITH conv AS (
         SELECT
           CASE WHEN de_id = $1 THEN para_id ELSE de_id END AS partner_id,
           contenido,
           created_at,
           de_id = $1                    AS es_mio,
           para_id = $1 AND NOT leido   AS es_no_leido
         FROM mensajes
         WHERE de_id = $1 OR para_id = $1
       )
       SELECT
         c.partner_id,
         u.nombre                                                            AS partner_nombre,
         MAX(c.created_at)                                                   AS last_at,
         BOOL_OR(c.es_mio)                                                   AS yo_respondi,
         COUNT(*) FILTER (WHERE c.es_no_leido)::integer                      AS sin_leer,
         (ARRAY_AGG(c.contenido ORDER BY c.created_at DESC))[1]              AS last_mensaje
       FROM conv c
       JOIN usuarios u ON u.id = c.partner_id
       GROUP BY c.partner_id, u.nombre
       ORDER BY last_at DESC`,
      [miId]
    );

    res.json(resultado.rows);
  } catch (error) {
    next(error);
  }
});

// POST /mensajes
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { para_id, contenido } = req.body;

    if (!contenido) return res.status(400).json({ error: 'contenido es obligatorio' });
    if (!para_id)   return res.status(400).json({ error: 'para_id es obligatorio' });
    if (para_id === req.usuario.id)
      return res.status(400).json({ error: 'No puedes enviarte un mensaje a ti mismo' });

    const destinatario = await pool.query('SELECT id FROM usuarios WHERE id = $1', [para_id]);
    if (destinatario.rows.length === 0)
      return res.status(400).json({ error: 'El destinatario no existe' });

    const resultado = await pool.query(
      `INSERT INTO mensajes (de_id, para_id, contenido)
       VALUES ($1, $2, $3)
       RETURNING id, de_id, para_id, contenido, leido, created_at`,
      [req.usuario.id, para_id, contenido]
    );

    // Email al destinatario — fire-and-forget, no bloquea la respuesta
    pool.query('SELECT nombre, email FROM usuarios WHERE id = $1', [para_id])
      .then(({ rows }) => {
        if (!rows[0]) return;
        return mailer.sendNewMessageEmail({
          to:        rows[0].email,
          nombre:    rows[0].nombre,
          de_nombre: req.usuario.nombre,
          preview:   contenido,
        });
      })
      .catch(() => {});

    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /mensajes/:id/leer
router.put('/:id/leer', authMiddleware, async (req, res, next) => {
  try {
    const busqueda = await pool.query(
      'SELECT id, para_id FROM mensajes WHERE id = $1',
      [req.params.id]
    );

    if (busqueda.rows.length === 0)
      return res.status(404).json({ error: 'Mensaje no encontrado' });

    if (busqueda.rows[0].para_id !== req.usuario.id)
      return res.status(403).json({ error: 'No tienes permiso para marcar este mensaje como leído' });

    const resultado = await pool.query(
      `UPDATE mensajes SET leido = true WHERE id = $1
       RETURNING id, de_id, para_id, contenido, leido, created_at`,
      [req.params.id]
    );

    res.json(resultado.rows[0]);
  } catch (error) {
    next(error);
  }
});

// GET /mensajes/conversacion/:usuarioId — hilo completo con un usuario
router.get('/conversacion/:usuarioId', authMiddleware, async (req, res, next) => {
  try {
    const { usuarioId } = req.params;
    const miId = req.usuario.id;

    const resultado = await pool.query(
      `SELECT m.id, m.contenido, m.leido, m.created_at,
              m.de_id, m.para_id,
              u.nombre AS de_nombre
       FROM mensajes m
       JOIN usuarios u ON u.id = m.de_id
       WHERE (m.de_id = $1 AND m.para_id = $2)
          OR (m.de_id = $2 AND m.para_id = $1)
       ORDER BY m.created_at ASC`,
      [miId, usuarioId]
    );

    res.json(resultado.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
