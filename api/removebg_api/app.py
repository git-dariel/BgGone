import io
import json
import logging
import time
import uuid

from flask import Flask, Response, g, jsonify, request, send_file
from flask_cors import CORS
from PIL import Image, ImageEnhance, ImageFilter
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest
from redis.exceptions import RedisError

from .access import authorize, create_key, key_usage, require_admin, revoke_key
from .batches import batch_status, cancel_batch, enqueue, redis_for
from .config import Settings
from .errors import APIError, register_errors
from .images import adjust_mask, composite, number, output, read_image, safe_name
from .models import BackgroundRemovalService

REQUESTS = Counter("removebg_requests_total", "HTTP requests", ["endpoint", "status"])
DURATION = Histogram("removebg_request_seconds", "Request duration", ["endpoint"])
INFERENCE = Histogram("removebg_inference_seconds", "Model inference duration", ["model"])
INFERENCE_ERRORS = Counter("removebg_inference_errors_total", "Inference errors")
QUEUE_DEPTH = Gauge("removebg_queue_depth", "Waiting batch jobs")


def create_app(settings: Settings | None = None, service: BackgroundRemovalService | None = None) -> Flask:
    settings = settings or Settings.from_env()
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = settings.max_upload_mb * 1024 * 1024 * settings.max_batch_size + 1024 * 1024
    app.config["SETTINGS"] = settings
    app.config["SERVICE"] = service or BackgroundRemovalService(settings.model, settings.device, settings.max_inference_side, settings.max_concurrent_inference, settings.edge_refinement)
    origins = [origin.strip() for origin in settings.allowed_origins.split(",") if origin.strip()]
    CORS(app, resources={r"/v1/*": {"origins": origins}}, allow_headers=["Content-Type", "X-API-Key", "X-Admin-Token"])
    register_errors(app)
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    redis_retry_after = 0.0

    def client():
        nonlocal redis_retry_after
        if time.monotonic() < redis_retry_after:
            return None
        try:
            result = redis_for(settings)
            result.ping()
            return result
        except (RedisError, OSError):
            redis_retry_after = time.monotonic() + 5
            return None

    def image(field="image", preserve_alpha=False):
        return read_image(request.files.get(field), settings.max_upload_mb * 1024 * 1024,
                          settings.max_image_pixels, preserve_alpha=preserve_alpha)

    def infer(source):
        try:
            mask, seconds = app.config["SERVICE"].mask(source)
            INFERENCE.labels(settings.model).observe(seconds)
            return mask, seconds
        except Exception:
            INFERENCE_ERRORS.inc()
            raise

    def edit_subject(source):
        if "cutout" not in request.files:
            mask, duration = infer(source)
            return source, mask, duration
        cutout = image("cutout", preserve_alpha=True)
        if cutout.size != source.size:
            raise APIError("invalid_cutout", "Cutout dimensions must match the image")
        return cutout, cutout.getchannel("A"), 0

    def form_float(name, default, low, high):
        return number(request.form.get(name), default, low, high, name)

    def options():
        fmt = request.form.get("format", "png").lower()
        quality = int(form_float("quality", 90, 1, 100))
        return fmt, quality

    def send_image(result, filename="result", mask=False, duration=0):
        fmt, quality = options() if not mask else ("png", 90)
        stream, mimetype = output(result, fmt, quality)
        response = send_file(stream, mimetype=mimetype, as_attachment=True, download_name=f"{safe_name(filename).rsplit('.', 1)[0]}.{fmt}")
        response.headers["X-Processing-Duration-Ms"] = str(round(duration * 1000))
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.before_request
    def before():
        g.started = time.perf_counter()
        g.request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))[:100]
        request.request_id = g.request_id
        if request.path.startswith("/v1/") and request.endpoint not in {"health", "ready", "metrics", "new_key", "delete_key", "usage"} and request.method != "OPTIONS":
            cost = min(len(request.files.getlist("images")), settings.max_batch_size) if request.path == "/v1/batch" else 1
            authorize(settings, client(), max(1, cost))

    @app.after_request
    def after(response):
        elapsed = time.perf_counter() - g.get("started", time.perf_counter())
        endpoint = request.endpoint or "unknown"
        REQUESTS.labels(endpoint, str(response.status_code)).inc()
        DURATION.labels(endpoint).observe(elapsed)
        response.headers["X-Request-ID"] = g.get("request_id", "")
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Content-Security-Policy"] = "default-src 'none'"
        app.logger.info(json.dumps({"request_id": g.get("request_id"), "method": request.method, "path": request.path, "status": response.status_code, "duration_ms": round(elapsed * 1000)}))
        return response

    @app.get("/v1/health", endpoint="health")
    def health():
        return jsonify(status="ok")

    @app.get("/v1/ready", endpoint="ready")
    def ready():
        try:
            app.config["SERVICE"].adapter.load()
            return jsonify(status="ready", model=settings.model, device=settings.device)
        except APIError:
            return jsonify(status="unavailable"), 503

    @app.get("/metrics", endpoint="metrics")
    def metrics():
        try:
            from rq import Queue

            connection = client()
            if connection:
                QUEUE_DEPTH.set(Queue("images", connection=connection).count)
        except (RedisError, OSError):
            app.logger.warning("Queue depth unavailable")
        return Response(generate_latest(), mimetype=CONTENT_TYPE_LATEST)

    @app.post("/v1/background/remove")
    def remove():
        source = image()
        mask, duration = infer(source)
        result = source.convert("RGBA")
        result.putalpha(adjust_mask(mask, feather=form_float("feather", 0, 0, 20)))
        return send_image(result, request.files["image"].filename, duration=duration)

    @app.post("/v1/mask")
    def mask_route():
        source = image()
        mask, duration = infer(source)
        mask = adjust_mask(mask, form_float("threshold", 0, 0, 1), form_float("feather", 0, 0, 20), int(form_float("smooth", 0, 0, 5)))
        return send_image(mask, "mask", mask=True, duration=duration)

    @app.post("/v1/background/replace")
    def replace():
        source = image()
        foreground, mask, duration = edit_subject(source)
        mode = request.form.get("background", "transparent")
        opacity = form_float("opacity", 1, 0, 1)
        brightness = form_float("brightness", 1, 0, 3)
        if mode == "transparent":
            background = Image.new("RGBA", source.size, (0, 0, 0, 0))
        elif mode == "color":
            color = request.form.get("color", "#ffffff")
            if len(color) != 7 or not color.startswith("#"):
                raise APIError("invalid_color", "Use a six-digit hex color")
            try:
                rgb = tuple(bytes.fromhex(color[1:]))
            except ValueError as exc:
                raise APIError("invalid_color", "Use a six-digit hex color") from exc
            background = Image.new("RGBA", source.size, (*rgb, 255))
        elif mode == "image":
            background = image("background_image").resize(source.size, Image.Resampling.LANCZOS).convert("RGBA")
        else:
            raise APIError("invalid_background", "Background must be transparent, color, or image")
        background = ImageEnhance.Brightness(background).enhance(brightness)
        background.putalpha(int(opacity * 255))
        return send_image(composite(foreground, mask, background), "replaced", duration=duration)

    @app.post("/v1/background/blur")
    def blur():
        source = image()
        foreground, mask, duration = edit_subject(source)
        intensity = form_float("intensity", 12, 0, 80)
        brightness = form_float("brightness", 1, 0, 3)
        opacity = form_float("opacity", 1, 0, 1)
        background = source.filter(ImageFilter.GaussianBlur(intensity)).convert("RGBA")
        background = ImageEnhance.Brightness(background).enhance(brightness)
        background.putalpha(int(opacity * 255))
        return send_image(composite(foreground, mask, background), "blurred", duration=duration)

    @app.post("/v1/batch")
    def batch():
        uploads = request.files.getlist("images")
        if not uploads or len(uploads) > settings.max_batch_size:
            raise APIError("invalid_batch", f"Upload 1 to {settings.max_batch_size} images in 'images'")
        files = []
        for upload in uploads:
            normalized = read_image(upload, settings.max_upload_mb * 1024 * 1024, settings.max_image_pixels)
            stream = io.BytesIO()
            normalized.save(stream, "PNG")
            files.append((safe_name(upload.filename or "image"), stream.getvalue()))
        return jsonify(id=enqueue(settings, files), status="queued"), 202

    @app.get("/v1/batch/<job_id>")
    def batch_info(job_id):
        return jsonify(batch_status(settings, job_id))

    @app.get("/v1/batch/<job_id>/download")
    def batch_download(job_id):
        status = batch_status(settings, job_id)
        if status["status"] != "complete":
            raise APIError("not_ready", "Batch is not complete", 409)
        from pathlib import Path

        archive = Path(settings.batch_directory) / f"{job_id}.zip"
        if not archive.is_file():
            raise APIError("not_found", "Batch archive expired", 404)
        return send_file(archive, mimetype="application/zip", as_attachment=True, download_name=f"batch-{job_id}.zip")

    @app.delete("/v1/batch/<job_id>")
    def batch_cancel(job_id):
        cancel_batch(settings, job_id)
        return jsonify(status="canceled")

    @app.post("/v1/keys", endpoint="new_key")
    def new_key():
        require_admin(settings)
        key_id, secret = create_key(settings)
        return jsonify(id=key_id, api_key=secret), 201

    @app.delete("/v1/keys/<key_id>", endpoint="delete_key")
    def delete_key(key_id):
        require_admin(settings)
        if not revoke_key(settings, key_id):
            raise APIError("not_found", "API key not found", 404)
        return "", 204

    @app.get("/v1/keys/<key_id>/usage", endpoint="usage")
    def usage(key_id):
        require_admin(settings)
        return jsonify(key_usage(settings, key_id))

    if settings.warm_model:
        app.config["SERVICE"].adapter.load()
    return app
