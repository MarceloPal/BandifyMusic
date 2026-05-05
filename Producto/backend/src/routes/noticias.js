const express = require('express');

const router = express.Router();

// GET /api/noticias?q=música&page=1
router.get('/', async (req, res, next) => {
  try {
    const q    = (req.query.q || 'música').trim() || 'música';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);

    const apiUrl = new URL('https://gnews.io/api/v4/search');
    apiUrl.searchParams.set('q',     q);
    apiUrl.searchParams.set('lang',  'es');
    apiUrl.searchParams.set('max',   '10');
    apiUrl.searchParams.set('page',  String(page));
    apiUrl.searchParams.set('token', process.env.GNEWS_API_KEY);

    const response = await fetch(apiUrl.toString());
    const data     = await response.json();

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: data.errors?.[0] || 'Error consultando GNews' });
    }

    // Mapear campos de GNews al shape que ya usa el frontend
    const articles = (data.articles || [])
      .filter((a) => a.image)
      .map((a) => ({
        title:       a.title,
        description: a.description,
        url:         a.url,
        urlToImage:  a.image,
        publishedAt: a.publishedAt,
        source:      { name: a.source?.name },
      }));

    res.json({ articles, totalResults: data.totalArticles ?? 0 });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
