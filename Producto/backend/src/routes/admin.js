const express          = require('express');
const authMiddleware    = require('../middleware/auth');
const { requireAdmin }  = authMiddleware;
const adminController   = require('../controllers/adminController');

const router = express.Router();

// Todas las rutas de este router requieren auth + rol admin
router.use(authMiddleware, requireAdmin);

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Métricas globales del sistema
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Totales + registros semanales + reportes }
 */
router.get('/stats', adminController.stats);

/**
 * @swagger
 * /api/admin/usuarios:
 *   get:
 *     summary: Lista todos los usuarios
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de usuarios }
 */
router.get('/usuarios', adminController.listarUsuarios);

/**
 * @swagger
 * /api/admin/usuarios/{id}:
 *   patch:
 *     summary: Editar campos clave de un usuario
 *     tags: [Admin]
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
 *               nombre:        { type: string }
 *               email:         { type: string, format: email }
 *               role:          { type: string, enum: [user, admin] }
 *               es_premium:    { type: boolean }
 *               es_verificado: { type: boolean }
 *     responses:
 *       200: { description: Usuario actualizado }
 *       404: { description: Usuario no encontrado }
 */
router.patch('/usuarios/:id', adminController.actualizarUsuario);

/**
 * @swagger
 * /api/admin/usuarios/{id}:
 *   delete:
 *     summary: Eliminar usuario (transacción con limpieza de FK)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Usuario eliminado }
 */
router.delete('/usuarios/:id', adminController.eliminarUsuario);

/**
 * @swagger
 * /api/admin/tocatas:
 *   get:
 *     summary: Lista todas las tocatas con organizador
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de tocatas }
 */
router.get('/tocatas', adminController.listarTocatas);

/**
 * @swagger
 * /api/admin/tocatas/{id}:
 *   delete:
 *     summary: Eliminar tocata
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Tocata eliminada }
 */
router.delete('/tocatas/:id', adminController.eliminarTocata);

/**
 * @swagger
 * /api/admin/reportes/{id}:
 *   patch:
 *     summary: Cambiar estado de un reporte
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [estado]
 *             properties:
 *               estado: { type: string, enum: [pendiente, resuelto, ignorado] }
 *     responses:
 *       200: { description: Reporte actualizado }
 *       404: { description: Reporte no encontrado }
 */
router.patch('/reportes/:id', adminController.actualizarReporte);

/**
 * @swagger
 * /api/admin/notificaciones-masivas:
 *   post:
 *     summary: Enviar notificación a todos los usuarios o a una lista
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [titulo, descripcion]
 *             properties:
 *               titulo:      { type: string }
 *               descripcion: { type: string }
 *               link:        { type: string, nullable: true }
 *               usuario_ids:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *                 description: Si está vacío, envía a TODOS los usuarios
 *     responses:
 *       200: { description: Notificación enviada }
 */
router.post('/notificaciones-masivas', adminController.notificacionesMasivas);

/**
 * @swagger
 * /api/admin/ventas:
 *   get:
 *     summary: Historial de tickets vendidos + resumen
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: '{ tickets, resumen: { total_ventas, ingresos_totales } }' }
 */
router.get('/ventas', adminController.ventas);

/**
 * @swagger
 * /api/admin/notificaciones:
 *   get:
 *     summary: Historial de anuncios enviados (agrupados por contenido)
 *     description: |
 *       Devuelve cada anuncio una sola vez (deduplicado por título+descripción+link+imagen)
 *       con el conteo de destinatarios. El id es el representativo del grupo.
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de anuncios ordenados por fecha desc (máx 100)
 */
router.get('/notificaciones', adminController.listarAnuncios);

/**
 * @swagger
 * /api/admin/notificaciones/{id}:
 *   delete:
 *     summary: Eliminar un anuncio del historial (borra todas las filas del broadcast)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: 'Anuncio eliminado + filas borradas' }
 *       404: { description: Anuncio no encontrado }
 */
router.delete('/notificaciones/:id', adminController.eliminarAnuncio);

module.exports = router;
