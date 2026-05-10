/**
 * Configuración de CORS para la API de Bandify.
 *
 * - origin: lee FRONTEND_URL del entorno; en dev acepta cualquier origen.
 * - methods: explícitamente declarados (incluye OPTIONS para preflight).
 * - allowedHeaders: Content-Type para JSON y Authorization para JWT.
 */

const corsOptions = {
  origin:               process.env.FRONTEND_URL || '*',
  methods:              ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders:       ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

module.exports = corsOptions;
