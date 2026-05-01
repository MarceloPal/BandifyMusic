/**
 * Rutas para gestión de imágenes en AWS S3.
 *
 * GET /images/upload-url?type=avatar|cover|afiche&ext=jpg|png|webp
 *   → URL presignada para subida directa (PUT, 5 min).
 *   El cliente sube directamente a S3 — el servidor nunca recibe el binario.
 *
 * GET /images/view-url?key=avatars/xxx.jpg
 *   → URL presignada para lectura (GET, 1 hora).
 *   Solo se emiten URLs para carpetas de imagen autorizadas.
 *
 * Organización en S3:
 *   avatars/<usuario_id>-<timestamp>-<random>.ext
 *   covers/<usuario_id>-<timestamp>-<random>.ext
 *   afiches/<usuario_id>-<timestamp>-<random>.ext
 *
 * NUNCA se generan URLs firmadas de lectura para carpetas de audio (demos/).
 */

const crypto   = require('crypto');
const express  = require('express');
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3             = require('../utils/s3Client');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/* ── Tablas de validación ─────────────────────────────────────────────────── */

/** Tipos permitidos y la carpeta S3 que les corresponde. */
const FOLDER_MAP = {
  avatar:  'avatars',
  cover:   'covers',
  afiche:  'afiches',
  banner:  'banners',
};

/** Extensiones permitidas y su Content-Type canónico. */
const EXT_MIME = {
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  png:  'image/png',
  webp: 'image/webp',
};

/** Prefijos de carpeta que están autorizados para emitir view-urls. */
const ALLOWED_VIEW_PREFIXES = Object.values(FOLDER_MAP).map((f) => `${f}/`);
// → ['avatars/', 'covers/', 'afiches/']

/* ── Helpers ──────────────────────────────────────────────────────────────── */

/**
 * Genera un sufijo aleatorio de 8 caracteres hexadecimales.
 * Combinado con usuario_id + timestamp garantiza unicidad absoluta.
 */
function randomHex() {
  return crypto.randomBytes(4).toString('hex'); // → 'a3f1b9c2'
}

/* ── Rutas ────────────────────────────────────────────────────────────────── */

/**
 * GET /images/upload-url?type=avatar&ext=jpg
 *
 * Devuelve { uploadUrl, key }.
 * El cliente hace PUT <uploadUrl> con el binario de la imagen.
 */
router.get('/upload-url', authMiddleware, async (req, res, next) => {
  try {
    const type = req.query.type;
    const ext  = (req.query.ext || 'jpg').toLowerCase();

    /* ── Validación de type ── */
    if (!FOLDER_MAP[type]) {
      return res.status(400).json({
        error: `Parámetro 'type' inválido. Valores aceptados: ${Object.keys(FOLDER_MAP).join(', ')}`,
      });
    }

    /* ── Validación de extensión / MIME ── */
    if (!EXT_MIME[ext]) {
      return res.status(400).json({
        error: `Extensión '${ext}' no permitida. Extensiones aceptadas: ${Object.keys(EXT_MIME).join(', ')}`,
      });
    }

    /* ── Clave S3 única ── */
    // Formato: avatars/<usuario_id>-<timestamp_ms>-<8hex>.jpg
    const folder  = FOLDER_MAP[type];
    const key     = `${folder}/${req.usuario.id}-${Date.now()}-${randomHex()}.${ext === 'jpeg' ? 'jpg' : ext}`;
    const mimeType = EXT_MIME[ext];

    /* ── URL presignada de escritura (PUT) — válida 5 min ── */
    const command   = new PutObjectCommand({
      Bucket:      process.env.AWS_BUCKET,
      Key:         key,
      ContentType: mimeType,
    });
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    res.json({ uploadUrl, key });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /images/view-url?key=avatars/xxx.jpg
 *
 * Devuelve { url } — URL presignada de lectura (GET, 1 hora).
 *
 * Seguridad: solo emite URLs para carpetas de imagen autorizadas.
 * No puede usarse para leer demos/audio u otros recursos del bucket.
 */
router.get('/view-url', authMiddleware, async (req, res, next) => {
  try {
    const { key } = req.query;

    if (!key) {
      return res.status(400).json({ error: "Parámetro 'key' es obligatorio." });
    }

    /* ── Validación de carpeta ── */
    const allowed = ALLOWED_VIEW_PREFIXES.some((prefix) => key.startsWith(prefix));
    if (!allowed) {
      return res.status(403).json({
        error: `La key '${key}' no corresponde a una carpeta de imagen autorizada (${ALLOWED_VIEW_PREFIXES.join(', ')}).`,
      });
    }

    /* ── Validación de extensión ── */
    const ext = key.split('.').pop().toLowerCase();
    if (!EXT_MIME[ext] && ext !== 'jpg') {
      return res.status(400).json({ error: `Extensión de archivo no permitida: .${ext}` });
    }

    /* ── URL presignada de lectura (GET) — válida 1 hora ── */
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET,
      Key:    key,
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    res.json({ url });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
