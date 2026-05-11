const express           = require('express');
const authMiddleware     = require('../middleware/auth');
const foldersController  = require('../controllers/foldersController');

const router = express.Router();

/**
 * @swagger
 * /api/folders:
 *   get:
 *     summary: Lista las carpetas de proyectos del usuario
 *     tags: [Folders]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de carpetas con conteo de demos asociados
 */
router.get('/', authMiddleware, foldersController.listar);

/**
 * @swagger
 * /api/folders:
 *   post:
 *     summary: Crear nueva carpeta de proyectos
 *     description: |
 *       Límite freemium: 10 carpetas para cuentas gratuitas. Premium ilimitado.
 *       Devuelve 403 con code DEMO_LIMIT_REACHED si se alcanza el límite.
 *     tags: [Folders]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre]
 *             properties:
 *               nombre:    { type: string, maxLength: 100 }
 *               cover_url: { type: string, nullable: true, description: 'S3 key de la foto' }
 *     responses:
 *       201: { description: Carpeta creada }
 *       400: { description: Datos inválidos }
 *       403:
 *         description: Límite freemium alcanzado (FOLDER_LIMIT_REACHED)
 */
router.post('/', authMiddleware, foldersController.crear);

/**
 * @swagger
 * /api/folders/{id}:
 *   put:
 *     summary: Actualiza nombre y/o cover_url de una carpeta
 *     tags: [Folders]
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
 *               nombre:    { type: string, maxLength: 100 }
 *               cover_url: { type: string, nullable: true }
 *     responses:
 *       200: { description: Carpeta actualizada }
 *       404: { description: Carpeta no encontrada }
 */
router.put('/:id', authMiddleware, foldersController.actualizar);

/**
 * @swagger
 * /api/folders/{id}:
 *   delete:
 *     summary: Elimina una carpeta (los demos quedan sin carpeta vía SET NULL)
 *     tags: [Folders]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Carpeta eliminada }
 *       404: { description: Carpeta no encontrada }
 */
router.delete('/:id', authMiddleware, foldersController.eliminar);

module.exports = router;
