import logging
import os
import threading
import time
from abc import ABC, abstractmethod
from pathlib import Path

from PIL import Image

from .errors import APIError

MODEL_NAMES = {
    "u2net": "u2net",
    "u2netp": "u2netp",
    "silueta": "silueta",
    "isnet": "isnet-general-use",
    "birefnet": "birefnet-general",
    "birefnet-lite": "birefnet-general-lite",
    "birefnet-portrait": "birefnet-portrait",
}
log = logging.getLogger(__name__)


def memory_bounded_session_options():
    import onnxruntime as ort

    options = ort.SessionOptions()
    options.intra_op_num_threads = 1
    options.inter_op_num_threads = 1
    options.enable_mem_pattern = False
    options.enable_cpu_mem_arena = False
    return options


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
                        self._session = new_session(
                            self.model_name,
                            sess_opts=memory_bounded_session_options(),
                            providers=providers,
                        )
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


class U2NetPAdapter(ModelAdapter):
    model_name = MODEL_NAMES["u2netp"]
    model_url = "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx"
    model_hash = "sha256:309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8"
    model_file = "u2netp.onnx"
    error_label = "U2NetP"

    def load(self):
        if self._session is None:
            with self._lock:
                if self._session is None:
                    try:
                        import onnxruntime as ort
                        import pooch

                        home = os.getenv("U2NET_HOME") or os.getenv("REMBG_HOME") or str(Path.home() / ".rembg")
                        model_dir = Path(home) / "models" / self.model_name
                        model_path = pooch.retrieve(
                            self.model_url,
                            known_hash=self.model_hash,
                            fname=self.model_file,
                            path=model_dir,
                            progressbar=False,
                        )
                        providers = ["CPUExecutionProvider"]
                        if self.device == "gpu":
                            if "CUDAExecutionProvider" not in ort.get_available_providers():
                                raise RuntimeError("CUDAExecutionProvider is unavailable")
                            providers.insert(0, "CUDAExecutionProvider")
                        options = memory_bounded_session_options()
                        self._session = ort.InferenceSession(
                            model_path, sess_options=options, providers=providers
                        )
                    except Exception as exc:
                        log.exception("%s model loading failed", self.error_label)
                        raise APIError("model_unavailable", "Model could not be loaded", 503) from exc
        return self._session

    def predict(self, image: Image.Image) -> Image.Image:
        try:
            import numpy as np

            session = self.load()
            resized = image.convert("RGB").resize((320, 320), Image.Resampling.LANCZOS)
            pixels = np.asarray(resized, dtype=np.float32)
            pixels /= max(float(pixels.max()), 1e-6)
            pixels -= np.array((0.485, 0.456, 0.406), dtype=np.float32)
            pixels /= np.array((0.229, 0.224, 0.225), dtype=np.float32)
            batch = np.expand_dims(pixels.transpose((2, 0, 1)), 0)
            prediction = session.run(None, {session.get_inputs()[0].name: batch})[0][0, 0]
            minimum = float(prediction.min())
            maximum = float(prediction.max())
            if maximum > minimum:
                prediction = (prediction - minimum) / (maximum - minimum)
            else:
                prediction = np.zeros_like(prediction)
            mask = Image.fromarray((prediction * 255).astype(np.uint8), "L")
            return mask.resize(image.size, Image.Resampling.LANCZOS)
        except APIError:
            raise
        except Exception as exc:
            log.exception("%s inference failed", self.error_label)
            raise APIError("inference_failed", "Image inference failed", 503) from exc


class SiluetaAdapter(U2NetPAdapter):
    model_name = MODEL_NAMES["silueta"]
    model_url = "https://github.com/danielgatis/rembg/releases/download/v0.0.0/silueta.onnx"
    model_hash = "md5:55e59e0d8062d2f5d013f4725ee84782"
    model_file = "silueta.onnx"
    error_label = "Silueta"

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
    "u2netp": U2NetPAdapter,
    "silueta": SiluetaAdapter,
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
            if self.adapter.model_name in {"u2netp", "silueta"}:
                side = min(side, 512) if side else 512
            elif side and self.adapter.uses_alpha_matting:
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
