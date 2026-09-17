import io
import json
import logging
import time
import uuid
import zipfile
from pathlib import Path

from PIL import Image
from redis import Redis
from rq import Queue, Retry
from rq.exceptions import NoSuchJobError
from rq.job import Job, JobStatus

from .config import Settings
from .errors import APIError
from .images import output, safe_name
from .models import BackgroundRemovalService

log = logging.getLogger(__name__)


def redis_for(settings: Settings):
    return Redis.from_url(settings.redis_url, socket_connect_timeout=1, socket_timeout=2)


def cleanup(settings: Settings):
    directory = Path(settings.batch_directory)
    if not directory.exists():
        return
    cutoff = time.time() - settings.batch_retention_seconds
    for file in directory.glob("*.zip"):
        if file.stat().st_mtime < cutoff:
            file.unlink(missing_ok=True)


def enqueue(settings: Settings, files: list[tuple[str, bytes]]) -> str:
    try:
        client = redis_for(settings)
        queue = Queue("images", connection=client, default_timeout=settings.request_timeout_seconds * max(1, len(files)))
        if queue.count >= 100:
            raise APIError("queue_full", "Batch queue is full", 503)
        job_id = str(uuid.uuid4())
        client.setex(f"batch:{job_id}", settings.batch_retention_seconds, json.dumps({"status": "queued", "items": [{"filename": name, "status": "queued"} for name, _ in files]}))
        queue.enqueue(process_batch, settings, files, job_id=job_id, job_timeout=settings.request_timeout_seconds * max(1, len(files)), result_ttl=settings.batch_retention_seconds, failure_ttl=settings.batch_retention_seconds, retry=Retry(max=2, interval=[10, 30]))
        return job_id
    except APIError:
        raise
    except Exception as exc:
        raise APIError("queue_unavailable", "Batch queue is unavailable", 503) from exc


def batch_status(settings: Settings, job_id: str) -> dict:
    try:
        client = redis_for(settings)
        raw = client.get(f"batch:{job_id}")
        if raw is None:
            raise APIError("not_found", "Batch not found or expired", 404)
        status = json.loads(raw)
        if status["status"] in {"queued", "processing"}:
            try:
                job = Job.fetch(job_id, connection=client)
                job_status = job.get_status(refresh=True)
                if job_status in {JobStatus.FAILED, JobStatus.STOPPED}:
                    status["status"] = "failed"
                    client.setex(f"batch:{job_id}", settings.batch_retention_seconds, json.dumps(status))
                elif job_status == JobStatus.CANCELED:
                    status["status"] = "canceled"
                    client.setex(f"batch:{job_id}", settings.batch_retention_seconds, json.dumps(status))
            except NoSuchJobError:
                pass
        return status
    except APIError:
        raise
    except Exception as exc:
        raise APIError("queue_unavailable", "Batch queue is unavailable", 503) from exc


def cancel_batch(settings: Settings, job_id: str):
    from rq.job import Job

    client = redis_for(settings)
    status = batch_status(settings, job_id)
    if status["status"] in {"complete", "failed", "canceled"}:
        raise APIError("invalid_state", "Batch has already finished", 409)
    job = Job.fetch(job_id, connection=client)
    if job.get_status() == "started":
        from rq.command import send_stop_job_command

        send_stop_job_command(client, job_id)
    else:
        job.cancel()
    status["status"] = "canceled"
    client.setex(f"batch:{job_id}", settings.batch_retention_seconds, json.dumps(status))


def process_batch(settings: Settings, files: list[tuple[str, bytes]]):
    from rq import get_current_job

    job = get_current_job()
    client = redis_for(settings)
    service = BackgroundRemovalService(settings.model, settings.device, settings.max_inference_side, settings.max_concurrent_inference, settings.edge_refinement)
    results = [{"filename": name, "status": "queued"} for name, _ in files]
    def save(status):
        client.setex(f"batch:{job.id}", settings.batch_retention_seconds, json.dumps({"status": status, "items": results}))
    directory = Path(settings.batch_directory)
    directory.mkdir(parents=True, exist_ok=True)
    cleanup(settings)
    archive = directory / f"{job.id}.zip"
    try:
        with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as zip_file:
            for index, (name, data) in enumerate(files):
                results[index]["status"] = "processing"
                save("processing")
                try:
                    with Image.open(io.BytesIO(data)) as opened:
                        image = opened.convert("RGB")
                    mask, duration = service.mask(image)
                    image = image.convert("RGBA")
                    image.putalpha(mask)
                    png, _ = output(image)
                    output_name = f"{index + 1:03d}-{safe_name(name).rsplit('.', 1)[0]}.png"
                    zip_file.writestr(output_name, png.getvalue())
                    results[index].update(status="complete", output=output_name, duration_ms=round(duration * 1000))
                except Exception:
                    log.exception("Batch image failed")
                    results[index].update(status="failed", error="Processing failed")
                save("processing")
        save("complete")
    except Exception:
        archive.unlink(missing_ok=True)
        save("failed")
        raise
