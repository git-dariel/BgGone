# BgGone

Next.js image studio with a Flask background removal API. The studio supports single images, edge masks, background edits, WebP and PNG export, batch ZIP jobs, and API key management.

## Start locally

The frontend and API run as separate processes. From the repository root:

```powershell
pnpm install
pnpm dev
```

Open `http://localhost:3000`. The frontend expects the API at `http://localhost:5000/v1`. To change it, copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_BASE_URL`, or enter another URL on the self-hosting page. Start the API using [api/README.md](api/README.md). Batch jobs also require Redis and an RQ worker; Docker Compose starts the whole backend stack.

The browser sends images directly to the API. Set `ALLOWED_ORIGINS` on the API to the frontend origin when hosting them separately. `NEXT_PUBLIC_` values are visible in the browser; never put `ADMIN_TOKEN` in them. Enter the admin token in the API key desk only when managing keys.

## Check the frontend

```powershell
pnpm lint
pnpm test:unit
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Browser tests use a built frontend on port 3100 and stub image processing responses; the backend does not need to be running. The API contract is in [api/openapi.yaml](api/openapi.yaml). Implementation progress is tracked in [orchestrator/TODO_FRONTEND.md](orchestrator/TODO_FRONTEND.md) and [orchestrator/TODO_API.md](orchestrator/TODO_API.md).
