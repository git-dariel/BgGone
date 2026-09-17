import io

from PIL import Image

from removebg_api.app import create_app
from removebg_api.config import Settings

from .conftest import upload


def test_health_and_ready(client):
    assert client.get("/v1/health").json == {"status": "ok"}
    assert client.get("/v1/ready").status_code == 200
    assert b"removebg_requests_total" in client.get("/metrics").data


def test_remove_and_webp(client):
    response = client.post("/v1/background/remove", data={"image": upload()}, content_type="multipart/form-data")
    assert response.status_code == 200
    assert response.mimetype == "image/png"
    assert Image.open(io.BytesIO(response.data)).getpixel((0, 0))[3] == 128
    assert response.headers["X-Processing-Duration-Ms"] == "12"
    response = client.post("/v1/background/remove", data={"image": upload(), "format": "webp", "quality": "75"}, content_type="multipart/form-data")
    assert response.status_code == 200
    assert Image.open(io.BytesIO(response.data)).format == "WEBP"


def test_mask_and_edit(client):
    response = client.post("/v1/mask", data={"image": upload(), "threshold": "0.6"}, content_type="multipart/form-data")
    assert response.status_code == 200
    assert Image.open(io.BytesIO(response.data)).getpixel((0, 0)) == 0
    response = client.post("/v1/background/replace", data={"image": upload(), "background": "color", "color": "#0000ff"}, content_type="multipart/form-data")
    assert response.status_code == 200
    assert Image.open(io.BytesIO(response.data)).mode == "RGBA"
    response = client.post("/v1/background/blur", data={"image": upload(), "intensity": "4"}, content_type="multipart/form-data")
    assert response.status_code == 200


def test_background_edits_reuse_cutout_without_inference(client):
    def no_inference(_image):
        raise AssertionError("Background edits should reuse the supplied cutout")

    client.application.config["SERVICE"].mask = no_inference
    cutout = Image.new("RGBA", (4, 4), (255, 0, 0, 255))
    cutout.putpixel((0, 0), (255, 0, 0, 0))
    cutout.putpixel((1, 0), (255, 0, 0, 128))

    def cutout_upload(size=(4, 4)):
        stream = io.BytesIO()
        cutout.resize(size).save(stream, "PNG")
        stream.seek(0)
        return stream, "cutout.png"

    response = client.post(
        "/v1/background/replace",
        data={"image": upload(), "cutout": cutout_upload(), "background": "color", "color": "#0000ff"},
        content_type="multipart/form-data",
    )
    assert response.status_code == 200
    result = Image.open(io.BytesIO(response.data))
    assert result.getpixel((0, 0)) == (0, 0, 255, 255)
    assert result.getpixel((1, 0))[0] > 0
    assert result.getpixel((1, 0))[2] > 0
    assert response.headers["X-Processing-Duration-Ms"] == "0"

    response = client.post(
        "/v1/background/blur",
        data={"image": upload(), "cutout": cutout_upload(), "intensity": "4"},
        content_type="multipart/form-data",
    )
    assert response.status_code == 200
    assert response.headers["X-Processing-Duration-Ms"] == "0"

    bad = client.post(
        "/v1/background/replace",
        data={"image": upload(), "cutout": cutout_upload((2, 2)), "background": "color"},
        content_type="multipart/form-data",
    )
    assert bad.status_code == 400
    assert bad.json["error"]["code"] == "invalid_cutout"


def test_rejects_bad_images_and_parameters(client):
    bad = client.post("/v1/background/remove", data={"image": (io.BytesIO(b"bad"), "bad.png")}, content_type="multipart/form-data")
    assert bad.status_code == 400
    assert bad.json["error"]["code"] == "invalid_image"
    bad = client.post("/v1/background/remove", data={"image": upload(), "format": "gif"}, content_type="multipart/form-data")
    assert bad.status_code == 400
    bad = client.post("/v1/background/replace", data={"image": upload(), "background": "color", "color": "red"}, content_type="multipart/form-data")
    assert bad.status_code == 400


def test_keys_quota_and_revocation(client):
    assert client.post("/v1/keys").status_code == 401
    created = client.post("/v1/keys", headers={"X-Admin-Token": "test-admin"})
    assert created.status_code == 201
    key_id, secret = created.json["id"], created.json["api_key"]
    for _ in range(2):
        assert client.post("/v1/mask", headers={"X-API-Key": secret}, data={"image": upload()}, content_type="multipart/form-data").status_code == 200
    assert client.post("/v1/mask", headers={"X-API-Key": secret}, data={"image": upload()}, content_type="multipart/form-data").status_code == 429
    usage = client.get(f"/v1/keys/{key_id}/usage", headers={"X-Admin-Token": "test-admin"})
    assert usage.json["used"] == 2
    assert client.delete(f"/v1/keys/{key_id}", headers={"X-Admin-Token": "test-admin"}).status_code == 204
    assert client.post("/v1/mask", headers={"X-API-Key": secret}, data={"image": upload()}, content_type="multipart/form-data").status_code == 401


def test_batch_limits(client):
    assert client.post("/v1/batch", data={"images": [upload(), upload(), upload()]}, content_type="multipart/form-data").status_code == 400
    assert client.get("/v1/batch/unknown").status_code in {404, 503}


def test_anonymous_rate_limit(tmp_path):
    from .conftest import FakeService

    app = create_app(Settings(warm_model=False, anonymous_rate_per_minute=1, database_path=str(tmp_path / "keys.db")), FakeService())
    client = app.test_client()
    assert client.post("/v1/mask", data={"image": upload()}, content_type="multipart/form-data", environ_base={"REMOTE_ADDR": "198.51.100.9"}).status_code == 200
    response = client.post("/v1/mask", data={"image": upload()}, content_type="multipart/form-data", environ_base={"REMOTE_ADDR": "198.51.100.9"})
    assert response.status_code == 429
    assert response.json["error"]["code"] == "rate_limited"
