const express = require('express');
const bcrypt  = require('bcryptjs');
const pool = require('../db/index');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /usuarios/perfil
router.get('/perfil', authMiddleware, async (req, res, next) => {
  try {
    let resultado;

    // Intentar con todas las columnas (pueden no existir si no corrió migración)
    try {
      resultado = await pool.query(
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
    } catch (colErr) {
      if (colErr.code === '42703') {
        // Alguna columna no existe aún — fallback sin columnas nuevas
        resultado = await pool.query(
          `SELECT u.id, u.nombre, u.email, u.instrumento, u.ciudad,
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

    // pgvector devuelve el vector como string "[0.1,0.2,...]" — parsear a array JS
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
});

// PUT /usuarios/perfil
// Acepta campos de usuarios (nombre, instrumento, ciudad, fecha_nacimiento)
// Y campos de identidad artística en perfiles (bio, oficio, experiencia, user_tags)
router.put('/perfil', authMiddleware, async (req, res, next) => {
  try {
    const {
      nombre, instrumento, ciudad, fecha_nacimiento,
      bio, oficio, experiencia, user_tags, foto_url, banner_url,
      instagram_url, spotify_url, discord_url,
      card_settings,
    } = req.body;

    // ── 1. Actualizar tabla usuarios ──────────────────────────────────────────
    const uCampos  = [];
    const uValores = [];
    let i = 1;

    if (nombre)           { uCampos.push(`nombre = $${i++}`);           uValores.push(nombre); }
    if (instrumento)      { uCampos.push(`instrumento = $${i++}`);      uValores.push(instrumento); }
    if (ciudad)           { uCampos.push(`ciudad = $${i++}`);           uValores.push(ciudad); }
    if (fecha_nacimiento) { uCampos.push(`fecha_nacimiento = $${i++}`); uValores.push(fecha_nacimiento); }

    let usuarioRow = null;
    if (uCampos.length > 0) {
      uValores.push(req.usuario.id);
      const r = await pool.query(
        `UPDATE usuarios SET ${uCampos.join(', ')}
         WHERE id = $${i}
         RETURNING id, nombre, email, instrumento, ciudad, fecha_nacimiento, created_at`,
        uValores
      );
      usuarioRow = r.rows[0];
    }

    // ── 2. Actualizar tabla perfiles (identidad + redes + card_settings) ────────
    const tienePerfil = bio !== undefined || oficio !== undefined
      || experiencia !== undefined || user_tags !== undefined || foto_url !== undefined
      || banner_url !== undefined
      || instagram_url !== undefined || spotify_url !== undefined || discord_url !== undefined
      || card_settings !== undefined;

    if (tienePerfil) {
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
            req.usuario.id,
            bio           ?? null,
            oficio        ? JSON.stringify(oficio)    : null,
            experiencia   ? parseInt(experiencia)     : null,
            user_tags     ? JSON.stringify(user_tags) : null,
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

    if (!uCampos.length && !tienePerfil) {
      return res.status(400).json({ error: 'Debes enviar al menos un campo para actualizar' });
    }

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
});

// PUT /usuarios/cambiar-password
router.put('/cambiar-password', authMiddleware, async (req, res, next) => {
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
});

module.exports = router;
