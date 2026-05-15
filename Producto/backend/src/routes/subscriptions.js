const express = require('express');
const authMiddleware = require('../middleware/auth');
const subscriptionController = require('../controllers/subscriptionController');

const router = express.Router();

/**
 * @swagger
 * /api/subscriptions/checkout:
 *   post:
 *     summary: Generar preferencia de pago MercadoPago para suscripción Premium
 *     tags: [Suscripciones]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: '{ init_point } URL para redirigir al checkout MP' }
 *       401: { description: 'Token inválido o no proporcionado' }
 *       500: { description: 'Error interno del servidor' }
 */
router.post('/checkout', authMiddleware, subscriptionController.checkout);

module.exports = router;
