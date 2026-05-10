const express          = require('express');
const authMiddleware    = require('../middleware/auth');
const imagesController  = require('../controllers/imagesController');

const router = express.Router();

/**
 * @swagger
 * /images/upload-url:
 *   get:
 *     summary: URL presignada de S3 para subir imagen (PUT, 5 min)
 *     tags: [Imágenes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema: { type: string, enum: [avatar, cover, afiche, banner] }
 *       - in: query
 *         name: ext
 *         schema: { type: string, enum: [jpg, jpeg, png, webp], default: jpg }
 *     responses:
 *       200:
 *         description: URL presignada y key resultante
 *       400: { description: type o ext inválidos }
 */
router.get('/upload-url', authMiddleware, imagesController.uploadUrl);

/**
 * @swagger
 * /images/view-url:
 *   get:
 *     summary: URL presignada de S3 para leer imagen (GET, 1 hora)
 *     description: Solo emite URLs para carpetas autorizadas (avatars, covers, afiches, banners).
 *     tags: [Imágenes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: key
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: URL presignada }
 *       403: { description: Carpeta no autorizada }
 */
router.get('/view-url', authMiddleware, imagesController.viewUrl);

module.exports = router;
