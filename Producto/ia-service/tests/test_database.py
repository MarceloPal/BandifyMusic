import json
from unittest.mock import MagicMock, patch

from database import (
    save_audio_vector,
    create_job,
    mark_job_error,
    get_job_status,
)

@patch("database.get_connection")
def test_save_audio_vector_success(mock_conn):

    conn = MagicMock()
    cursor = MagicMock()

    conn.cursor.return_value = cursor
    mock_conn.return_value = conn

    vector = [0.1] * 27

    ok = save_audio_vector(
        job_id="123",
        vector=vector,
        metadata={"tempo":120},
        mp3_s3_key="music/song.mp3"
    )

    assert ok is True

    cursor.execute.assert_called()
    conn.commit.assert_called_once()
    cursor.close.assert_called_once()
    conn.close.assert_called_once()


def test_save_audio_vector_invalid_length():

    vector = [0.2] * 20

    ok = save_audio_vector("123", vector)

    assert ok is False

@patch("database.get_connection")
def test_create_job(mock_conn):

    conn = MagicMock()
    cursor = MagicMock()

    conn.cursor.return_value = cursor
    mock_conn.return_value = conn

    ok = create_job(
        "job123",
        "user1",
        "audio/test.wav"
    )

    assert ok is True
    conn.commit.assert_called_once()

@patch("database.get_connection")
def test_mark_job_error(mock_conn):

    conn = MagicMock()
    cursor = MagicMock()

    conn.cursor.return_value = cursor
    mock_conn.return_value = conn

    ok = mark_job_error("123", "error")

    assert ok is True
    cursor.execute.assert_called_once()


@patch("database.get_connection")
def test_get_job_status_done(mock_conn):

    conn = MagicMock()
    cursor = MagicMock()

    conn.cursor.return_value = cursor
    mock_conn.return_value = conn

    cursor.fetchone.return_value = (
        "done",
        [0.1] * 27,
        None,
        '{"tempo":120}',
        "music/song.mp3",
    )

    status, vector, error, metadata, key = get_job_status("1")

    assert status == "done"
    assert len(vector) == 27
    assert metadata["tempo"] == 120
    assert key == "music/song.mp3"