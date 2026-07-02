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
- [Testing y cobertura](#testing-y-cobertura)
- [Equipo](#equipo)

---

## Stack tecnológico

| Capa | Tecnología | Deploy |
|------|-----------|--------|
| Frontend | React 18 + Vite + TanStack Query + Tailwind CSS | Vercel |
| Backend | Node.js + Express 5 + JWT + Brevo (correo transaccional) | Railway |
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

> **Nota de Evaluación EP3:** El desarrollo activo de este hito se encuentra consolidado en la rama `develop`. Asegúrese de revisar los commits en dicha rama.

```text
BandifyMusic/
├── Documentacion/
│   ├── Bandify_EP3.pptx                              # Presentación EP3
│   ├── 3.1.2 Plan Pruebas Funcionales.docx            # Plan de pruebas funcionales
│   ├── 3_1_3_Planilla_Casos_de_Prueba.xlsx            # Planilla de casos de prueba
│   ├── Bitácora de Pruebas de Usuario y Mejora Continua.pdf
│   ├── Evidencia_Backup_QA.pdf
│   └── api-contracts.md                               # Contratos de API
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
git clone -b develop https://github.com/BandifyMusic/BandifyMusic-develop.git

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
EMAIL_USER=tu_correo_autorizado_en_brevo@dominio.cl
BREVO_API_KEY=xkeysib-...      # Emails transaccionales (API HTTP de Brevo)
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

Esquema PostgreSQL con extensión `pgvector` para búsqueda de similitud de audio. Compuesto por **15 tablas relacionales** bajo un modelo Hub-and-Spoke.

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
* **Mercado Pago Sandbox:** Procesamiento de tickets (`/tocatas/:id/checkout`) y suscripciones Premium (`/api/subscriptions/checkout`), redirigiendo al `init_point` de Checkout Pro y actualizando la DB mediante Webhooks asíncronos (IPN).
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

### Componentes/Páginas clave
* `Auth.jsx` / `Onboarding.jsx`: Login, registro, recuperación/restablecimiento de contraseña, y flujo guiado post-registro (ciudad, oficio, estilos y primer demo).
* `MiAdn.jsx`: Pipeline visual asíncrono de extracción sonora, repertorio de demos y reproductor propio.
* `Explore.jsx`: Interfaz de compatibilidad musical (Matching) y visualización de perfil (`ProfileDrawer`).
* `Tocatas.jsx` (wrapper de `TocatasBoard.jsx`): Tablón de eventos con vista de mapa (Leaflet.js + OpenStreetMap vía `MapaTocatas.jsx`) y compra de entradas integrada con Mercado Pago.
* `PublicarTocata.jsx` / `GestionTocatas.jsx`: Creación y edición de tocatas, y panel del organizador (recaudación, cancelar evento).
* `PlanesPremium.jsx`: Checkout de suscripción Premium (Mercado Pago Checkout Pro).
* `Admin.jsx` + `AdminLayout.jsx`: Panel de administración — métricas, gestión de usuarios, tocatas, noticias, ventas y notificaciones masivas ("Megáfono").
* `Profile.jsx` / `Settings.jsx` / `ChangePassword.jsx`: Perfil propio y público, configuración de cuenta y cambio de contraseña.

---

## Flujos principales

1. **Registro → Onboarding → Primer análisis de IA:** `Auth.jsx` crea la cuenta → `Onboarding.jsx` pide ciudad/oficio/estilos → sube un demo (presigned URL a S3) → el backend crea un job → el frontend hace polling a `/audio/jobs/:id` cada 5 s hasta que el IA Service termina el vector de 27 dimensiones.
2. **Matching:** `Explore.jsx` consulta `/matching/buscar`, que ordena candidatos por similitud coseno (`<=>` de pgvector) combinada con coincidencia de tags/género.
3. **Publicar y vender entradas de una tocata:** `PublicarTocata.jsx` crea/edita el evento (`POST`/`PATCH /tocatas`) → aparece en `TocatasBoard.jsx` (tablón + mapa) → un asistente compra vía `POST /tocatas/:id/checkout`, que redirige al Checkout Pro de Mercado Pago → el organizador ve la recaudación en `GestionTocatas.jsx`.
4. **Suscripción Premium:** `PlanesPremium.jsx` llama a `POST /api/subscriptions/checkout`, redirige al `init_point` de Mercado Pago, y el backend actualiza `es_premium` vía webhook (IPN).

---

## Testing y cobertura

| Servicio | Framework | Cobertura | Comando |
|---|---|---|---|
| Backend | Jest + Supertest | 92/92 tests · **81.3%** lines | `cd Producto/backend && npx jest --coverage` |
| Frontend | Vitest + React Testing Library | 149/149 tests · **61.6%** lines | `cd Producto/frontend && npx vitest run --coverage` |
| IA Service | pytest + FastAPI TestClient | 47 tests · **80%** lines (solo código de app, sin `tests/`) | `cd Producto/ia-service && pytest --cov=. --cov-report=term-missing` |

Cubren, entre otros: control de acceso JWT y aislamiento entre usuarios (`security.test.js`), el pipeline de análisis de audio y sus fallos de S3/FFmpeg (`test_analyzer.py`), los guards de rutas privadas/admin del frontend (`App.test.jsx`), y los flujos de dinero (compra de entradas y suscripción Premium vía Mercado Pago).

---

## Equipo

| Integrante | Rol |
|-----------|-----|
| Marcelo Palma | Scrum Master / Dev Backend |
| Julio Silva | Dev Frontend / UX |
| Ignacio Farias | Dev IA / Audio |

**TPY1101 — Taller Aplicado de Programación · DuocUC · Sección 002V**