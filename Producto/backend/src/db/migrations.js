/**
 * Auto-migration: añade columnas nuevas a las tablas existentes
 * de forma idempotente (IF NOT EXISTS). Se ejecuta al arrancar el servidor.
 */

const pool = require('./index');

async function runMigrations() {
  const stmts = [
    // Retrocompatibilidad: audio_metadata en perfiles
    'ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS audio_metadata JSONB',
    // Identidad artística del usuario
    'ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS user_tags   JSONB',
    'ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS oficio      JSONB',
    'ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS experiencia INTEGER',
    'ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS bio         TEXT',
    'ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS foto_url    TEXT',
    // Freemium
    'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS es_premium BOOLEAN DEFAULT false',
    // Tocatas con afiche
    'ALTER TABLE tocatas ADD COLUMN IF NOT EXISTS afiche_url     TEXT',
    'ALTER TABLE tocatas ADD COLUMN IF NOT EXISTS contacto_email TEXT',
    // Jobs con demo_id
    'ALTER TABLE jobs ADD COLUMN IF NOT EXISTS demo_id UUID',
    // Tabla de demos (repertorio)
    `CREATE TABLE IF NOT EXISTS demos (
      id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      usuario_id    UUID         NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      s3_key        TEXT         NOT NULL,
      nombre        TEXT         NOT NULL DEFAULT 'Demo sin nombre',
      cover_url     TEXT,
      audio_vector  vector(27),
      audio_metadata JSONB,
      activo        BOOLEAN      NOT NULL DEFAULT true,
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )`,
    // Columnas faltantes en audio_jobs (para el servicio IA)
    'ALTER TABLE audio_jobs ADD COLUMN IF NOT EXISTS audio_metadata JSONB',
    // Columnas faltantes en demos (para tablas creadas antes de la migración completa)
    'ALTER TABLE demos ADD COLUMN IF NOT EXISTS cover_url      TEXT',
    'ALTER TABLE demos ADD COLUMN IF NOT EXISTS audio_vector   vector(27)',
    'ALTER TABLE demos ADD COLUMN IF NOT EXISTS audio_metadata JSONB',
    'ALTER TABLE demos ADD COLUMN IF NOT EXISTS activo         BOOLEAN NOT NULL DEFAULT true',
    // Identidad visual de la tarjeta holográfica
    'ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS card_settings JSONB',
    // Redes sociales del músico
    'ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS instagram_url TEXT',
    'ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS spotify_url   TEXT',
    'ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS discord_url   TEXT',
    // Banner del perfil estilo hero
    'ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS banner_url    TEXT',
    // Tabla de recuperación de contraseña
    `CREATE TABLE IF NOT EXISTS password_resets (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      usuario_id  UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      token       TEXT        NOT NULL UNIQUE,
      expires_at  TIMESTAMPTZ NOT NULL,
      used        BOOLEAN     NOT NULL DEFAULT false,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    // Roles de usuario (admin, user)
    'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT \'user\'',
    // Tabla de tickets (si no existe)
    `CREATE TABLE IF NOT EXISTS tickets (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id     UUID        NOT NULL,
      buyer_id     UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      price_clp    INTEGER     NOT NULL CHECK (price_clp >= 0),
      purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    // Tabla de reportes (moderación)
    `CREATE TABLE IF NOT EXISTS reportes (
      id            SERIAL PRIMARY KEY,
      emisor_id     UUID REFERENCES usuarios(id) ON DELETE SET NULL,
      tipo_contenido VARCHAR(50) NOT NULL,
      contenido_id  UUID NOT NULL,
      motivo        TEXT NOT NULL,
      estado        VARCHAR(20) DEFAULT 'pendiente',
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )`,
    // Tabla de noticias propias
    `CREATE TABLE IF NOT EXISTS noticias (
      id            SERIAL PRIMARY KEY,
      titulo        VARCHAR(255) NOT NULL,
      contenido     TEXT NOT NULL,
      imagen_url    TEXT,
      fuente        VARCHAR(100) DEFAULT 'Bandify',
      autor_id      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )`,
    // Tocatas con venta de entradas vía MercadoPago
    'ALTER TABLE tocatas ADD COLUMN IF NOT EXISTS precio             NUMERIC(10,2)',
    'ALTER TABLE tocatas ADD COLUMN IF NOT EXISTS cantidad_disponible INTEGER',
  ];

  for (const sql of stmts) {
    try {
      await pool.query(sql);
    } catch (err) {
      // Ignorar errores menores (ej: columna ya existe en versiones viejas de Postgres sin IF NOT EXISTS)
      console.warn('[MIGRATIONS] Advertencia:', err.message);
    }
  }

  console.log('[MIGRATIONS] ✓ Esquema verificado y actualizado');
}

module.exports = { runMigrations };
