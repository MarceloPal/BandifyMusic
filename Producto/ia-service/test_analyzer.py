"""
UT-01: Valida que extract_segment_features produce un vector de exactamente 27
dimensiones con valores numéricos, usando audio sintético (sin boto3 / S3).
"""

import io
import struct
import wave
import numpy as np
import pytest

from analyzer import extract_segment_features, TARGET_SR


# ──────────────────────────────────────────────────────────────────────────────
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
