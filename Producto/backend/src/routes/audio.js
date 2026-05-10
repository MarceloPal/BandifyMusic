const express          = require('express');
const authMiddleware    = require('../middleware/auth');
const audioController   = require('../controllers/audioController');

const router = express.Router();

/**
 * @swagger
 * /audio/upload-url:
 *   get:
 *     summary: URL presignada para subir demo a S3 (PUT, 5 min)
 *     tags: [Audio]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: ext
 *         schema: { type: string, enum: [mp3, wav, ogg, m4a, flac, alac], default: mp3 }
 *     responses:
 *       200: { description: '{ uploadUrl, s3Key }' }
 *       400: { description: Extensión no permitida }
 */
router.get('/upload-url', authMiddleware, audioController.uploadUrl);

/**
 * @swagger
 * /audio/listen-url:
 *   get:
 *     summary: URL presignada para reproducir demo desde S3 (GET, 1 hora)
 *     description: Soporta HTTP 206 Range Requests para streaming progresivo.
 *     tags: [Audio]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: key
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: '{ url, contentType }' }
 *       403: { description: Key fuera de la carpeta demos/ }
 */
router.get('/listen-url', authMiddleware, audioController.listenUrl);

/**
 * @swagger
 * /audio/analyze:
 *   post:
 *     summary: Encola análisis IA del demo subido a S3
 *     description: |
 *       Crea un registro en `demos` y `jobs`, llama al IA Service en background.
 *       Aplica límite freemium: 3 demos activos máximo para cuentas gratuitas.
 *     tags: [Audio]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [s3Key]
 *             properties:
 *               s3Key:  { type: string }
 *               nombre: { type: string }
 *     responses:
 *       200: { description: '{ jobId, demoId, status: processing }' }
 *       403:
 *         description: Límite freemium alcanzado (code DEMO_LIMIT_REACHED)
 */
router.post('/analyze', authMiddleware, audioController.analyze);

/**
 * @swagger
 * /audio/jobs/{jobId}:
 *   get:
 *     summary: Consulta estado de un job de análisis
 *     description: |
 *       Si el job sigue 'processing', consulta al IA Service. Cuando éste
 *       termina, persiste vector + metadata + s3_key MP3 en perfiles y demos.
 *     tags: [Audio]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: 'Estado del job: processing | done | error' }
 *       403: { description: El job no pertenece al usuario }
 *       404: { description: Job no encontrado }
 */
router.get('/jobs/:jobId', authMiddleware, audioController.obtenerJob);

module.exports = router;
