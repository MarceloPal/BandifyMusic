/**
 * Controlador de Notificaciones — agregadas en tiempo real desde tablas existentes.
 *
 * Tipos:
 *   • mensaje  — mensajes no leídos recibidos por el usuario
 *   • tocata   — tocatas próximas en la ciudad del usuario
 *   • adn      — demos del usuario analizados en los últimos 7 días
 *   • sistema  — notificaciones físicas de la tabla notificaciones
 *
 * Cada llamada calcula sobre el estado actual de la DB (sin tabla intermedia).
 */

const pool = require('../db/index');

/**
 * GET /notificaciones — feed unificado del usuario.
 */
exports.listar = async (req, res, next) => {
  try {
    const miId = req.usuario.id;

    // ── 1. Mensajes no leídos ────────────────────────────────────────────────
    const mensajes = await pool.query(
      `SELECT m.id, m.contenido, m.created_at,
              u.id AS de_id, u.nombre AS de_nombre
       FROM mensajes m
       JOIN usuarios u ON u.id = m.de_id
       WHERE m.para_id = $1 AND m.leido = false
       ORDER BY m.created_at DESC
       LIMIT 10`,
      [miId]
    );

    // ── 2. Tocatas próximas en la ciudad del usuario (30 días) ───────────────
    const tocatas = await pool.query(
      `SELECT t.id, t.nombre, t.fecha, t.ciudad, t.created_at
       FROM tocatas t
       JOIN usuarios u ON u.id = $1
       WHERE LOWER(t.ciudad) = LOWER(u.ciudad)
         AND t.fecha >= CURRENT_DATE
         AND t.fecha <= CURRENT_DATE + INTERVAL '30 days'
         AND t.organizador_id <> $1
       ORDER BY t.fecha ASC
       LIMIT 5`,
      [miId]
    );

    // ── 3. Demos del usuario analizados en últimos 7 días ────────────────────
    const demos = await pool.query(
      `SELECT id, nombre, created_at
       FROM demos
       WHERE usuario_id = $1
         AND audio_vector IS NOT NULL
         AND created_at >= NOW() - INTERVAL '7 days'
       ORDER BY created_at DESC
       LIMIT 5`,
      [miId]
    );

    // ── 4. Notificaciones físicas de la DB (anuncios, sistema) ───────────────
    // imagen_url permite mostrar foto adjunta en anuncios masivos del admin
    let fisicas;
    try {
      fisicas = await pool.query(
        `SELECT id, titulo, descripcion, tipo, leida, link, imagen_url, created_at
         FROM notificaciones
         WHERE usuario_id = $1
         ORDER BY created_at DESC
         LIMIT 15`,
        [miId]
      );
    } catch (colErr) {
      // Fallback si imagen_url no existe aún (migración no corrió)
      if (colErr.code !== '42703') throw colErr;
      fisicas = await pool.query(
        `SELECT id, titulo, descripcion, tipo, leida, link, NULL::text AS imagen_url, created_at
         FROM notificaciones
         WHERE usuario_id = $1
         ORDER BY created_at DESC
         LIMIT 15`,
        [miId]
      );
    }

    // ── Agregar y formatear ──────────────────────────────────────────────────
    const items = [];

    for (const f of fisicas.rows) {
      items.push({
        id:          `db-${f.id}`,
        tipo:        f.tipo,
        titulo:      f.titulo,
        descripcion: f.descripcion,
        tiempo:      f.created_at,
        leida:       f.leida,
        link:        f.link || null,
        imagen_url:  f.imagen_url || null,
      });
    }

    for (const m of mensajes.rows) {
      const preview = m.contenido.length > 80 ? m.contenido.slice(0, 80) + '…' : m.contenido;
      items.push({
        id:          `msg-${m.id}`,
        tipo:        'mensaje',
        titulo:      `Mensaje de ${m.de_nombre}`,
        descripcion: preview,
        tiempo:      m.created_at,
        leida:       false,
        link:        `/messages?with=${m.de_id}&nombre=${encodeURIComponent(m.de_nombre)}`,
      });
    }

    for (const t of tocatas.rows) {
      const fechaFmt = new Date(t.fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
      items.push({
        id:          `toc-${t.id}`,
        tipo:        'tocata',
        titulo:      'Tocata cerca de ti',
        descripcion: `${t.nombre} — ${fechaFmt} en ${t.ciudad}`,
        tiempo:      t.created_at,
        leida:       true,
        link:        '/tocatas',
      });
    }

    for (const d of demos.rows) {
      items.push({
        id:          `adn-${d.id}`,
        tipo:        'adn',
        titulo:      'ADN Musical actualizado',
        descripcion: `Tu demo "${d.nombre}" fue analizado correctamente.`,
        tiempo:      d.created_at,
        leida:       true,
        link:        '/mi-adn',
      });
    }

    items.sort((a, b) => new Date(b.tiempo) - new Date(a.tiempo));

    res.json(items);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /notificaciones/leer — marca todos los mensajes recibidos como leídos.
 */
exports.marcarLeidas = async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE mensajes SET leido = true WHERE para_id = $1 AND leido = false`,
      [req.usuario.id]
    );
    await pool.query(
      `UPDATE notificaciones SET leida = true WHERE usuario_id = $1 AND leida = false`,
      [req.usuario.id]
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};
