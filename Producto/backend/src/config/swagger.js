/**
 * Configuración de Swagger / OpenAPI 3.0 para Bandify.
 *
 * Las anotaciones se leen como JSDoc desde:
 *   - src/routes/*.js
 *   - src/controllers/*.js
 *
 * La UI queda expuesta en /api-docs (montada desde app.js).
 */

const swaggerJsdoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title:       'Bandify API',
    version:     '1.0.0',
    description:
      'API REST de Bandify — plataforma chilena de matchmaking musical. ' +
      'Conecta músicos por similitud de audio (vector pgvector de 27 dimensiones), ' +
      'gestiona tocatas con venta de entradas vía MercadoPago, e integra eventos de Ticketmaster.',
    contact: {
      name:  'Equipo Bandify',
      email: 'contacto@bandify.cl',
    },
    license: {
      name: 'Proprietary',
    },
  },
  servers: [
    {
      url:         process.env.API_URL || 'http://localhost:3000',
      description: 'Servidor activo',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type:         'http',
        scheme:       'bearer',
        bearerFormat: 'JWT',
        description:  'Token JWT obtenido vía POST /auth/login o /auth/registro',
      },
    },
    schemas: {
      Error: {
        type:       'object',
        properties: {
          error: { type: 'string', example: 'Mensaje descriptivo del error' },
        },
      },
      Usuario: {
        type:       'object',
        properties: {
          id:               { type: 'string', format: 'uuid' },
          nombre:           { type: 'string', example: 'Juan Pérez' },
          email:            { type: 'string', format: 'email' },
          role:             { type: 'string', enum: ['user', 'admin'] },
          instrumento:      { type: 'string', nullable: true },
          ciudad:           { type: 'string', nullable: true },
          fecha_nacimiento: { type: 'string', format: 'date', nullable: true },
          es_premium:       { type: 'boolean' },
          es_verificado:    { type: 'boolean' },
          created_at:       { type: 'string', format: 'date-time' },
        },
      },
      Tocata: {
        type:       'object',
        properties: {
          id:                  { type: 'string', format: 'uuid' },
          nombre:              { type: 'string' },
          descripcion:         { type: 'string', nullable: true },
          fecha:               { type: 'string', format: 'date' },
          ciudad:              { type: 'string' },
          direccion:           { type: 'string', nullable: true },
          genero:              { type: 'string', nullable: true },
          lat:                 { type: 'number',  nullable: true },
          lng:                 { type: 'number',  nullable: true },
          afiche_url:          { type: 'string',  nullable: true },
          contacto_email:      { type: 'string',  nullable: true, format: 'email' },
          precio:              { type: 'number',  nullable: true },
          cantidad_disponible: { type: 'integer', nullable: true },
          organizador_id:      { type: 'string',  format: 'uuid' },
          organizador_nombre:  { type: 'string' },
        },
      },
      Demo: {
        type:       'object',
        properties: {
          id:             { type: 'string', format: 'uuid' },
          s3_key:         { type: 'string' },
          nombre:         { type: 'string' },
          cover_url:      { type: 'string', nullable: true },
          audio_vector:   { type: 'array',  items: { type: 'number' }, nullable: true },
          audio_metadata: { type: 'object', nullable: true },
          created_at:     { type: 'string', format: 'date-time' },
        },
      },
      Mensaje: {
        type:       'object',
        properties: {
          id:         { type: 'string', format: 'uuid' },
          de_id:      { type: 'string', format: 'uuid' },
          para_id:    { type: 'string', format: 'uuid' },
          contenido:  { type: 'string' },
          leido:      { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      AuthTokenResponse: {
        type:       'object',
        properties: {
          token:   { type: 'string', description: 'JWT válido por 7 días' },
          usuario: { $ref: '#/components/schemas/Usuario' },
        },
      },
    },
  },
  tags: [
    { name: 'Auth',            description: 'Registro, login y reset de contraseña' },
    { name: 'Usuarios',        description: 'Perfiles y datos del usuario autenticado' },
    { name: 'Audio',           description: 'Subida y análisis IA de demos' },
    { name: 'Demos',           description: 'Repertorio de demos del usuario' },
    { name: 'Matching',        description: 'Búsqueda de músicos compatibles por similitud audio + tags' },
    { name: 'Tocatas',         description: 'Eventos de la comunidad + venta de entradas' },
    { name: 'Mensajes',        description: 'Mensajería entre usuarios' },
    { name: 'Notificaciones',  description: 'Notificaciones agregadas (mensajes, tocatas, ADN)' },
    { name: 'Imágenes',        description: 'Upload y view URLs presignadas de S3' },
    { name: 'Noticias',        description: 'Noticias propias + integración GNews' },
    { name: 'Eventos',         description: 'Eventos masivos vía Ticketmaster Discovery API' },
    { name: 'Admin',           description: 'Panel de administración (requiere rol admin)' },
  ],
};

const options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
  ],
};

module.exports = swaggerJsdoc(options);
