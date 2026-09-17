import io

import pytest
from PIL import Image
from werkzeug.datastructures import FileStorage

from removebg_api.errors import APIError
from removebg_api.images import read_image, safe_name


def test_safe_name():
    assert safe_name("../../evil name.png") == "evil_name.png"


def test_mime_and_pixels():
    stream = io.BytesIO()
    Image.new("RGB", (5, 5)).save(stream, "PNG")
    data = stream.getvalue()
    with pytest.raises(APIError, match="MIME"):
        read_image(FileStorage(io.BytesIO(data), filename="a.jpg", content_type="image/jpeg"), 1000, 100)
    with pytest.raises(APIError, match="pixel"):
        read_image(FileStorage(io.BytesIO(data), filename="a.png", content_type="image/png"), 1000, 20)

