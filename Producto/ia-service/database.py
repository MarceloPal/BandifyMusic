"""
Conexión a PostgreSQL y operaciones con pgvector.

get_job_status now returns a 5-tuple:
    (status, vector, error_message, metadata, s3_key)
save_audio_vector accepts an optional mp3_s3_key to update audio_jobs.s3_key
after transcoding.
"""

import psycopg2
import json
from pgvector.psycopg2 import register_vector
import os
from typing import List, Optional, Tuple, Dict, Any


def get_connection():
    try:
        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        register_vector(conn)
        print("[DB] Conexión a PostgreSQL establecida")
        return conn
    except psycopg2.Error as e:
        print(f"[DB ERROR] No se pudo conectar a PostgreSQL: {e}")
        raise


def get_job_status(
    job_id: str,
) -> Tuple[Optional[str], Optional[List[float]], Optional[str], Optional[Dict], Optional[str]]:
    """
    Returns: (status, vector, error_message, metadata, s3_key)
    s3_key reflects the current key in audio_jobs (may be the MP3 key after transcoding).
    """
    try:
        conn = get_connection()
        cur = conn.cursor()

        try:
            cur.execute(
                "SELECT status, audio_vector, error_message, audio_metadata, s3_key "
                "FROM audio_jobs WHERE id = %s",
                (job_id,),
            )
            result = cur.fetchone()
        except psycopg2.errors.UndefinedColumn:  # pylint: disable=no-member
            conn.rollback()
            cur.execute(
                "SELECT status, audio_vector, error_message, NULL AS audio_metadata, s3_key "
                "FROM audio_jobs WHERE id = %s",
                (job_id,),
            )
            result = cur.fetchone()

        cur.close()
        conn.close()

        if result is None:
            return None, None, None, None, None

        status, vector, error_message, metadata_raw, s3_key = result

        vector_list = vector if vector is not None else None
        metadata = None
        if metadata_raw is not None:
            metadata = metadata_raw if isinstance(metadata_raw, dict) else json.loads(metadata_raw)

        print(f"[DB] Job {job_id}: status={status}  s3_key={s3_key}")
        return status, vector_list, error_message, metadata, s3_key

    except psycopg2.Error as e:
        print(f"[DB ERROR] Error consultando job {job_id}: {e}")
        raise


def create_job(job_id: str, usuario_id: str, s3_key: str) -> bool:
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO audio_jobs (id, usuario_id, s3_key, status, created_at, updated_at)
            VALUES (%s, %s, %s, 'processing', NOW(), NOW())
            """,
            (job_id, usuario_id, s3_key),
        )
        conn.commit()
        cur.close()
        conn.close()
        print(f"[DB] Job {job_id} creado para usuario {usuario_id}")
        return True
    except psycopg2.Error as e:
        print(f"[DB ERROR] Error creando job: {e}")
        return False


def save_audio_vector(
    job_id: str,
    vector: List[float],
    metadata: Optional[Dict] = None,
    mp3_s3_key: Optional[str] = None,
) -> bool:
    """
    Guarda el vector (27 dims) + metadata, marca el job como 'done'.
    Si mp3_s3_key se proporciona, actualiza también audio_jobs.s3_key
    (apunta al MP3 resultante del transcoding).
    """
    if len(vector) != 27:
        print(f"[DB ERROR] Vector tiene {len(vector)} dims, se esperaban 27")
        return False

    try:
        conn = get_connection()
        cur = conn.cursor()

        try:
            if mp3_s3_key:
                cur.execute(
                    """
                    UPDATE audio_jobs
                    SET status = 'done',
                        audio_vector   = %s,
                        audio_metadata = %s,
                        s3_key         = %s,
                        updated_at     = NOW()
                    WHERE id = %s
                    """,
                    (vector, json.dumps(metadata) if metadata else None, mp3_s3_key, job_id),
                )
            else:
                cur.execute(
                    """
                    UPDATE audio_jobs
                    SET status = 'done',
                        audio_vector   = %s,
                        audio_metadata = %s,
                        updated_at     = NOW()
                    WHERE id = %s
                    """,
                    (vector, json.dumps(metadata) if metadata else None, job_id),
                )
        except psycopg2.errors.UndefinedColumn:  # pylint: disable=no-member
            conn.rollback()
            cur.execute(
                "UPDATE audio_jobs SET status='done', audio_vector=%s, updated_at=NOW() WHERE id=%s",
                (vector, job_id),
            )
            print("[DB WARN] audio_metadata column missing — saved vector only.")

        conn.commit()
        cur.close()
        conn.close()
        print(f"[DB] ✓ Job {job_id} guardado (27 dims) | new_key={mp3_s3_key or 'unchanged'}")
        return True

    except psycopg2.Error as e:
        print(f"[DB ERROR] Error guardando vector para {job_id}: {e}")
        return False


def mark_job_error(job_id: str, error_message: str) -> bool:
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE audio_jobs SET status='error', error_message=%s, updated_at=NOW() WHERE id=%s",
            (error_message, job_id),
        )
        conn.commit()
        cur.close()
        conn.close()
        print(f"[DB] Job {job_id} marcado como error: {error_message}")
        return True
    except psycopg2.Error as e:
        print(f"[DB ERROR] Error marcando error en job {job_id}: {e}")
        return False
