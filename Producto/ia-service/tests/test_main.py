from fastapi.testclient import TestClient

from main import app

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