import logging
import threading
import time
from abc import ABC, abstractmethod

from PIL import Image

from .errors import APIError

MODEL_NAMES = {
    "u2net": "u2net",
    "isnet": "isnet-general-use",
    "birefnet": "birefnet-general",
    "birefnet-lite": "birefnet-general-lite",
    "birefnet-portrait": "birefnet-portrait",
}
log = logging.getLogger(__name__)


class ModelAdapter(ABC):
    def __init__(self, device: str, edge_refinement: str = "auto"):
        self.device = device
        self.edge_refinement = edge_refinement
        self._session = None
        self._lock = threading.Lock()

    @property
    @abstractmethod
    def model_name(self) -> str: ...

    @property
    def uses_alpha_matting(self) -> bool:
        return self.edge_refinement == "alpha" or (
            self.edge_refinement == "auto" and self.model_name == "u2net"
        )

    def load(self):
        if self._session is None:
            with self._lock:
                if self._session is None:
                    try:
                        import onnxruntime as ort
                        from rembg import new_session

                        providers = ["CPUExecutionProvider"]
                        if self.device == "gpu":
                            if "CUDAExecutionProvider" not in ort.get_available_providers():
                                raise RuntimeError("CUDAExecutionProvider is unavailable")
                            providers.insert(0, "CUDAExecutionProvider")
                        self._session = new_session(self.model_name, providers=providers)
                    except Exception as exc:
                        log.exception("Model loading failed")
                        raise APIError("model_unavailable", "Model could not be loaded", 503) from exc
        return self._session

    def predict(self, image: Image.Image) -> Image.Image:
        try:
            from rembg import remove

            # only_mask bypasses rembg's alpha matting. Older U2Net masks often
            # clip hair, so request the refined cutout and keep its alpha.
            if self.uses_alpha_matting:
                cutout = remove(image, session=self.load(), alpha_matting=True)
                return cutout.getchannel("A")
            return remove(image, session=self.load(), only_mask=True).convert("L")
        except APIError:
            raise
        except Exception as exc:
            log.exception("Inference failed")
            raise APIError("inference_failed", "Image inference failed", 503) from exc


class U2NetAdapter(ModelAdapter):
    model_name = MODEL_NAMES["u2net"]


class ISNetAdapter(ModelAdapter):
    model_name = MODEL_NAMES["isnet"]


class BiRefNetAdapter(ModelAdapter):
    model_name = MODEL_NAMES["birefnet"]


class BiRefNetLiteAdapter(ModelAdapter):
    model_name = MODEL_NAMES["birefnet-lite"]


class BiRefNetPortraitAdapter(ModelAdapter):
    model_name = MODEL_NAMES["birefnet-portrait"]


ADAPTERS = {
    "u2net": U2NetAdapter,
    "isnet": ISNetAdapter,
    "birefnet": BiRefNetAdapter,
    "birefnet-lite": BiRefNetLiteAdapter,
    "birefnet-portrait": BiRefNetPortraitAdapter,
}


class BackgroundRemovalService:
    def __init__(self, model: str, device: str, max_side: int, concurrency: int,
                 edge_refinement: str = "auto"):
        self.adapter = ADAPTERS[model](device, edge_refinement)
        self.max_side = max_side
        self.semaphore = threading.BoundedSemaphore(concurrency)

    def mask(self, image: Image.Image) -> tuple[Image.Image, float]:
        if not self.semaphore.acquire(blocking=False):
            raise APIError("busy", "Inference capacity reached; retry shortly", 503)
        try:
            source = image.copy()
            side = self.max_side
            if side and self.adapter.uses_alpha_matting:
                # Full-resolution closed-form matting is very expensive on CPU.
                side = min(side, 1024)
            if side and max(source.size) > side:
                source.thumbnail((side, side), Image.Resampling.LANCZOS)
            start = time.perf_counter()
            mask = self.adapter.predict(source)
            duration = time.perf_counter() - start
            if mask.size != image.size:
                mask = mask.resize(image.size, Image.Resampling.LANCZOS)
            return mask, duration
        finally:
            self.semaphore.release()
