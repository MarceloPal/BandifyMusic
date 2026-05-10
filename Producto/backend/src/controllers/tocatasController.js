/**
 * Controlador de Tocatas — eventos de comunidad + venta de entradas vía MercadoPago.
 *
 * Endpoints:
 *   GET    /tocatas             — listar con filtros (auth)
 *   GET    /tocatas/publicas    — listado público (sin auth)
 *   POST   /tocatas             — crear tocata (geocodifica dirección si falta lat/lng)
 *   GET    /tocatas/:id         — detalle (auth)
 *   POST   /tocatas/:id/checkout— preferencia de pago MercadoPago
 *   DELETE /tocatas/:id         — solo el organizador puede eliminar
 */

const { MercadoPagoConfig, Preference } = require('mercadopago');
const pool                              = require('../db/index');
const { getCoordinates }                = require('../utils/geocoder');

const mpClient = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });

/**
 * GET /tocatas — lista con filtros opcionales (ciudad, genero, fecha).
 */
exports.listar = async (req, res, next) => {
  try {
    const { ciudad, genero, fecha } = req.query;

    const condiciones = [];
    const valores     = [];
    let i = 1;

    if (ciudad) { condiciones.push(`t.ciudad = $${i++}`); valores.push(ciudad); }
    if (genero) { condiciones.push(`t.genero = $${i++}`); valores.push(genero); }
    if (fecha)  { condiciones.push(`t.fecha = $${i++}`);  valores.push(fecha); }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const resultado = await pool.query(
      `SELECT t.id, t.nombre, t.descripcion, t.fecha, t.ciudad, t.direccion,
              t.genero, t.lat, t.lng, t.created_at,
              t.afiche_url, t.contacto_email,
              t.precio, t.cantidad_disponible,
              u.id AS organizador_id, u.nombre AS organizador_nombre,
              u.email AS organizador_email
       FROM tocatas t
       JOIN usuarios u ON u.id = t.organizador_id
       ${where}
       ORDER BY t.fecha ASC`,
      valores
    );

    res.json(resultado.rows);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /tocatas
 * Si el frontend no envía lat/lng, se geocodifica `direccion + ciudad` con Nominatim.
 * El geocoder NUNCA falla → si no encuentra, devuelve null y la tocata se crea igual.
 */
exports.crear = async (req, res, next) => {
  try {
    const { nombre, descripcion, fecha, ciudad, direccion, genero, lat, lng, afiche_url, contacto_email, precio, cantidad_disponible } = req.body;

    if (!nombre || !fecha || !ciudad) {
      return res.status(400).json({ error: 'nombre, fecha y ciudad son obligatorios' });
    }

    let latFinal = lat != null ? Number(lat) : null;
    let lngFinal = lng != null ? Number(lng) : null;

    if ((latFinal == null || lngFinal == null) && (direccion || ciudad)) {
      const queryDir = [direccion, ciudad, 'Chile'].filter(Boolean).join(', ');
      const coords = await getCoordinates(queryDir);
      latFinal = coords.lat;
      lngFinal = coords.lng;
    }

    const resultado = await pool.query(
      `INSERT INTO tocatas (organizador_id, nombre, descripcion, fecha, ciudad, direccion, genero, lat, lng, afiche_url, contacto_email, precio, cantidad_disponible)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [req.usuario.id, nombre, descripcion || null, fecha, ciudad, direccion || null,
       genero || null, latFinal, lngFinal, afiche_url || null, contacto_email || null,
       precio ? Number(precio) : null, cantidad_disponible ? parseInt(cantidad_disponible) : null]
    );

    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /tocatas/:id/checkout — genera preferencia de pago MercadoPago.
 */
exports.checkout = async (req, res, next) => {
  try {
    const { cantidad = 1 } = req.body;
    const qty = Math.max(1, parseInt(cantidad) || 1);

    const resultado = await pool.query(
      `SELECT t.id, t.nombre, t.precio, t.cantidad_disponible,
              u.nombre AS organizador_nombre
       FROM tocatas t
       JOIN usuarios u ON u.id = t.organizador_id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (resultado.rows.length === 0) return res.status(404).json({ error: 'Tocata no encontrada' });

    const tocata = resultado.rows[0];

    if (!tocata.precio) return res.status(400).json({ error: 'Esta tocata no tiene entradas a la venta' });

    if (tocata.cantidad_disponible !== null && qty > tocata.cantidad_disponible) {
      return res.status(400).json({ error: `Solo quedan ${tocata.cantidad_disponible} entradas disponibles` });
    }

    const preference = new Preference(mpClient);
    const response = await preference.create({
      body: {
        items: [{
          id:          tocata.id,
          title:       `Entrada: ${tocata.nombre}`,
          quantity:    qty,
          unit_price:  Math.round(parseFloat(tocata.precio)),
          currency_id: 'CLP',
        }],
        back_urls: {
          success: `${process.env.FRONTEND_URL || 'https://bandify-music-2167.vercel.app'}/tocatas?pago=exitoso`,
          failure: `${process.env.FRONTEND_URL || 'https://bandify-music-2167.vercel.app'}/tocatas?pago=error`,
          pending: `${process.env.FRONTEND_URL || 'https://bandify-music-2167.vercel.app'}/tocatas?pago=pendiente`,
        },
        auto_return:        'approved',
        external_reference: tocata.id,
      },
    });

    res.json({ init_point: response.init_point });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /tocatas/publicas — listado público de eventos futuros (sin auth, sin emails).
 */
exports.listarPublicas = async (req, res, next) => {
  try {
    const limite = Math.min(parseInt(req.query.limite, 10) || 6, 30);
    let resultado;
    try {
      resultado = await pool.query(
        `SELECT t.id, t.nombre, t.fecha, t.ciudad, t.direccion,
                t.genero, t.afiche_url,
                u.nombre AS organizador_nombre
         FROM tocatas t
         JOIN usuarios u ON u.id = t.organizador_id
         WHERE t.fecha >= CURRENT_DATE
         ORDER BY t.fecha ASC
         LIMIT $1`,
        [limite]
      );
    } catch (err) {
      // Fallback si afiche_url no existe aún
      if (err.code === '42703') {
        resultado = await pool.query(
          `SELECT t.id, t.nombre, t.fecha, t.ciudad, t.direccion,
                  t.genero, NULL AS afiche_url,
                  u.nombre AS organizador_nombre
           FROM tocatas t
           JOIN usuarios u ON u.id = t.organizador_id
           WHERE t.fecha >= CURRENT_DATE
           ORDER BY t.fecha ASC
           LIMIT $1`,
          [limite]
        );
      } else throw err;
    }
    res.json(resultado.rows);
  } catch (error) { next(error); }
};

/**
 * GET /tocatas/:id — detalle completo (auth).
 */
exports.obtenerDetalle = async (req, res, next) => {
  try {
    const resultado = await pool.query(
      `SELECT t.id, t.nombre, t.descripcion, t.fecha, t.ciudad, t.direccion,
              t.genero, t.lat, t.lng, t.created_at,
              t.afiche_url, t.contacto_email,
              t.precio, t.cantidad_disponible,
              u.id AS organizador_id, u.nombre AS organizador_nombre,
              u.email AS organizador_email, u.instrumento AS organizador_instrumento
       FROM tocatas t
       JOIN usuarios u ON u.id = t.organizador_id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (resultado.rows.length === 0) return res.status(404).json({ error: 'Tocata no encontrada' });
    res.json(resultado.rows[0]);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /tocatas/:id — solo el organizador puede borrar.
 */
exports.eliminar = async (req, res, next) => {
  try {
    const resultado = await pool.query('SELECT id, organizador_id FROM tocatas WHERE id = $1', [req.params.id]);

    if (resultado.rows.length === 0) return res.status(404).json({ error: 'Tocata no encontrada' });
    if (resultado.rows[0].organizador_id !== req.usuario.id)
      return res.status(403).json({ error: 'Solo el organizador puede eliminar esta tocata' });

    await pool.query('DELETE FROM tocatas WHERE id = $1', [req.params.id]);
    res.json({ message: 'Tocata eliminada correctamente' });
  } catch (error) {
    next(error);
  }
};
