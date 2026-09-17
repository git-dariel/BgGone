# BgGone API — TODO

## Phase 1 — Project Setup
- [x] Initialize Flask project
- [x] Create modular application structure
- [x] Add environment configuration
- [x] Add `.env.example`
- [x] Add dependency management
- [x] Add health-check endpoint
- [x] Add centralized error handling
- [x] Add request logging
- [x] Add CORS configuration
- [x] Add API versioning under `/v1`

## Phase 2 — Model Abstraction
- [x] Create `BackgroundRemovalService`
- [x] Create reusable `ModelAdapter` interface
- [x] Add `U2NetAdapter`
- [x] Add `ISNetAdapter`
- [x] Add `BiRefNetAdapter`
- [x] Add configurable default model
- [x] Add CPU inference support
- [x] Add NVIDIA GPU inference support
- [x] Add model warm-up on startup
- [x] Add model loading error handling
- [x] Add inference timing metrics

## Phase 3 — Core Background Removal API
- [x] Implement `POST /v1/background/remove`
- [x] Accept JPG, JPEG, PNG, and WebP
- [x] Validate image MIME type
- [x] Validate maximum upload size
- [x] Normalize image orientation
- [x] Convert unsupported image modes1
- [x] Run subject segmentation
- [x] Generate alpha mask
- [x] Refine subject edges
- [x] Preserve fine hair and fur edges
- [x] Return transparent PNG
- [x] Add WebP output option
- [x] Add image quality parameter
- [x] Delete temporary files after processing
- [x] Avoid persistent image storage by default

## Phase 4 — Mask API
- [x] Implement `POST /v1/mask`
- [x] Return grayscale mask
- [x] Add mask threshold option
- [x] Add mask feathering option
- [x] Add mask smoothing option
- [x] Add raw mask download support

## Phase 5 — Background Editing API
- [x] Implement `POST /v1/background/replace`
- [x] Support solid background color
- [x] Support custom background image
- [x] Support transparent background
- [x] Implement `POST /v1/background/blur`
- [x] Add blur intensity parameter
- [x] Add background brightness adjustment
- [x] Add background opacity adjustment
- [x] Add subject/background compositing utility

## Phase 6 — Batch Processing
- [x] Implement `POST /v1/batch`
- [x] Accept multiple images
- [x] Add batch size limits
- [x] Process images asynchronously
- [x] Add processing status endpoint
- [x] Add per-image success/error results
- [x] Package completed results as ZIP
- [x] Auto-delete expired batch files
- [x] Add configurable batch retention duration

## Phase 7 — Public API Access
- [x] Add API key authentication
- [x] Add API key generation
- [x] Add API key revocation
- [x] Add per-key usage tracking
- [x] Add per-key rate limiting
- [x] Add anonymous rate limiting
- [x] Add upload size limits
- [x] Add request timeout protection
- [x] Add abuse protection
- [x] Add configurable usage quotas

## Phase 8 — Jobs and Workers
- [x] Add background job queue
- [x] Add Redis support
- [x] Add worker service
- [x] Move batch inference to workers
- [x] Add retry handling
- [x] Add failed-job tracking
- [x] Add job cancellation
- [x] Add job cleanup task

## Phase 9 — Performance
- [x] Cache loaded models
- [x] Reduce duplicate preprocessing
- [x] Add optional image downscaling before inference
- [x] Restore original output dimensions
- [ ] Benchmark CPU inference
- [ ] Benchmark GPU inference
- [x] Add concurrency limits
- [x] Add memory usage safeguards
- [x] Add request queue limits
- [ ] Add optional ONNX Runtime acceleration

## Phase 10 — Security
- [x] Sanitize filenames
- [x] Reject malformed image files
- [x] Reject unsupported file signatures
- [x] Add maximum pixel-dimension limits
- [x] Add decompression bomb protection
- [x] Add secure temporary file handling
- [x] Add configurable allowed origins
- [x] Add security headers
- [x] Add dependency vulnerability scanning

## Phase 11 — Docker and Self-Hosting
- [x] Create CPU Dockerfile
- [x] Create NVIDIA GPU Dockerfile
- [x] Add `docker-compose.yml`
- [x] Add API service
- [x] Add Redis service
- [x] Add worker service
- [x] Add environment configuration
- [x] Add persistent model cache volume
- [x] Add Docker health checks
- [x] Add production Gunicorn configuration
- [x] Add self-hosting documentation

## Phase 12 — Testing
- [x] Add unit tests
- [x] Add API integration tests
- [x] Add model adapter tests
- [x] Add image validation tests
- [x] Add background replacement tests
- [x] Add batch-processing tests
- [x] Add rate-limit tests
- [x] Add API-key tests
- [ ] Add CPU pipeline test
- [ ] Add GPU pipeline test

## Phase 13 — API Documentation
- [x] Create OpenAPI specification
- [x] Document `/background/remove`
- [x] Document `/background/replace`
- [x] Document `/background/blur`
- [x] Document `/mask`
- [x] Document `/batch`
- [x] Add request examples
- [x] Add response examples
- [x] Add cURL examples
- [x] Add JavaScript examples
- [x] Add Python examples
- [x] Add error-code documentation

## Phase 14 — CI/CD
- [x] Add GitHub Actions
- [x] Run linting on pull requests
- [x] Run automated tests
- [x] Build CPU Docker image
- [x] Build GPU Docker image
- [x] Add container vulnerability scan
- [x] Publish tagged Docker images
- [ ] Add staging deployment workflow
- [ ] Add production deployment workflow

## Phase 15 — Observability
- [x] Add structured logs
- [x] Add request IDs
- [x] Add processing duration metrics
- [x] Add inference error metrics
- [x] Add queue depth metrics
- [x] Add health endpoint
- [x] Add readiness endpoint
- [x] Add Prometheus-compatible metrics

