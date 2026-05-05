# Bandify

Plataforma web de colaboración musical para músicos independientes en Chile. Combina análisis de audio con inteligencia artificial para conectar artistas según su estilo sonoro real, sin formularios ni etiquetas manuales.

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

---

## Arquitectura general

```
Usuario
  │
  ▼
[Frontend — React/Vite]
  │  fetch con JWT
  ▼
[Backend — Express API]
  ├── PostgreSQL (datos + vectores pgvector)
  ├── AWS S3 (audios + imágenes, presigned URLs)
  └── IA Service (análisis de audio)
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

```
BandifyMusic/
├── Documentacion/
│   ├── api-contracts.md                          # Contratos de API entre servicios
│   └── Entregable_1_TPY1101_Grupo_Bandify.docx   # Informe académico EP1
├── Gestion/
│   ├── Documento de definicion del proyecto.docx
│   └── Integrantes.txt
└── Producto/
    ├── database.sql          # Esquema completo + datos de prueba
    ├── backend/              # API REST Node.js
    ├── frontend/             # App React
    └── ia-service/           # Microservicio Python de análisis de audio
```

---

## Cómo correr el proyecto en local

**Requisitos:** Node.js ≥ 18, Python ≥ 3.10, PostgreSQL ≥ 15 con extensión `pgvector`, FFmpeg en PATH.

```bash
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
RESEND_API_KEY=re_...          # Opcional — emails transaccionales
RESEND_FROM=Bandify <noreply@bandify.cl>
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

Esquema PostgreSQL con extensión `pgvector` para búsqueda de similitud de audio.

| Tabla | Descripción |
|-------|-------------|
| `usuarios` | Identidad central: email, password_hash, nombre, instrumento, ciudad |
| `perfiles` | Perfil extendido: `audio_vector vector(27)`, `audio_metadata JSONB`, `user_tags JSONB`, bio, foto, banner, links sociales |
| `demos` | Biblioteca de audios del usuario: s3_key, cover, vector propio, activo (soft-delete) |
| `folders` | Colecciones de demos (agrupaciones personalizadas) |
| `reviews` | Calificaciones de demos (1–5 estrellas, únicas por par demo/reviewer) |
| `tocatas` | Eventos en vivo: fecha, ciudad, género, coordenadas, afiche, contacto |
| `tickets` | Compras de entradas (buyer_id, price_clp) |
| `mensajes` | Chat directo entre usuarios (de_id, para_id, leido) |
| `password_resets` | Tokens de recuperación de contraseña con expiración |
| `audio_jobs` | Estado de jobs de análisis: processing / done / error |

**Vector de 27 dimensiones:**
- `[0–12]` — 13 coeficientes MFCC (timbre)
- `[13–24]` — 12 bins de chroma (notas musicales)
- `[25]` — BPM normalizado (BPM / 200)
- `[26]` — Energía RMS normalizada (0–1)

La similitud entre músicos se calcula con el operador `<=>` de pgvector (distancia coseno).

---

## Backend — API REST

Base URL: `http://localhost:3000`

### Autenticación — `/auth`

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/registro` | Registro de nuevo usuario. Devuelve `{ token, usuario }` |
| POST | `/auth/login` | Login. Devuelve JWT + perfil completo + estado premium |
| POST | `/auth/forgot-password` | Envía email con token de recuperación |
| POST | `/auth/reset-password` | Valida token y actualiza contraseña |

Todas las rutas protegidas requieren header `Authorization: Bearer <token>`.

### Usuarios — `/usuarios`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/usuarios/perfil` | Perfil completo del usuario autenticado |
| PUT | `/usuarios/perfil` | Actualiza bio, oficio, tags, foto, banner, links sociales |

### Audio — `/audio`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/audio/upload-url?ext=mp3` | URL prefirmada de S3 para subir audio (5 min) |
| GET | `/audio/listen-url?key=demos/xxx` | URL prefirmada de S3 para reproducir (1 hora) |
| POST | `/audio/analyze` | Inicia job de análisis. Límite: 3 demos activos en plan gratuito |
| GET | `/audio/jobs/:jobId` | Polling del estado del job (`processing` / `done` / `error`) |

### Matching — `/matching`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/matching/buscar` | Devuelve músicos ordenados por compatibilidad |

Parámetros opcionales: `ciudad`, `tags` (separados por coma), `limite`.

**Fórmula de score:** `60 % solapamiento de tags + 40 % similitud coseno de audio − 20 pp penalización por BPM muy distinto`

### Demos — `/demos`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/demos` | Lista demos activos del usuario |
| PUT | `/demos/:id` | Actualiza nombre o cover |
| DELETE | `/demos/:id` | Soft-delete (marca activo = false) |

### Tocatas — `/tocatas`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/tocatas/publicas` | Eventos futuros (sin auth, sin emails) |
| GET | `/tocatas` | Eventos con filtros (ciudad, género, fecha) |
| POST | `/tocatas` | Crea evento (requiere auth) |
| GET | `/tocatas/:id` | Detalle del evento con info del organizador |
| DELETE | `/tocatas/:id` | Elimina evento (solo organizador) |

### Mensajes — `/mensajes`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/mensajes/conversaciones` | Lista de conversaciones con contador de no leídos |
| GET | `/mensajes/conversacion/:usuarioId` | Hilo completo con un usuario |
| POST | `/mensajes` | Envía mensaje (notifica al destinatario por email) |
| PUT | `/mensajes/:id/leer` | Marca mensaje como leído |

### Notificaciones — `/notificaciones`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/notificaciones` | Agrega mensajes no leídos + eventos cercanos + análisis recientes |
| PATCH | `/notificaciones/leer` | Marca todos los mensajes como leídos |

### Imágenes — `/images`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/images/upload-url?type=avatar&ext=jpg` | URL prefirmada para subir imagen |
| GET | `/images/view-url?key=avatars/xxx.jpg` | URL prefirmada para ver imagen |

---

## Servicio de IA

Base URL: `http://localhost:8000`

Microservicio Python especializado en análisis de audio con Librosa.

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Healthcheck |
| POST | `/analyze` | Inicia análisis de un audio en S3 |
| GET | `/jobs/:jobId` | Consulta estado y resultado del job |

### Pipeline de análisis (`analyzer.py`)

1. **Descarga streaming** desde S3 (sin cargar el archivo completo en RAM)
2. **Segmentación** — extrae 3 ventanas de 10 segundos del audio
3. **Por cada segmento extrae:**
   - 13 coeficientes MFCC (timbre)
   - 12 bins de chroma (distribución de notas)
   - HPSS — separación armónico/percusivo (% por componente)
   - BPM estimado con `librosa.beat.tempo`
   - Energía RMS
4. **Votación y promedio** — consolida los 3 segmentos en un vector final de 27 dimensiones
5. **Transcodificación** — convierte WAV / FLAC / OGG / M4A a MP3 128 kbps con FFmpeg (si aplica)
6. **Sube MP3** a S3 bajo `demos/`
7. **Elimina original** de S3 si fue transcodificado
8. **Guarda resultado** — vector en `perfiles.audio_vector` (pgvector) y metadata en `perfiles.audio_metadata` (JSONB)

---

## Frontend

App React con Vite. Enrutamiento con React Router 7, estado del servidor con TanStack Query.

### Páginas

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/` | `Landing.jsx` | Hero, Cómo funciona, Tocatas públicas |
| `/auth` | `Auth.jsx` | Login / registro / recuperación de contraseña |
| `/onboarding` | `Onboarding.jsx` | Setup inicial de perfil post-registro |
| `/mi-adn` | `MiAdn.jsx` | Subida de demo, análisis de audio, biblioteca |
| `/profile` | `Profile.jsx` | Ver y editar perfil, foto, banner, links sociales |
| `/explore` | `Explore.jsx` | Búsqueda de músicos con filtros y scoring |
| `/messages` | `Messages.jsx` | Chat directo entre usuarios |
| `/tocatas` | `Tocatas.jsx` | Descubrimiento y creación de eventos |
| `/notifications` | `Notifications.jsx` | Centro de notificaciones agregadas |
| `/settings` | `Settings.jsx` | Configuración de cuenta (Master-Detail) |
| `/help` | `Help.jsx` | Preguntas frecuentes y soporte |

### Componentes clave

| Componente | Descripción |
|-----------|-------------|
| `TopNavbar.jsx` | Barra superior fija con logo y menú desplegable del usuario |
| `Sidebar.jsx` | Menú lateral de navegación (mantenido como fallback mobile) |
| `Footer.jsx` | Footer con columnas de navegación, selector de idioma e Instagram |
| `ProfileCard.jsx` | Tarjeta visual de músico con efecto holográfico configurable |
| `ProfileDrawer.jsx` | Panel lateral deslizable con perfil completo de un músico |
| `ProfileSidePanel.jsx` | Vista alternativa de perfil |
| `AudioPlayer.jsx` | Reproductor HTML5 personalizado |
| `AudioAnalysisLoader.jsx` | Overlay de progreso durante el análisis |
| `GooeyNav.jsx` | Navegación animada con efecto gooey (landing) |
| `SoftAurora.jsx` | Fondo animado con gradientes WebGL |
| `PremiumModal.jsx` | Modal de upgrade al alcanzar el límite de demos gratuitos |
| `Stepper.jsx` | Indicador de pasos para el onboarding |

### Contexto y hooks

| Archivo | Descripción |
|---------|-------------|
| `context/AuthContext.jsx` | Estado global de auth: token, user, login, logout, updateUser. Persiste en localStorage |
| `hooks/useImageUrl.js` | Obtiene URL prefirmada de imagen desde el backend |
| `utils/helpers.js` | `API_URL`, `getInitials()`, helpers de fecha |
| `utils/audioHelpers.js` | `deriveStats()`, `detectKey()`, `suggestGenres()`, constantes de tags e instrumentos |

---

## Flujos principales

### 1. Subida y análisis de audio

```
Usuario sube archivo
  → GET /audio/upload-url       (backend genera URL prefirmada)
  → PUT <presigned-url>         (frontend sube directo a S3)
  → POST /audio/analyze         (backend crea job → llama IA service)
  → IA descarga, analiza, sube MP3, guarda vector
  → Frontend poll GET /audio/jobs/:id cada 5s
  → Al completar: perfil actualizado + email "ADN listo"
```

### 2. Matching de músicos

```
Usuario entra a /explore
  → GET /matching/buscar?tags=Rock,Jazz&ciudad=Santiago
  → Backend: score = 60% tags + 40% coseno pgvector − BPM penalty
  → Devuelve lista ordenada con shared_tags + compatibilidad %
  → Frontend muestra tarjetas con ProfileDrawer al hacer clic
```

### 3. Mensajería

```
Usuario envía mensaje
  → POST /mensajes {para_id, contenido}
  → Backend guarda en DB + envía email async (fire-and-forget)
  → Destinatario ve badge en /notifications
  → GET /mensajes/conversacion/:id → muestra hilo
  → PUT /mensajes/:id/leer → limpia badge
```

### 4. Tocatas

```
Organizador crea evento → POST /tocatas
  → Aparece en /tocatas/publicas (sin auth)
  → Filtros: ciudad, género, fecha
  → Músicos sin cuenta pueden ver el listado desde la landing
```

---

## Equipo

| Integrante | Rol |
|-----------|-----|
| Marcelo Palma | Scrum Master / Dev Backend |
| Julio Silva | Dev Frontend / UX |
| Ignacio Farias | Dev IA / Audio |

**TPY1101 — Taller Aplicado de Programación · DuocUC · Sección 002V**
