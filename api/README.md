# BgGone API

Flask API for the Next.js frontend. Processing routes live under `/v1`. Model weights are downloaded to the rembg model cache on first startup. Single-image requests stay in memory. Batch input and job metadata remain in Redis for up to `BATCH_RETENTION_SECONDS` after processing; completed ZIP files expire after the same retention interval.

## Local CPU setup

Use Python 3.11–3.13 and start Redis for batches. From this directory:

```bash
python -m venv .venv
# Activate .venv for your shell.
pip install -e '.[cpu,test]'
cp .env.example .env
# The API and worker load api/.env automatically; shell environment variables take precedence.
flask --app removebg_api.wsgi:app run --port 5000
python -m removebg_api.worker
```

The second Python command runs in another terminal. On Windows, use Docker for RQ workers; RQ's default worker process model requires Unix process forking. The HTTP service can run directly on Windows.

## Docker CPU or NVIDIA GPU

Copy `api/.env.example` to `api/.env` and set a long random `ADMIN_TOKEN`. From the repository root:

```bash
docker compose up --build
# NVIDIA Container Toolkit and a compatible CUDA host are required:
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up --build
```

The API listens on port 5000. The CPU and GPU images use the appropriate `rembg` extra. See [rembg's installation guide](https://github.com/danielgatis/rembg#installation) for CUDA and ONNX Runtime compatibility. `MODEL` accepts `u2net`, `isnet`, `birefnet`, `birefnet-lite`, or `birefnet-portrait`. The default `birefnet-lite` model is a smaller BiRefNet variant that keeps a soft alpha mask. It may miss fine strands that `birefnet-portrait` retains, so compare both on representative photos before deployment. `EDGE_REFINEMENT=auto` applies alpha matting to U2Net and preserves the soft alpha from newer models. Restart the API and worker after changing these settings; a new model downloads weights on first use. Set `MODEL=birefnet-portrait` in `api/.env` to restore the previous portrait model. `DEVICE=gpu` fails readiness if CUDA is not available. Set `ALLOWED_ORIGINS` to a comma-separated list of trusted frontend origins. The frontend uses `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/v1` by default.

## API calls

```bash
curl -F image=@portrait.jpg http://localhost:5000/v1/background/remove -o portrait.png
curl -F image=@portrait.jpg -F format=webp -F quality=85 http://localhost:5000/v1/background/remove -o portrait.webp
curl -F image=@portrait.jpg -F threshold=0.4 -F feather=2 http://localhost:5000/v1/mask -o mask.png
curl -F image=@portrait.jpg -F background=color -F color='#dbeafe' http://localhost:5000/v1/background/replace -o edited.png
curl -F image=@portrait.jpg -F cutout=@portrait-cutout.png -F background=color -F color='#dbeafe' http://localhost:5000/v1/background/replace -o edited.png
curl -F image=@portrait.jpg -F background=image -F background_image=@scene.jpg http://localhost:5000/v1/background/replace -o edited.png
curl -F image=@portrait.jpg -F intensity=16 http://localhost:5000/v1/background/blur -o blurred.png
curl -F images=@one.jpg -F images=@two.png http://localhost:5000/v1/batch
curl http://localhost:5000/v1/batch/YOUR_BATCH_ID
curl http://localhost:5000/v1/batch/YOUR_BATCH_ID/download -o batch.zip
```

For `/background/replace` and `/background/blur`, send an existing transparent PNG or WebP as `cutout` alongside the original `image` to reuse its alpha without running segmentation again. The images must have the same dimensions. The studio sends its current cutout for these edits, so its background controls do not run another model. Requests without `cutout` continue to use `MODEL` as before.

```js
const form = new FormData();
form.append("image", file);
form.append("format", "png");
const response = await fetch("http://localhost:5000/v1/background/remove", {
  method: "POST",
  body: form,
  headers: { "X-API-Key": apiKey }, // Optional
});
if (!response.ok) throw new Error((await response.json()).error.message);
const result = await response.blob();
```

```python
import requests

with open("portrait.jpg", "rb") as image:
    response = requests.post("http://localhost:5000/v1/background/remove", files={"image": image}, timeout=120)
response.raise_for_status()
with open("portrait.png", "wb") as result:
    result.write(response.content)
```

Create, inspect, and revoke keys with `X-Admin-Token`:

```bash
curl -X POST -H 'X-Admin-Token: YOUR_ADMIN_TOKEN' http://localhost:5000/v1/keys
curl -H 'X-Admin-Token: YOUR_ADMIN_TOKEN' http://localhost:5000/v1/keys/KEY_ID/usage
curl -X DELETE -H 'X-Admin-Token: YOUR_ADMIN_TOKEN' http://localhost:5000/v1/keys/KEY_ID
```

The secret is shown once. Send it in `X-API-Key`. Anonymous requests are rate limited by IP. Keys have rate limits and monthly quotas; usage is stored in SQLite. For multiple API replicas, use a shared database and Redis. SQLite is intended for a single API host. Redis is required for batch processing. The in-process rate-limit fallback is suitable only for one host when Redis is unavailable.

## Limits and responses

Defaults are 12 MiB per image, 25 million pixels per image, 10 images per batch, 2 concurrent model calls per API process, 100 queued batches, 120 seconds per image, and 1 hour batch retention. `MAX_INFERENCE_SIDE` scales model input down and restores the mask to original dimensions. U2Net alpha matting is capped at a 1024-pixel working side to keep CPU costs bounded unless `MAX_INFERENCE_SIDE=0`, which disables downscaling. Gunicorn and RQ enforce request/job timeouts. Large or malformed uploads return JSON errors. Processing errors use the same shape:

```json
{"error":{"code":"invalid_image","message":"Image cannot be decoded"},"request_id":"..."}
```

Common codes: `missing_image`, `empty_image`, `invalid_image`, `invalid_mime`, `invalid_signature`, `image_too_large`, `invalid_parameter`, `invalid_format`, `invalid_color`, `model_unavailable`, `inference_failed`, `busy`, `queue_full`, `queue_unavailable`, `rate_limited`, `quota_exceeded`, `invalid_api_key`, `not_found`, `not_ready`. Processing responses include `X-Processing-Duration-Ms`.

The full contract is in [openapi.yaml](openapi.yaml). `/v1/health` checks the HTTP process, `/v1/ready` checks model availability, and `/metrics` exports Prometheus data.

## Checks

```bash
python -m pytest -q
python -m ruff check .
pip-audit
```

The automated suite uses a fake segmentation adapter so it can run without downloading weights. A live CPU pipeline smoke test requires installing `.[cpu]`, setting `WARM_MODEL=true`, and sending a real image. GPU inference needs a compatible NVIDIA host; Docker builds alone do not verify CUDA execution.

For local timings with real weights, run `python benchmark.py portrait.jpg --device cpu` or `python benchmark.py portrait.jpg --device gpu` on the target host. The script warms the model first and reports median times; hardware-specific results are not checked into the repository.

The remaining unchecked items in `orchestrator/TODO_API.md` need real photos, CPU/GPU hardware, or deployment targets. Fine hair and fur quality still depends on the image and model; check the transparent result against the original, especially around low-contrast strands. Rembg already uses ONNX Runtime, so a separate acceleration toggle has not been added. Staging and production deployment workflows need the hosting target and credentials.
