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
    // Sello de verificación
    'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS es_verificado BOOLEAN DEFAULT false',
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
    // Tabla de notificaciones físicas (avisos, anuncios)
    `CREATE TABLE IF NOT EXISTS notificaciones (
      id            SERIAL PRIMARY KEY,
      usuario_id    UUID REFERENCES usuarios(id) ON DELETE CASCADE,
      titulo        VARCHAR(255) NOT NULL,
      descripcion   TEXT NOT NULL,
      tipo          VARCHAR(50) DEFAULT 'sistema',
      leida         BOOLEAN DEFAULT false,
      link          TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )`,
    // Imagen opcional en notificaciones (anuncios admin con foto)
    'ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS imagen_url TEXT',
    // Tabla de tickets de soporte al cliente
    `CREATE TABLE IF NOT EXISTS soporte_tickets (
      id            SERIAL PRIMARY KEY,
      usuario_id    UUID REFERENCES usuarios(id) ON DELETE SET NULL,
      email         VARCHAR(255) NOT NULL,
      asunto        VARCHAR(255),
      mensaje       TEXT NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )`,
    // ── ROLLBACK: Épica 2 Carpetas de Proyectos (cancelada) ──
    // Estos DROPs revierten DBs que ya tenían la feature creada. Son idempotentes
    // (IF EXISTS) → no-op en DBs nuevas que nunca crearon estas tablas.
    // Orden: primero la columna (libera la FK), después la tabla.
    'ALTER TABLE demos DROP COLUMN IF EXISTS folder_id',
    'DROP TABLE IF EXISTS folders CASCADE',
    // Tocatas con venta de entradas vía MercadoPago
    'ALTER TABLE tocatas ADD COLUMN IF NOT EXISTS precio             NUMERIC(10,2)',
    'ALTER TABLE tocatas ADD COLUMN IF NOT EXISTS cantidad_disponible INTEGER',
    // Coordenadas geográficas para mostrar tocatas en el mapa Leaflet
    // NUMERIC(10,7) → ~1cm de precisión, suficiente para ubicar un venue
    'ALTER TABLE tocatas ADD COLUMN IF NOT EXISTS lat NUMERIC(10,7)',
    'ALTER TABLE tocatas ADD COLUMN IF NOT EXISTS lng NUMERIC(10,7)',
    // Estado del evento: 'activo' | 'cancelado' (soft-delete, mantiene historial)
    "ALTER TABLE tocatas ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'activo'",
    // Hora del evento (HH:MM)
    'ALTER TABLE tocatas ADD COLUMN IF NOT EXISTS hora          TEXT',
    // Restricción de edad del evento y tipos de entrada con precio por tier
    'ALTER TABLE tocatas ADD COLUMN IF NOT EXISTS edad_minima   TEXT',
    'ALTER TABLE tocatas ADD COLUMN IF NOT EXISTS tipos_entrada JSONB',
    // Fix FK constraints: reemplazar sin CASCADE por con CASCADE en jobs y audio_jobs
    // (necesario para poder eliminar usuarios desde el panel de admin)
    `DO $$
     BEGIN
       IF EXISTS (
         SELECT 1 FROM information_schema.table_constraints
         WHERE constraint_name = 'jobs_usuario_id_fkey'
           AND constraint_type = 'FOREIGN KEY'
       ) THEN
         ALTER TABLE jobs DROP CONSTRAINT jobs_usuario_id_fkey;
         ALTER TABLE jobs ADD CONSTRAINT jobs_usuario_id_fkey
           FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
       END IF;
     END $$`,
    `DO $$
     BEGIN
       IF EXISTS (
         SELECT 1 FROM information_schema.table_constraints
         WHERE constraint_name = 'audio_jobs_usuario_id_fkey'
           AND constraint_type = 'FOREIGN KEY'
       ) AND EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_name = 'audio_jobs' AND column_name = 'usuario_id'
       ) THEN
         ALTER TABLE audio_jobs DROP CONSTRAINT audio_jobs_usuario_id_fkey;
         ALTER TABLE audio_jobs ADD CONSTRAINT audio_jobs_usuario_id_fkey
           FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
       END IF;
     END $$`,
    // Fix FK constraints: mensajes.de_id y mensajes.para_id deben cascadear
    // al borrar un usuario (sino el admin no puede eliminar usuarios que
    // hayan enviado o recibido mensajes).
    `DO $$
     BEGIN
       IF EXISTS (
         SELECT 1 FROM information_schema.table_constraints
         WHERE constraint_name = 'mensajes_de_id_fkey'
           AND constraint_type = 'FOREIGN KEY'
       ) THEN
         ALTER TABLE mensajes DROP CONSTRAINT mensajes_de_id_fkey;
         ALTER TABLE mensajes ADD CONSTRAINT mensajes_de_id_fkey
           FOREIGN KEY (de_id) REFERENCES usuarios(id) ON DELETE CASCADE;
       END IF;
     END $$`,
    `DO $$
     BEGIN
       IF EXISTS (
         SELECT 1 FROM information_schema.table_constraints
         WHERE constraint_name = 'mensajes_para_id_fkey'
           AND constraint_type = 'FOREIGN KEY'
       ) THEN
         ALTER TABLE mensajes DROP CONSTRAINT mensajes_para_id_fkey;
         ALTER TABLE mensajes ADD CONSTRAINT mensajes_para_id_fkey
           FOREIGN KEY (para_id) REFERENCES usuarios(id) ON DELETE CASCADE;
       END IF;
     END $$`,
    // Fix FK constraint: tocatas.organizador_id debe cascadear al borrar usuario.
    // Sin esto, un admin no puede eliminar usuarios que hayan organizado tocatas.
    `DO $$
     BEGIN
       IF EXISTS (
         SELECT 1 FROM information_schema.table_constraints
         WHERE constraint_name = 'tocatas_organizador_id_fkey'
           AND constraint_type = 'FOREIGN KEY'
       ) THEN
         ALTER TABLE tocatas DROP CONSTRAINT tocatas_organizador_id_fkey;
         ALTER TABLE tocatas ADD CONSTRAINT tocatas_organizador_id_fkey
           FOREIGN KEY (organizador_id) REFERENCES usuarios(id) ON DELETE CASCADE;
       END IF;
     END $$`,
    // Candado final: unicidad del nombre de usuario a nivel de base de datos.
    // El bloque busca por tabla+columna+tipo para ser idempotente independientemente
    // del nombre que PostgreSQL le haya asignado a la constraint en cada instancia.
    `DO $$
     BEGIN
       IF NOT EXISTS (
         SELECT 1
         FROM   information_schema.table_constraints  tc
         JOIN   information_schema.constraint_column_usage ccu
                ON  tc.constraint_name = ccu.constraint_name
                AND tc.table_schema    = ccu.table_schema
         WHERE  tc.constraint_type = 'UNIQUE'
           AND  tc.table_name      = 'usuarios'
           AND  ccu.column_name    = 'nombre'
       ) THEN
         ALTER TABLE usuarios ADD CONSTRAINT usuarios_nombre_key UNIQUE (nombre);
       END IF;
     END $$`,
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
