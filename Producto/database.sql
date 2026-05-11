-- ==============================================================================
-- SCRIPT DE BASE DE DATOS: BANDIFY
-- Motor: PostgreSQL 18.3 | Extensiones: pgcrypto, pgvector
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CONFIGURACIÓN Y EXTENSIONES
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;
COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


-- ------------------------------------------------------------------------------
-- 2. MÓDULO DE USUARIOS Y AUTENTICACIÓN
-- ------------------------------------------------------------------------------

CREATE TABLE public.usuarios (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre character varying(100) NOT NULL,
    email character varying(150) NOT NULL UNIQUE,
    password_hash character varying(255) NOT NULL,
    instrumento character varying(100),
    ciudad character varying(100),
    estilo_detectado text,
    tags_musicales jsonb,
    fecha_nacimiento date,
    es_premium boolean DEFAULT false,
    email_secundario text,
    role character varying(20) DEFAULT 'usuario' CHECK (role IN ('usuario', 'admin')),
    es_verificado boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.perfiles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id uuid UNIQUE REFERENCES public.usuarios(id) ON DELETE CASCADE,
    audio_vector public.vector(27),
    s3_key character varying(255),
    audio_metadata jsonb,
    user_tags jsonb DEFAULT '[]'::jsonb,
    oficio jsonb DEFAULT '[]'::jsonb,
    experiencia character varying(50),
    bio text,
    foto_url text,
    banner_url text,
    es_premium boolean DEFAULT false,
    instagram_url text,
    spotify_url text,
    discord_username text,
    discord_url text,
    card_settings jsonb,
    updated_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.password_resets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    token text NOT NULL UNIQUE,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


-- ------------------------------------------------------------------------------
-- 3. MÓDULO DE CONTENIDO (Tocatas, Demos y Entradas)
-- ------------------------------------------------------------------------------

CREATE TABLE public.tocatas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organizador_id uuid REFERENCES public.usuarios(id),
    nombre character varying(200) NOT NULL,
    descripcion text,
    fecha date,
    ciudad character varying(100),
    direccion character varying(255),
    genero character varying(100),
    lat numeric(9,6),
    lng numeric(9,6),
    afiche_url text,
    contacto_email text,
    precio numeric(10,2),
    cantidad_disponible integer,
    created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.tickets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id uuid NOT NULL,
    buyer_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    price_clp integer NOT NULL CHECK (price_clp >= 0),
    purchased_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.demos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id uuid NOT NULL,
    nombre character varying(255),
    s3_key text NOT NULL,
    cover_url text,
    formato_original text,
    peso_original_mb double precision,
    audio_metadata jsonb,
    audio_vector jsonb,
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


-- ------------------------------------------------------------------------------
-- 4. MÓDULO DE INTERACCIONES Y COMUNICACIÓN
-- ------------------------------------------------------------------------------

CREATE TABLE public.mensajes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    de_id uuid REFERENCES public.usuarios(id),
    para_id uuid REFERENCES public.usuarios(id),
    contenido text NOT NULL,
    leido boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.notificaciones (
    id SERIAL PRIMARY KEY,
    usuario_id uuid REFERENCES public.usuarios(id) ON DELETE CASCADE,
    titulo character varying(255) NOT NULL,
    descripcion text NOT NULL,
    tipo character varying(50) DEFAULT 'sistema',
    link text,
    leida boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.noticias (
    id SERIAL PRIMARY KEY,
    autor_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
    titulo character varying(255) NOT NULL,
    contenido text NOT NULL,
    imagen_url text,
    fuente character varying(100) DEFAULT 'Bandify',
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.reportes (
    id SERIAL PRIMARY KEY,
    emisor_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
    tipo_contenido character varying(50) NOT NULL,
    contenido_id uuid NOT NULL,
    motivo text NOT NULL,
    estado character varying(20) DEFAULT 'pendiente',
    created_at timestamp with time zone DEFAULT now()
);


-- ------------------------------------------------------------------------------
-- 5. MÓDULO DE SISTEMA E IA (Jobs y Logs)
-- ------------------------------------------------------------------------------

CREATE TABLE public.jobs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id uuid REFERENCES public.usuarios(id) ON DELETE CASCADE,
    demo_id uuid,
    ia_job_id text,
    s3_key character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'processing',
    created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.audio_jobs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id uuid REFERENCES public.usuarios(id) ON DELETE CASCADE,
    s3_key text NOT NULL,
    status text DEFAULT 'processing',
    audio_vector public.vector(27),
    audio_metadata jsonb,
    error_message text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.admin_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    accion character varying(100) NOT NULL,
    entidad_tipo character varying(50) NOT NULL,
    entidad_id uuid,
    detalles jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Índices de optimización para logs
CREATE INDEX idx_admin_logs_accion ON public.admin_logs USING btree (accion);
CREATE INDEX idx_admin_logs_admin_id ON public.admin_logs USING btree (admin_id);
CREATE INDEX idx_admin_logs_created_at ON public.admin_logs USING btree (created_at DESC);
CREATE INDEX idx_admin_logs_entidad ON public.admin_logs USING btree (entidad_tipo, entidad_id);