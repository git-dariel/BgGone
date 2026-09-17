import io
import re

from PIL import Image, ImageFilter, ImageOps, UnidentifiedImageError
from werkzeug.datastructures import FileStorage

from .errors import APIError

FORMATS = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}
SIGNATURES = {"JPEG": (b"\xff\xd8\xff",), "PNG": (b"\x89PNG\r\n\x1a\n",), "WEBP": (b"RIFF",)}


def safe_name(name: str) -> str:
    stem = name.replace("\\", "/").split("/")[-1]
    return re.sub(r"[^A-Za-z0-9._-]", "_", stem)[:100] or "image"


def read_image(upload: FileStorage | None, max_bytes: int, max_pixels: int,
               preserve_alpha: bool = False) -> Image.Image:
    if upload is None:
        raise APIError("missing_image", "Upload an image in the 'image' field")
    data = upload.stream.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise APIError("image_too_large", "Image exceeds the upload limit", 413)
    if not data:
        raise APIError("empty_image", "Image is empty")
    try:
        with Image.open(io.BytesIO(data)) as probe:
            fmt = probe.format
            if fmt not in FORMATS:
                raise APIError("unsupported_format", "Use JPG, PNG, or WebP")
            if upload.mimetype != FORMATS[fmt]:
                raise APIError("invalid_mime", "Image MIME type does not match its contents")
            if not any(data.startswith(prefix) for prefix in SIGNATURES[fmt]):
                raise APIError("invalid_signature", "Image signature is invalid")
            if fmt == "WEBP" and data[8:12] != b"WEBP":
                raise APIError("invalid_signature", "Image signature is invalid")
            if probe.width * probe.height > max_pixels:
                raise APIError("image_too_large", "Image pixel count exceeds the limit", 413)
            probe.load()
            normalized = ImageOps.exif_transpose(probe)
            if preserve_alpha:
                if "A" not in normalized.getbands() and "transparency" not in normalized.info:
                    raise APIError("invalid_cutout", "Cutout must have a transparency channel")
                return normalized.convert("RGBA")
            return normalized.convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
        raise APIError("invalid_image", "Image cannot be decoded") from exc


def number(value: str | None, default: float, low: float, high: float, name: str) -> float:
    if value is None or value == "":
        return default
    try:
        parsed = float(value)
    except ValueError as exc:
        raise APIError("invalid_parameter", f"{name} must be a number") from exc
    if not low <= parsed <= high:
        raise APIError("invalid_parameter", f"{name} must be between {low} and {high}")
    return parsed


def output(image: Image.Image, fmt: str = "png", quality: int = 90) -> tuple[io.BytesIO, str]:
    if fmt not in {"png", "webp"}:
        raise APIError("invalid_format", "Output format must be png or webp")
    result = io.BytesIO()
    image.save(result, format=fmt.upper(), **({"quality": quality} if fmt == "webp" else {}))
    result.seek(0)
    return result, f"image/{fmt}"


def adjust_mask(mask: Image.Image, threshold: float = 0, feather: float = 0, smooth: int = 0) -> Image.Image:
    mask = mask.convert("L")
    if smooth:
        mask = mask.filter(ImageFilter.MedianFilter(size=2 * smooth + 1))
    if feather:
        mask = mask.filter(ImageFilter.GaussianBlur(feather))
    if threshold:
        cutoff = int(threshold * 255)
        mask = mask.point(lambda pixel: 255 if pixel >= cutoff else 0)
    return mask


def composite(subject: Image.Image, mask: Image.Image, background: Image.Image) -> Image.Image:
    foreground = subject.convert("RGBA")
    foreground.putalpha(mask)
    return Image.alpha_composite(background.convert("RGBA"), foreground)
