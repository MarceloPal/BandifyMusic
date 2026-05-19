/**
 * Controlador de Mensajes — mensajería 1-a-1 entre usuarios.
 * Email de aviso al destinatario es fire-and-forget para no bloquear la respuesta.
 */

const pool   = require('../db/index');
const mailer = require('../utils/mailer');

/**
 * GET /mensajes — bandeja de entrada legacy (mantener para compatibilidad).
 */
exports.bandejaEntrada = async (req, res, next) => {
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
};

/**
 * GET /mensajes/conversaciones — lista unificada de conversaciones activas.
 */
exports.listarConversaciones = async (req, res, next) => {
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
         p.foto_url                                                         AS partner_foto_url,
         MAX(c.created_at)                                                   AS last_at,
         BOOL_OR(c.es_mio)                                                   AS yo_respondi,
         COUNT(*) FILTER (WHERE c.es_no_leido)::integer                      AS sin_leer,
         (ARRAY_AGG(c.contenido ORDER BY c.created_at DESC))[1]              AS last_mensaje
       FROM conv c
       JOIN usuarios u ON u.id = c.partner_id
       LEFT JOIN perfiles p ON p.usuario_id = u.id
       GROUP BY c.partner_id, u.nombre, p.foto_url
       ORDER BY last_at DESC`,
      [miId]
    );

    res.json(resultado.rows);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /mensajes — envía un mensaje. Dispara email al destinatario async.
 */
exports.enviar = async (req, res, next) => {
  try {
    const { para_id, contenido } = req.body;

    if (!contenido) return res.status(400).json({ error: 'contenido es obligatorio' });
    if (!para_id)   return res.status(400).json({ error: 'para_id es obligatorio' });
    if (para_id === req.usuario.id)
      return res.status(400).json({ error: 'No puedes enviarte un mensaje a ti mismo' });

    let esPremium = req.usuario.es_premium;
    if (typeof esPremium !== 'boolean') {
      const premiumRow = await pool.query(
        'SELECT COALESCE(es_premium, false) AS es_premium FROM usuarios WHERE id = $1',
        [req.usuario.id]
      );
      esPremium = premiumRow.rows[0]?.es_premium ?? false;
    }

    // ── INICIO: VALIDACIÓN PREMIUM (CONEXIONES ÚNICAS) ──
    if (!esPremium) {
      const destinatarioId = para_id || req.body.receptor_id;

      const conteoResult = await pool.query(
        `SELECT COUNT(DISTINCT para_id) AS conexiones_nuevas
         FROM mensajes
         WHERE de_id = $1
           AND para_id != $2
           AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
           AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)`,
        [req.usuario.id, destinatarioId]
      );

      const conexionesNuevas = parseInt(conteoResult.rows[0]?.conexiones_nuevas, 10) || 0;

      if (conexionesNuevas >= 10) {
        return res.status(403).json({
          error: 'Has alcanzado el límite de tu cuenta gratuita: solo puedes iniciar conversaciones con 10 músicos diferentes al mes. Pásate a Premium para hacer networking sin límites.',
        });
      }
    }
    // ── FIN: VALIDACIÓN PREMIUM ──

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
};

/**
 * PUT /mensajes/:id/leer — marca mensaje como leído (solo el destinatario).
 */
exports.marcarLeido = async (req, res, next) => {
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
};

/**
 * GET /mensajes/conversacion/:usuarioId — hilo completo con un usuario.
 */
exports.obtenerConversacion = async (req, res, next) => {
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
};
