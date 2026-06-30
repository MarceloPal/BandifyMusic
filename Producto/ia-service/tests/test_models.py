from models import AnalyzeRequest


def test_analyze_request():

    model = AnalyzeRequest(
        s3_key="music.wav",
        usuario_id="123"
    )

    assert model.s3_key == "music.wav"
    assert model.usuario_id == "123"