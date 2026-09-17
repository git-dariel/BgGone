import io

import pytest
from PIL import Image

from removebg_api.app import create_app
from removebg_api.config import Settings


class FakeAdapter:
    def load(self):
        return self


class FakeService:
    adapter = FakeAdapter()

    def mask(self, image):
        mask = Image.new("L", image.size, 128)
        return mask, 0.012


@pytest.fixture
def client(tmp_path):
    settings = Settings(warm_model=False, database_path=str(tmp_path / "keys.db"), batch_directory=str(tmp_path / "batches"), admin_token="test-admin", max_upload_mb=1, max_batch_size=2, key_monthly_quota=2)
    app = create_app(settings, FakeService())
    app.testing = True
    return app.test_client()


def upload(color="red", fmt="PNG", size=(4, 4)):
    stream = io.BytesIO()
    Image.new("RGB", size, color).save(stream, fmt)
    stream.seek(0)
    ext = "jpg" if fmt == "JPEG" else fmt.lower()
    return stream, f"example.{ext}"

