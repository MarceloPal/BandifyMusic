/**
 * Bandify API — entrypoint.
 * Estructura: rutas → controladores → DB (PostgreSQL puro vía pg).
 * Configuración no-trivial (CORS, Swagger) vive en src/config/.
 */

require('dotenv').config();

const express        = require('express');
const cors           = require('cors');
const swaggerUi      = require('swagger-ui-express');

const { runMigrations } = require('./db/migrations');
const corsOptions       = require('./config/cors');
const swaggerSpec       = require('./config/swagger');

// ─── Routers ────────────────────────────────────────────────────────────────
const authRoutes           = require('./routes/auth');
const usuariosRoutes       = require('./routes/usuarios');
const audioRoutes          = require('./routes/audio');
const matchingRoutes       = require('./routes/matching');
const tocatasRoutes        = require('./routes/tocatas');
const mensajesRoutes       = require('./routes/mensajes');
const imagesRoutes         = require('./routes/images');
const demosRoutes          = require('./routes/demos');
const notificacionesRoutes = require('./routes/notificaciones');
const noticiasRoutes       = require('./routes/noticias');
const adminRoutes          = require('./routes/admin');
const eventosRoutes        = require('./routes/eventos');

const app = express();

// ─── Middlewares globales ───────────────────────────────────────────────────
app.use(cors(corsOptions));
app.use(express.json());

// ─── Documentación Swagger ──────────────────────────────────────────────────
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Bandify API Docs',
    customCss:       '.swagger-ui .topbar { display: none }',
  })
);

// ─── Rutas de la API ────────────────────────────────────────────────────────
app.use('/auth',            authRoutes);
app.use('/usuarios',        usuariosRoutes);
app.use('/audio',           audioRoutes);
app.use('/matching',        matchingRoutes);
app.use('/tocatas',         tocatasRoutes);
app.use('/mensajes',        mensajesRoutes);
app.use('/images',          imagesRoutes);
app.use('/demos',           demosRoutes);
app.use('/notificaciones',  notificacionesRoutes);
app.use('/api/noticias',    noticiasRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api/eventos',     eventosRoutes);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check del API gateway
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servicio activo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:    { type: string, example: ok }
 *                 service:   { type: string }
 *                 timestamp: { type: string, format: date-time }
 */
app.get('/health', (req, res) => {
  res.json({
    status:    'ok',
    service:   'bandify-api-gateway',
    timestamp: new Date().toISOString(),
  });
});

// ─── Middleware centralizado de errores ─────────────────────────────────────
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    error:   'Error interno del servidor',
    detalle: error.message,
  });
});

// ─── Arranque ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Servidor Bandify corriendo en puerto ${PORT}`);
  console.log(`Documentación Swagger: http://localhost:${PORT}/api-docs`);
  await runMigrations();
});

module.exports = app;
