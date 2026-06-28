# ─────────────────────────────────────────────────────────────────────────────
# Bandify IA Service — imagen de producción
#
# Por qué Dockerfile (en lugar de solo Procfile):
#   librosa hace fallback a `audioread` para formatos como .m4a/.mp3/.ogg, y
#   audioread requiere FFmpeg en el PATH del sistema. El buildpack por defecto
#   de Python NO incluye FFmpeg, así que este Dockerfile lo instala vía apt.
# ─────────────────────────────────────────────────────────────────────────────

FROM python:3.11-slim

# ─── Dependencias del sistema ───────────────────────────────────────────────
# - ffmpeg: backend de audioread para .m4a/.mp3/.ogg
# - libsndfile1: backend nativo de soundfile para .wav/.flac
# - build-essential, gcc: necesarios si pip compila wheels (ej. psycopg2)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    build-essential \
    gcc \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ─── Dependencias Python ────────────────────────────────────────────────────
# Copiar requirements primero para aprovechar el cache de Docker
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ─── Código de la app ───────────────────────────────────────────────────────
COPY main.py .
COPY analyzer.py .
COPY database.py .
COPY models.py .

# ─── Configuración runtime ──────────────────────────────────────────────────
# Railway/Render inyectan $PORT en runtime; default 8000 para dev local
ENV PYTHONUNBUFFERED=1 \
    PORT=8000

EXPOSE 8000

# Verificar que FFmpeg quedó disponible (falla el build si algo salió mal)
RUN ffmpeg -version | head -1

# ─── Usuario no privilegiado ────────────────────────────────────────────────
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
