const express            = require('express');
const authMiddleware      = require('../middleware/auth');
const mensajesController  = require('../controllers/mensajesController');

const router = express.Router();

/**
 * @swagger
 * /mensajes:
 *   get:
 *     summary: Bandeja de entrada (legacy, plana)
 *     tags: [Mensajes]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de mensajes recibidos }
 */
router.get('/', authMiddleware, mensajesController.bandejaEntrada);

/**
 * @swagger
 * /mensajes/conversaciones:
 *   get:
 *     summary: Lista de conversaciones agrupadas
 *     description: |
 *       Devuelve una conversación por interlocutor con: partner_id, partner_nombre,
 *       last_at, last_mensaje, yo_respondi, sin_leer.
 *     tags: [Mensajes]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Conversaciones ordenadas por last_at DESC }
 */
router.get('/conversaciones', authMiddleware, mensajesController.listarConversaciones);

/**
 * @swagger
 * /mensajes:
 *   post:
 *     summary: Envía un mensaje a otro usuario
 *     tags: [Mensajes]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [para_id, contenido]
 *             properties:
 *               para_id:   { type: string, format: uuid }
 *               contenido: { type: string }
 *     responses:
 *       201: { description: Mensaje creado }
 *       400: { description: Datos inválidos o auto-mensaje }
 */
router.post('/', authMiddleware, mensajesController.enviar);

/**
 * @swagger
 * /mensajes/{id}/leer:
 *   put:
 *     summary: Marca un mensaje como leído
 *     tags: [Mensajes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Mensaje actualizado }
 *       403: { description: No es el destinatario }
 *       404: { description: Mensaje no encontrado }
 */
router.put('/:id/leer', authMiddleware, mensajesController.marcarLeido);

/**
 * @swagger
 * /mensajes/conversacion/{usuarioId}:
 *   get:
 *     summary: Hilo completo con un usuario
 *     tags: [Mensajes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: usuarioId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Mensajes ASC por created_at }
 */
router.get('/conversacion/:usuarioId', authMiddleware, mensajesController.obtenerConversacion);

module.exports = router;
