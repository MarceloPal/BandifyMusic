# Bandify 
Plataforma web de colaboración musical para músicos independientes chilenos.

## Stack tecnológico
- Frontend: React + Vite + TanStack Query → Vercel
- Backend: Node.js + Express + pgvector → Railway
- IA: Python + FastAPI + Librosa → Railway
- Storage: AWS S3
- Base de datos: PostgreSQL + pgvector

## Estructura del repositorio

```
bandify/
├── Documentacion/                        # Entregables academicos (informes, UML, MER, Carta Gantt)
│   ├── api-contracts.md
│   └── Entregable_1_TPY1101_Grupo_Bandify.docx
├── Producto/                             # Codigo fuente del producto
│   ├── frontend/                         # React + Vite
│   ├── backend/                          # Node.js + Express
│   ├── ia-service/                       # Python + FastAPI + Librosa
│   └── database.sql                      # Esquema base PostgreSQL + datos de prueba
└── Gestion/                              # Documentos de gestion del proyecto
    ├── 1.1.2 Documento de registro de definicion e identificacion del proyecto.docx
    └── Integrantes.txt
```

## Como correr el proyecto en local

```bash
# Backend
cd Producto/backend && npm install && npm run dev

# Frontend
cd Producto/frontend && npm install && npm run dev

# IA Service
cd Producto/ia-service && pip install -r requirements.txt && uvicorn main:app --reload
```

Para levantar la base de datos desde cero, ejecuta `Producto/database.sql` contra una instancia de PostgreSQL (>= 15).

## Equipo
- Marcelo Palma — Scrum Master / Dev Backend
- Julio Silva — Dev Frontend / UX
- Ignacio Farias — Dev IA / Audio

TPY1101 — Taller Aplicado de Programación · DuocUC · Sección 002V
