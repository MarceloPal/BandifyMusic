require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { runMigrations } = require('./db/migrations');
const authRoutes    = require('./routes/auth');
const usuariosRoutes = require('./routes/usuarios');
const audioRoutes = require('./routes/audio');
const matchingRoutes = require('./routes/matching');
const tocatasRoutes  = require('./routes/tocatas');
const mensajesRoutes = require('./routes/mensajes');
const imagesRoutes   = require('./routes/images');
const demosRoutes    = require('./routes/demos');
const notificacionesRoutes = require('./routes/notificaciones');

const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/audio', audioRoutes);
app.use('/matching', matchingRoutes);
app.use('/tocatas', tocatasRoutes);
app.use('/mensajes', mensajesRoutes);
app.use('/images',  imagesRoutes);
app.use('/demos',   demosRoutes);
app.use('/notificaciones', notificacionesRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'bandify-api-gateway',
    timestamp: new Date().toISOString(),
  });
});

// Middleware centralizado de manejo de errores
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    error: 'Error interno del servidor',
    detalle: error.message,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Servidor Bandify corriendo en puerto ${PORT}`);
  await runMigrations();
});

module.exports = app;
