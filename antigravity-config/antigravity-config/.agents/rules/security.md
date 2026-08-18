---
trigger: always_on
description: Security baseline for the New Balaji Transports logistics platform — injection prevention, auth/authz, secrets, transport, logging. Applies to every file touching input handling, auth, storage, or external services.
---

# Security — Non-Negotiable Baseline

## Input handling & injection prevention
- Never build SQL/NoSQL queries via string concatenation or f-strings/template literals with
  user input. Always use parameterized queries (pg/node-postgres placeholders, SQLAlchemy/
  Django ORM bound params, Mongoose/PyMongo typed schemas — never raw `$where` or string-built
  Mongo queries).
- Validate and whitelist every input at the API boundary with a schema library (Zod/Joi on Node,
  Pydantic on FastAPI, Django validators) BEFORE it touches business logic. Reject on mismatch;
  never "best-effort coerce" untrusted input.
- Treat every field from the Driver App as untrusted, even auto-populated ones — a device or IoT
  relay can be spoofed. Server-side re-validates odometer/fuel deltas for physical plausibility
  (e.g., reject a trip claiming 3,000km "distance traveled" in 40 minutes) rather than trusting
  client-submitted values.
- Never use `dangerouslySetInnerHTML` on user-influenced content in React; if unavoidable, run it
  through DOMPurify first.
- File uploads (POD photos, fuel receipts): validate actual file content/magic bytes server-side
  (not extension or client MIME type), enforce a strict size cap, strip EXIF metadata, store in
  object storage (S3/GCS) with non-executable randomized keys — never a directly web-servable
  path, never a client-supplied filename as the storage path.

## Authentication & authorization
- Admin/dispatcher accounts: Argon2id (preferred) or bcrypt (cost ≥ 12) password hashing — never
  MD5/SHA1/plaintext. Enforce MFA for roles that can view financials or compliance data.
- Driver auth (Tracking ID + 4-digit PIN) is a deliberately weak factor (10,000 possible PINs).
  Compensate with strict rate limiting (e.g., 5 attempts then exponential backoff/lockout),
  device-binding on first login (new-device logins require OTP/admin approval), and short-lived
  session tokens rather than a PIN granting a long-lived session.
- Short-lived JWT access tokens (10-15 min) + rotating refresh tokens in httpOnly, Secure,
  SameSite=Strict cookies (web) or `flutter_secure_storage` (Flutter — never SharedPreferences or
  localStorage).
- Real RBAC enforced server-side (Admin / Dispatcher / Viewer / Driver) on every endpoint — check
  role + resource ownership, never rely on the frontend hiding a button as the security boundary.
- Every admin-mutating action (trip edits, compliance overrides, rate changes) writes an audit log
  entry: who, what, when, before/after values.

## Transport & infrastructure
- HTTPS/TLS everywhere, including service-to-service calls and the MQTT broker (mqtts://, port
  8883, per-device client certs or unique credentials — never one shared broker password across
  the fleet).
- Standard secure headers on every response: CSP, Strict-Transport-Security,
  X-Content-Type-Options: nosniff, X-Frame-Options: DENY (or frame-ancestors), Referrer-Policy.
- CORS: explicit origin allowlist — never `*` on any authenticated endpoint.
- Secrets (DB creds, Maps/Whisper/STT API keys, MQTT credentials, JWT signing keys) live in env
  vars backed by a secrets manager (AWS/GCP Secrets Manager, Vault) — never committed, hardcoded,
  or logged. Add a pre-commit secret scanner (gitleaks/truffleHog).
- Rate limit every public endpoint, especially the no-login Live Tracking lookup (prevent Tracking
  ID enumeration) and the Get-a-Quote form (prevent spam). Redis-backed sliding-window limiter
  keyed by IP + endpoint.
- Encrypt outsized-risk fields at rest (driver personal ID numbers, if collected) via
  column-level encryption or KMS, in addition to disk-level encryption.

## Dependency & supply chain hygiene
- Pin dependency versions; run `npm audit` / `pip-audit` / `dart pub outdated` (or Dependabot/
  Snyk) in CI on every PR; block merges on high/critical vulnerabilities.
- Prefer well-audited, widely-used libraries over rolling your own for anything auth/crypto/
  file-parsing related.

## Logging & error handling
- Never log secrets, full PINs, full tokens, or raw voice recordings/PII in plaintext. Mask/
  redact before logging.
- Return generic error messages to clients ("Invalid credentials", not "PIN incorrect for
  Tracking ID NBT-8421 — user exists"); log detail server-side only.
- Every unhandled exception path fails closed (deny/abort), never fails open — especially in
  auth and financial-calculation code paths.
