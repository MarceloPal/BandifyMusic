-- =====================================================
-- BASE DE DATOS: BANDIFY
-- Script ordenado con:
-- 14 tablas
-- Claves primarias y foráneas
-- Procedimientos almacenados (P.A.)
-- 5 datos de prueba
-- PostgreSQL
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- TABLA: usuarios
-- =====================================================
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    instrumento VARCHAR(100),
    ciudad VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    estilo_detectado TEXT,
    tags_musicales JSONB,
    fecha_nacimiento DATE,
    es_premium BOOLEAN DEFAULT FALSE,
    role VARCHAR(20) DEFAULT 'usuario'
);

-- =====================================================
-- TABLA: perfiles
-- =====================================================
CREATE TABLE perfiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id),
    audio_vector VECTOR(27),
    s3_key VARCHAR(255),
    updated_at TIMESTAMP DEFAULT NOW(),
    audio_metadata JSONB,
    user_tags JSONB DEFAULT '[]',
    oficio JSONB DEFAULT '[]',
    experiencia VARCHAR(50),
    bio TEXT,
    foto_url TEXT,
    es_premium BOOLEAN DEFAULT FALSE,
    instagram_url TEXT,
    spotify_url TEXT
);

-- =====================================================
-- TABLA: demos
-- =====================================================
CREATE TABLE demos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id),
    nombre VARCHAR(255),
    s3_key TEXT NOT NULL,
    cover_url TEXT,
    audio_metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    formato_original TEXT,
    peso_original_mb DOUBLE PRECISION,
    audio_vector JSONB,
    activo BOOLEAN DEFAULT TRUE
);

-- =====================================================
-- TABLA: jobs
-- =====================================================
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id),
    s3_key VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'processing',
    created_at TIMESTAMP DEFAULT NOW(),
    ia_job_id TEXT,
    demo_id UUID REFERENCES demos(id)
);

-- =====================================================
-- TABLA: audio_jobs
-- =====================================================
CREATE TABLE audio_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id),
    s3_key TEXT NOT NULL,
    status TEXT DEFAULT 'processing',
    audio_vector VECTOR(27),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    audio_metadata JSONB
);

-- =====================================================
-- TABLA: mensajes
-- =====================================================
CREATE TABLE mensajes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    de_id UUID REFERENCES usuarios(id),
    para_id UUID REFERENCES usuarios(id),
    contenido TEXT NOT NULL,
    leido BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- TABLA: noticias
-- =====================================================
CREATE TABLE noticias (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    contenido TEXT NOT NULL,
    imagen_url TEXT,
    fuente VARCHAR(100) DEFAULT 'Bandify',
    autor_id UUID REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- TABLA: notificaciones
-- =====================================================
CREATE TABLE notificaciones (
    id SERIAL PRIMARY KEY,
    usuario_id UUID REFERENCES usuarios(id),
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT NOT NULL,
    tipo VARCHAR(50) DEFAULT 'sistema',
    leida BOOLEAN DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    imagen_url TEXT
);

-- =====================================================
-- TABLA: password_resets
-- =====================================================
CREATE TABLE password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id),
    token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- TABLA: reportes
-- =====================================================
CREATE TABLE reportes (
    id SERIAL PRIMARY KEY,
    emisor_id UUID REFERENCES usuarios(id),
    tipo_contenido VARCHAR(50) NOT NULL,
    contenido_id UUID NOT NULL,
    motivo TEXT NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente',
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- TABLA: soporte_tickets
-- =====================================================
CREATE TABLE soporte_tickets (
    id SERIAL PRIMARY KEY,
    usuario_id UUID REFERENCES usuarios(id),
    email VARCHAR(255) NOT NULL,
    asunto VARCHAR(255),
    mensaje TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- TABLA: tocatas
-- =====================================================
CREATE TABLE tocatas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizador_id UUID REFERENCES usuarios(id),
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    fecha DATE,
    ciudad VARCHAR(100),
    direccion VARCHAR(255),
    genero VARCHAR(100),
    lat NUMERIC(9,6),
    lng NUMERIC(9,6),
    created_at TIMESTAMP DEFAULT NOW(),
    afiche_url TEXT,
    contacto_email TEXT,
    precio NUMERIC(10,2),
    cantidad_disponible INTEGER
);

-- =====================================================
-- TABLA: tickets
-- =====================================================
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES tocatas(id),
    buyer_id UUID REFERENCES usuarios(id),
    price_clp INTEGER NOT NULL CHECK(price_clp >= 0),
    purchased_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- TABLA: admin_logs
-- =====================================================
CREATE TABLE admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES usuarios(id),
    accion VARCHAR(100) NOT NULL,
    entidad_tipo VARCHAR(50) NOT NULL,
    entidad_id UUID,
    detalles JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- TABLA: tickets_extra
-- =====================================================
CREATE TABLE tickets_extra (
    id SERIAL PRIMARY KEY,
    usuario_id UUID REFERENCES usuarios(id),
    descripcion TEXT,
    estado VARCHAR(50) DEFAULT 'abierto',
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- PROCEDIMIENTOS ALMACENADOS (P.A.)
-- =====================================================

-- Registrar usuario
CREATE OR REPLACE PROCEDURE registrar_usuario(
    p_nombre VARCHAR,
    p_email VARCHAR,
    p_password VARCHAR
)
LANGUAGE SQL
AS $$
    INSERT INTO usuarios(nombre, email, password_hash)
    VALUES(p_nombre, p_email, p_password);
$$;

-- Crear notificación
CREATE OR REPLACE PROCEDURE crear_notificacion(
    p_usuario UUID,
    p_titulo VARCHAR,
    p_descripcion TEXT
)
LANGUAGE SQL
AS $$
    INSERT INTO notificaciones(usuario_id, titulo, descripcion)
    VALUES(p_usuario, p_titulo, p_descripcion);
$$;

-- =====================================================
-- DATOS DE PRUEBA (5)
-- =====================================================

INSERT INTO usuarios(nombre, email, password_hash, instrumento, ciudad, estilo_detectado)
VALUES
('Carlos Vega', 'carlos@gmail.com', '1234', 'Guitarra', 'Santiago', 'Rock'),
('Ana Torres', 'ana@gmail.com', '1234', 'Batería', 'Valparaíso', 'Metal'),
('Luis Rojas', 'luis@gmail.com', '1234', 'Bajo', 'Concepción', 'Jazz'),
('María Soto', 'maria@gmail.com', '1234', 'Voz', 'La Serena', 'Pop'),
('Pedro Díaz', 'pedro@gmail.com', '1234', 'Teclado', 'Temuco', 'Indie');

INSERT INTO perfiles(usuario_id, experiencia, bio)
SELECT id, 'Intermedio', 'Perfil de músico en Bandify'
FROM usuarios
LIMIT 5;

INSERT INTO demos(usuario_id, nombre, s3_key, formato_original, peso_original_mb)
SELECT id, 'Demo Musical', 'audio/demo.mp3', 'mp3', 4.5
FROM usuarios
LIMIT 5;

INSERT INTO mensajes(de_id, para_id, contenido)
SELECT u1.id, u2.id, 'Hola, ¿quieres colaborar en una banda?'
FROM usuarios u1, usuarios u2
WHERE u1.id <> u2.id
LIMIT 5;

INSERT INTO noticias(titulo, contenido, fuente, autor_id)
SELECT
'Nueva Tocata',
'Evento musical este fin de semana',
'Bandify',
id
FROM usuarios
LIMIT 5;

INSERT INTO notificaciones(usuario_id, titulo, descripcion)
SELECT
id,
'Nueva Notificación',
'Tienes una nueva actividad en tu cuenta'
FROM usuarios
LIMIT 5;

INSERT INTO password_resets(usuario_id, token, expires_at)
SELECT
id,
md5(random()::text),
NOW() + INTERVAL '1 day'
FROM usuarios
LIMIT 5;

INSERT INTO soporte_tickets(usuario_id, email, asunto, mensaje)
SELECT
id,
email,
'Problema de acceso',
'No puedo iniciar sesión'
FROM usuarios
LIMIT 5;

INSERT INTO tocatas(
organizador_id,
nombre,
descripcion,
fecha,
ciudad,
direccion,
genero,
precio,
cantidad_disponible
)
SELECT
id,
'Tocata Rock 2026',
'Evento musical en vivo',
CURRENT_DATE + INTERVAL '7 day',
'Santiago',
'Av. Principal 123',
'Rock',
5000,
100
FROM usuarios
LIMIT 5;

INSERT INTO tickets(event_id, buyer_id, price_clp)
SELECT t.id, u.id, 5000
FROM tocatas t, usuarios u
LIMIT 5;

INSERT INTO reportes(emisor_id, tipo_contenido, contenido_id, motivo)
SELECT
id,
'usuario',
gen_random_uuid(),
'Contenido inapropiado'
FROM usuarios
LIMIT 5;

INSERT INTO admin_logs(admin_id, accion, entidad_tipo, entidad_id)
SELECT
id,
'CREATE',
'usuario',
gen_random_uuid()
FROM usuarios
LIMIT 5;

INSERT INTO audio_jobs(usuario_id, s3_key)
SELECT
id,
'audio/procesando.mp3'
FROM usuarios
LIMIT 5;

INSERT INTO jobs(usuario_id, s3_key, status)
SELECT
id,
'audio/job.mp3',
'completed'
FROM usuarios
LIMIT 5;

INSERT INTO tickets_extra(usuario_id, descripcion)
SELECT
id,
'Solicitud extra de soporte'
FROM usuarios
LIMIT 5;

-- =====================================================
-- CONSULTA DE VERIFICACIÓN
-- =====================================================

SELECT * FROM usuarios;
SELECT * FROM perfiles;
SELECT * FROM demos;
SELECT * FROM mensajes;
SELECT * FROM tocatas;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
