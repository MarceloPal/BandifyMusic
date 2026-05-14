const express = require('express');
const soporteController = require('../controllers/soporteController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /soporte:
 *   post:
 *     summary: Crear un ticket de soporte
 *     description: Permite a cualquier usuario (autenticado u no) enviar un ticket de soporte
 *     tags: [Soporte]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, asunto, mensaje]
 *             properties:
 *               email: { type: string, format: email }
 *               asunto: { type: string, maxLength: 255 }
 *               mensaje: { type: string }
 *     responses:
 *       201: { description: Ticket creado con éxito }
 *       400: { description: Datos inválidos }
 */
router.post('/', authMiddleware, soporteController.crearTicket);

module.exports = router;
