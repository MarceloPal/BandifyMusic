from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app, process_audio_task

client = TestClient(app)


def test_health():

    response = client.get("/health")

    assert response.status_code == 200

    body = response.json()

    assert body["status"] == "ok"
    assert body["service"] == "bandify-ia-service"

def test_analyze_without_user():

    response = client.post(
        "/analyze",
        json={
            "s3_key":"audio.wav",
            "usuario_id":""
        }
    )

    assert response.status_code == 400

def test_analyze_without_key():

    response = client.post(
        "/analyze",
        json={
            "s3_key":"",
            "usuario_id":"1"
        }
    )

    assert response.status_code == 400


def test_analyze_with_whitespace_only_fields():

    response = client.post(
        "/analyze",
        json={
            "s3_key": "   ",
            "usuario_id": "1"
        }
    )

    assert response.status_code == 400


def test_analyze_missing_field_returns_422():

    # usuario_id ni siquiera está presente en el body → falla la validación
    # de Pydantic antes de llegar al handler (422, no el 400 manual).
    response = client.post(
        "/analyze",
        json={"s3_key": "audio.wav"}
    )

    assert response.status_code == 422


@patch("main.process_audio_task")
@patch("main.create_job")
def test_analyze_success(mock_create_job, mock_process_task):

    mock_create_job.return_value = True

    response = client.post(
        "/analyze",
        json={
            "s3_key": "audio/demo.wav",
            "usuario_id": "user-1"
        }
    )

    assert response.status_code == 200

    body = response.json()

    assert body["status"] == "processing"
    assert isinstance(body["jobId"], str) and len(body["jobId"]) > 0

    mock_create_job.assert_called_once()
    job_id, usuario_id, s3_key = mock_create_job.call_args[0]
    assert usuario_id == "user-1"
    assert s3_key == "audio/demo.wav"
    assert job_id == body["jobId"]


@patch("main.process_audio_task")
@patch("main.create_job")
def test_analyze_db_error_creating_job(mock_create_job, mock_process_task):

    mock_create_job.return_value = False

    response = client.post(
        "/analyze",
        json={
            "s3_key": "audio/demo.wav",
            "usuario_id": "user-1"
        }
    )

    assert response.status_code == 500
    assert response.json()["detail"] == "Error creando job en la base de datos"


@patch("main.get_job_status")
def test_get_job_status_not_found(mock_get_status):

    mock_get_status.return_value = (None, None, None, None, None)

    response = client.get("/jobs/no-existe")

    assert response.status_code == 404
    assert response.json()["detail"] == "Job no encontrado"


@patch("main.get_job_status")
def test_get_job_status_processing(mock_get_status):

    mock_get_status.return_value = ("processing", None, None, None, None)

    response = client.get("/jobs/job-1")

    assert response.status_code == 200

    body = response.json()
    assert body["status"] == "processing"
    assert body["vector"] is None


@patch("main.get_job_status")
def test_get_job_status_done(mock_get_status):

    vector = [0.1] * 27
    metadata = {"tempo": 120}

    mock_get_status.return_value = ("done", vector, None, metadata, "audio/final.mp3")

    response = client.get("/jobs/job-1")

    assert response.status_code == 200

    body = response.json()
    assert body["status"] == "done"
    assert body["vector"] == vector
    assert body["metadata"] == metadata
    assert body["mp3_s3_key"] == "audio/final.mp3"


@patch("main.get_job_status")
def test_get_job_status_error(mock_get_status):

    mock_get_status.return_value = ("error", None, "Vector con 10 dims, se esperaban 27", None, None)

    response = client.get("/jobs/job-1")

    assert response.status_code == 200

    body = response.json()
    assert body["status"] == "error"
    assert body["message"] == "Vector con 10 dims, se esperaban 27"


# ── process_audio_task (background job) ──────────────────────────────────────
# Se prueba directamente en vez de a través del endpoint /analyze porque este
# corre en un executor en segundo plano (asyncio.run_in_executor): invocarlo
# vía HTTP haría el test dependiente de timing entre threads.

@patch("main.mark_job_error")
@patch("main.analyze_audio")
def test_process_audio_task_analyze_returns_none(mock_analyze, mock_mark_error):

    mock_analyze.return_value = None

    process_audio_task("job-1", "audio/demo.wav")

    mock_mark_error.assert_called_once()
    assert "No se pudo extraer vector" in mock_mark_error.call_args[0][1]


@patch("main.mark_job_error")
@patch("main.analyze_audio")
def test_process_audio_task_wrong_vector_length(mock_analyze, mock_mark_error):

    mock_analyze.return_value = {
        "vector": [0.1, 0.2, 0.3],
        "metadata": {},
        "mp3_s3_key": None,
    }

    process_audio_task("job-1", "audio/demo.wav")

    mock_mark_error.assert_called_once()
    assert "se esperaban 27" in mock_mark_error.call_args[0][1]


@patch("main.save_audio_vector")
@patch("main.mark_job_error")
@patch("main.analyze_audio")
def test_process_audio_task_success(mock_analyze, mock_mark_error, mock_save):

    vector = [0.0] * 27
    mock_analyze.return_value = {
        "vector": vector,
        "metadata": {"tempo": 100},
        "mp3_s3_key": "audio/final.mp3",
    }
    mock_save.return_value = True

    process_audio_task("job-1", "audio/demo.wav")

    mock_save.assert_called_once_with(
        "job-1", vector, {"tempo": 100}, mp3_s3_key="audio/final.mp3"
    )
    mock_mark_error.assert_not_called()


@patch("main.save_audio_vector")
@patch("main.mark_job_error")
@patch("main.analyze_audio")
def test_process_audio_task_save_fails(mock_analyze, mock_mark_error, mock_save):

    mock_analyze.return_value = {
        "vector": [0.0] * 27,
        "metadata": None,
        "mp3_s3_key": None,
    }
    mock_save.return_value = False

    process_audio_task("job-1", "audio/demo.wav")

    mock_mark_error.assert_called_once_with("job-1", "Error guardando vector en PostgreSQL")


@patch("main.mark_job_error")
@patch("main.analyze_audio")
def test_process_audio_task_unexpected_exception(mock_analyze, mock_mark_error):

    mock_analyze.side_effect = RuntimeError("boom")

    process_audio_task("job-1", "audio/demo.wav")

    mock_mark_error.assert_called_once()
    error_message = mock_mark_error.call_args[0][1]
    assert "Excepción inesperada" in error_message
    assert "RuntimeError" in error_message
    assert "boom" in error_message
