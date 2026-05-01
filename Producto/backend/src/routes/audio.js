const crypto = require('crypto');
const express = require('express');
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const pool           = require('../db/index');
const authMiddleware = require('../middleware/auth');
const s3             = require('../utils/s3Client');
const mailer         = require('../utils/mailer');

const router = express.Router();

/** Extensiones de audio permitidas y su Content-Type. */
const AUDIO_EXT_MIME = {
  mp3:  'audio/mpeg',
  wav:  'audio/wav',
  ogg:  'audio/ogg',
  m4a:  'audio/mp4',      // AAC o ALAC en contenedor MP4
  flac: 'audio/flac',
  alac: 'audio/mp4',      // ALAC usa el mismo contenedor MP4
};

// GET /audio/upload-url?ext=mp3   (ext opcional, default mp3)
router.get('/upload-url', authMiddleware, async (req, res, next) => {
  try {
    const ext = (req.query.ext || 'mp3').toLowerCase();

    if (!AUDIO_EXT_MIME[ext]) {
      return res.status(400).json({
        error: `Extensión '${ext}' no permitida. Extensiones aceptadas: ${Object.keys(AUDIO_EXT_MIME).join(', ')}`,
      });
    }

    // Clave única: demos/<usuario_id>-<timestamp_ms>-<8hex>.<ext>
    const rand  = crypto.randomBytes(4).toString('hex');
    const s3Key = `demos/${req.usuario.id}-${Date.now()}-${rand}.${ext}`;

    const command = new PutObjectCommand({
      Bucket:      process.env.AWS_BUCKET,
      Key:         s3Key,
      ContentType: AUDIO_EXT_MIME[ext],
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    res.json({ uploadUrl, s3Key });
  } catch (error) {
    next(error);
  }
});

// GET /audio/listen-url?key=demos/xxx — URL firmada para reproducción (1 hora)
// S3 natively supports HTTP 206 Range Requests; the browser <audio> element
// will automatically send Range headers and receive 206 partial responses,
// enabling progressive / seek-anywhere streaming without any proxy layer.
router.get('/listen-url', authMiddleware, async (req, res, next) => {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ error: 'key es obligatorio' });

    // Solo emitir URLs de escucha para la carpeta de demos de audio
    if (!key.startsWith('demos/')) {
      return res.status(403).json({ error: "La key debe pertenecer a la carpeta 'demos/'." });
    }

    // Derive MIME type from extension so the browser knows it's audio and
    // can begin progressive playback without waiting for the full download.
    const ext = key.split('.').pop().toLowerCase();
    const MIME_MAP = {
      mp3:  'audio/mpeg',
      wav:  'audio/wav',
      ogg:  'audio/ogg',
      m4a:  'audio/mp4',
      flac: 'audio/flac',
      alac: 'audio/mp4',
    };
    const contentType = MIME_MAP[ext] || 'audio/mpeg';

    const command = new GetObjectCommand({
      Bucket:              process.env.AWS_BUCKET,
      Key:                 key,
      ResponseContentType: contentType,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hora
    res.json({ url, contentType });
  } catch (error) {
    next(error);
  }
});

// POST /audio/analyze
router.post('/analyze', authMiddleware, async (req, res, next) => {
  try {
    const { s3Key, nombre } = req.body;

    if (!s3Key) {
      return res.status(400).json({ error: 's3Key es obligatorio' });
    }

    // ── Verificar límite freemium (máx 3 demos activos para cuentas gratuitas) ──
    try {
      const [demoCount, userRow] = await Promise.all([
        pool.query('SELECT COUNT(*) FROM demos WHERE usuario_id = $1 AND activo = true', [req.usuario.id]),
        pool.query('SELECT COALESCE(es_premium, false) AS es_premium FROM usuarios WHERE id = $1', [req.usuario.id]),
      ]);
      const count      = parseInt(demoCount.rows[0].count, 10);
      const esPremium  = userRow.rows[0]?.es_premium ?? false;

      if (count >= 3 && !esPremium) {
        return res.status(403).json({
          error: 'Has alcanzado el límite de 3 demos para cuentas gratuitas. Actualiza a Premium para almacenamiento ilimitado.',
          code:  'DEMO_LIMIT_REACHED',
        });
      }
    } catch (limitErr) {
      // Si la tabla demos no existe aún, ignorar el chequeo
      if (limitErr.code !== '42P01' && limitErr.code !== '42703') throw limitErr;
    }

    // ── Crear registro en demos ───────────────────────────────────────────────
    let demoId = null;
    try {
      const demoResult = await pool.query(
        `INSERT INTO demos (usuario_id, s3_key, nombre) VALUES ($1, $2, $3) RETURNING id`,
        [req.usuario.id, s3Key, nombre?.trim() || 'Demo sin nombre']
      );
      demoId = demoResult.rows[0].id;
    } catch (demoErr) {
      if (demoErr.code !== '42P01' && demoErr.code !== '42703') throw demoErr;
      console.warn('[AUDIO] Tabla demos no disponible — creando job sin demo_id');
    }

    // ── Crear job local con status 'processing' ───────────────────────────────
    let jobResult;
    try {
      jobResult = await pool.query(
        `INSERT INTO jobs (usuario_id, s3_key, status, demo_id)
         VALUES ($1, $2, 'processing', $3)
         RETURNING id`,
        [req.usuario.id, s3Key, demoId]
      );
    } catch (jobErr) {
      if (jobErr.code !== '42703') throw jobErr;
      // demo_id column not yet migrated
      jobResult = await pool.query(
        `INSERT INTO jobs (usuario_id, s3_key, status) VALUES ($1, $2, 'processing') RETURNING id`,
        [req.usuario.id, s3Key]
      );
    }

    const jobId = jobResult.rows[0].id;

    // Llamar al IA Service con el payload correcto (s3_key y usuario_id)
    try {
      const iaResponse = await fetch(`${process.env.IA_SERVICE_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3_key: s3Key, usuario_id: req.usuario.id }),
      });

      if (!iaResponse.ok) {
        throw new Error(`IA Service respondió con status ${iaResponse.status}`);
      }

      const iaData = await iaResponse.json();

      // Guardar el iaJobId para poder hacer polling después
      await pool.query(
        `UPDATE jobs SET ia_job_id = $1 WHERE id = $2`,
        [iaData.jobId, jobId]
      );

      console.log(`[AUDIO] Job ${jobId} → IA Job ${iaData.jobId}`);
    } catch (iaError) {
      console.error('[AUDIO] Error contactando al IA Service:', iaError.message);
      await pool.query(
        `UPDATE jobs SET status = 'error' WHERE id = $1`,
        [jobId]
      );
    }

    res.json({ jobId, demoId, status: 'processing' });
  } catch (error) {
    next(error);
  }
});

// GET /audio/jobs/:jobId
router.get('/jobs/:jobId', authMiddleware, async (req, res, next) => {
  try {
    const { jobId } = req.params;

    let resultado;
    try {
      resultado = await pool.query(
        'SELECT id, usuario_id, s3_key, status, ia_job_id, demo_id, created_at FROM jobs WHERE id = $1',
        [jobId]
      );
    } catch (colErr) {
      if (colErr.code !== '42703') throw colErr;
      resultado = await pool.query(
        'SELECT id, usuario_id, s3_key, status, ia_job_id, NULL::uuid AS demo_id, created_at FROM jobs WHERE id = $1',
        [jobId]
      );
    }

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Job no encontrado' });
    }

    const job = resultado.rows[0];

    if (job.usuario_id !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes permiso para ver este job' });
    }

    // Si el job local sigue en 'processing', consultar al IA Service
    if (job.status === 'processing' && job.ia_job_id) {
      try {
        // Timeout de 25 s para no bloquear si el IA Service no responde
        const iaController = new AbortController();
        const iaTimeout    = setTimeout(() => iaController.abort(), 25_000);

        let iaResponse;
        try {
          iaResponse = await fetch(
            `${process.env.IA_SERVICE_URL}/jobs/${job.ia_job_id}`,
            { signal: iaController.signal }
          );
        } finally {
          clearTimeout(iaTimeout);
        }

        const iaData = await iaResponse.json();

        if (iaData.status === 'done') {
          const audioMetadata = iaData.metadata || null;

          // Si el IA Service transcodificó a MP3, usa la nueva clave; si no, la original.
          // iaData.mp3_s3_key es null cuando el archivo ya era MP3 (sin transcoding).
          const finalS3Key = iaData.mp3_s3_key || job.s3_key;

          // ── Actualizar perfiles con vector + s3_key definitivo ───────────
          try {
            await pool.query(
              `INSERT INTO perfiles (usuario_id, audio_vector, s3_key, audio_metadata, updated_at)
               VALUES ($1, $2, $3, $4, NOW())
               ON CONFLICT (usuario_id)
               DO UPDATE SET
                 audio_vector   = EXCLUDED.audio_vector,
                 s3_key         = EXCLUDED.s3_key,
                 audio_metadata = EXCLUDED.audio_metadata,
                 updated_at     = NOW()`,
              [job.usuario_id, JSON.stringify(iaData.vector), finalS3Key, audioMetadata ? JSON.stringify(audioMetadata) : null]
            );
          } catch (insertErr) {
            if (insertErr.code === '42703') {
              console.warn('[AUDIO] audio_metadata column missing — saving without it.');
              await pool.query(
                `INSERT INTO perfiles (usuario_id, audio_vector, s3_key, updated_at)
                 VALUES ($1, $2, $3, NOW())
                 ON CONFLICT (usuario_id)
                 DO UPDATE SET
                   audio_vector = EXCLUDED.audio_vector,
                   s3_key       = EXCLUDED.s3_key,
                   updated_at   = NOW()`,
                [job.usuario_id, JSON.stringify(iaData.vector), finalS3Key]
              );
            } else {
              throw insertErr;
            }
          }

          // ── Actualizar demos: vector + s3_key MP3 ───────────────────────
          if (job.demo_id) {
            try {
              const demoFields = ['audio_vector = $1', 'audio_metadata = $2'];
              const demoVals   = [
                JSON.stringify(iaData.vector),
                audioMetadata ? JSON.stringify(audioMetadata) : null,
              ];
              // Actualizar s3_key solo si hubo transcoding (evita sobreescribir con el mismo valor)
              if (iaData.mp3_s3_key) {
                demoFields.push(`s3_key = $${demoVals.length + 1}`);
                demoVals.push(iaData.mp3_s3_key);
              }
              demoVals.push(job.demo_id);
              await pool.query(
                `UPDATE demos SET ${demoFields.join(', ')} WHERE id = $${demoVals.length}`,
                demoVals
              );
            } catch (demoErr) {
              console.warn('[AUDIO] No se pudo actualizar demos:', demoErr.message);
            }
          }

          // ── Marcar job como done + actualizar s3_key si cambió ──────────
          if (iaData.mp3_s3_key) {
            await pool.query(
              `UPDATE jobs SET status = 'done', s3_key = $1 WHERE id = $2`,
              [iaData.mp3_s3_key, jobId]
            );
          } else {
            await pool.query(`UPDATE jobs SET status = 'done' WHERE id = $1`, [jobId]);
          }

          console.log(`[AUDIO] ✓ Job ${jobId} completado | s3_key final=${finalS3Key}`);

          // Email "ADN listo" — fire-and-forget
          pool.query('SELECT nombre, email FROM usuarios WHERE id = $1', [job.usuario_id])
            .then(({ rows }) => {
              if (!rows[0]) return;
              return mailer.sendAdnReadyEmail({ to: rows[0].email, nombre: rows[0].nombre });
            })
            .catch(() => {});
          return res.json({
            jobId:    job.id,
            status:   'done',
            demoId:   job.demo_id,
            s3Key:    finalS3Key,
            createdAt: job.created_at,
          });
        }

        if (iaData.status === 'error') {
          await pool.query(
            `UPDATE jobs SET status = 'error' WHERE id = $1`,
            [jobId]
          );
          return res.json({ jobId: job.id, status: 'error', mensaje: iaData.message, createdAt: job.created_at });
        }

      } catch (iaError) {
        if (iaError.name === 'AbortError') {
          console.error(`[AUDIO] Timeout (25 s) consultando IA Service para job ${jobId}`);
        } else {
          console.error('[AUDIO] Error consultando IA Service:', iaError.message);
        }
        // No marcamos como 'error': el job sigue en 'processing' y el frontend reintentará.
      }
    }

    res.json({
      jobId: job.id,
      status: job.status,
      s3Key: job.s3_key,
      createdAt: job.created_at,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
