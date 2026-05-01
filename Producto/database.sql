-- ============================================================
-- Bandify · Esquema base PostgreSQL (EP2)
-- ============================================================
-- Crea las tablas principales del proyecto y carga datos de
-- prueba para poder validar la aplicacion sin depender de S3
-- ni del pipeline de IA. Pensado para ejecutarse de cero sobre
-- una base limpia: todos los DROP son CASCADE para evitar
-- conflictos al re-ejecutar.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS tickets   CASCADE;
DROP TABLE IF EXISTS events    CASCADE;
DROP TABLE IF EXISTS reviews   CASCADE;
DROP TABLE IF EXISTS folders   CASCADE;
DROP TABLE IF EXISTS demos     CASCADE;
DROP TABLE IF EXISTS users     CASCADE;

-- ─── users ──────────────────────────────────────────────────
CREATE TABLE users (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email            VARCHAR(160) UNIQUE NOT NULL,
    password_hash    VARCHAR(255)        NOT NULL,
    nombre           VARCHAR(120)        NOT NULL,
    instrumento      VARCHAR(80),
    ciudad           VARCHAR(80),
    fecha_nacimiento DATE,
    created_at       TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ─── demos ──────────────────────────────────────────────────
CREATE TABLE demos (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title            VARCHAR(160) NOT NULL,
    s3_key           VARCHAR(255) NOT NULL,
    duration_seconds INTEGER      NOT NULL CHECK (duration_seconds > 0),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_demos_user_id ON demos(user_id);

-- ─── folders (agrupaciones de demos por usuario) ────────────
CREATE TABLE folders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(120) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, name)
);

-- ─── reviews (feedback de un usuario sobre un demo) ─────────
CREATE TABLE reviews (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    demo_id     UUID        NOT NULL REFERENCES demos(id) ON DELETE CASCADE,
    reviewer_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating      SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (demo_id, reviewer_id)
);
CREATE INDEX idx_reviews_demo_id ON reviews(demo_id);

-- ─── events (tocatas / shows) ───────────────────────────────
CREATE TABLE events (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         VARCHAR(160) NOT NULL,
    description  TEXT,
    fecha        DATE         NOT NULL,
    ciudad       VARCHAR(80)  NOT NULL,
    direccion    VARCHAR(200),
    genero       VARCHAR(80),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_events_fecha ON events(fecha);

-- ─── tickets (entradas a un evento) ─────────────────────────
CREATE TABLE tickets (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id     UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    buyer_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    price_clp    INTEGER     NOT NULL CHECK (price_clp >= 0),
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tickets_event_id ON tickets(event_id);
CREATE INDEX idx_tickets_buyer_id ON tickets(buyer_id);

-- ============================================================
-- Datos de prueba
-- IDs explicitos para que las FK queden enlazadas.
-- password_hash de prueba corresponde a "bandify2026" (bcrypt).
-- ============================================================

INSERT INTO users (id, email, password_hash, nombre, instrumento, ciudad, fecha_nacimiento) VALUES
    ('11111111-1111-1111-1111-111111111111', 'marcelo@bandify.cl',
     '$2a$10$WjKdQsTjLg0iFqf3uVyM2eIuIv0wD2P8C1A3zXUaC1Hn3QbiMRB.S',
     'Marcelo Palma',  'Guitarra',  'Santiago',    '1998-03-12'),
    ('22222222-2222-2222-2222-222222222222', 'julio@bandify.cl',
     '$2a$10$WjKdQsTjLg0iFqf3uVyM2eIuIv0wD2P8C1A3zXUaC1Hn3QbiMRB.S',
     'Julio Silva',    'Bateria',   'Valparaiso',  '2000-07-04'),
    ('33333333-3333-3333-3333-333333333333', 'ignacio@bandify.cl',
     '$2a$10$WjKdQsTjLg0iFqf3uVyM2eIuIv0wD2P8C1A3zXUaC1Hn3QbiMRB.S',
     'Ignacio Farias', 'Bajo',      'Concepcion',  '1999-11-22');

INSERT INTO demos (id, user_id, title, s3_key, duration_seconds) VALUES
    ('aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     '11111111-1111-1111-1111-111111111111',
     'Riff de fusion latina', 'demos/marcelo/fusion-latina.mp3', 184),
    ('aaaa2222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     '22222222-2222-2222-2222-222222222222',
     'Groove en 7/8',         'demos/julio/groove-7-8.mp3',      212),
    ('aaaa3333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     '33333333-3333-3333-3333-333333333333',
     'Linea de bajo funky',   'demos/ignacio/funky-bass.mp3',    167);

INSERT INTO folders (id, user_id, name, description) VALUES
    ('bbbb1111-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
     '11111111-1111-1111-1111-111111111111',
     'Composiciones 2026', 'Demos en proceso para el EP que sale a fin de ano'),
    ('bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
     '22222222-2222-2222-2222-222222222222',
     'Practicas de bateria', 'Sesiones de tempo y dinamica'),
    ('bbbb3333-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
     '33333333-3333-3333-3333-333333333333',
     'Lineas y solos',       'Material para mostrar a colaboradores potenciales');

INSERT INTO reviews (id, demo_id, reviewer_id, rating, comment) VALUES
    ('cccc1111-cccc-cccc-cccc-cccccccccccc',
     'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     '22222222-2222-2222-2222-222222222222',
     5, 'Buen groove, encajaria de cabeza con la bateria'),
    ('cccc2222-cccc-cccc-cccc-cccccccccccc',
     'aaaa2222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     '33333333-3333-3333-3333-333333333333',
     4, 'Falta un poco mas de cuerpo en los graves, pero la metrica esta solida'),
    ('cccc3333-cccc-cccc-cccc-cccccccccccc',
     'aaaa3333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     '11111111-1111-1111-1111-111111111111',
     5, 'Slap muy limpio, calza perfecto con la guitarra ritmica');

INSERT INTO events (id, organizer_id, name, description, fecha, ciudad, direccion, genero) VALUES
    ('dddd1111-dddd-dddd-dddd-dddddddddddd',
     '11111111-1111-1111-1111-111111111111',
     'Noche Bandify Vol. 1',
     'Lanzamiento oficial con tres bandas locales',
     '2026-05-30', 'Santiago',   'Club Chocolate, Av. Ernesto Pinto Lagarrigue 192', 'Indie Rock'),
    ('dddd2222-dddd-dddd-dddd-dddddddddddd',
     '22222222-2222-2222-2222-222222222222',
     'Jam abierta en Valpo',
     'Jam session de jazz fusion abierta a todo musico',
     '2026-06-12', 'Valparaiso', 'Bar Cinzano, Plaza Anibal Pinto 1182',             'Jazz'),
    ('dddd3333-dddd-dddd-dddd-dddddddddddd',
     '33333333-3333-3333-3333-333333333333',
     'Funk en el Bio Bio',
     'Encuentro de bandas funk del sur',
     '2026-07-04', 'Concepcion', 'Sala 666, Cochrane 666',                            'Funk');

INSERT INTO tickets (id, event_id, buyer_id, price_clp) VALUES
    ('eeee1111-eeee-eeee-eeee-eeeeeeeeeeee',
     'dddd1111-dddd-dddd-dddd-dddddddddddd',
     '22222222-2222-2222-2222-222222222222',  5000),
    ('eeee2222-eeee-eeee-eeee-eeeeeeeeeeee',
     'dddd2222-dddd-dddd-dddd-dddddddddddd',
     '33333333-3333-3333-3333-333333333333',  3000),
    ('eeee3333-eeee-eeee-eeee-eeeeeeeeeeee',
     'dddd3333-dddd-dddd-dddd-dddddddddddd',
     '11111111-1111-1111-1111-111111111111',  4500);
