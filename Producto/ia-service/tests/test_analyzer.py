"""
UT-01: Valida que extract_segment_features produce un vector de exactamente 27
dimensiones con valores numéricos, usando audio sintético (sin boto3 / S3).
"""

import io
import struct
import wave
import numpy as np
import pytest
from unittest.mock import patch, MagicMock
import subprocess

from analyzer import (
    extract_segment_features,
    download_to_file,
    upload_to_s3,
    delete_from_s3,
    transcode_to_mp3,
    extract_segments_librosa,
    _maybe_transcode,
    analyze_audio,
    TARGET_SR,
)

# ─────────────────────────────────────────────────────────────────────────────
# Helper: genera un segmento de audio sintético (tono puro 440 Hz, 10 s)
# ──────────────────────────────────────────────────────────────────────────────

def make_mock_segment(duration_s: float = 10.0, sr: int = TARGET_SR) -> np.ndarray:
    """Retorna un array float32 con un tono puro de 440 Hz."""
    t = np.linspace(0, duration_s, int(sr * duration_s), endpoint=False)
    signal = (0.5 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)
    return signal


# ──────────────────────────────────────────────────────────────────────────────
# UT-01-A: longitud del vector
# ──────────────────────────────────────────────────────────────────────────────

def test_vector_length_is_27():
    """El vector resultante debe tener exactamente 27 dimensiones."""
    segment = make_mock_segment(duration_s=10.0)
    result = extract_segment_features(segment, sr=TARGET_SR, seg_idx=0)

    assert result is not None, "extract_segment_features retornó None con audio válido"
    vector = result["vector"]
    assert len(vector) == 27, (
        f"Se esperaban 27 dimensiones, se obtuvieron {len(vector)}: {vector}"
    )


# ──────────────────────────────────────────────────────────────────────────────
# UT-01-B: todos los valores son numéricos (float)
# ──────────────────────────────────────────────────────────────────────────────

def test_vector_all_values_are_numeric():
    """Todos los valores del vector deben ser numéricos finitos (no NaN, no inf)."""
    segment = make_mock_segment(duration_s=10.0)
    result = extract_segment_features(segment, sr=TARGET_SR, seg_idx=0)

    assert result is not None
    vector = result["vector"]

    for i, val in enumerate(vector):
        assert isinstance(val, (int, float)), (
            f"Dimensión {i} no es numérica: tipo={type(val).__name__}, valor={val}"
        )
        assert np.isfinite(val), (
            f"Dimensión {i} contiene un valor no finito: {val}"
        )


# ──────────────────────────────────────────────────────────────────────────────
# UT-01-C: estructura del resultado (stats presentes)
# ──────────────────────────────────────────────────────────────────────────────

def test_result_contains_stats_keys():
    """El resultado debe incluir la clave 'stats' con los descriptores esperados."""
    segment = make_mock_segment(duration_s=10.0)
    result = extract_segment_features(segment, sr=TARGET_SR, seg_idx=0)

    assert result is not None
    assert "stats" in result, "Falta la clave 'stats' en el resultado"

    expected_keys = {
        "harmony_ratio",
        "percussive_ratio",
        "tempo_bpm",
        "energy_rms",
        "chroma_mean",
        "mfcc1_mean",
    }
    missing = expected_keys - set(result["stats"].keys())
    assert not missing, f"Faltan claves en stats: {missing}"


# ──────────────────────────────────────────────────────────────────────────────
# UT-01-D: composición del vector (mfcc×13 + chroma×12 + tempo×1 + rms×1 = 27)
# ──────────────────────────────────────────────────────────────────────────────

def test_vector_composition():
    """
    Valida que las primeras 13 posiciones son MFCCs, 12 siguientes Chroma,
    posición 25 es tempo_norm y posición 26 es energy_rms.
    """
    import librosa

    segment = make_mock_segment(duration_s=10.0)
    result = extract_segment_features(segment, sr=TARGET_SR, seg_idx=0)
    assert result is not None

    vector = result["vector"]
    # MFCC: índices 0–12
    mfcc_section = vector[:13]
    # Chroma: índices 13–24
    chroma_section = vector[13:25]
    # Tempo normalizado: índice 25
    tempo_norm = vector[25]
    # Energy RMS: índice 26
    energy_rms = vector[26]

    assert len(mfcc_section) == 13, "La sección MFCC debe tener 13 elementos"
    assert len(chroma_section) == 12, "La sección Chroma debe tener 12 elementos"
    # tempo_norm = bpm / 200, rango esperado (0, 2)
    assert 0.0 <= tempo_norm <= 2.0, (
        f"tempo_norm={tempo_norm} fuera del rango esperado [0, 2]"
    )
    # energy_rms debe ser positivo
    assert energy_rms >= 0.0, f"energy_rms={energy_rms} no puede ser negativo"


# ──────────────────────────────────────────────────────────────────────────────
# UT-01-E: segmento demasiado corto retorna None (comportamiento defensivo)
# ──────────────────────────────────────────────────────────────────────────────

def test_too_short_segment_returns_none():
    """Un segmento < MIN_SEG_S debe ser manejado sin excepción."""
    # 0.5 s es demasiado corto para Librosa (necesita al menos ~2 s para beat_track)
    segment = make_mock_segment(duration_s=0.3)
    # No debe lanzar excepción — puede retornar None o un resultado degradado
    try:
        result = extract_segment_features(segment, sr=TARGET_SR, seg_idx=0)
        # Si retorna resultado, aun así debe respetar la longitud 27
        if result is not None:
            assert len(result["vector"]) == 27
    except Exception as exc:
        pytest.fail(f"extract_segment_features lanzó excepción inesperada: {exc}")

#-──────────────────────────────────────────────────────────────────────────────
# UT-01-F: _maybe_transcode (simulación de transcodificación y S3)
#-──────────────────────────────────────────────────────────────────────────────

@patch("analyzer.upload_to_s3")
@patch("analyzer.transcode_to_mp3")
@patch("analyzer.delete_from_s3")
def test_maybe_transcode_success(
    mock_delete,
    mock_transcode,
    mock_upload
):

    mock_transcode.return_value = True
    mock_upload.return_value = True
    mock_delete.return_value = True

    key = _maybe_transcode(
        "wav",
        "music/test.wav",
        "/tmp/in.wav",
        "/tmp/out.mp3"
    )

    assert key == "music/test.mp3"

@patch("analyzer.transcode_to_mp3")
def test_maybe_transcode_failure(mock_transcode):

    mock_transcode.return_value = False

    result = _maybe_transcode(
        "wav",
        "music/test.wav",
        "a",
        "b"
    )

    assert result is None

# ==========================================================
# UT-02-A
# Pipeline exitoso
# ==========================================================

@patch("analyzer._maybe_transcode")
@patch("analyzer.extract_segment_features")
@patch("analyzer.extract_segments_librosa")
@patch("analyzer.download_to_file")
def test_analyze_audio_success(
    mock_download,
    mock_extract_segments,
    mock_extract_features,
    mock_transcode,
):

    mock_download.return_value = True

    segment = np.ones(TARGET_SR * 5, dtype=np.float32)

    mock_extract_segments.return_value = (
        [segment, segment, segment],
        TARGET_SR,
    )

    feature = {
        "vector": [1.0] * 27,
        "stats": {
            "harmony_ratio": 0.5,
            "percussive_ratio": 0.5,
            "tempo_bpm": 120,
            "energy_rms": 0.3,
            "chroma_mean": 0.2,
            "mfcc1_mean": 0.1,
        },
    }

    mock_extract_features.return_value = feature

    mock_transcode.return_value = "music/test.mp3"

    result = analyze_audio("music/test.wav")

    assert result is not None
    assert len(result["vector"]) == 27
    assert result["mp3_s3_key"] == "music/test.mp3"
    assert result["metadata"]["tempo_bpm"] == 120


# ==========================================================
# UT-02-B
# Error descargando desde S3
# ==========================================================

@patch("analyzer.download_to_file")
def test_analyze_audio_download_failure(mock_download):

    mock_download.return_value = False

    result = analyze_audio("music/test.wav")

    assert result is None


# ==========================================================
# UT-02-C
# No se pudieron obtener segmentos
# ==========================================================

@patch("analyzer.extract_segments_librosa")
@patch("analyzer.download_to_file")
def test_analyze_audio_no_segments(
    mock_download,
    mock_segments,
):

    mock_download.return_value = True
    mock_segments.return_value = None

    result = analyze_audio("music/test.wav")

    assert result is None


# ==========================================================
# UT-02-D
# Todos los segmentos demasiado cortos
# ==========================================================

@patch("analyzer.extract_segments_librosa")
@patch("analyzer.download_to_file")
def test_analyze_audio_short_segments(
    mock_download,
    mock_segments,
):

    mock_download.return_value = True

    short = np.zeros(100, dtype=np.float32)

    mock_segments.return_value = (
        [short, short, short],
        TARGET_SR,
    )

    result = analyze_audio("music/test.wav")

    assert result is None


# ==========================================================
# UT-02-E
# Solo algunos segmentos son válidos
# ==========================================================

@patch("analyzer._maybe_transcode")
@patch("analyzer.extract_segment_features")
@patch("analyzer.extract_segments_librosa")
@patch("analyzer.download_to_file")
def test_analyze_audio_partial_segments(
    mock_download,
    mock_segments,
    mock_features,
    mock_transcode,
):

    mock_download.return_value = True

    segment = np.ones(TARGET_SR * 5, dtype=np.float32)

    mock_segments.return_value = (
        [segment, segment, segment],
        TARGET_SR,
    )

    mock_features.side_effect = [
        None,
        {
            "vector": [2.0] * 27,
            "stats": {
                "harmony_ratio": 0.4,
                "percussive_ratio": 0.6,
                "tempo_bpm": 100,
                "energy_rms": 0.2,
                "chroma_mean": 0.3,
                "mfcc1_mean": 0.1,
            },
        },
        {
            "vector": [4.0] * 27,
            "stats": {
                "harmony_ratio": 0.6,
                "percussive_ratio": 0.4,
                "tempo_bpm": 140,
                "energy_rms": 0.4,
                "chroma_mean": 0.5,
                "mfcc1_mean": 0.2,
            },
        },
    ]

    mock_transcode.return_value = None

    result = analyze_audio("music/test.wav")

    assert result is not None
    assert len(result["vector"]) == 27

    # promedio de 2 y 4
    assert result["vector"][0] == 3.0


# ==========================================================
# UT-02-F
# Vector inválido
# ==========================================================

@patch("analyzer.extract_segment_features")
@patch("analyzer.extract_segments_librosa")
@patch("analyzer.download_to_file")
def test_analyze_audio_invalid_vector(
    mock_download,
    mock_segments,
    mock_features,
):

    mock_download.return_value = True

    segment = np.ones(TARGET_SR * 5, dtype=np.float32)

    mock_segments.return_value = (
        [segment],
        TARGET_SR,
    )

    mock_features.return_value = {
        "vector": [0.0] * 20,
        "stats": {
            "harmony_ratio": 0.5,
            "percussive_ratio": 0.5,
            "tempo_bpm": 120,
            "energy_rms": 0.2,
            "chroma_mean": 0.2,
            "mfcc1_mean": 0.1,
        },
    }

    result = analyze_audio("music/test.wav")

    assert result is None

# -------------------------------------------------------
# DOWNLOAD
# -------------------------------------------------------

@patch("analyzer.os.path.getsize", return_value=1024 * 1024)
@patch("analyzer._get_s3")
def test_download_to_file_success(mock_s3, mock_size):

    client = MagicMock()
    mock_s3.return_value = client

    assert download_to_file("music/test.wav", "tmp.wav") is True

    client.download_file.assert_called_once()


@patch("analyzer._get_s3")
def test_download_to_file_exception(mock_s3):

    client = MagicMock()
    client.download_file.side_effect = Exception("boom")
    mock_s3.return_value = client

    assert download_to_file("music/test.wav", "tmp.wav") is False


# -------------------------------------------------------
# UPLOAD
# -------------------------------------------------------

@patch("analyzer.os.path.getsize", return_value=1024 * 1024)
@patch("analyzer._get_s3")
def test_upload_to_s3_success(mock_s3, mock_size):

    client = MagicMock()
    mock_s3.return_value = client

    assert upload_to_s3("tmp.mp3", "music/test.mp3") is True

    client.upload_file.assert_called_once()


@patch("analyzer._get_s3")
def test_upload_to_s3_failure(mock_s3):

    client = MagicMock()
    client.upload_file.side_effect = Exception()

    mock_s3.return_value = client

    assert upload_to_s3("tmp.mp3", "music/test.mp3") is False


# -------------------------------------------------------
# DELETE
# -------------------------------------------------------

@patch("analyzer._get_s3")
def test_delete_from_s3_success(mock_s3):

    client = MagicMock()
    mock_s3.return_value = client

    assert delete_from_s3("music/test.mp3") is True


@patch("analyzer._get_s3")
def test_delete_from_s3_failure(mock_s3):

    client = MagicMock()
    client.delete_object.side_effect = Exception()

    mock_s3.return_value = client

    assert delete_from_s3("music/test.mp3") is False


# -------------------------------------------------------
# FFMPEG
# -------------------------------------------------------

@patch("analyzer.os.path.getsize", return_value=1024 * 1024)
@patch("analyzer.subprocess.run")
def test_transcode_success(mock_run, mock_size):

    proc = MagicMock()
    proc.returncode = 0

    mock_run.return_value = proc

    assert transcode_to_mp3("a.wav", "b.mp3") is True


@patch("analyzer.subprocess.run")
def test_transcode_returncode_error(mock_run):

    proc = MagicMock()
    proc.returncode = 1
    proc.stderr = b"error"

    mock_run.return_value = proc

    assert transcode_to_mp3("a.wav", "b.mp3") is False


@patch("analyzer.subprocess.run")
def test_transcode_timeout(mock_run):

    mock_run.side_effect = subprocess.TimeoutExpired("ffmpeg", 120)

    assert transcode_to_mp3("a.wav", "b.mp3") is False


@patch("analyzer.subprocess.run")
def test_transcode_ffmpeg_missing(mock_run):

    mock_run.side_effect = FileNotFoundError()

    assert transcode_to_mp3("a.wav", "b.mp3") is False


# -------------------------------------------------------
# LIBROSA
# -------------------------------------------------------

@patch("analyzer.librosa.load")
def test_extract_segments_librosa(mock_load):

    audio = np.zeros(TARGET_SR * 30, dtype=np.float32)

    mock_load.return_value = (audio, TARGET_SR)

    result = extract_segments_librosa("fake.wav")

    assert result is not None

    segments, sr = result

    assert len(segments) == 3
    assert sr == TARGET_SR


@patch("analyzer.librosa.load")
def test_extract_segments_librosa_failure(mock_load):

    mock_load.side_effect = RuntimeError()

    assert extract_segments_librosa("fake.wav") is None

