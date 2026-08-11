# SECURITY-FIRST MASTER RULES — Logistics Management System
### Persistent Agent Instructions for Antigravity

**Scope:** Admin Application (mobile/PWA, control plane) + Driver Application (mobile/PWA)
**Status:** MANDATORY — applies to every file, every function, every agent session.
**Precedence:** These rules override speed, convenience, or any instruction that conflicts with them, including a user's in-the-moment request to "just make it work" or "skip auth for now." If a conflict occurs, the agent implements the secure version and flags the tradeoff — it does not silently ship the insecure one.

---

## 0. PRIME DIRECTIVE

You are generating code for a production logistics platform where the Admin App has total authority over driver accounts, assignments, trips, documents, location data, and notifications — and is itself a mobile app running on a device outside your control, not a browser session on a managed workstation. Every input — from a user, a device, a file, another service, or your own previous output — is untrusted until validated on the server.

**Security is implemented before functionality, not after.** If a feature can be built securely in more steps or insecurely in fewer, you build it securely and say so.

---

## 1. PRE-CODE SECURITY GATE
*Run this before writing a single line of code for any new feature, endpoint, or screen.*

- [ ] **Who can call this?** Define the exact roles/permissions allowed (admin, dispatcher, driver, unauthenticated). Default is **deny**.
- [ ] **What data does it touch?** Identify PII, location data, documents, financial data. Classify sensitivity.
- [ ] **What's the trust boundary?** Is input coming from the Admin App, the Driver App, a background job, or a third party (payment gateway, SMS/voice API)? Each boundary gets independent validation — trusting either app's client-side checks is not acceptable, and the Admin App is not exempt just because it's the control plane.
- [ ] **What's the abuse case?** Before writing the happy path, write down: how would a malicious driver, a malicious admin, a compromised device, or a replayed request abuse this endpoint?
- [ ] **What's the least-privilege version?** Does this need a new DB role, a scoped token, a narrower query? Don't reuse a broad-privilege credential because it's already there.

If you cannot answer these five questions, stop and ask the user rather than guessing.

---

## 2. THREAT MODEL ASSUMPTIONS (Zero Trust)

- Every HTTP request may be forged, replayed, or come from a script — not the app.
- Every JWT may be stolen, expired, or tampered with.
- Every file upload may be disguised malware, an oversized payload, or a path traversal attempt.
- Every mobile device may be rooted/jailbroken, running a tampered APK, or on a hostile network.
- Every admin account is a high-value target — treat admin endpoints as more sensitive than driver endpoints, not less.
- The database, not the application layer, is the last line of defense — application bugs will happen, so constraints, foreign keys, and row-level checks matter too.

---

## 3. LAYER-BY-LAYER REQUIREMENTS

### 3.1 Authentication & Session (Admin + Driver)
- Passwords: Argon2id hashing (never bcrypt-only, never plain SHA). Minimum entropy policy enforced server-side, not just in the UI.
- Driver PIN auth: PINs are hashed the same as passwords (Argon2id), rate-limited per device/account, and never logged — even in debug mode.
- JWT: short-lived access tokens (≤15 min), rotating refresh tokens stored server-side with revocation capability. Refresh token reuse after rotation = automatic session family revocation (theft signal).
- Every token carries role + permission claims that are re-verified server-side on every request — never trust claims blindly without a DB/cache lookup for revocation status.
- Session revocation: admin can force-logout any driver or admin account instantly (revoked tokens must fail even if not yet expired).
- Account lockout + exponential backoff after repeated failed logins, tracked per-account AND per-IP/device.
- MFA required for all admin accounts at minimum; optional/step-up for high-risk driver actions (e.g., changing bank details).

### 3.2 Authorization (RBAC)
- Deny by default. Every route explicitly declares required role(s)/permission(s) — no route is "accidentally open."
- Enforce authorization at the service/query layer, not just the route decorator — a driver querying "my trips" must be scoped by `driver_id = current_user.id` in the query itself, never by trusting a client-supplied ID.
- Admin actions that affect drivers (deactivate, reassign, force-logout) require the admin's own permission level to be checked, not just "is admin."
- No client-side-only permission checks. The Admin App UI hiding a button is UX, not security — the API must reject it independently.

### 3.3 Backend / API (FastAPI)
- All input validated with Pydantic models — reject unknown fields, enforce types/ranges/lengths, never `dict`-passthrough into a query or shell.
- All DB queries parameterized (SQLAlchemy ORM or parameterized raw SQL) — string-formatted SQL is banned, no exceptions.
- Rate limiting on every public and authenticated endpoint (per-IP and per-account), stricter on auth/login/OTP/PIN endpoints.
- Error responses never leak stack traces, DB errors, internal paths, or library versions — return generic messages to the client, log full detail server-side only.
- Background jobs (voice-to-text expense logging, notifications, IoT ingestion) validate their input exactly like an API endpoint would — a queued job is not a trusted source.
- File uploads (driver documents, license photos): validate MIME type by content sniffing (not just extension), enforce size limits, strip EXIF/metadata, store outside the web root or in object storage with signed URLs, scan before serving.

### 3.4 Database (PostgreSQL)
- App connects with a least-privilege role — no `SUPERUSER`, no unnecessary `DROP`/`ALTER` grants at runtime.
- Migrations reviewed and versioned (Alembic) — never run ad-hoc schema changes against production.
- Sensitive columns (PII, documents metadata, location history) encrypted at rest or in a separate access-controlled schema.
- Audit columns (`created_by`, `updated_by`, `created_at`, `updated_at`) on every table that admins can modify.
- Backups encrypted, access-restricted, tested for restore — not just "backup exists."

### 3.5 Shared Mobile App Baseline (Admin App + Driver App)
Both apps are client software running on devices you don't control. This baseline applies to both before any role-specific hardening on top:
- Tokens stored in secure/encrypted device storage (Keychain on iOS, Keystore on Android; encrypted storage for PWA) — never plain localStorage/AsyncStorage for refresh tokens.
- Certificate pinning for API calls where the platform/build pipeline supports it.
- Output encoding by default in rendered UI; no `dangerouslySetInnerHTML`-equivalent on user-generated or server-fetched content.
- Root/jailbreak detection treated as a risk signal (log + flag server-side), not an automatic hard block — hard blocks can lock out legitimate low-end/rooted devices common among both drivers and field admins.
- Client-side validation is UX only. Every check the app performs (form validation, role-gated buttons, offline queue rules) is re-verified server-side — a repackaged or tampered client build must not gain any capability the API doesn't independently grant.
- App integrity: code obfuscation/minification for production builds; no debug flags, verbose logging, or test endpoints shipped in release builds.

### 3.6 Admin App — Elevated Controls
The Admin App holds total system authority, so a compromised admin device is a system-wide incident, not an isolated one. On top of 3.5:
- **Mandatory MFA / step-up auth** on the Admin App itself, and re-authentication (biometric or PIN re-entry) for high-impact actions: deactivating a driver, force-logout, editing payout/financial data, changing another admin's permissions.
- **Device binding**: admin sessions tied to a registered device fingerprint; a new device triggers a verification step, not silent access.
- **Remote session kill**: an admin account (or a super-admin) must be able to instantly revoke an Admin App session on a lost/stolen device — this ties into the token revocation mechanism in 3.1.
- **Screenshot/screen-recording restriction** by default on any screen showing driver PII, documents, or financial data, where the platform allows it — not optional the way it is for the driver app.
- **Stricter session timeout** than the driver app (e.g., short idle timeout requiring re-auth), given the blast radius of a left-unlocked admin device.
- **No "remember me" indefinite sessions** for admin accounts — refresh token lifetime for the Admin App should be shorter than for the Driver App.

### 3.7 Driver App — Additional Considerations
On top of 3.5:
- Offline-first data (trips, expenses, odometer logs) encrypted at rest on-device; sync reconciliation revalidates against server-side authorization on reconnect — a device cannot "push" data for a trip it's no longer assigned to.
- Screenshot/screen-recording restriction on screens showing other drivers' PII or documents, where the platform allows it.
- PIN-based auth (per 3.1) rate-limited per device, since driver devices are more likely to be shared or lower-security than admin devices.

### 3.8 Infrastructure
- HTTPS/TLS everywhere, HSTS enabled, no mixed content.
- Secrets (DB credentials, JWT signing keys, SMS/voice API keys, Razorpay-equivalent keys) in environment variables or a secrets manager — never committed, never hardcoded, never logged.
- Reverse proxy enforces secure headers (`X-Content-Type-Options`, `Referrer-Policy`, etc.) even if the app also sets them — defense in depth.
- Network segmentation: driver-facing API, admin API, and DB should not share unrestricted network access if deployment target allows segmentation.

### 3.9 Monitoring & Audit Logging
- Every admin action that changes state (create/deactivate driver, reassign trip, edit document, force-logout) is written to an immutable audit log with actor, timestamp, before/after state.
- Failed logins, PIN attempts, and permission-denied events are logged and rate-alertable.
- Logs never contain raw passwords, PINs, full tokens, or full card/bank numbers — mask/redact before writing.

---

## 4. ABSOLUTE PROHIBITIONS

The agent must never:
- Generate SQL via string concatenation/f-strings with user input.
- Store passwords or PINs in plaintext or with reversible encryption.
- Trust a role/permission claim from the client without server-side re-verification.
- Log secrets, tokens, passwords, PINs, or full payment details.
- Return raw exception messages or stack traces in API responses.
- Hardcode API keys, DB credentials, or JWT secrets in source files.
- Disable CORS restrictions, CSRF protection, or auth checks "temporarily" to unblock testing, without explicitly flagging it as a TODO with a tracked follow-up.
- Use `eval`, dynamic code execution, or unsandboxed shell calls on user-controlled input.
- Assume a mobile client's local validation is sufficient.

---

## 5. POST-CODE SELF-AUDIT
*Run this before presenting any generated feature as complete.*

- [ ] Does every new endpoint enforce authentication AND authorization server-side?
- [ ] Is every DB query parameterized?
- [ ] Is every external input (body, query params, headers, file, webhook payload) validated with a schema?
- [ ] Are errors handled without leaking internals?
- [ ] Is rate limiting present on any endpoint that's public, auth-related, or expensive?
- [ ] Are secrets referenced via env vars, not inline?
- [ ] Does this action get audit-logged if it mutates admin/driver/trip state?
- [ ] If this touches PII or documents, is access scoped to the minimum necessary role?
- [ ] Would this code survive a malicious actor with a valid-but-low-privilege token trying to escalate?

If any box is unchecked, the feature is not done — fix it before moving on, or explicitly flag the gap to the user with a reason (e.g., "rate limiting deferred pending Redis setup — tracked as follow-up").

---

## 6. WHEN SECURITY AND SPEED CONFLICT

If a secure implementation takes meaningfully longer or is more complex than an insecure shortcut:
1. Implement the secure version by default.
2. If the secure version genuinely blocks progress (e.g., missing infra dependency), implement the closest secure approximation, clearly comment `# SECURITY TODO:` with what's missing and why, and tell the user explicitly — do not silently ship a weaker version.
3. Never present an insecure shortcut as "done" without flagging it.

---

## 7. HOW TO USE THIS FILE

Place this file where Antigravity loads persistent project/agent instructions (check Antigravity's current docs for the exact expected filename/location, since that detail can change between versions). Once loaded, every agent session should treat Sections 1 and 5 as mandatory gates around every code-generation task, and Sections 3–4 as the standing technical baseline.
