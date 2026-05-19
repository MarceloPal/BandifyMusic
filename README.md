# Bandify

Plataforma web de colaboración musical para músicos independientes en Chile. Combina análisis de audio con inteligencia artificial para conectar artistas según su estilo sonoro real, y ofrece herramientas de autogestión y publicación de eventos locales.

---

## Índice

- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura general](#arquitectura-general)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Cómo correr el proyecto en local](#cómo-correr-el-proyecto-en-local)
- [Variables de entorno](#variables-de-entorno)
- [Base de datos](#base-de-datos)
- [Backend — API REST](#backend--api-rest)
- [Servicio de IA](#servicio-de-ia)
- [Frontend](#frontend)
- [Flujos principales](#flujos-principales)
- [Equipo](#equipo)

---

## Stack tecnológico

| Capa | Tecnología | Deploy |
|------|-----------|--------|
| Frontend | React 18 + Vite + TanStack Query + Tailwind CSS | Vercel |
| Backend | Node.js + Express 5 + JWT + Resend | Railway |
| IA | Python + FastAPI + Librosa | Railway |
| Base de datos | PostgreSQL 15 + extensión pgvector | Railway |
| Storage | AWS S3 | us-east-1 |
| Pagos | Mercado Pago SDK (Entorno Sandbox) | - |
| Integraciones | API Ticketmaster Discovery + API GNews | - |

---

## Arquitectura general

```text
Usuario
  │
  ▼
[Frontend — React/Vite]
  │  fetch con JWT
  ▼
[Backend — Express API]
  ├── PostgreSQL (datos + vectores pgvector)
  ├── AWS S3 (audios + imágenes, presigned URLs)
  ├── Mercado Pago Sandbox (Webhooks / Suscripciones)
  ├── APIs Externas (Ticketmaster / GNews)
  └── IA Service (análisis de audio asíncrono)
        │
        ▼
  [FastAPI + Librosa]
  ├── Descarga audio desde S3
  ├── Extrae vector de 27 dimensiones
  ├── Transcodifica a MP3 si es necesario
  └── Guarda vector en PostgreSQL via pgvector
```

El frontend nunca toca S3 directamente: el backend genera URLs prefirmadas (presigned) con tiempo de expiración para subidas y lecturas. El análisis de audio es asíncrono: el frontend lanza el job y hace polling cada 5 segundos hasta que el servicio de IA termine.

---

## Estructura del repositorio

> **Nota de Evaluación EP2:** El desarrollo activo de este hito se encuentra consolidado en la rama `develop`. Asegúrese de revisar los commits en dicha rama.

```text
BandifyMusic/
├── Documentacion/
│   ├── EP2_TPY1101_GrupoBandify.zip                 # Entregables Oficiales EP2
│   └── Entregable_1_TPY1101_Grupo_Bandify.docx.pdf  # Informe académico actualizado
├── Gestion/
│   ├── Documento de definicion del proyecto.docx
│   └── Integrantes.txt
└── Producto/
    ├── database.sql          # Esquema completo + datos de prueba (Postgres-QA)
    ├── backend/              # API REST Node.js
    ├── frontend/             # App React
    └── ia-service/           # Microservicio Python de análisis de audio
```

---

## Cómo correr el proyecto en local

**Requisitos:** Node.js ≥ 18, Python ≥ 3.10, PostgreSQL ≥ 15 con extensión `pgvector`, FFmpeg en PATH.

```bash
# Clonar rama activa
git clone -b develop [https://github.com/BandifyMusic/BandifyMusic-develop.git](https://github.com/BandifyMusic/BandifyMusic-develop.git)

# 1. Base de datos
psql -U postgres -c "CREATE DATABASE bandify;"
psql -U postgres -d bandify -f Producto/database.sql

# 2. Backend
cd Producto/backend
npm install
npm run dev          # http://localhost:3000

# 3. IA Service
cd Producto/ia-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000   # http://localhost:8000

# 4. Frontend
cd Producto/frontend
npm install
npm run dev          # http://localhost:5173
```

---

## Variables de entorno

### Backend (`Producto/backend/.env`)

```env
PORT=3000
FRONTEND_URL=http://localhost:5173
IA_SERVICE_URL=http://localhost:8000
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=tu_secreto_seguro
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_BUCKET=bandify-demos-2026
RESEND_API_KEY=re_...          # Emails transaccionales
MERCADOPAGO_ACCESS_TOKEN=APP_USR-... # Sandbox Token
TICKETMASTER_API_KEY=...
```

### Frontend (`Producto/frontend/.env`)

```env
VITE_API_URL=http://localhost:3000
VITE_BACKEND_URL=http://localhost:3000
```

### IA Service (`Producto/ia-service/.env`)

```env
DATABASE_URL=postgresql://user:pass@host:port/db
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_BUCKET=bandify-demos-2026
```

---

## Base de datos

Esquema PostgreSQL con extensión `pgvector` para búsqueda de similitud de audio. Compuesto por **14 tablas relacionales** bajo un modelo Hub-and-Spoke.

| Tabla Principal | Descripción |
|-------|-------------|
| `usuarios` | Identidad central (Hub), RBAC, control de roles y estado `es_premium` |
| `perfiles` | Perfil extendido (Spoke): `vector(27)`, metadata, bio, `foto_url` |
| `demos` | Biblioteca de audios. Regla de negocio: Max 3 demos en cuenta Freemium |
| `tocatas` | Mantenedor de eventos georreferenciados locales |
| `tickets` | Registro de compra de entradas (Módulo Monetización) |
| `mensajes` | Chat asíncrono directo entre usuarios |

**Vector de 27 dimensiones:**
- `[0–12]` — 13 coeficientes MFCC (timbre)
- `[13–24]` — 12 bins de chroma (notas musicales)
- `[25]` — BPM normalizado (BPM / 200)
- `[26]` — Energía RMS normalizada (0–1)

La similitud entre músicos se calcula con el operador `<=>` de pgvector (distancia coseno).

---

## Backend — API REST

Base URL: `http://localhost:3000`

### Autenticación y Usuarios (`/auth`, `/usuarios`)
Gestión completa de JWT, roles y mantenedores de perfiles. Soporta recuperación asíncrona de credenciales vía API de correo.

### Audio y Modelos Freemium (`/audio`)
Control de persistencia hacia AWS S3 mediante Presigned URLs. 
* **Lógica Comercial:** Cuentas gratuitas están limitadas a cargar archivos de máximo 60 MB y mantener 3 demos activos. Cuentas Premium (validadas vía Mercado Pago) poseen límite de 100 MB y almacenamiento ilimitado.

### Monetización e Integraciones (`/pagos`, `/eventos`)
* **Mercado Pago Sandbox:** Procesamiento de tickets y suscripciones, actualizando la DB mediante Webhooks asíncronos (IPN). Incluye retención técnica del 5% automatizada.
* **Ticketmaster API:** Wrapper transfronterizo con fallback para la agregación de espectáculos globales a la cartelera local de la plataforma.
* **GNews API:** Agregación híbrida para nutrir el feed de noticias musicales.

---

## Servicio de IA (`/analyze`)

Microservicio Python especializado en análisis de audio con Librosa.

### Pipeline de análisis (`analyzer.py`)

1. **Descarga streaming** desde S3 (sin cargar el archivo completo en RAM).
2. **Segmentación** — extrae 3 ventanas de 10 segundos del audio.
3. **Extracción** — MFCC, Chroma, HPSS, BPM y Energía RMS.
4. **Consolidación** — Vector final de 27 dimensiones.
5. **Transcodificación** — Convierte WAV / FLAC / M4A a MP3 128 kbps con FFmpeg.
6. **Persistencia** — Sube MP3 a S3 y guarda huella matemática en PostgreSQL.

---

## Frontend

App React con Vite + Tailwind CSS (Dark Mode estricto). Enrutamiento con React Router y gestión de estado con TanStack Query.

### Componentes Clave (EP2)
* `MiAdn.jsx`: Pipeline visual asíncrono de extracción sonora con animaciones.
* `Explore.jsx`: Interfaz de compatibilidad musical (Matching) y visualización holográfica (`ProfileDrawer`).
* `Tocatas.jsx`: Mapa interactivo renderizado con Leaflet.js y OpenStreetMap para ubicar eventos.
* `Planes.jsx`: Integración visual del Checkout Pro de Mercado Pago.

---

## Equipo

| Integrante | Rol |
|-----------|-----|
| Marcelo Palma | Scrum Master / Dev Backend |
| Julio Silva | Dev Frontend / UX |
| Ignacio Farias | Dev IA / Audio |

**TPY1101 — Taller Aplicado de Programación · DuocUC · Sección 002V**