---
trigger: always_on
description: Architecture, database, caching, and performance/resilience standards for the New Balaji Transports platform. Applies to API design, database schema/queries, background jobs, and third-party integrations.
---

# Architecture & Performance

- RESTful API design: versioned routes (`/api/v1/...`), consistent resource naming, correct HTTP
  verbs/status codes, pagination on every list endpoint (never return an unbounded fleet/trip
  list), consistent error response shape across all endpoints.
- Database: index every column used in a WHERE/JOIN/sort on hot paths (vehicle number, tracking
  ID, trip status, compliance expiry dates) — verify with `EXPLAIN ANALYZE` on anything touching
  fleet or trips tables. Use connection pooling (PgBouncer or built-in pool config), not a new
  connection per request.
- Offload heavy/slow work (PDF report generation, AI voice transcription/translation, large
  analytics aggregation) to a background job queue (BullMQ/Celery or similar) — never block an
  HTTP request thread on these; return a job ID and let the client poll or receive a push/
  websocket update when ready.
- Cache aggressively where data is read far more than it changes (fleet status counts, compliance
  dashboard summaries) using Redis with a sane TTL and explicit invalidation on writes. Don't cache
  anything that must reflect true current state for a safety/compliance decision without a clear
  invalidation path.
- Real-time features (live GPS tracking, live activity feed on the Admin App) use WebSockets or a
  managed real-time service rather than client-side polling every few seconds at scale.
- Frontend performance: code-split by route, lazy-load below-the-fold sections, compress/serve
  images via CDN with responsive sizes, monitor bundle size in CI (fail the build on a large
  unexplained regression).
- Driver App specifically: assume patchy network in transit. Queue writes locally (expense logs,
  fuel refills, GPS pings) and sync when connectivity returns, with clear UI feedback on sync
  status — never silently lose a voice-logged expense because the connection dropped mid-request.
- Third-party API resilience: wrap all external calls (Maps/geocoding, Whisper/STT, FASTag/toll
  lookup, MQTT sensor reads) with timeouts, retries with backoff, and a defined fallback/degraded
  mode (e.g., if the toll API is down, let the trip be created with tolls marked "pending
  estimate" rather than blocking dispatch entirely).
