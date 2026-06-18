const express            = require('express');
const authMiddleware      = require('../middleware/auth');
const tocatasController   = require('../controllers/tocatasController');

const router = express.Router();

/**
 * @swagger
 * /tocatas:
 *   get:
 *     summary: Lista de tocatas con filtros opcionales
 *     tags: [Tocatas]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: ciudad
 *         schema: { type: string }
 *       - in: query
 *         name: genero
 *         schema: { type: string }
 *       - in: query
 *         name: fecha
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Lista de tocatas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Tocata' }
 */
router.get('/', authMiddleware, tocatasController.listar);

/**
 * @swagger
 * /tocatas:
 *   post:
 *     summary: Crear tocata (geocodifica dirección si no se provee lat/lng)
 *     tags: [Tocatas]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, fecha, ciudad]
 *             properties:
 *               nombre:              { type: string }
 *               descripcion:         { type: string }
 *               fecha:               { type: string, format: date }
 *               ciudad:              { type: string }
 *               direccion:           { type: string }
 *               genero:              { type: string }
 *               lat:                 { type: number }
 *               lng:                 { type: number }
 *               afiche_url:          { type: string }
 *               contacto_email:      { type: string, format: email }
 *               precio:              { type: number }
 *               cantidad_disponible: { type: integer }
 *     responses:
 *       201: { description: Tocata creada }
 *       400: { description: Faltan campos obligatorios }
 */
router.post('/', authMiddleware, tocatasController.crear);

/**
 * @swagger
 * /tocatas/publicas:
 *   get:
 *     summary: Listado público de tocatas futuras (sin auth)
 *     tags: [Tocatas]
 *     parameters:
 *       - in: query
 *         name: limite
 *         schema: { type: integer, default: 6, maximum: 30 }
 *     responses:
 *       200: { description: Lista de tocatas futuras (campos reducidos) }
 */
router.get('/publicas', tocatasController.listarPublicas);

/**
 * @swagger
 * /tocatas/{id}/checkout:
 *   post:
 *     summary: Generar preferencia de pago MercadoPago para una tocata
 *     tags: [Tocatas]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cantidad: { type: integer, default: 1 }
 *     responses:
 *       200: { description: '{ init_point } URL para redirigir al checkout MP' }
 *       400: { description: Sin precio o stock insuficiente }
 *       404: { description: Tocata no encontrada }
 */
router.post('/:id/checkout', authMiddleware, tocatasController.checkout);

router.patch('/:id/cancelar', authMiddleware, tocatasController.cancelar);
router.get('/:id/tickets',    authMiddleware, tocatasController.resumenTickets);
router.patch('/:id',          authMiddleware, tocatasController.actualizar);

/**
 * @swagger
 * /tocatas/{id}:
 *   get:
 *     summary: Detalle completo de una tocata
 *     tags: [Tocatas]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Detalle de la tocata
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Tocata' }
 *       404: { description: No encontrada }
 */
router.get('/:id', authMiddleware, tocatasController.obtenerDetalle);

/**
 * @swagger
 * /tocatas/{id}:
 *   delete:
 *     summary: Eliminar tocata (solo el organizador)
 *     tags: [Tocatas]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Tocata eliminada }
 *       403: { description: No es el organizador }
 *       404: { description: No encontrada }
 */
router.delete('/:id', authMiddleware, tocatasController.eliminar);

module.exports = router;
