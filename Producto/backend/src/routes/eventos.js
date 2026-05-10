const express = require('express');
const eventosController = require('../controllers/eventosController');

const router = express.Router();

/**
 * @swagger
 * /api/eventos:
 *   get:
 *     summary: Lista eventos masivos vía Ticketmaster Discovery API
 *     description: |
 *       Busca eventos en Chile primero; si no hay resultados, hace fallback
 *       a MX → AR → BR → CO → PE. Cada evento incluye lat/lng del venue
 *       cuando Ticketmaster los provee.
 *     tags: [Eventos]
 *     parameters:
 *       - in: query
 *         name: ciudad
 *         schema: { type: string }
 *       - in: query
 *         name: clasificacion
 *         schema: { type: string, default: Music }
 *       - in: query
 *         name: pagina
 *         schema: { type: integer, default: 0 }
 *       - in: query
 *         name: limite
 *         schema: { type: integer, default: 20, maximum: 50 }
 *     responses:
 *       200:
 *         description: Lista paginada de eventos
 *       503:
 *         description: API key de Ticketmaster no configurada
 */
router.get('/', eventosController.listar);

module.exports = router;
