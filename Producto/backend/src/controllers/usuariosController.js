/**
 * Controlador de Usuarios — perfil del usuario autenticado.
 *
 * GET  /usuarios/perfil          → datos completos (usuarios + perfiles JOIN)
 * PUT  /usuarios/perfil          → upsert sobre usuarios y/o perfiles
 * PUT  /usuarios/cambiar-password → cambio con verificación de password actual
 *
 * Las queries tienen fallbacks para columnas que pueden no existir si no
 * corrió la migración (códigos 42703 = column does not exist).
 */

const bcrypt = require('bcryptjs');
const pool   = require('../db/index');

/**
 * GET /usuarios/perfil
 * Devuelve usuario + perfil con fallback si faltan columnas nuevas.
 * Parsea audio_vector (pgvector) y audio_metadata (JSONB).
 */
exports.obtenerPerfil = async (req, res, next) => {
  try {
    let resultado;

    try {
      resultado = await pool.query(
        `SELECT u.id, u.nombre, u.email, u.role, u.instrumento, u.ciudad,
                u.fecha_nacimiento, u.created_at,
                p.s3_key, p.audio_vector, p.audio_metadata,
                p.user_tags, p.oficio, p.experiencia, p.bio, p.foto_url, p.banner_url,
                p.instagram_url, p.spotify_url, p.discord_url,
                p.card_settings,
                p.updated_at AS perfil_updated_at
         FROM usuarios u
         LEFT JOIN perfiles p ON p.usuario_id = u.id
         WHERE u.id = $1`,
        [req.usuario.id]
      );
    } catch (colErr) {
      if (colErr.code === '42703') {
        // Alguna columna no existe aún — fallback sin columnas nuevas
        resultado = await pool.query(
          `SELECT u.id, u.nombre, u.email, u.role, u.instrumento, u.ciudad,
                  u.fecha_nacimiento, u.created_at,
                  p.s3_key, p.audio_vector, NULL::jsonb AS audio_metadata,
                  NULL::jsonb AS user_tags, NULL::jsonb AS oficio,
                  NULL::integer AS experiencia, NULL::text AS bio, NULL::text AS foto_url, NULL::text AS banner_url,
                  NULL::text AS instagram_url, NULL::text AS spotify_url, NULL::text AS discord_url,
                  NULL::jsonb AS card_settings,
                  p.updated_at AS perfil_updated_at
           FROM usuarios u
           LEFT JOIN perfiles p ON p.usuario_id = u.id
           WHERE u.id = $1`,
          [req.usuario.id]
        );
      } else {
        throw colErr;
      }
    }

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const row = resultado.rows[0];

    // pgvector → array JS
    if (row.audio_vector) {
      const str = String(row.audio_vector);
      row.audio_vector = str.replace(/[[\]]/g, '').split(',').map(Number);
    }

    // audio_metadata puede llegar como string JSON
    if (row.audio_metadata && typeof row.audio_metadata === 'string') {
      try { row.audio_metadata = JSON.parse(row.audio_metadata); } catch { row.audio_metadata = null; }
    }

    res.json(row);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /usuarios/publico/:username
 * Perfil público — sin autenticación. Excluye explícitamente email, password_hash,
 * fecha_nacimiento, role, es_premium y card_settings.
 */
exports.perfilPublico = async (req, res, next) => {
  try {
    const { username } = req.params;
    if (!username) return res.status(400).json({ error: 'username requerido' });

    let resultado;
    try {
      resultado = await pool.query(
        `SELECT u.id, u.nombre, u.ciudad, u.instrumento,
                p.bio, p.oficio, p.experiencia, p.user_tags,
                p.foto_url, p.banner_url,
                p.instagram_url, p.spotify_url, p.discord_url,
                p.audio_vector, p.audio_metadata, p.s3_key
         FROM usuarios u
         LEFT JOIN perfiles p ON p.usuario_id = u.id
         WHERE LOWER(u.nombre) = LOWER($1)`,
        [username.trim()]
      );
    } catch (colErr) {
      if (colErr.code === '42703') {
        resultado = await pool.query(
          `SELECT u.id, u.nombre, u.ciudad, u.instrumento,
                  NULL::text AS bio, NULL::jsonb AS oficio, NULL::integer AS experiencia,
                  NULL::jsonb AS user_tags, NULL::text AS foto_url, NULL::text AS banner_url,
                  NULL::text AS instagram_url, NULL::text AS spotify_url, NULL::text AS discord_url,
                  NULL AS audio_vector, NULL::jsonb AS audio_metadata, NULL::text AS s3_key
           FROM usuarios u
           WHERE LOWER(u.nombre) = LOWER($1)`,
          [username.trim()]
        );
      } else {
        throw colErr;
      }
    }

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const row = resultado.rows[0];

    if (row.audio_vector) {
      const str = String(row.audio_vector);
      row.audio_vector = str.replace(/[[\]]/g, '').split(',').map(Number);
    }
    if (row.audio_metadata && typeof row.audio_metadata === 'string') {
      try { row.audio_metadata = JSON.parse(row.audio_metadata); } catch { row.audio_metadata = null; }
    }

    res.json(row);
  } catch (error) {
    next(error);
  }
};

const PERFIL_KEYS = [
  'bio', 'oficio', 'experiencia', 'user_tags', 'foto_url',
  'banner_url', 'instagram_url', 'spotify_url', 'discord_url', 'card_settings',
];

function buildUsuarioCampos(body) {
  const campos  = [];
  const valores = [];
  let i = 1;
  if (body.nombre)           { campos.push(`nombre = $${i++}`);           valores.push(body.nombre); }
  if (body.instrumento)      { campos.push(`instrumento = $${i++}`);      valores.push(body.instrumento); }
  if (body.ciudad)           { campos.push(`ciudad = $${i++}`);           valores.push(body.ciudad); }
  if (body.fecha_nacimiento) { campos.push(`fecha_nacimiento = $${i++}`); valores.push(body.fecha_nacimiento); }
  return { campos, valores, i };
}

async function upsertPerfilData(usuarioId, body) {
  const { bio, oficio, experiencia, user_tags, foto_url, banner_url,
    instagram_url, spotify_url, discord_url, card_settings } = body;
  try {
    await pool.query(
      `INSERT INTO perfiles
         (usuario_id, bio, oficio, experiencia, user_tags, foto_url, banner_url,
          instagram_url, spotify_url, discord_url, card_settings)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (usuario_id) DO UPDATE SET
         bio           = COALESCE(EXCLUDED.bio,           perfiles.bio),
         oficio        = COALESCE(EXCLUDED.oficio,        perfiles.oficio),
         experiencia   = COALESCE(EXCLUDED.experiencia,   perfiles.experiencia),
         user_tags     = COALESCE(EXCLUDED.user_tags,     perfiles.user_tags),
         foto_url      = COALESCE(EXCLUDED.foto_url,      perfiles.foto_url),
         banner_url    = COALESCE(EXCLUDED.banner_url,    perfiles.banner_url),
         instagram_url = COALESCE(EXCLUDED.instagram_url, perfiles.instagram_url),
         spotify_url   = COALESCE(EXCLUDED.spotify_url,   perfiles.spotify_url),
         discord_url   = COALESCE(EXCLUDED.discord_url,   perfiles.discord_url),
         card_settings = COALESCE(EXCLUDED.card_settings, perfiles.card_settings),
         updated_at    = NOW()`,
      [
        usuarioId,
        bio           ?? null,
        oficio        ? JSON.stringify(oficio)        : null,
        experiencia   ? parseInt(experiencia)         : null,
        user_tags     ? JSON.stringify(user_tags)     : null,
        foto_url      ?? null,
        banner_url    ?? null,
        instagram_url ?? null,
        spotify_url   ?? null,
        discord_url   ?? null,
        card_settings ? JSON.stringify(card_settings) : null,
      ]
    );
  } catch (perfErr) {
    if (perfErr.code !== '42703') throw perfErr;
  }
}

/**
 * PUT /usuarios/perfil
 * Acepta campos de usuarios (nombre, instrumento, ciudad, fecha_nacimiento)
 * Y campos de identidad artística en perfiles (bio, oficio, experiencia, user_tags, redes, card_settings).
 */
exports.actualizarPerfil = async (req, res, next) => {
  try {
    // ── 1. Actualizar tabla usuarios ──────────────────────────────────────────
    const { campos, valores, i } = buildUsuarioCampos(req.body);
    const tienePerfil = PERFIL_KEYS.some(k => req.body[k] !== undefined);

    if (!campos.length && !tienePerfil) {
      return res.status(400).json({ error: 'Debes enviar al menos un campo para actualizar' });
    }

    let usuarioRow = null;
    if (campos.length > 0) {
      valores.push(req.usuario.id);
      const r = await pool.query(
        `UPDATE usuarios SET ${campos.join(', ')}
         WHERE id = $${i}
         RETURNING id, nombre, email, instrumento, ciudad, fecha_nacimiento, created_at`,
        valores
      );
      usuarioRow = r.rows[0];
    }

    // ── 2. Actualizar tabla perfiles (identidad + redes + card_settings) ──────
    if (tienePerfil) await upsertPerfilData(req.usuario.id, req.body);

    // Devolver el perfil completo
    if (usuarioRow) return res.json(usuarioRow);

    const { rows } = await pool.query(
      `SELECT u.id, u.nombre, u.email, u.instrumento, u.ciudad,
              u.fecha_nacimiento, u.created_at,
              p.s3_key, p.audio_vector, p.audio_metadata,
              p.user_tags, p.oficio, p.experiencia, p.bio, p.foto_url, p.banner_url,
              p.instagram_url, p.spotify_url, p.discord_url,
              p.card_settings,
              p.updated_at AS perfil_updated_at
       FROM usuarios u
       LEFT JOIN perfiles p ON p.usuario_id = u.id
       WHERE u.id = $1`,
      [req.usuario.id]
    );
    res.json(rows[0] || {});
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /usuarios/cambiar-password — verifica contraseña actual y actualiza.
 */
exports.cambiarPassword = async (req, res, next) => {
  try {
    const { passwordActual, passwordNueva } = req.body;

    if (!passwordActual || !passwordNueva) {
      return res.status(400).json({ error: 'passwordActual y passwordNueva son obligatorios' });
    }
    if (passwordNueva.length < 8) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
    }

    const result = await pool.query(
      'SELECT password_hash FROM usuarios WHERE id = $1',
      [req.usuario.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const valido = await bcrypt.compare(passwordActual, result.rows[0].password_hash);
    if (!valido) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    }

    const passwordHash = await bcrypt.hash(passwordNueva, 10);
    await pool.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [passwordHash, req.usuario.id]);

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /usuarios/cuenta — elimina la cuenta del usuario autenticado.
 * Ejecuta la misma lógica que adminController.eliminarUsuario pero usa req.usuario.id.
 */
exports.eliminarMiCuenta = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const id = req.usuario.id;

    // ── Tablas con FK que NO tienen ON DELETE CASCADE en bases viejas ──────
    // Las borramos manualmente. En migraciones nuevas ya tienen CASCADE,
    // pero este cleanup explícito funciona en cualquier estado del schema.

    // mensajes: tiene 2 FKs (de_id y para_id), ambos pueden bloquear
    await client.query('DELETE FROM mensajes   WHERE de_id   = $1 OR para_id = $1', [id]);

    // jobs / audio_jobs: ya tienen CASCADE vía migración, pero defensivo
    await client.query('DELETE FROM jobs       WHERE usuario_id = $1', [id]);
    await client.query('DELETE FROM audio_jobs WHERE usuario_id = $1', [id]);
    await client.query('DELETE FROM perfiles   WHERE usuario_id = $1', [id]);

    // tocatas que el usuario organizó (defensivo — depende del schema base)
    // Esto cascadeará tickets vía sus propias FKs si están bien definidas.
    await client.query('DELETE FROM tocatas    WHERE organizador_id = $1', [id]);

    // El resto debería tener ON DELETE CASCADE o SET NULL en sus FKs
    // (demos, tickets.buyer_id, notificaciones, password_resets, reportes, noticias)
    await client.query('DELETE FROM usuarios WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.json({ message: 'Cuenta eliminada con éxito' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};
