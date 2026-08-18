# Security Guidance for NBT + ARS Fleet Transit

> **Purpose:** Mandatory security and vulnerability guidance for the NBT + ARS Fleet Transit System  
> **Scope:** Admin App (React Native), Driver App (React Native), and Backend (Node.js)  
> **Last Updated:** 2026-08-18

---

## 1. Authentication & Authorization

### 1.1 PIN & Token Security
- **CRITICAL:** Never hardcode credentials. All PINs, access tokens, and session credentials must be loaded from secure environment configuration.
- **Admin Authentication:** Validate username and PIN via secure backend endpoint before issuing a session token.
- **Driver Authentication:** Always hash PINs using SHA-256 + salt. Validate Tracking ID + PIN against backend database, never hardcode valid credentials.
- **Session Tokens:** Generate tokens using cryptographically secure methods (e.g., `crypto.randomBytes`). Tokens must expire after 24 hours or upon explicit logout.
- **Auto-Lock Enforcement:** Implement and enforce 300-second inactivity timeout on both apps. Clear session data on timeout without warning (silent auto-lock).

### 1.2 Authorization Checks
- **Admin Routes:** All endpoints under `/admin` must verify `admin_role` or `is_admin` flag before any database read/write.
- **Driver Routes:** All endpoints under `/driver` must verify the authenticated driver's `session_driver_id` matches the resource being accessed.
- **Trip Access Control:** Drivers can only access trips assigned to them. Admin can access all trips. Implement this check at every data access point, not just the API layer.

---

## 2. Sensitive Data Protection

### 2.1 Data Classification
- **HIGH:** Driver PINs, session tokens, payment account details, personal identification numbers, GPS coordinates (real-time location).
- **MEDIUM:** Trip data, expense logs, driver names, vehicle details, contact information.
- **LOW:** Fleet statistics, historical trip summaries (aggregated, no PII).

### 2.2 Logging Policy
- **NEVER log HIGH-sensitivity data at any level (DEBUG, INFO, WARN, ERROR).**
- **Do not log:** `pin`, `password`, `session_token`, `access_token`, `payment_account_number`, `driver_id` (real-time location tie-in).
- **Safe to log:** Trip status changes, operation timestamps, aggregated error counts.
- **Format:** Use sanitized IDs (e.g., `trip_id`, `driver_id_hashed`) instead of full values in logs.

### 2.3 AsyncStorage (Mobile) Security
- **Never store PINs, passwords, or unencrypted tokens in AsyncStorage.**
- **Use `expo-secure-store` for all sensitive credentials:** `admin_session_token`, `session_driver_id`, hashed PINs, auth tokens.
- **AsyncStorage OK for:** Trip cache (with expiry), UI preferences, non-sensitive user settings.
- **On Logout:** Wipe all sensitive data from both `expo-secure-store` and `AsyncStorage`.

### 2.4 Signature & Base64 Handling
- **Signatures are HIGH sensitivity (contain driver identity proof).**
- **Validate signature data before encoding to base64:** Check for file size limits (max 2 MB), valid image format (JPEG/PNG only).
- **Do not store raw signatures on device.** Transmit to backend immediately after capture, then delete from local storage.
- **Signature integrity:** Include signature hash in trip POD record for audit trail and tamper detection.

---

## 3. API & Backend Security

### 3.1 Input Validation
- **Validate all trip parameters** at API entry: trip_id, driver_id, destination, payload size.
- **Reject invalid data types:** If expecting a number, reject strings; if expecting a date, reject malformed timestamps.
- **Sanitize string inputs:** Strip dangerous characters (`;`, `'`, `"`, `<`, `>`) before database writes to prevent injection attacks.
- **Rate Limiting:** Implement per-IP and per-driver rate limits (e.g., max 100 requests per minute per driver, 1000 per minute per admin).

### 3.2 Trip Lifecycle Validation
- **State Machine Enforcement:** A trip cannot transition from `completed` to `pending`. Enforce valid state transitions at the backend.
- **Idempotency:** Trip updates (mark complete, log expense) must be idempotent. Use trip ID + operation type as unique key.
- **Double-spend Prevention:** For expense reimbursement, verify each expense is submitted only once. Use transaction IDs or UUIDs.

### 3.3 Authorization at Every Layer
- **Do not rely on client-side role checks.** Verify `admin_role` or `driver_assignment` on the backend before returning data.
- **Multi-tenant Safety:** If expanding to multiple fleet operators, filter all queries by `org_id` or `fleet_id`.

---

## 4. Real-Time & Offline Sync Security

### 4.1 Offline Data Handling
- **SyncAction Queue:** Before syncing queued actions, verify the device is still authenticated (token not expired).
- **Data Conflict Resolution:** If offline changes conflict with server state, log the conflict and alert the user. Do not silently overwrite.
- **Timestamp Validation:** Reject sync actions older than 7 days to prevent delayed injections.

### 4.2 GPS & Location Data
- **GPS coordinates are HIGH sensitivity.** Do not log raw coordinates at INFO level.
- **Location Accuracy:** Validate GPS coordinates are within reasonable bounds (e.g., within India for an Indian transit company).
- **Frequency Throttling:** Cap GPS telemetry to once per 30 seconds to avoid tracking abuse.

---

## 5. Cryptography & Token Comparison

### 5.1 Secure Comparison
- **Use `crypto.timingSafeEqual` for token/PIN comparison, not `===`.**
- **Why:** Regular equality comparison leaks timing information, allowing attackers to guess tokens character-by-character.

### 5.2 Hashing
- **PINs & Passwords:** Hash with bcrypt (cost factor 10+) or Argon2, never plain SHA-256 alone.
- **Session Tokens:** Generate with `crypto.randomBytes(32)` and store SHA-256 hash, keep plaintext only in memory.

---

## 6. Database & Data Persistence

### 6.1 Data Integrity
- **Every trip write must be atomic:** Either all fields are updated, or none. Use transactions.
- **Audit Trail:** Log all mutations (create, update, delete) with timestamp, actor (admin_id/driver_id), and old/new values.
- **Backup:** Ensure sensitive data (PINs, tokens) are **not** backed up in plain text. Exclude from backup, or encrypt at-rest.

### 6.2 Access Control
- **Admin Database:** Restrict direct access to `AdminDatabase` class. Use service layer methods that enforce authorization.
- **Driver Database:** Drivers can only read their assigned trips and expenses. Queries must filter by `session_driver_id`.

---

## 7. Communication & Transport Security

### 7.1 HTTPS Enforcement
- **All API calls must use HTTPS, never HTTP.**
- **Pin SSL certificates** for production backend to prevent MITM attacks.
- **API Versioning:** Include API version in URL or header (e.g., `/api/v1/trips`).

### 7.2 Request Signing (Future)
- **For high-security operations** (payment processing, POD submission), implement request signing:
  - Compute HMAC-SHA256 of request body + timestamp using a shared secret.
  - Include signature in `Authorization` header.
  - Validate on backend; reject if signature invalid or timestamp older than 5 minutes.

---

## 8. Error Handling & Information Disclosure

### 8.1 Error Messages
- **Never expose stack traces, database schemas, or file paths to the client.**
- **Generic responses:** Return `"Invalid credentials"` for both invalid PIN and non-existent driver.
- **Logging:** Log full errors server-side; return safe error codes to client (e.g., 401, 403, 500).

### 8.2 Exception Handling
- **Catch all exceptions in API handlers.** Do not let unhandled exceptions crash the server.
- **Transactions Rollback:** On exception, rollback any partial writes to the database.

---

## 9. Mobile App Security

### 9.1 Code Obfuscation & Reverse Engineering
- **Disable remote debugging in production builds.**
- **Use ProGuard/R8 (Android) to obfuscate code and remove debugging symbols.**
- **Do not embed API keys or secrets in APK.** Load from backend or secure config server.

### 9.2 Jailbreak/Root Detection
- **Implement jailbreak detection (iOS) and root detection (Android).**
- **Action on detection:** Log the event, warn the user, or restrict sensitive operations (payment, POD upload).

### 9.3 Permissions & Privacy
- **Request only necessary permissions** (GPS, camera, contacts).
- **Explain permission requests** to the user in-app (privacy policy link).
- **Respect permission denials:** Gracefully degrade functionality if user denies GPS or camera access.

---

## 10. Dependency & Supply Chain Security

### 10.1 Third-Party Libraries
- **Audit dependencies for known vulnerabilities** using `npm audit` or similar.
- **Pin versions in `package-lock.json`.** Do not use floating versions (`^`, `~`).
- **Remove unused dependencies** to reduce attack surface.

### 10.2 Updates
- **Apply security patches to dependencies immediately.**
- **Test on staging before deploying to production.**

---

## 11. Compliance & Audit

### 11.1 Data Retention
- **Define data retention policy:** How long are completed trips, expenses, and signatures kept?
- **Automatic deletion:** Implement automated purge jobs for data older than retention limit.
- **User Data Export:** Provide API for drivers to export their personal data (GDPR-like).

### 11.2 Audit Logging
- **Audit all sensitive operations:**
  - Admin creates trip
  - Driver logs in
  - Trip marked complete
  - POD signature uploaded
  - Payment processed
- **Immutable audit log:** Ensure audit records cannot be modified or deleted.

---

## 12. Incident Response & Security Monitoring

### 12.1 Monitoring
- **Alert on suspicious patterns:**
  - Multiple failed login attempts (> 5 in 10 minutes)
  - Admin accessing excessive trips
  - Driver offline sync queue size > 100
  - Signature upload failures
- **Rate limiting trips:** If a driver's trip completion rate exceeds 15 trips/hour, flag for review.

### 12.2 Incident Response Plan
- **Security vulnerability found:** Patch immediately, inform affected users within 24 hours.
- **Data breach suspected:** Notify compliance/legal, preserve evidence, initiate forensics.

---

## Appendix: Security Checklist for Code Reviews

- [ ] No hardcoded credentials (PINs, passwords, API keys, secrets)
- [ ] All sensitive data protected in `expo-secure-store` (mobile) or encrypted in-transit (backend)
- [ ] PINs hashed with bcrypt/Argon2 before storage
- [ ] Session tokens validated on every API call
- [ ] Authorization checks enforced at API layer (not just UI)
- [ ] Trip state transitions validated (no invalid transitions)
- [ ] Error messages do not expose sensitive information
- [ ] Logging sanitized (no PINs, tokens, or real-time location data at INFO level)
- [ ] HTTPS enforced; SSL certificates pinned (production)
- [ ] Rate limiting implemented on API endpoints
- [ ] Input validation on all API endpoints
- [ ] GPS coordinates validated for reasonable bounds
- [ ] Signature data validated before storage (size, format)
- [ ] Offline sync actions re-authenticated before merge
- [ ] Dependencies audited and pinned
- [ ] Auto-lock timeout implemented (300 seconds)
- [ ] Audit logging enabled for sensitive operations
