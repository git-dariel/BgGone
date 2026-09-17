# BgGone Frontend — TODO

## Phase 1 — Project Setup
- [x] Initialize Next.js with TypeScript
- [x] Configure Tailwind CSS
- [x] Create reusable component structure
- [x] Add environment configuration
- [x] Add API base URL configuration
- [x] Add global error handling
- [x] Add responsive layout
- [x] Add dark mode support
- [x] Add application metadata and favicon

## Phase 2 — UI Design System
- [x] Define typography
- [x] Define spacing system
- [x] Define border-radius system
- [x] Define button styles
- [x] Define input styles
- [x] Define card styles
- [x] Define loading states
- [x] Define error states
- [x] Define empty states
- [x] Create reusable modal component
- [x] Create reusable toast component
- [x] Create reusable progress component

## Phase 3 — Landing Page
- [x] Create hero section
- [x] Add image upload call-to-action
- [x] Add drag-and-drop upload area
- [x] Add supported-file information
- [x] Add feature highlights
- [x] Add privacy/self-hosting section
- [x] Add open-source GitHub section
- [x] Add API section
- [x] Add footer

## Phase 4 — Image Upload Flow
- [x] Add drag-and-drop upload
- [x] Add file picker upload
- [x] Validate JPG, JPEG, PNG, and WebP
- [x] Validate maximum file size
- [x] Show local image preview
- [x] Show upload progress
- [x] Show processing state
- [x] Allow image replacement
- [x] Allow upload cancellation
- [x] Display API errors clearly

## Phase 5 — Background Removal Integration
- [x] Integrate `POST /v1/background/remove`
- [x] Send image as multipart form data
- [x] Handle transparent PNG response
- [x] Handle WebP response
- [x] Display processing duration
- [x] Add retry action
- [x] Preserve original uploaded image
- [x] Store processed result in client state

## Phase 6 — Result Preview
- [x] Create before/after preview
- [x] Add draggable comparison slider
- [x] Add checkerboard transparent background
- [x] Add zoom controls
- [x] Add pan controls
- [x] Add fit-to-screen action
- [x] Add reset-view action
- [x] Add fullscreen preview
- [x] Add original/result toggle

## Phase 7 — Download
- [x] Add transparent PNG download
- [x] Add WebP download
- [x] Add original-resolution download
- [x] Add filename generation
- [x] Add output-quality selector
- [x] Add download progress state
- [x] Add download-complete feedback

## Phase 8 — Background Editor
- [x] Add transparent background option
- [x] Add solid color background
- [x] Add color picker
- [x] Add preset background colors
- [x] Add custom background image upload
- [x] Add background blur
- [x] Add blur intensity slider
- [x] Add background brightness control
- [x] Add background opacity control
- [x] Add reset-background action

## Phase 9 — Background API Integration
- [x] Integrate `POST /v1/background/replace`
- [x] Integrate `POST /v1/background/blur`
- [x] Add loading state for edits
- [x] Add edit error handling
- [x] Cache the original removed-background result
- [x] Prevent unnecessary repeat inference
- [x] Allow reverting to transparent output

## Phase 10 — Fine Edge Controls
- [x] Integrate `POST /v1/mask`
- [x] Add mask preview mode
- [x] Add edge feathering control
- [x] Add mask smoothing control
- [x] Add threshold control
- [x] Add reset-edge-settings action
- [x] Add side-by-side mask preview

## Phase 11 — Batch Processing UI
- [x] Add multi-image upload
- [x] Show batch image queue
- [x] Show per-image processing status
- [x] Show per-image errors
- [x] Show overall batch progress
- [x] Allow removing queued images
- [x] Allow retrying failed images
- [x] Integrate `POST /v1/batch`
- [x] Poll batch status
- [x] Add download-all ZIP action

## Phase 12 — API Dashboard
- [x] Create API documentation page
- [x] Create API-key management UI
- [x] Show generated API key once
- [x] Add revoke-key action
- [x] Show usage counters
- [x] Show rate-limit information
- [x] Show request history
- [x] Add copyable cURL examples
- [x] Add JavaScript usage example
- [x] Add Python usage example

## Phase 13 — Self-Hosting Experience
- [x] Create self-hosting page
- [x] Add Docker quick-start instructions
- [x] Add CPU deployment instructions
- [x] Add NVIDIA GPU deployment instructions
- [x] Add environment variable reference
- [x] Add backend URL configuration
- [x] Add GitHub repository link
- [x] Add contribution link
- [x] Add issue-reporting link

## Phase 14 — Accessibility
- [x] Add keyboard navigation
- [x] Add visible focus states
- [x] Add ARIA labels
- [x] Add accessible upload controls
- [x] Add accessible slider controls
- [x] Add image alt text
- [x] Add screen-reader processing status
- [x] Verify color contrast
- [x] Test mobile accessibility

## Phase 15 — Responsive Design
- [x] Optimize desktop editor
- [x] Optimize tablet editor
- [x] Optimize mobile upload flow
- [x] Optimize mobile result preview
- [x] Optimize mobile background controls
- [x] Optimize batch-processing layout
- [ ] Test major mobile browsers
- [ ] Test major desktop browsers

## Phase 16 — Performance
- [x] Lazy-load editor components
- [x] Optimize preview image rendering
- [x] Revoke unused object URLs
- [x] Reduce client memory usage
- [x] Add image dimension safeguards
- [x] Avoid unnecessary rerenders
- [x] Add request cancellation
- [x] Add API timeout handling

## Phase 17 — Polish
- [x] Add skeleton loading states
- [x] Add processing animation
- [x] Add upload success feedback
- [x] Add download success feedback
- [x] Add keyboard shortcuts
- [x] Add recent-image local session state
- [x] Add confirmation before clearing work
- [x] Add privacy notice
- [x] Add no-retention notice

## Phase 18 — Testing and Release
- [x] Add component tests
- [x] Add API integration tests
- [x] Add upload-flow tests
- [x] Add editor tests
- [x] Add batch-processing tests
- [x] Add responsive UI tests
- [x] Add accessibility tests
- [x] Add end-to-end tests
- [x] Add GitHub Actions
- [ ] Deploy frontend
- [ ] Verify production API integration
- [ ] Publish first open-source release

## Release dependencies

Browser compatibility beyond Chromium, production API verification, deployment, and the first release require deployment targets and published repository details. Set `NEXT_PUBLIC_GITHUB_REPO_URL` to enable the GitHub, contribution, and issue links.
