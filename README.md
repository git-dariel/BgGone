# BgGone

BgGone is a self-hostable background removal studio. A Next.js frontend provides image upload, preview, editing, and export; a Flask API performs segmentation and image processing. The frontend sends images directly to the API.

## Features

- Remove backgrounds from JPG, PNG, and WebP images and export transparent PNG or WebP files.
- Inspect and adjust the subject mask, including threshold, feathering, and smoothing.
- Replace the background with a color or image, or blur the original background. Studio edits reuse the existing cutout, so they do not run segmentation again.
- Configure CPU or NVIDIA GPU inference and choose a model to balance speed and edge detail.
- Manage API keys and usage limits through the API key page or API endpoints.
- Submit batch jobs through the API. The frontend batch upload page currently displays "Coming soon."

## Project structure

| Path | Purpose |
| --- | --- |
| `app/`, `components/`, `lib/` | Next.js frontend and studio |
| `api/removebg_api/` | Flask API, model adapters, and batch worker |
| `api/openapi.yaml` | API contract |
| `tests/`, `api/tests/` | Frontend and API tests |
| `docker-compose.yml` | Local API, worker, and Redis stack |

## Requirements

- Node.js 20.9 or newer and pnpm 10.28.2
- Python 3.11 through 3.13 for a local API installation
- Docker and Docker Compose if running the backend stack in containers
- Redis and an RQ worker only when using batch API jobs

The first API startup downloads the selected model's weights. Disk use, memory use, and processing time depend on the model and hardware.

## Run locally on Windows

Run these commands from the repository root in PowerShell. Create each environment file only if it does not already exist.

```powershell
pnpm install
if (-not (Test-Path api/.env)) { Copy-Item api/.env.example api/.env }
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
python -m venv .venv
.\.venv\Scripts\python -m pip install -e "./api[cpu,test]"
```

Start the API in one terminal:

```powershell
.\.venv\Scripts\python -m flask --app removebg_api.wsgi:app run --port 5000
```

Start the frontend in another terminal:

```powershell
pnpm dev
```

Open `http://localhost:3000`. Check the API at `http://localhost:5000/v1/health`. The single-image studio does not require Redis. For Unix-like systems or a more detailed backend setup, see [api/README.md](api/README.md).

### Run the backend with Docker

Set a long random `ADMIN_TOKEN` in `api/.env`, then run from the repository root:

```powershell
docker compose up --build
```

This starts the API on port 5000, an RQ worker, and Redis. It does not start the Next.js frontend; run `pnpm dev` separately. An NVIDIA GPU configuration is available in `docker-compose.gpu.yml` and requires compatible host drivers and the NVIDIA Container Toolkit.

## Configuration

| Setting | Location | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `.env.local` | Browser-accessible API base URL, including `/v1`; defaults to `http://localhost:5000/v1` |
| `MODEL` | `api/.env` | Segmentation model; defaults to `birefnet-lite` |
| `DEVICE` | `api/.env` | `cpu` or `gpu` |
| `EDGE_REFINEMENT` | `api/.env` | `auto`, `alpha`, or `none` |
| `ALLOWED_ORIGINS` | `api/.env` | Comma-separated frontend origins allowed by API CORS |
| `ADMIN_TOKEN` | `api/.env` | Secret used to manage API keys |

The API loads `api/.env` automatically; shell environment variables take precedence. Restart the API after changing its settings. `NEXT_PUBLIC_` values are exposed to the browser, so keep `ADMIN_TOKEN` and other secrets in the API environment. See [.env.example](.env.example) and [api/.env.example](api/.env.example) for the full setting lists.

`birefnet-lite` is the smaller default model. `birefnet-portrait` generally gives more detail on portraits but needs more resources. `u2net`, `isnet`, and `birefnet` are also supported. Compare outputs on representative images before choosing a production model; fine hair and fur quality depends on the photo. The local model setting applies to initial removal and to API edits that do not include a cutout.

## Data handling

Single-image requests are processed in memory and are not stored by the API. Batch requests use Redis for temporary input and job metadata, and write completed ZIP files to the configured batch directory. The default batch retention is one hour. API keys and usage data are stored in SQLite by default; use shared storage when running multiple API replicas. Anonymous requests are rate limited, and API keys can be managed with `X-Admin-Token`.

## API overview

All processing routes are under `/v1`.

| Endpoint | Purpose |
| --- | --- |
| `POST /background/remove` | Produce a transparent cutout |
| `POST /mask` | Return a grayscale subject mask |
| `POST /background/replace` | Use a transparent, color, or image background |
| `POST /background/blur` | Blur the original background |
| `POST /batch` | Queue a batch job |
| `GET /batch/{id}` | Read batch status |
| `GET /batch/{id}/download` | Download completed batch results |
| `GET /health`, `GET /ready` | Check the service and model readiness |

For example, from PowerShell:

```powershell
curl.exe -F "image=@portrait.jpg" http://localhost:5000/v1/background/remove -o portrait-cutout.png
```

The replace and blur endpoints accept an optional transparent `cutout` with the same dimensions as `image`. When supplied, they reuse its alpha and skip model inference. The studio supplies this cutout automatically. See the [OpenAPI contract](api/openapi.yaml) and [API guide](api/README.md) for parameters, responses, authentication, and batch usage.

## Checks

```powershell
pnpm lint
pnpm test:unit
pnpm build
pnpm test:e2e
.\.venv\Scripts\python -m pytest -q api/tests
.\.venv\Scripts\python -m ruff check api
```

The browser tests start the built frontend on port 3100 and stub API image responses. Google Chrome is required for local Playwright runs; CI uses Playwright Chromium. The API tests use a fake segmentation adapter and do not download model weights.

## Deployment considerations

Deploy the frontend and API as separate services and set `NEXT_PUBLIC_API_BASE_URL` and `ALLOWED_ORIGINS` to their public URLs. For Heroku, set `NEXT_PUBLIC_API_BASE_URL` on the frontend app to the actual API URL, such as `https://your-api-app.herokuapp.com/v1`; do not leave the `<api-host>` placeholder. Set it before building the frontend and rebuild after changing it, because Next.js embeds `NEXT_PUBLIC_` values in the browser bundle at build time. A URL saved on the Self-host page overrides this value for that browser. Use a persistent model cache if the platform discards local files on restart. The Docker Compose setup is intended for local use; adapt storage, secrets, and worker capacity to the deployment target.

To deploy the CPU API to a second Heroku app, commit the API changes, install the Heroku CLI, log in, and run these commands from the repository root. Replace `YOUR_API_APP` with an available Heroku app name. The `api/heroku.yml` manifest is at the root of the API subtree when pushed, so Heroku builds `Dockerfile.cpu` for that app.

```powershell
heroku login
heroku create YOUR_API_APP --stack container
heroku git:remote -a YOUR_API_APP -r heroku-api
heroku config:set ALLOWED_ORIGINS=https://bggone-05ba01f79fe8.herokuapp.com WARM_MODEL=false -a YOUR_API_APP
git subtree push --prefix api heroku-api main
curl.exe https://YOUR_API_APP.herokuapp.com/v1/health
```

Then set `NEXT_PUBLIC_API_BASE_URL=https://YOUR_API_APP.herokuapp.com/v1` on the existing frontend Heroku app and redeploy the frontend from GitHub so Next.js rebuilds its browser bundle. The value must use the actual API app name, with no angle brackets. If the Self-host page has a saved URL, update it there too; that browser setting takes precedence. Keep `ADMIN_TOKEN` and other secrets in the API app's Heroku config vars, rather than committing `api/.env`.

The current single-image removal endpoint processes synchronously. On CPU, model inference can exceed hosting request limits. Heroku, for example, requires an initial response within [30 seconds](https://devcenter.heroku.com/articles/request-timeout). The API Gunicorn configuration reads Heroku's [`$PORT`](https://devcenter.heroku.com/articles/container-registry-and-runtime) when present. A Heroku deployment still needs a separately deployed API and, for slow inference, an asynchronous single-image job flow or sufficiently fast hardware and model settings. Background edits that reuse a cutout avoid another inference pass, but the initial removal still runs the model.

Implementation progress is tracked in [the frontend plan](orchestrator/TODO_FRONTEND.md) and [the API plan](orchestrator/TODO_API.md).
