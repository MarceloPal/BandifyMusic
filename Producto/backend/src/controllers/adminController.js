/**
 * Controlador del Panel de Administración.
 * Todas las operaciones requieren rol 'admin' (verificado en el router).
 */

const pool = require('../db/index');

/**
 * GET /api/admin/stats — totales + registros semanales + reportes recientes.
 */
exports.stats = async (req, res, next) => {
  try {
    const totalUsuariosQuery = pool.query('SELECT COUNT(*) FROM usuarios');
    const totalTocatasQuery  = pool.query('SELECT COUNT(*) FROM tocatas');
    const totalTicketsQuery  = pool.query('SELECT COUNT(*) FROM tickets');

    const registrosSemanalesQuery = pool.query(`
      SELECT
        date_trunc('week', created_at) AS semana,
        COUNT(*) AS cantidad
      FROM usuarios
      WHERE created_at >= NOW() - INTERVAL '4 weeks'
      GROUP BY semana
      ORDER BY semana ASC
    `);

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
      reportesQuery,
    ]);

    res.json({
      totales: {
        usuarios: parseInt(usuariosRes.rows[0].count),
        tocatas:  parseInt(tocatasRes.rows[0].count),
        tickets:  parseInt(ticketsRes.rows[0].count),
      },
      registrosSemanales: registrosRes.rows.map(r => ({
        semana:   r.semana,
        cantidad: parseInt(r.cantidad),
      })),
      reportes: reportesRes.rows,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/usuarios
 * Lista todos los usuarios con:
 *  - foto_url (de tabla perfiles vía LEFT JOIN)
 *  - demo_count: cantidad de demos activos (de tabla demos vía subquery LEFT JOIN)
 *
 * Usa una subquery agrupada para el conteo de demos (en vez de un LEFT JOIN directo
 * que multiplicaría las filas de usuarios). Tiene fallback si las tablas no existen.
 */
exports.listarUsuarios = async (req, res, next) => {
  try {
    let result;
    try {
      result = await pool.query(`
        SELECT
          u.id, u.nombre, u.email, u.role, u.es_premium, u.es_verificado,
          u.created_at, u.ciudad, u.instrumento,
          p.foto_url,
          COALESCE(d.demo_count, 0)::int AS demo_count
        FROM usuarios u
        LEFT JOIN perfiles p ON p.usuario_id = u.id
        LEFT JOIN (
          SELECT usuario_id, COUNT(*) AS demo_count
          FROM demos
          WHERE activo = true
          GROUP BY usuario_id
        ) d ON d.usuario_id = u.id
        ORDER BY u.created_at DESC
      `);
    } catch (joinErr) {
      // Fallback si tabla demos o columna activo no existe aún (42P01/42703)
      if (joinErr.code !== '42P01' && joinErr.code !== '42703') throw joinErr;
      result = await pool.query(`
        SELECT
          u.id, u.nombre, u.email, u.role, u.es_premium, u.es_verificado,
          u.created_at, u.ciudad, u.instrumento,
          p.foto_url,
          0 AS demo_count
        FROM usuarios u
        LEFT JOIN perfiles p ON p.usuario_id = u.id
        ORDER BY u.created_at DESC
      `);
    }
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/usuarios/:id — admin edita campos clave del usuario.
 */
exports.actualizarUsuario = async (req, res, next) => {
  try {
    const { nombre, email, role, es_premium, es_verificado } = req.body;

    const result = await pool.query(
      `UPDATE usuarios
       SET nombre = $1, email = $2, role = $3, es_premium = $4, es_verificado = $5
       WHERE id = $6 RETURNING *`,
      [nombre, email, role, es_premium, es_verificado, req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/tocatas — lista todas las tocatas con organizador.
 */
exports.listarTocatas = async (req, res, next) => {
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
};

/**
 * DELETE /api/admin/usuarios/:id
 * Transacción: limpia tablas dependientes que no tienen ON DELETE CASCADE.
 */
exports.eliminarUsuario = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const id = req.params.id;

    // ── Tablas con FK que NO tienen ON DELETE CASCADE en bases viejas ──────
    // Las borramos manualmente. En migraciones nuevas ya tienen CASCADE,
    // pero este cleanup explícito funciona en cualquier estado del schema.

    // Limpieza explícita de todas las tablas con FK hacia usuarios
    await client.query('DELETE FROM mensajes          WHERE de_id   = $1 OR para_id = $1', [id]);
    await client.query('DELETE FROM notificaciones    WHERE usuario_id = $1', [id]);
    await client.query('DELETE FROM password_resets   WHERE usuario_id = $1', [id]);
    await client.query('DELETE FROM tickets           WHERE buyer_id   = $1', [id]);
    await client.query('DELETE FROM demos             WHERE usuario_id = $1', [id]);
    await client.query('DELETE FROM audio_jobs        WHERE usuario_id = $1', [id]);
    await client.query('DELETE FROM jobs              WHERE usuario_id = $1', [id]);
    await client.query('DELETE FROM tocatas           WHERE organizador_id = $1', [id]);
    await client.query('DELETE FROM perfiles          WHERE usuario_id = $1', [id]);
    await client.query('DELETE FROM usuarios          WHERE id = $1',         [id]);

    await client.query('COMMIT');
    res.json({ message: 'Usuario eliminado con éxito' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * DELETE /api/admin/tocatas/:id — eliminar tocata.
 */
exports.eliminarTocata = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM tocatas WHERE id = $1', [req.params.id]);
    res.json({ message: 'Tocata eliminada con éxito' });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/reportes/:id — actualizar estado del reporte.
 */
exports.actualizarReporte = async (req, res, next) => {
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
};

/**
 * POST /api/admin/notificaciones-masivas
 * Envía notificación a todos los usuarios o a una lista específica.
 */
exports.notificacionesMasivas = async (req, res, next) => {
  try {
    const { titulo, descripcion, link, usuario_ids, imagen_url } = req.body;
    if (!titulo || !descripcion) {
      return res.status(400).json({ error: 'Título y descripción son obligatorios' });
    }

    if (usuario_ids && Array.isArray(usuario_ids) && usuario_ids.length > 0) {
      // Enviar solo a los seleccionados
      await pool.query(`
        INSERT INTO notificaciones (usuario_id, titulo, descripcion, tipo, link, imagen_url)
        SELECT id, $1, $2, 'sistema', $3, $4
        FROM usuarios
        WHERE id = ANY($5::uuid[])
      `, [titulo, descripcion, link || null, imagen_url || null, usuario_ids]);
    } else {
      // Enviar a TODOS
      await pool.query(`
        INSERT INTO notificaciones (usuario_id, titulo, descripcion, tipo, link, imagen_url)
        SELECT id, $1, $2, 'sistema', $3, $4 FROM usuarios
      `, [titulo, descripcion, link || null, imagen_url || null]);
    }

    res.json({ message: 'Notificación enviada correctamente' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/notificaciones
 * Historial de anuncios del sistema, agrupados por contenido para no mostrar
 * duplicados (cada broadcast inserta N filas, una por destinatario).
 *
 * Cada anuncio incluye:
 *  - id: id representativo (MIN(id)) para usar en el DELETE
 *  - destinatarios: cuántos usuarios recibieron este anuncio
 */
exports.listarAnuncios = async (req, res, next) => {
  try {
    let result;
    try {
      result = await pool.query(`
        SELECT
          MIN(id)                          AS id,
          titulo,
          descripcion,
          link,
          imagen_url,
          MIN(created_at)                  AS created_at,
          COUNT(*)::int                    AS destinatarios
        FROM notificaciones
        WHERE tipo = 'sistema'
        GROUP BY titulo, descripcion, link, imagen_url
        ORDER BY MIN(created_at) DESC
        LIMIT 100
      `);
    } catch (colErr) {
      // Fallback si imagen_url no existe aún
      if (colErr.code !== '42703') throw colErr;
      result = await pool.query(`
        SELECT
          MIN(id)                          AS id,
          titulo,
          descripcion,
          link,
          NULL::text                       AS imagen_url,
          MIN(created_at)                  AS created_at,
          COUNT(*)::int                    AS destinatarios
        FROM notificaciones
        WHERE tipo = 'sistema'
        GROUP BY titulo, descripcion, link
        ORDER BY MIN(created_at) DESC
        LIMIT 100
      `);
    }
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/notificaciones/:id
 * Borra TODAS las filas de un anuncio del historial — no solo la fila con ese
 * id, sino todas las que comparten (titulo, descripcion, link, imagen_url),
 * porque un anuncio masivo crea N filas idénticas (una por destinatario).
 */
exports.eliminarAnuncio = async (req, res, next) => {
  try {
    // Encontrar las claves del anuncio representativo
    let target;
    try {
      target = await pool.query(
        `SELECT titulo, descripcion, link, imagen_url
         FROM notificaciones
         WHERE id = $1 AND tipo = 'sistema'`,
        [req.params.id]
      );
    } catch (colErr) {
      if (colErr.code !== '42703') throw colErr;
      target = await pool.query(
        `SELECT titulo, descripcion, link, NULL::text AS imagen_url
         FROM notificaciones
         WHERE id = $1 AND tipo = 'sistema'`,
        [req.params.id]
      );
    }

    if (target.rows.length === 0) {
      return res.status(404).json({ error: 'Anuncio no encontrado' });
    }

    const { titulo, descripcion, link, imagen_url } = target.rows[0];

    // Borrar todas las filas con esas mismas claves (COALESCE para nulls)
    let delResult;
    try {
      delResult = await pool.query(
        `DELETE FROM notificaciones
         WHERE tipo = 'sistema'
           AND titulo = $1
           AND descripcion = $2
           AND COALESCE(link, '') = COALESCE($3, '')
           AND COALESCE(imagen_url, '') = COALESCE($4, '')`,
        [titulo, descripcion, link, imagen_url]
      );
    } catch (colErr) {
      if (colErr.code !== '42703') throw colErr;
      delResult = await pool.query(
        `DELETE FROM notificaciones
         WHERE tipo = 'sistema'
           AND titulo = $1
           AND descripcion = $2
           AND COALESCE(link, '') = COALESCE($3, '')`,
        [titulo, descripcion, link]
      );
    }

    res.json({
      message: 'Anuncio eliminado',
      filas_borradas: delResult.rowCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/ventas — historial de tickets con resumen de ingresos.
 */
exports.ventas = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        ti.id,
        ti.price_clp as monto,
        ti.purchased_at as fecha,
        u.nombre as comprador_nombre,
        u.email as comprador_email,
        t.nombre as evento_nombre,
        t.genero as categoria
      FROM tickets ti
      JOIN usuarios u ON u.id = ti.buyer_id
      JOIN tocatas t ON t.id = ti.event_id
      ORDER BY ti.purchased_at DESC
    `);

    const ingresosTotales = result.rows.reduce((sum, row) => sum + (parseInt(row.monto) || 0), 0);

    res.json({
      tickets: result.rows,
      resumen: {
        total_ventas:     result.rowCount,
        ingresos_totales: ingresosTotales,
      },
    });
  } catch (error) {
    next(error);
  }
};
