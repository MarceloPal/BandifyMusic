"""
FastAPI app principal del IA Service de Bandify.

Endpoints:
- POST /analyze      → inicia análisis background
- GET  /jobs/{jobId} → estado + vector + metadata + mp3_s3_key
- GET  /health
"""

from fastapi import FastAPI, HTTPException
import os
import uuid
import asyncio
import traceback
from dotenv import load_dotenv

from models import AnalyzeRequest, AnalyzeResponse, JobStatusResponse, HealthResponse
from database import create_job, get_job_status, save_audio_vector, mark_job_error
from analyzer import analyze_audio

load_dotenv()

app = FastAPI(title="Bandify IA Service", version="2.0.0")

print("[STARTUP] IA Service v2.0 — Hi-Fi pipeline con FFmpeg transcoding")
print(f"[STARTUP] DATABASE_URL: {os.getenv('DATABASE_URL', '')[:50]}...")
print(f"[STARTUP] AWS_BUCKET: {os.getenv('AWS_BUCKET')}")
print(f"[STARTUP] AWS_REGION: {os.getenv('AWS_REGION')}")


async def process_audio_task(job_id: str, s3_key: str) -> None:
    """
    Background task: download → hi-fi segment extraction → analyze →
    FFmpeg transcode (if lossless) → upload MP3 → delete original → save to DB.
    """
    print(f"\n[TASK] Iniciando job {job_id}  |  s3_key={s3_key}")
    try:
        result = analyze_audio(s3_key)

        if result is None:
            mark_job_error(job_id, f"No se pudo extraer vector de {s3_key}")
            return

        vector     = result.get("vector", [])
        metadata   = result.get("metadata")
        mp3_s3_key = result.get("mp3_s3_key")  # None if original was already MP3

        if len(vector) != 27:
            mark_job_error(job_id, f"Vector con {len(vector)} dims, se esperaban 27")
            return

        if save_audio_vector(job_id, vector, metadata, mp3_s3_key=mp3_s3_key):
            print(f"[TASK] ✓ Job {job_id} completado | mp3_key={mp3_s3_key}")
        else:
            mark_job_error(job_id, "Error guardando vector en PostgreSQL")

    except Exception as e:  # pylint: disable=broad-exception-caught
        # Log COMPLETO: tipo de excepción + mensaje + traceback en stdout.
        # str(e) puede ser vacío para ciertos errores (ej: NoBackendError de
        # audioread sin FFmpeg). repr(e) y type(e).__name__ dan más contexto.
        exc_type    = type(e).__name__
        exc_repr    = repr(e)
        exc_message = str(e) or '(sin mensaje)'
        full_tb     = traceback.format_exc()

        print(f"\n[TASK ERROR] Job {job_id} falló")
        print(f"[TASK ERROR]   tipo:    {exc_type}")
        print(f"[TASK ERROR]   repr:    {exc_repr}")
        print(f"[TASK ERROR]   mensaje: {exc_message}")
        print(f"[TASK ERROR]   traceback:\n{full_tb}")

        # Mensaje persistido en DB — incluye tipo para que sea útil aún si str(e) es vacío
        mark_job_error(job_id, f"Excepción inesperada: {exc_type}: {exc_message}")


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", service="bandify-ia-service")


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    if not request.s3_key or not request.s3_key.strip():
        raise HTTPException(status_code=400, detail="s3_key es obligatorio")
    if not request.usuario_id or not request.usuario_id.strip():
        raise HTTPException(status_code=400, detail="usuario_id es obligatorio")

    job_id = str(uuid.uuid4())
    if not create_job(job_id, request.usuario_id, request.s3_key):
        raise HTTPException(status_code=500, detail="Error creando job en la base de datos")

    asyncio.create_task(process_audio_task(job_id, request.s3_key))
    return AnalyzeResponse(jobId=job_id, status="processing")


@app.get("/jobs/{jobId}", response_model=JobStatusResponse)
async def get_job_status_endpoint(jobId: str):
    status, vector, error_message, metadata, s3_key = get_job_status(jobId)

    if status is None:
        raise HTTPException(status_code=404, detail="Job no encontrado")

    if status == "done":
        return JobStatusResponse(
            status="done",
            vector=vector,
            metadata=metadata,
            mp3_s3_key=s3_key,   # current s3_key (may be new MP3 key after transcoding)
        )
    if status == "error":
        return JobStatusResponse(status="error", message=error_message)

    return JobStatusResponse(status="processing")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
