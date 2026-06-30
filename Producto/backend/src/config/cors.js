/**
 * Configuración de CORS para la API de Bandify.
 *
 * - origin: lee FRONTEND_URL del entorno; falla al arrancar si no está definida.
 * - methods: explícitamente declarados (incluye OPTIONS para preflight).
 * - allowedHeaders: Content-Type para JSON y Authorization para JWT.
 */

const frontendUrl = process.env.FRONTEND_URL;
if (!frontendUrl) {
  throw new Error('[CORS] La variable de entorno FRONTEND_URL no está definida. El servidor no puede arrancar sin un origen permitido explícito.');
}

const corsOptions = {
  origin:               frontendUrl,
  methods:              ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders:       ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

module.exports = corsOptions;
