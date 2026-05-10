const express                  = require('express');
const authMiddleware            = require('../middleware/auth');
const notificacionesController  = require('../controllers/notificacionesController');

const router = express.Router();

/**
 * @swagger
 * /notificaciones:
 *   get:
 *     summary: Feed unificado de notificaciones del usuario
 *     description: Agrega mensajes no leídos, tocatas próximas, demos analizados y avisos del sistema.
 *     tags: [Notificaciones]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista cronológica descendente de notificaciones
 */
router.get('/', authMiddleware, notificacionesController.listar);

/**
 * @swagger
 * /notificaciones/leer:
 *   patch:
 *     summary: Marca todos los mensajes recibidos como leídos
 *     tags: [Notificaciones]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Mensajes marcados como leídos }
 */
router.patch('/leer', authMiddleware, notificacionesController.marcarLeidas);

module.exports = router;
