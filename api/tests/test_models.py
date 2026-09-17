import sys
from types import SimpleNamespace

import pytest
from PIL import Image

from removebg_api.errors import APIError
from removebg_api.models import (
    BackgroundRemovalService,
    BiRefNetAdapter,
    BiRefNetLiteAdapter,
    BiRefNetPortraitAdapter,
    ISNetAdapter,
    U2NetAdapter,
    U2NetPAdapter,
)


def test_adapter_names():
    assert [cls("cpu").model_name for cls in (U2NetAdapter, U2NetPAdapter, ISNetAdapter, BiRefNetAdapter, BiRefNetLiteAdapter, BiRefNetPortraitAdapter)] == ["u2net", "u2netp", "isnet-general-use", "birefnet-general", "birefnet-general-lite", "birefnet-portrait"]


def test_u2net_uses_matted_alpha_instead_of_raw_mask(monkeypatch):
    calls = []

    def remove(image, **options):
        calls.append(options)
        cutout = Image.new("RGBA", image.size, (40, 30, 20, 255))
        cutout.putpixel((0, 0), (40, 30, 20, 96))
        return cutout

    monkeypatch.setitem(sys.modules, "rembg", SimpleNamespace(remove=remove))
    adapter = U2NetAdapter("cpu")
    adapter.load = lambda: object()
    mask = adapter.predict(Image.new("RGB", (3, 3)))
    assert mask.getpixel((0, 0)) == 96
    assert calls[0]["alpha_matting"] is True
    assert calls[0].get("only_mask") is not True


def test_u2netp_keeps_soft_mask_without_loading_rembg(monkeypatch):
    import numpy as np

    class FakeSession:
        def get_inputs(self):
            return [SimpleNamespace(name="input.1")]

        def run(self, _outputs, values):
            assert values["input.1"].shape == (1, 3, 320, 320)
            prediction = np.zeros((1, 1, 320, 320), dtype=np.float32)
            prediction[0, 0, :, 160:] = 0.5
            prediction[0, 0, 0, 0] = 1
            return [prediction]

    adapter = U2NetPAdapter("cpu")
    monkeypatch.setattr(adapter, "load", lambda: FakeSession())
    mask = adapter.predict(Image.new("RGB", (320, 320)))
    assert mask.mode == "L"
    assert 0 < mask.getpixel((240, 160)) < 255


@pytest.mark.parametrize("adapter_class", [BiRefNetLiteAdapter, BiRefNetPortraitAdapter])
def test_birefnet_models_keep_soft_raw_alpha(monkeypatch, adapter_class):
    calls = []

    def remove(image, **options):
        calls.append(options)
        return Image.new("L", image.size, 96)

    monkeypatch.setitem(sys.modules, "rembg", SimpleNamespace(remove=remove))
    adapter = adapter_class("cpu")
    adapter.load = lambda: object()
    mask = adapter.predict(Image.new("RGB", (3, 3)))
    assert mask.getpixel((0, 0)) == 96
    assert calls[0]["only_mask"] is True
    assert "alpha_matting" not in calls[0]


def test_downscale_and_restore():
    service = BackgroundRemovalService("u2net", "cpu", 10, 1)
    sizes = []

    def predict(image):
        sizes.append(image.size)
        return Image.new("L", image.size, 120)

    service.adapter.predict = predict
    mask, duration = service.mask(Image.new("RGB", (40, 20)))
    assert sizes == [(10, 5)]
    assert mask.size == (40, 20)
    assert duration >= 0


def test_u2net_matte_input_is_bounded_for_cpu():
    service = BackgroundRemovalService("u2net", "cpu", 2048, 1)
    sizes = []

    def predict(image):
        sizes.append(image.size)
        return Image.new("L", image.size, 128)

    service.adapter.predict = predict
    mask, _ = service.mask(Image.new("RGB", (1500, 750)))
    assert sizes == [(1024, 512)]
    assert mask.size == (1500, 750)


def test_u2netp_input_is_bounded_for_basic_dyno():
    service = BackgroundRemovalService("u2netp", "cpu", 2048, 1)
    sizes = []

    def predict(image):
        sizes.append(image.size)
        return Image.new("L", image.size, 128)

    service.adapter.predict = predict
    mask, _ = service.mask(Image.new("RGB", (1500, 750)))
    assert sizes == [(512, 256)]
    assert mask.size == (1500, 750)


def test_zero_max_side_keeps_full_resolution():
    service = BackgroundRemovalService("u2net", "cpu", 0, 1)
    sizes = []

    def predict(image):
        sizes.append(image.size)
        return Image.new("L", image.size, 128)

    service.adapter.predict = predict
    service.mask(Image.new("RGB", (1100, 550)))
    assert sizes == [(1100, 550)]


def test_concurrency_limit():
    service = BackgroundRemovalService("u2net", "cpu", 10, 1)
    service.semaphore.acquire()
    with pytest.raises(APIError) as error:
        service.mask(Image.new("RGB", (2, 2)))
    assert error.value.code == "busy"
