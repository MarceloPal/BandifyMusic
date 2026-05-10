const express             = require('express');
const authMiddleware       = require('../middleware/auth');
const { requireAdmin }     = authMiddleware;
const noticiasController   = require('../controllers/noticiasController');

const router = express.Router();

/**
 * @swagger
 * /api/noticias:
 *   get:
 *     summary: Lista noticias propias + GNews (público)
 *     tags: [Noticias]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string, default: música }
 *         description: Query de búsqueda en GNews
 *     responses:
 *       200:
 *         description: Lista combinada de noticias locales y externas
 */
router.get('/', noticiasController.listar);

/**
 * @swagger
 * /api/noticias:
 *   post:
 *     summary: Crear noticia local (admin only)
 *     tags: [Noticias, Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [titulo, contenido]
 *             properties:
 *               titulo:     { type: string }
 *               contenido:  { type: string }
 *               imagen_url: { type: string, nullable: true }
 *               fuente:     { type: string, default: Bandify }
 *     responses:
 *       201: { description: Noticia creada }
 *       403: { description: Requiere rol admin }
 */
router.post('/', authMiddleware, requireAdmin, noticiasController.crear);

/**
 * @swagger
 * /api/noticias/{id}:
 *   delete:
 *     summary: Eliminar noticia (admin only)
 *     tags: [Noticias, Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Noticia eliminada }
 *       404: { description: No encontrada }
 */
router.delete('/:id', authMiddleware, requireAdmin, noticiasController.eliminar);

module.exports = router;
