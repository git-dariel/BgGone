# BgGone API

Flask API for the Next.js frontend. Processing routes live under `/v1`. The default CPU image includes the Silueta model weights; other model weights are downloaded to the rembg model cache on first startup. Single-image requests stay in memory. Batch input and job metadata remain in Redis for up to `BATCH_RETENTION_SECONDS` after processing; completed ZIP files expire after the same retention interval.

## Run locally with PowerShell (CPU)

Install Python 3.11, 3.12, or 3.13. Then open PowerShell at the repository root and run:

```powershell
Set-Location .\api
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -e ".[cpu,test]"
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
.\.venv\Scripts\python.exe -m flask --app removebg_api.wsgi:app run --port 5000
```

If `.env` already exists from an older setup, set `MODEL=silueta`, `EDGE_REFINEMENT=auto`, and `MAX_INFERENCE_SIDE=512` in that file before starting the API.

The API will be available at `http://localhost:5000`. Check it from a second PowerShell window:

```powershell
Invoke-RestMethod -Uri http://localhost:5000/v1/health
```

The API and worker load `api/.env` automatically; PowerShell environment variables take precedence. Redis is only required for batch processing. On Windows, use Docker for Redis and the RQ worker because RQ's default worker process model requires Unix process forking; the HTTP API itself runs directly in PowerShell.

## Docker CPU or NVIDIA GPU

Copy `api/.env.example` to `api/.env` and set a long random `ADMIN_TOKEN`. From the repository root:

```bash
docker compose up --build
# NVIDIA Container Toolkit and a compatible CUDA host are required:
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up --build
```

The API listens on port 5000. The CPU and GPU images use the appropriate `rembg` extra. See [rembg's installation guide](https://github.com/danielgatis/rembg#installation) for CUDA and ONNX Runtime compatibility. `MODEL` accepts `silueta`, `u2netp`, `u2net`, `isnet`, `birefnet`, `birefnet-lite`, or `birefnet-portrait`.

`silueta` is the default for CPU deployments. It is larger and slower than U2NetP, but remains lightweight and produces a more detailed soft mask through a direct, memory-bounded ONNX path with a 512-pixel working-image cap. This improves many hair and fur boundaries without loading the much heavier alpha-matting runtime. Fine-edge quality still depends on contrast, focus, and the source image. U2NetP remains available as the lowest-memory rollback option. `EDGE_REFINEMENT=alpha` is unavailable with both lightweight direct adapters. BiRefNet models can produce stronger masks but need substantially more memory and are not recommended for a 512 MB Heroku Basic dyno.

Restart the API and worker after changing model settings. Models other than the CPU image's bundled default download their weights on first use. `DEVICE=gpu` fails readiness if CUDA is not available. Set `ALLOWED_ORIGINS` to a comma-separated list of trusted frontend origins. The frontend uses `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/v1` by default.

## Heroku CLI and logs

Run these commands in PowerShell to sign in, confirm access to the `bggone-api` app, and stream its logs:

```powershell
heroku --version
heroku login
heroku auth:whoami
heroku apps:info --app bggone-api
heroku logs --tail --app bggone-api
```

Heroku apps are selected with `--app bggone-api`; you do not navigate into the app as a directory. Press `Ctrl+C` to stop streaming logs. To display the most recent 200 log entries without continuing to stream:

```powershell
heroku logs --num 200 --app bggone-api
```

Configure the Heroku Basic dyno for the memory-bounded Silueta pipeline:

```powershell
heroku config:set MODEL=silueta EDGE_REFINEMENT=auto MAX_INFERENCE_SIDE=512 MAX_CONCURRENT_INFERENCE=1 WEB_WORKERS=1 OMP_NUM_THREADS=1 --app bggone-api
heroku logs --tail --app bggone-api
```

After deploying, check readiness and confirm that it reports `"model":"silueta"`:

```powershell
$appUrl = (heroku apps:info --app bggone-api --json | ConvertFrom-Json).web_url
Invoke-RestMethod -Uri "$($appUrl.TrimEnd('/'))/v1/ready"
```

If the dyno reports memory or timeout errors, roll back to U2NetP:

```powershell
heroku config:set MODEL=u2netp EDGE_REFINEMENT=auto --app bggone-api
```

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

Defaults are 12 MiB per image, 25 million pixels per image, 10 images per batch, 1 concurrent model call per API process, 100 queued batches, 120 seconds per image, and 1 hour batch retention. `MAX_INFERENCE_SIDE` scales the working image down and restores the mask to original dimensions. Silueta and U2NetP are capped at 512 pixels; U2Net alpha matting is capped at 1024 pixels. Setting `MAX_INFERENCE_SIDE=0` disables general downscaling, but the model-specific safety caps still apply. Gunicorn and RQ enforce request/job timeouts. Large or malformed uploads return JSON errors. Processing errors use the same shape:

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

For local timings with real weights, compare Silueta with U2NetP from PowerShell:

```powershell
.\.venv\Scripts\python.exe benchmark.py portrait.jpg --model silueta --device cpu
.\.venv\Scripts\python.exe benchmark.py portrait.jpg --model u2netp --device cpu
```

The script warms the model first and reports median times; hardware-specific results are not checked into the repository. Compare the generated API output on representative human-hair and pet-fur images as well as the timings, because the benchmark does not score edge quality.

The remaining unchecked items in `orchestrator/TODO_API.md` need real photos, CPU/GPU hardware, or deployment targets. Fine hair and fur quality still depends on the image and model; check the transparent result against the original, especially around low-contrast strands. Rembg already uses ONNX Runtime, so a separate acceleration toggle has not been added. Staging and production deployment workflows need the hosting target and credentials.
