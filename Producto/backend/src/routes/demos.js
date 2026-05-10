const express        = require('express');
const authMiddleware  = require('../middleware/auth');
const demosController = require('../controllers/demosController');

const router = express.Router();

/**
 * @swagger
 * /demos:
 *   get:
 *     summary: Lista los demos activos del usuario autenticado
 *     tags: [Demos]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de demos del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Demo' }
 *       401: { description: Token inválido }
 */
router.get('/', authMiddleware, demosController.listar);

/**
 * @swagger
 * /demos/{id}:
 *   put:
 *     summary: Actualiza nombre o cover_url de un demo
 *     tags: [Demos]
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
 *               nombre:    { type: string }
 *               cover_url: { type: string }
 *     responses:
 *       200: { description: Demo actualizado }
 *       400: { description: Nada que actualizar }
 *       404: { description: Demo no encontrado }
 */
router.put('/:id', authMiddleware, demosController.actualizar);

/**
 * @swagger
 * /demos/{id}:
 *   delete:
 *     summary: Soft delete de un demo (marca activo=false)
 *     tags: [Demos]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Demo desactivado }
 *       404: { description: Demo no encontrado }
 */
router.delete('/:id', authMiddleware, demosController.eliminar);

module.exports = router;
