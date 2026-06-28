"""
Análisis de audio Hi-Fi con Librosa + soundfile — Pipeline v2.

Flujo completo para un archivo WAV/FLAC/ALAC/MP3/OGG:

1. DESCARGA STREAMING  — boto3.download_file() → disco temporal (sin cargar en RAM)
2. EXTRACCIÓN EFICIENTE DE SEGMENTOS
   • WAV / FLAC        → soundfile con seek() aleatorio (≤ 30 s de RAM total)
   • MP3 / OGG / M4A  → librosa.load (offset+duration, solo 30 s)
3. ANÁLISIS            — MFCCs, Chroma, HPSS, BPM, RMS sobre el audio original
4. TRANSCODING HI-FI   — FFmpeg: original → MP3 128 kbps (solo si no era ya MP3)
5. GESTIÓN S3          — Upload MP3 → Delete original (orden seguro)
6. CLEANUP             — shutil.rmtree() del directorio temporal

Requisito del sistema: ffmpeg en PATH  (apt-get install ffmpeg / brew install ffmpeg)
"""

import os
import io
import time
import shutil
import tempfile
import subprocess
from typing import List, Tuple, Optional, Dict, Any

import librosa
import numpy as np
import boto3
import botocore.exceptions
from botocore.config import Config as BotoCoreConfig

# soundfile importado con try para no romper el servicio si no está instalado
try:
    import soundfile as sf
    _HAS_SOUNDFILE = True
except ImportError:
    _HAS_SOUNDFILE = False
    print("[WARN] soundfile no disponible — usando librosa para todos los formatos")


# ─────────────────────────────────────────────────────────────────────────────
# Constantes
# ─────────────────────────────────────────────────────────────────────────────

# Formatos que soundfile puede leer con acceso aleatorio (sin cargar todo en RAM)
SOUNDFILE_EXTS = {"wav", "flac", "aif", "aiff"}

# Formatos que deben ser transcodificados a MP3 después del análisis
TRANSCODE_EXTS = {"wav", "flac", "aif", "aiff", "m4a", "alac", "ogg"}

TARGET_SR = 22050       # sample rate para Librosa / análisis
OFFSET_S  = 2.5        # segundos a saltar al inicio (evitar clicks/silencio)
ANALYSIS_S = 30.0      # ventana total de análisis (s)
SEG_S     = 10.0       # duración máxima de cada segmento (s)
MIN_SEG_S = 2.0        # mínimo para considerar un segmento válido


# ─────────────────────────────────────────────────────────────────────────────
# Cliente S3
# ─────────────────────────────────────────────────────────────────────────────

def _get_s3():
    return boto3.client(
        "s3",
        region_name=os.getenv("AWS_REGION"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        config=BotoCoreConfig(
            connect_timeout=10,
            read_timeout=120,   # generoso para archivos de hasta 60 MB
            retries={"max_attempts": 2, "mode": "standard"},
        ),
    )


# ─────────────────────────────────────────────────────────────────────────────
# S3 — Download / Upload / Delete
# ─────────────────────────────────────────────────────────────────────────────

def download_to_file(s3_key: str, dest_path: str) -> bool:
    """
    Descarga streaming de S3 a un archivo local usando multipart transfer.
    El binario nunca se acumula en RAM — boto3 escribe en chunks al disco.
    """
    t0 = time.time()
    print(f"[S3↓] Descargando '{s3_key}' → '{dest_path}'...")
    try:
        s3 = _get_s3()
        s3.download_file(os.getenv("AWS_BUCKET"), s3_key, dest_path)
        size_mb = os.path.getsize(dest_path) / (1024 * 1024)
        elapsed = time.time() - t0
        print(f"[S3↓] ✓ {size_mb:.1f} MB en {elapsed:.1f} s ({size_mb/elapsed:.1f} MB/s)")
        return True
    except botocore.exceptions.ConnectTimeoutError:
        print(f"[S3↓ ERROR] Timeout de conexión para '{s3_key}'")
    except botocore.exceptions.ReadTimeoutError:
        print(f"[S3↓ ERROR] Timeout de lectura para '{s3_key}'")
    except botocore.exceptions.BotoCoreError as exc:
        print(f"[S3↓ ERROR] BotoCoreError: {exc}")
    except Exception as exc:  # pylint: disable=broad-exception-caught
        print(f"[S3↓ ERROR] {exc}")
    return False


def upload_to_s3(local_path: str, s3_key: str) -> bool:
    """Sube un archivo local a S3 como audio/mpeg. Retorna True si exitoso."""
    try:
        s3 = _get_s3()
        s3.upload_file(
            local_path,
            os.getenv("AWS_BUCKET"),
            s3_key,
            ExtraArgs={"ContentType": "audio/mpeg"},
        )
        size_mb = os.path.getsize(local_path) / (1024 * 1024)
        print(f"[S3↑] ✓ '{s3_key}' subido ({size_mb:.1f} MB)")
        return True
    except Exception as exc:  # pylint: disable=broad-exception-caught
        print(f"[S3↑ ERROR] No se pudo subir '{s3_key}': {exc}")
        return False


def delete_from_s3(s3_key: str) -> bool:
    """Elimina un objeto de S3. Solo llamar después de confirmar el upload del MP3."""
    try:
        s3 = _get_s3()
        s3.delete_object(Bucket=os.getenv("AWS_BUCKET"), Key=s3_key)
        print(f"[S3✗] ✓ Original eliminado: '{s3_key}'")
        return True
    except Exception as exc:  # pylint: disable=broad-exception-caught
        print(f"[S3✗ ERROR] No se pudo eliminar '{s3_key}': {exc}")
        return False


# ─────────────────────────────────────────────────────────────────────────────
# Extracción de segmentos — Lossless (soundfile, acceso aleatorio)
# ─────────────────────────────────────────────────────────────────────────────

def extract_segments_soundfile(path: str) -> Optional[Tuple[List[np.ndarray], int]]:
    """
    Lee solo los 3 segmentos necesarios usando soundfile con seek().
    El archivo completo NUNCA se carga en RAM — máximo ~30 s de muestras en memoria.

    Funciona con WAV, FLAC, AIFF.
    """
    if not _HAS_SOUNDFILE:
        return None

    try:
        with sf.SoundFile(path) as f:
            native_sr    = f.samplerate
            total_frames = len(f)
            total_secs   = total_frames / native_sr
            print(
                f"[SF] {f.format}/{f.subtype}  {f.channels}ch  "
                f"{native_sr} Hz  {total_secs:.1f} s"
            )

            offset_frames   = int(OFFSET_S * native_sr)
            analysis_frames = min(
                total_frames - offset_frames,
                int(ANALYSIS_S * native_sr),
            )
            if analysis_frames < int(MIN_SEG_S * native_sr) * 3:
                print(f"[SF WARN] Audio demasiado corto ({total_secs:.1f} s)")
                return None

            seg_frames  = analysis_frames // 3
            read_frames = min(seg_frames, int(SEG_S * native_sr))
            segments    = []

            for i in range(3):
                seek_pos = offset_frames + i * seg_frames
                f.seek(seek_pos)
                data = f.read(read_frames, dtype="float32", always_2d=True)

                # Stereo / multi → mono
                mono = np.mean(data, axis=1).astype(np.float32)

                # Resample to TARGET_SR if native SR differs
                if native_sr != TARGET_SR:
                    mono = librosa.resample(mono, orig_sr=native_sr, target_sr=TARGET_SR)

                segments.append(mono)
                print(
                    f"[SF] Segmento {i}: {len(mono)/TARGET_SR:.1f} s "
                    f"(desde {seek_pos/native_sr:.1f} s)"
                )

        return segments, TARGET_SR

    except Exception as exc:  # pylint: disable=broad-exception-caught
        print(f"[SF ERROR] {exc} — intentando fallback con librosa")
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Extracción de segmentos — Lossy / fallback (librosa)
# ─────────────────────────────────────────────────────────────────────────────

def extract_segments_librosa(path: str) -> Optional[Tuple[List[np.ndarray], int]]:
    """
    Para MP3, OGG, M4A/AAC y fallback general.
    Carga solo offset=2.5 s + duration=30 s (no el archivo completo).
    """
    t0 = time.time()
    try:
        audio_data, sr = librosa.load(
            path,
            sr=TARGET_SR,
            offset=OFFSET_S,
            duration=ANALYSIS_S,
            mono=True,
        )
        print(
            f"[LIBROSA] Cargado en {time.time()-t0:.2f} s — "
            f"{len(audio_data)/sr:.1f} s efectivos @ {sr} Hz"
        )
        segments = list(np.array_split(audio_data, 3))
        return segments, sr
    except Exception as exc:  # pylint: disable=broad-exception-caught
        # Atrapa TODO: OSError, ValueError, NoBackendError de audioread, RuntimeError, etc.
        # Caso típico: librosa hace fallback a audioread para .m4a/.mp3, y audioread
        # necesita FFmpeg en el sistema. Sin FFmpeg, lanza NoBackendError sin mensaje.
        exc_type = type(exc).__name__
        exc_msg  = str(exc) or repr(exc) or '(sin mensaje)'
        print(f"[LIBROSA ERROR] {exc_type} al decodificar '{path}': {exc_msg}")
        print("[LIBROSA HINT] Si es .m4a/.mp3/.ogg, verifica que FFmpeg esté instalado en el sistema.")
        return None


# ─────────────────────────────────────────────────────────────────────────────
# FFmpeg — Transcoding
# ─────────────────────────────────────────────────────────────────────────────

def transcode_to_mp3(input_path: str, output_path: str) -> bool:
    """
    Convierte cualquier formato de audio a MP3 128 kbps con FFmpeg.
    Timeout: 120 s (suficiente para un WAV de 60 MB).
    Retorna True si el proceso terminó con returncode 0.
    """
    try:
        result = subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", input_path,
                "-codec:a", "libmp3lame",
                "-b:a", "128k",
                "-ar", "44100",
                "-ac", "2",           # stereo
                output_path,
            ],
            capture_output=True,
            timeout=120,
        )
        if result.returncode == 0:
            size_mb = os.path.getsize(output_path) / (1024 * 1024)
            print(f"[FFmpeg] ✓ Transcoding completado → {size_mb:.2f} MB")
            return True
        stderr_tail = result.stderr.decode("utf-8", errors="replace")[-600:]
        print(f"[FFmpeg ERROR] returncode={result.returncode}\n{stderr_tail}")
        return False
    except subprocess.TimeoutExpired:
        print("[FFmpeg ERROR] Timeout de 120 s durante transcoding")
        return False
    except FileNotFoundError:
        print("[FFmpeg ERROR] 'ffmpeg' no encontrado en PATH — instalar con: apt-get install ffmpeg")
        return False
    except Exception as exc:  # pylint: disable=broad-exception-caught
        print(f"[FFmpeg ERROR] {exc}")
        return False


# ─────────────────────────────────────────────────────────────────────────────
# Extracción de características por segmento (sin cambios respecto a v1)
# ─────────────────────────────────────────────────────────────────────────────

def extract_segment_features(
    segment: np.ndarray, sr: int, seg_idx: int
) -> Optional[Dict[str, Any]]:
    """
    Extrae vector de 27 dims y descriptores técnicos de un segmento.
    Vector: [mfcc×13, chroma×12, tempo_norm×1, energy_rms×1]
    """
    tag = f"[SEG {seg_idx}]"
    try:
        dur = len(segment) / sr
        print(f"{tag} Procesando ({dur:.1f} s)...")

        mfcc        = librosa.feature.mfcc(y=segment, sr=sr, n_mfcc=13)
        mfcc_mean   = np.mean(mfcc, axis=1)

        chroma      = librosa.feature.chroma_stft(y=segment, sr=sr)
        chroma_mean = np.mean(chroma, axis=1)

        onset_env   = librosa.onset.onset_strength(y=segment, sr=sr)
        tempo, _    = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr)
        bpm         = float(tempo)
        tempo_norm  = bpm / 200.0

        rms    = librosa.feature.rms(y=segment)
        energy = float(np.mean(rms))

        try:
            y_harm, y_perc   = librosa.effects.hpss(segment)
            rms_h            = float(np.sqrt(np.mean(y_harm ** 2)))
            rms_p            = float(np.sqrt(np.mean(y_perc ** 2)))
            total            = (rms_h + rms_p) or 1.0
            harmony_ratio    = round(rms_h / total, 4)
            percussive_ratio = round(rms_p / total, 4)
        except Exception as hpss_err:  # pylint: disable=broad-exception-caught
            print(f"{tag}   [HPSS WARN] {hpss_err}")
            chroma_avg_fb    = float(np.mean(chroma_mean))
            harmony_ratio    = round(min(1.0, chroma_avg_fb * 2.0), 4)
            percussive_ratio = round(1.0 - harmony_ratio, 4)

        chroma_avg = float(np.mean(chroma_mean))
        mfcc1      = float(mfcc_mean[1])

        print(
            f"{tag}   BPM={bpm:.1f}  RMS={energy:.5f}  "
            f"harm={harmony_ratio:.2f}  perc={percussive_ratio:.2f}"
        )

        vector = list(np.concatenate([mfcc_mean, chroma_mean, [tempo_norm], [energy]]))
        if len(vector) != 27:
            print(f"{tag} ERROR: vector tiene {len(vector)} dims")
            return None

        return {
            "vector": [float(x) for x in vector],
            "stats": {
                "harmony_ratio":    harmony_ratio,
                "percussive_ratio": percussive_ratio,
                "tempo_bpm":        round(bpm, 1),
                "energy_rms":       round(energy, 6),
                "chroma_mean":      round(chroma_avg, 4),
                "mfcc1_mean":       round(mfcc1, 4),
            },
        }

    except (ValueError, RuntimeError, OSError) as exc:
        print(f"{tag} ERROR: {exc}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Pipeline principal
# ─────────────────────────────────────────────────────────────────────────────

def _maybe_transcode(s3_ext: str, s3_key: str, tmp_path: str, mp3_path: str) -> Optional[str]:
    """Transcodifica a MP3 si el original es lossless. Retorna la nueva key S3 o None."""
    if s3_ext not in TRANSCODE_EXTS:
        return None
    print(f"\n[FFMPEG] Transcodificando .{s3_ext} → MP3 128 kbps...")
    if not transcode_to_mp3(tmp_path, mp3_path):
        print("[FFMPEG WARN] Transcoding falló — original conservado en S3")
        return None
    derived_mp3_key = s3_key.rsplit(".", 1)[0] + ".mp3"
    if not upload_to_s3(mp3_path, derived_mp3_key):
        print("[CLEANUP WARN] Upload del MP3 falló — original conservado en S3")
        return None
    delete_from_s3(s3_key)
    print(f"[CLEANUP] ✓ S3 limpio — almacenando solo MP3: {derived_mp3_key}")
    return derived_mp3_key


def analyze_audio(s3_key: str) -> Optional[Dict[str, Any]]:
    """
    Pipeline Hi-Fi completo.

    Retorna:
        {
            "vector":     [float × 27],
            "metadata":   {...descriptores técnicos...},
            "mp3_s3_key": str | None,   # nueva key MP3 si se transcodificó, si no None
        }
    """
    s3_ext   = s3_key.rsplit(".", 1)[-1].lower() if "." in s3_key else "mp3"
    tmp_dir  = tempfile.mkdtemp(prefix="bandify_")
    tmp_path = os.path.join(tmp_dir, f"input.{s3_ext}")
    mp3_path = os.path.join(tmp_dir, "output.mp3")

    try:
        print(f"\n[ANALYZER] ── Inicio pipeline ──  formato=.{s3_ext}  key={s3_key}")

        # ── 1. Descarga streaming a disco ────────────────────────────────────
        if not download_to_file(s3_key, tmp_path):
            return None

        # ── 2. Extraer 3 segmentos (inicio / medio / final) ──────────────────
        seg_result: Optional[Tuple[List[np.ndarray], int]] = None

        if s3_ext in SOUNDFILE_EXTS and _HAS_SOUNDFILE:
            print("[ANALYZER] Usando soundfile (acceso aleatorio — máx RAM eficiente)")
            seg_result = extract_segments_soundfile(tmp_path)

        if seg_result is None:
            # Fallback: librosa (carga 30 s en RAM)
            print("[ANALYZER] Usando librosa (modo estándar)")
            seg_result = extract_segments_librosa(tmp_path)

        if seg_result is None:
            return None

        segments, sr = seg_result

        # ── 3. Análisis por segmento ─────────────────────────────────────────
        seg_results = []
        for idx, seg in enumerate(segments):
            if len(seg) < sr * MIN_SEG_S:
                print(f"[SEG {idx}] Segmento demasiado corto ({len(seg)/sr:.1f} s) — omitido")
                continue
            feat = extract_segment_features(seg, sr, idx)
            if feat is not None:
                seg_results.append(feat)

        if not seg_results:
            print("[ANALYZER ERROR] Ningún segmento procesado correctamente")
            return None

        # ── 4. Vector final = promedio de segmentos válidos ───────────────────
        all_vectors  = [np.array(r["vector"]) for r in seg_results]
        final_vector = [float(x) for x in np.mean(all_vectors, axis=0)]

        if len(final_vector) != 27:
            print(f"[ANALYZER ERROR] Vector final tiene {len(final_vector)} dims")
            return None

        def avg_stat(key: str) -> float:
            return round(float(np.mean([r["stats"][key] for r in seg_results])), 6)

        final_metadata = {
            "harmony_ratio":    avg_stat("harmony_ratio"),
            "percussive_ratio": avg_stat("percussive_ratio"),
            "tempo_bpm":        avg_stat("tempo_bpm"),
            "energy_rms":       avg_stat("energy_rms"),
            "chroma_mean":      avg_stat("chroma_mean"),
            "mfcc1_mean":       avg_stat("mfcc1_mean"),
        }

        print(f"\n[ANALYZER] ✓ Vector final ({len(seg_results)} segmentos)")
        print(f"[ANALYZER] Metadata: {final_metadata}")

        # ── 5. Transcoding a MP3 (solo si el original no es ya MP3) ──────────
        final_mp3_key = _maybe_transcode(s3_ext, s3_key, tmp_path, mp3_path)

        return {
            "vector":     final_vector,
            "metadata":   final_metadata,
            "mp3_s3_key": final_mp3_key,   # None si ya era MP3 o si el transcoding falló
        }

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        print(f"[CLEANUP] Directorio temporal eliminado: {tmp_dir}")
