/**
 * Controlador de Imágenes — emisión de URLs presignadas de S3.
 *
 * Carpetas autorizadas: avatars/, covers/, afiches/, banners/.
 * NUNCA emite view-urls para audio (demos/) — ese flujo va por audioController.
 */

const crypto                      = require('crypto');
const { PutObjectCommand,
        GetObjectCommand }        = require('@aws-sdk/client-s3');
const { getSignedUrl }            = require('@aws-sdk/s3-request-presigner');
const s3                          = require('../utils/s3Client');

// ─── Tablas de validación ───────────────────────────────────────────────────

const FOLDER_MAP = {
  avatar:  'avatars',
  cover:   'covers',
  afiche:  'afiches',
  banner:  'banners',
  anuncio: 'anuncios',   // imágenes adjuntas a notificaciones masivas (admin)
};

const EXT_MIME = {
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  png:  'image/png',
  webp: 'image/webp',
};


function randomHex() {
  return crypto.randomBytes(4).toString('hex');
}

/**
 * GET /images/upload-url?type=avatar&ext=jpg
 * Devuelve { uploadUrl, key } para PUT directo a S3 (válida 5 min).
 */
exports.uploadUrl = async (req, res, next) => {
  try {
    const type = req.query.type;
    const ext  = (req.query.ext || 'jpg').toLowerCase();

    if (!FOLDER_MAP[type]) {
      return res.status(400).json({
        error: `Parámetro 'type' inválido. Valores aceptados: ${Object.keys(FOLDER_MAP).join(', ')}`,
      });
    }

    if (!EXT_MIME[ext]) {
      return res.status(400).json({
        error: `Extensión '${ext}' no permitida. Extensiones aceptadas: ${Object.keys(EXT_MIME).join(', ')}`,
      });
    }

    const folder   = FOLDER_MAP[type];
    const key      = `${folder}/${req.usuario.id}-${Date.now()}-${randomHex()}.${ext === 'jpeg' ? 'jpg' : ext}`;
    const mimeType = EXT_MIME[ext];

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
};

/**
 * GET /images/view-url?key=avatars/xxx.jpg
 * Devuelve { url } presignada de lectura (1 hora).
 * Solo permite carpetas de imagen autorizadas.
 */
exports.viewUrl = async (req, res, next) => {
  try {
    const { key } = req.query;

    if (!key) {
      return res.status(400).json({ error: "Parámetro 'key' es obligatorio." });
    }

    const ALLOWED_VIEW_PREFIXES = Object.values(FOLDER_MAP).map((f) => `${f}/`);
    if (!allowed) {
      return res.status(403).json({
        error: `La key '${key}' no corresponde a una carpeta de imagen autorizada (${ALLOWED_VIEW_PREFIXES.join(', ')}).`,
      });
    }

    const ext = key.split('.').pop().toLowerCase();
    if (!EXT_MIME[ext] && ext !== 'jpg') {
      return res.status(400).json({ error: `Extensión de archivo no permitida: .${ext}` });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET,
      Key:    key,
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    res.json({ url });
  } catch (error) {
    next(error);
  }
};
