const express = require('express');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Campos de imagen preferidos de Ticketmaster (mayor a menor calidad)
const IMAGE_RATIOS = ['16_9', '4_3', '3_2'];
const IMAGE_WIDTHS = [1024, 640, 305];

function pickImage(images = []) {
  for (const ratio of IMAGE_RATIOS) {
    for (const width of IMAGE_WIDTHS) {
      const found = images.find((img) => img.ratio === ratio && img.width >= width);
      if (found) return found.url;
    }
  }
  return images[0]?.url ?? null;
}

function mapEvento(ev) {
  const venue   = ev._embedded?.venues?.[0];
  const start   = ev.dates?.start ?? {};
  const prices  = ev.priceRanges ?? [];
  const artistas = (ev._embedded?.attractions ?? []).map((a) => a.name);
  const genero  = ev.classifications?.[0]?.genre?.name ?? null;
  const subgenero = ev.classifications?.[0]?.subGenre?.name ?? null;

  return {
    id:          ev.id,
    nombre:      ev.name,
    fecha:       start.localDate ?? null,
    hora:        start.localTime ?? null,
    ciudad:      venue?.city?.name ?? null,
    recinto:     venue?.name ?? null,
    direccion:   venue?.address?.line1 ?? null,
    imagen:      pickImage(ev.images),
    url:         ev.url ?? null,
    precio_min:  prices[0]?.min ?? null,
    precio_max:  prices[0]?.max ?? null,
    moneda:      prices[0]?.currency ?? null,
    artistas,
    genero,
    subgenero,
  };
}

// GET /api/eventos
// Query params opcionales:
//   ciudad          (default: Santiago)
//   clasificacion   (default: Music)
//   pagina          (default: 0, base 0 según API de TM)
//   limite          (default: 20, máx 50)
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'Servicio de eventos no configurado' });
    }

    const ciudad        = (req.query.ciudad || '').trim();
    const clasificacion = (req.query.clasificacion || 'Music').trim();
    const pagina        = Math.max(0, parseInt(req.query.pagina, 10)  || 0);
    const limite        = Math.min(50, Math.max(1, parseInt(req.query.limite, 10) || 20));

    // Intento 1: buscar en Chile (sin filtro de ciudad — TM tiene cobertura limitada en CL)
    const buildUrl = (countryCode, cityOverride) => {
      const u = new URL('https://app.ticketmaster.com/discovery/v2/events.json');
      u.searchParams.set('apikey',             apiKey);
      u.searchParams.set('classificationName', clasificacion);
      u.searchParams.set('sort',               'date,asc');
      u.searchParams.set('size',               String(limite));
      u.searchParams.set('page',               String(pagina));
      if (countryCode)              u.searchParams.set('countryCode', countryCode);
      if (cityOverride || ciudad)   u.searchParams.set('city', cityOverride || ciudad);
      return u;
    };

    let response = await fetch(buildUrl('CL').toString());
    let data     = response.status !== 204 ? await response.json() : null;

    // Fallback: si Chile no devuelve resultados, ampliar a toda Latinoamérica
    const sinResultados = !data || !data._embedded?.events?.length;
    if (sinResultados && response.ok) {
      const fallbackCodes = ['MX', 'AR', 'BR', 'CO', 'PE'];
      for (const cc of fallbackCodes) {
        response = await fetch(buildUrl(cc).toString());
        if (response.status === 204) continue;
        data = await response.json();
        if (data._embedded?.events?.length) break;
      }
    }

    // Sin datos tras todos los intentos
    if (!data) {
      return res.json({ total: 0, paginas: 0, pagina, eventos: [] });
    }

    if (!response.ok) {
      const msg = data?.errors?.[0]?.detail || data?.fault?.faultstring || 'Error consultando Ticketmaster';
      return res.status(response.status).json({ error: msg });
    }

    const rawEventos = data._embedded?.events ?? [];
    const page       = data.page ?? {};

    res.json({
      total:   page.totalElements ?? rawEventos.length,
      paginas: page.totalPages    ?? 1,
      pagina:  page.number        ?? pagina,
      eventos: rawEventos.map(mapEvento),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
