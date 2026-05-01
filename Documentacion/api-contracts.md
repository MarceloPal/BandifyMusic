# Contratos entre servicios — Bandify

## Backend → IA Service

POST /analyze
Content-Type: application/json

{
  "jobId": "uuid-generado-por-backend",
  "s3Key": "demos/usuario123-1234567890.mp3"
}

Respuesta inmediata (Background Task encolado):
{
  "jobId": "uuid",
  "status": "processing"
}

---

GET /jobs/:jobId

Respuesta cuando termina:
{
  "jobId": "uuid",
  "status": "done",
  "vector": [0.23, -0.41, ...] // 27 floats
}

---

## Validación de archivos (seguridad mínima)

- Tipos permitidos: audio/mpeg, audio/wav
- Tamaño máximo: 500 KB
- Duración máxima procesada: 30 segundos