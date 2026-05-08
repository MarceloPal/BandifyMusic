const express = require('express');
const pool    = require('../db/index');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = authMiddleware;

const router = express.Router();

// GET /api/noticias
// Devuelve noticias locales (DB) combinadas con noticias externas (GNews)
router.get('/', async (req, res, next) => {
  try {
    const q    = (req.query.q || 'música').trim() || 'música';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);

    // 1. Obtener noticias locales de la DB
    const localesRes = await pool.query(`
      SELECT id, titulo as title, contenido as description, imagen_url as "urlToImage", 
             fuente as source_name, created_at as "publishedAt"
      FROM noticias
      ORDER BY created_at DESC
      LIMIT 10
    `);

    const localArticles = localesRes.rows.map(n => ({
      id: n.id,
      title: n.title,
      description: n.description,
      url: '#', // Noticia interna
      urlToImage: n.urlToImage,
      publishedAt: n.publishedAt,
      source: { name: n.source_name || 'Bandify' },
      isLocal: true
    }));

    // 2. Obtener noticias externas de GNews (siempre que haya API_KEY)
    let externalArticles = [];
    if (process.env.GNEWS_API_KEY) {
      try {
        const apiUrl = new URL('https://gnews.io/api/v4/search');
        apiUrl.searchParams.set('q',     q);
        apiUrl.searchParams.set('lang',  'es');
        apiUrl.searchParams.set('max',   '10');
        apiUrl.searchParams.set('token', process.env.GNEWS_API_KEY);

        const response = await fetch(apiUrl.toString());
        const data     = await response.json();

        if (response.ok) {
          externalArticles = (data.articles || [])
            .filter((a) => a.image)
            .map((a) => ({
              title:       a.title,
              description: a.description,
              url:         a.url,
              urlToImage:  a.image,
              publishedAt: a.publishedAt,
              source:      { name: a.source?.name },
              isLocal:     false
            }));
        }
      } catch (err) {
        console.error('Error consultando GNews:', err.message);
      }
    }

    // Combinar: Locales primero, luego externas
    res.json({ 
      articles: [...localArticles, ...externalArticles],
      totalResults: localArticles.length + externalArticles.length 
    });
  } catch (error) {
    next(error);
  }
});

// --- RUTAS DE GESTIÓN (ADMIN) ---

// POST /api/noticias
router.post('/', authMiddleware, requireAdmin, async (req, res, next) => {
  try {
    const { titulo, contenido, imagen_url, fuente } = req.body;
    if (!titulo || !contenido) {
      return res.status(400).json({ error: 'Título y contenido son obligatorios' });
    }

    const result = await pool.query(
      `INSERT INTO noticias (titulo, contenido, imagen_url, fuente, autor_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [titulo, contenido, imagen_url || null, fuente || 'Bandify', req.usuario.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/noticias/:id
router.delete('/:id', authMiddleware, requireAdmin, async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM noticias WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Noticia no encontrada' });
    }
    res.json({ message: 'Noticia eliminada con éxito' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
