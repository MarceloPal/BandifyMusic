const express           = require('express');
const authMiddleware     = require('../middleware/auth');
const matchingController = require('../controllers/matchingController');

const router = express.Router();

/**
 * @swagger
 * /matching/buscar:
 *   get:
 *     summary: Busca músicos compatibles por similitud audio + tags
 *     description: |
 *       Calcula `compatibilidad` con la fórmula:
 *       `tag_overlap × 0.60 + audio_cosine × 0.40 + bpm_penalty`.
 *       Devuelve los top-N candidatos ordenados por score descendente.
 *     tags: [Matching]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: ciudad
 *         schema: { type: string }
 *         description: Filtro parcial ILIKE
 *       - in: query
 *         name: oficio
 *         schema: { type: string }
 *         description: Filtro exacto sobre user.oficio
 *       - in: query
 *         name: tags
 *         schema: { type: string }
 *         description: CSV — al menos uno debe coincidir
 *       - in: query
 *         name: limite
 *         schema: { type: integer, default: 5, maximum: 50 }
 *     responses:
 *       200:
 *         description: Lista de candidatos con score `compatibilidad`
 *       400: { description: El usuario aún no tiene demo analizado }
 *       401: { description: Token inválido }
 */
router.get('/buscar', authMiddleware, matchingController.buscar);

module.exports = router;
