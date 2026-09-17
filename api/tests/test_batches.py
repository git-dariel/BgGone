import io
import json
import zipfile
from pathlib import Path
from types import SimpleNamespace

from PIL import Image

from removebg_api import batches
from removebg_api.config import Settings


class FakeRedis:
    def __init__(self):
        self.values = {}

    def setex(self, key, _seconds, value):
        self.values[key] = value


def test_batch_zip_and_per_image_results(tmp_path, monkeypatch):
    redis = FakeRedis()
    monkeypatch.setattr(batches, "redis_for", lambda _settings: redis)
    monkeypatch.setattr("rq.get_current_job", lambda: SimpleNamespace(id="test-job"))

    class FakeService:
        def __init__(self, *_args):
            pass

        def mask(self, image):
            return Image.new("L", image.size, 255), 0.01

    monkeypatch.setattr(batches, "BackgroundRemovalService", FakeService)
    stream = io.BytesIO()
    Image.new("RGB", (3, 3), "red").save(stream, "PNG")
    settings = Settings(batch_directory=str(tmp_path), warm_model=False)
    batches.process_batch(settings, [("good.png", stream.getvalue()), ("bad.png", b"bad")])
    status = json.loads(redis.values["batch:test-job"])
    assert status["status"] == "complete"
    assert [item["status"] for item in status["items"]] == ["complete", "failed"]
    with zipfile.ZipFile(Path(tmp_path) / "test-job.zip") as archive:
        assert archive.namelist() == ["001-good.png"]


def test_expired_archive_cleanup(tmp_path):
    import os
    import time

    archive = tmp_path / "old.zip"
    archive.write_bytes(b"zip")
    os.utime(archive, (time.time() - 100, time.time() - 100))
    batches.cleanup(Settings(batch_directory=str(tmp_path), batch_retention_seconds=10))
    assert not archive.exists()
