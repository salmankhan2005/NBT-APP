# 🔒 NBT (New Balaji Transport) Security Audit Report
**Date:** 2026-08-18  
**Scope:** Entire codebase (Backend, Admin App, Driver App)  
**Classification:** CRITICAL FINDINGS PRESENT

---

## Executive Summary

The NBT codebase has implemented several strong security practices (parameterized queries, JWT with revocation, Argon2 hashing), but **CRITICAL vulnerabilities** exist in authentication and authorization that bypass security controls entirely. These issues must be remediated immediately before any production deployment.

**Critical Issues:** 5  
**High Issues:** 3  
**Medium Issues:** 2

---

## 🔴 1. AUTHENTICATION — CRITICAL VULNERABILITIES

### 🔴 1.1 Hardcoded Default Admin Credentials (CRITICAL)

**Issue:** Hardcoded admin credentials in production code  
**Severity:** CRITICAL  
**Impact:** Any attacker can log in as admin with username `admin` and password `9999`

**Files Affected:**
- `backend/src/routes/auth.ts` — Lines 143-149 (Admin login fallback)
- `admin app/src/db/database.ts` — Lines 883-895 (Client-side fallback)

**Code:**
```typescript
// backend/src/routes/auth.ts (Line 143-149)
if (username === 'admin' && pin === '9999') {
  const jti = `adm-dev-${Date.now()}`;
  const token = app.jwt.sign(
    { jti, adminId: 'ADM-001', username: 'admin', role: 'admin' },
    { expiresIn: '24h' }
  );
  return reply.code(200).send({ token, username: 'admin', name: 'Administrator', role: 'admin' });
}
```

```typescript
// admin app/src/db/database.ts (Line 883-895)
if (username === 'admin' && pin === '9999') {
  this.token = 'local-fallback-token';
  this.currentUsername = 'admin';
  // ... token stored in secure storage
  return true;
}
```

**Risk:** 
- Bypasses database-backed authentication entirely
- Allows unauthorized admin access even if user database is empty
- Credentials are hardcoded in source code and visible in compiled binaries
- No audit trail for this authentication path

**Remediation:**
```typescript
// REMOVE entirely — do not use hardcoded credentials
// Instead, ensure admin users are created in database with strong credentials
// For initial setup, use a temporary setup script that's NOT in production code

// Option 1: Setup Script (Not in production code)
// scripts/initial-admin-setup.ts (git-ignored, run once during deployment)
const initialPin = process.env.INITIAL_ADMIN_PIN;
if (!initialPin) throw new Error('INITIAL_ADMIN_PIN required for setup');
const pinHash = await argon2.hash(initialPin);
await sql`INSERT INTO admin_users (id, username, password_hash, name, role)
  VALUES ('ADM-001', 'admin', ${pinHash}, 'Administrator', 'admin')`;

// Option 2: Environment-based setup (safer)
// In bootstrap(), check if admin exists; if not, create from env vars
if (process.env.SETUP_MODE === 'true' && process.env.INITIAL_ADMIN_PIN) {
  // Create admin only in setup mode
}
```

---

### 🔴 1.2 Hardcoded Fallback Tokens in Middleware (CRITICAL)

**Issue:** Authentication middleware accepts hardcoded tokens, bypassing JWT verification entirely  
**Severity:** CRITICAL  
**Impact:** Any request with `Bearer local-fallback-token` or `Bearer mock-admin-token` is authenticated as admin automatically

**Files Affected:**
- `backend/src/middleware/auth.ts` — Lines 14-19

**Code:**
```typescript
// backend/src/middleware/auth.ts (Line 14-19)
if (rawToken === 'local-fallback-token' || rawToken === 'mock-admin-token') {
  request.user = { role: 'admin', username: 'admin', adminId: 'ADM-001' };
  return;
}
```

**Risk:**
- Any HTTP request with these known tokens grants admin access
- Tokens are hardcoded in source code — can be extracted from binaries
- Bypasses all JWT verification, expiration checks, and token revocation
- Attackers can call any admin API endpoint without valid credentials

**Remediation:**
```typescript
// Remove hardcoded token checks entirely
// BEFORE
if (rawToken === 'local-fallback-token' || rawToken === 'mock-admin-token') {
  request.user = { role: 'admin', username: 'admin', adminId: 'ADM-001' };
  return;
}

// AFTER - Remove this block completely
// All authentication must go through proper JWT verification only
await request.jwtVerify();
```

---

### 🔴 1.3 Hardcoded Fallback Tokens in Client Apps (CRITICAL)

**Issue:** Mobile apps use hardcoded fallback tokens when authentication fails  
**Severity:** CRITICAL  
**Impact:** Apps send `Bearer local-fallback-token` to backend, gaining automatic admin access

**Files Affected:**
- `admin app/src/screens/LorryBookingScreen.tsx` — Line 126
- `DRIVER APP/src/db/database.ts` — Line 939

**Code:**
```typescript
// admin app/src/screens/LorryBookingScreen.tsx (Line 125-126)
function getAdminToken(): string {
  return db.getToken() || 'local-fallback-token';
}

// DRIVER APP/src/db/database.ts (Line 939)
const token = this.currentToken || 'local-fallback-token';
```

**Risk:**
- If user is not authenticated, fallback token is used automatically
- Grants full access to API without valid login
- Users who don't log in still get admin API calls executed
- Combined with backend fallback check (issue 1.2), this creates authentication bypass

**Remediation:**
```typescript
// BEFORE
function getAdminToken(): string {
  return db.getToken() || 'local-fallback-token';
}

// AFTER - Throw error if not authenticated
function getAdminToken(): string {
  if (!db.getToken()) {
    throw new Error('User not authenticated. Please log in.');
  }
  return db.getToken()!;
}

// Or redirect to login screen in mobile app
if (!db.getToken()) {
  navigation.navigate('LoginScreen');
  throw new Error('Authentication required');
}
```

---

### 1.4 No Multi-Factor Authentication (MFA)

**Issue:** No MFA or OAuth implemented  
**Severity:** HIGH  
**Impact:** Single factor (PIN) can be compromised; no second layer of defense

**Current Authentication:** Simple PIN/Password (single factor)  
**Missing:** MFA, OAuth 2.0, Social Login

**Remediation:**
```typescript
// Option 1: TOTP-based MFA using 'speakeasy' library
import speakeasy from 'speakeasy';

// During admin setup
const secret = speakeasy.generateSecret({ name: 'NBT Admin' });
// Store secret.base32 in DB
// User scans QR code in authenticator app

// During login
const isValidOtp = speakeasy.totp.verify({
  secret: admin.mfaSecret,
  encoding: 'base32',
  token: otpToken,
  window: 2
});

if (!isValidOtp) return reply.code(401).send({ error: 'Invalid OTP' });

// Option 2: OAuth with Google (recommended for enterprise)
import { google } from 'googleapis';

app.get('/api/auth/google/callback', async (req, reply) => {
  const code = req.query.code;
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3001/api/auth/google/callback'
  );
  
  const { tokens } = await oauth2Client.getToken(code);
  const ticket = await oauth2Client.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID
  });
  
  const payload = ticket.getPayload();
  // Verify user's email is in your admin list
  // Issue JWT token
});
```

---

## 🟠 2. AUTHORIZATION — HIGH PRIORITY ISSUES

### 2.1 No Authorization Check on File Upload (HIGH)

**Issue:** Upload endpoint does NOT require authentication  
**Severity:** HIGH  
**Impact:** Unauthenticated users can upload any allowed file type (unlimited uploads)

**Files Affected:**
- `backend/src/routes/upload.ts` — Lines 20-54 (No `preHandler: [app.authenticate]`)

**Code:**
```typescript
// backend/src/routes/upload.ts (Line 20)
app.post(
  '/',
  {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },  // Only rate limit, no auth!
  },
  async (req: FastifyRequest, reply: FastifyReply) => {
    // ... file upload logic
```

**Risk:**
- Any attacker can upload files without authentication
- Can fill disk space with large files
- No audit trail of who uploaded what
- No owner tracking of uploaded files

**Remediation:**
```typescript
// BEFORE
app.post(
  '/',
  { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
  async (req: FastifyRequest, reply: FastifyReply) => {

// AFTER - Add authentication requirement
app.post(
  '/',
  {
    preHandler: [app.authenticate],  // ADD THIS
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } }
  },
  async (req: FastifyRequest, reply: FastifyReply) => {
    const user = req.user as { driverId?: string; adminId?: string };
    const ownerId = user.driverId || user.adminId;
    
    // ... existing upload logic ...
    
    // Log upload with owner
    await sql`
      INSERT INTO upload_logs (file_name, uploaded_by, uploaded_at)
      VALUES (${safeName}, ${ownerId}, now())
    `;
  }
);
```

---

### 2.2 Missing Authorization on Sensitive Admin Operations (HIGH)

**Issue:** Admin routes use `requireAdmin` but no row-level authorization  
**Severity:** HIGH  
**Impact:** One admin can access/modify data of other admins or global settings

**Example: Trip Update**
```typescript
// backend/src/routes/admin.ts (Line 166)
app.patch('/trips/:id', adminHook, async (req: FastifyRequest, reply: FastifyReply) => {
  const id = req.params.id as string;
  // ... NO CHECK if admin owns this trip or has permission
  await sql`UPDATE trips SET status = ${String(body.status)}, updated_at = now() WHERE id = ${id}`;
});
```

**Risk:**
- Admin A can modify Admin B's trip data
- No audit trail of which admin made changes
- No data ownership verification

**Remediation:**
```typescript
app.patch('/trips/:id', adminHook, async (req: FastifyRequest, reply: FastifyReply) => {
  const id = req.params.id as string;
  const user = req.user as { adminId: string; role: string };
  
  // Check if admin owns or has permission to edit this trip
  const trip = await sql`
    SELECT created_by FROM trips WHERE id = ${id}
  `;
  
  if (trip.length === 0) {
    return reply.code(404).send({ error: 'Trip not found' });
  }
  
  // Allow if owner or super_admin role
  if (user.role !== 'super_admin' && trip[0].created_by !== user.adminId) {
    return reply.code(403).send({ error: 'Forbidden', message: 'You do not have permission to edit this trip' });
  }
  
  // Proceed with update
  await sql`UPDATE trips SET status = ${String(body.status)}, updated_at = now() WHERE id = ${id}`;
});
```

---

### 2.3 No Role-Based Access Control (RBAC) (MEDIUM)

**Issue:** Only basic "admin" vs "driver" roles; no permission hierarchy  
**Severity:** MEDIUM  
**Impact:** Cannot restrict admins to specific operations

**Current Roles:**
- `admin` / `super_admin` — full access
- `driver` — trip-specific access

**Missing:**
- `finance_admin` — expense/payment only
- `ops_manager` — trip management only
- `viewer` — read-only access

**Remediation:**
```typescript
// Define permission matrix
const PERMISSIONS = {
  'super_admin': ['*'],
  'finance_admin': ['read:expenses', 'write:expenses', 'read:payments', 'write:payments'],
  'ops_manager': ['read:trips', 'write:trips', 'read:drivers', 'write:drivers'],
  'viewer': ['read:*'],
  'driver': ['read:own_trip', 'write:own_trip']
};

// Add permission check middleware
async function requirePermission(permission: string) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const user = req.user as { role: string };
    const allowedPerms = PERMISSIONS[user.role] || [];
    
    if (!allowedPerms.includes('*') && !allowedPerms.includes(permission)) {
      return reply.code(403).send({ error: 'Forbidden', message: `Permission '${permission}' required` });
    }
  };
}

// Usage
app.post('/expenses', 
  { preHandler: [app.authenticate, app.requireAdmin, requirePermission('write:expenses')] },
  async (req, reply) => { /* ... */ }
);
```

---

## 🟡 3. INPUT VALIDATION

### 3.1 Missing File Size Limit Validation in Upload (MEDIUM)

**Issue:** File size limit is set in multipart config but NOT validated per file  
**Severity:** MEDIUM  
**Impact:** Users might bypass limit or upload excessively large files

**Files Affected:**
- `backend/src/index.ts` — Lines 236-241 (Limit set to 10 MB)
- `backend/src/routes/upload.ts` — No file size check in handler

**Code:**
```typescript
// backend/src/index.ts (Line 236-241)
await app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
    files: 1,
  },
});
```

**Issue:** The limit exists in config but file size isn't explicitly validated in the route handler.

**Remediation:**
```typescript
// backend/src/routes/upload.ts
app.post(
  '/',
  { preHandler: [app.authenticate] },
  async (req: FastifyRequest, reply: FastifyReply) => {
    const data = await req.file();

    if (!data) {
      return reply.code(400).send({ error: 'No file provided' });
    }

    // ADD: Explicit file size validation
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    const fileStream = data.file;
    let uploadedBytes = 0;

    // Validate MIME type
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowedMimes.includes(data.mimetype)) {
      return reply.code(400).send({
        error: 'Invalid file type',
        message: `Only images and PDFs allowed. Received: ${data.mimetype}`,
      });
    }

    // Validate filename
    if (!data.filename || data.filename.length === 0) {
      return reply.code(400).send({ error: 'Filename required' });
    }

    // Check file extension against MIME type
    const ext = path.extname(data.filename).toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf'];
    if (!validExtensions.includes(ext)) {
      return reply.code(400).send({ error: 'Invalid file extension' });
    }

    const ext = path.extname(data.filename || '.jpg').replace(/[^a-zA-Z0-9.]/g, '') || '.jpg';
    const safeName = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const savePath = path.join(UPLOAD_DIR, safeName);

    try {
      // Stream with size validation
      const writeStream = fs.createWriteStream(savePath);
      
      fileStream.on('data', (chunk) => {
        uploadedBytes += chunk.length;
        if (uploadedBytes > MAX_FILE_SIZE) {
          fileStream.destroy();
          writeStream.destroy();
          fs.unlinkSync(savePath);
          throw new Error('File exceeds maximum size of 10 MB');
        }
      });

      await pipeline(fileStream, writeStream);

      const host = (process.env.PUBLIC_HOST || `http://localhost:${process.env.PORT || 3001}`);
      const publicUrl = `${host}/uploads/${safeName}`;

      return reply.code(201).send({ url: publicUrl, filename: safeName });
    } catch (err: any) {
      if (fs.existsSync(savePath)) fs.unlinkSync(savePath);
      return reply.code(400).send({ error: 'Upload failed', message: err.message });
    }
  }
);
```

---

## 🔴 4. SECRET MANAGEMENT — CRITICAL ISSUES

### 4.1 No Verification of Environment Variables (CRITICAL)

**Issue:** Missing environment variables are not validated at startup  
**Severity:** CRITICAL  
**Impact:** App could start without required secrets, using defaults or undefined values

**Files Affected:**
- `backend/src/index.ts` — Only JWT_SECRET is checked (line 198-199)
- Missing checks for: `DATABASE_URL`, `GOOGLE_MAPS_API_KEY`, `WHATSAPP_API_KEY`, etc.

**Code:**
```typescript
// backend/src/index.ts (Line 198-199)
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters. Set it in your .env file.');
}

// But DATABASE_URL is NOT checked
const connectionString = process.env.DATABASE_URL || '';  // Could be empty!
```

**Risk:**
- App could start without database connection
- Map services could silently fail without API key
- No audit of missing secrets

**Remediation:**
```typescript
// backend/src/index.ts (Add to bootstrap function)
async function validateEnvironment() {
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'NODE_ENV',
  ];

  const optionalEnvVars = [
    'GOOGLE_MAPS_API_KEY',
    'WHATSAPP_API_KEY',
    'WHATSAPP_API_URL',
  ];

  // Check required variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Required environment variable missing: ${envVar}`);
    }
  }

  // Validate JWT_SECRET length
  if (process.env.JWT_SECRET!.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }

  // Validate DATABASE_URL format
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || !dbUrl.startsWith('postgresql')) {
    throw new Error('Invalid DATABASE_URL format (must start with postgresql)');
  }

  // Log optional variables
  for (const envVar of optionalEnvVars) {
    if (process.env[envVar]) {
      app.log.info(`✓ ${envVar} configured`);
    } else {
      app.log.warn(`⚠ ${envVar} not configured — feature disabled`);
    }
  }

  app.log.info('✅ All required environment variables validated');
}

// Call before bootstrap
await validateEnvironment();
```

---

### 4.2 API Keys Exposed in Logs (HIGH)

**Issue:** API keys might be logged or included in error responses  
**Severity:** HIGH  
**Impact:** Secrets could be exposed in log files or error messages

**Files Affected:**
- `backend/src/routes/maps.ts` — API key usage
- `backend/src/routes/vehicleDocuments.ts` — WhatsApp API key usage

**Code:**
```typescript
// backend/src/routes/maps.ts (Line 470)
const apiKey = process.env.GOOGLE_MAPS_API_KEY;  // Never log this!

// backend/src/routes/vehicleDocuments.ts (Line 280-281)
const whatsappApiKey = process.env.WHATSAPP_API_KEY;
const whatsappApiUrl = process.env.WHATSAPP_API_URL;
```

**Risk:**
- If error is logged with context, API key could be included
- Stack traces might expose key in memory dumps

**Remediation:**
```typescript
// Create a secret sanitizer
function sanitizeForLogging(obj: any, secretKeys = ['apiKey', 'token', 'password', 'secret']): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const sanitized = { ...obj };
  for (const key of Object.keys(sanitized)) {
    if (secretKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeForLogging(sanitized[key]);
    }
  }
  return sanitized;
}

// Usage in error logging
try {
  // ... Google Maps API call
} catch (err: any) {
  app.log.error('Maps API error:', sanitizeForLogging({ 
    error: err.message, 
    context: err 
  }));
}
```

---

## ✅ 5. SQL INJECTION — NO ISSUES FOUND

**Status:** ✅ SECURE

**Findings:**
- All database queries use parameterized queries with `sql` template literals
- No string concatenation in SQL queries
- Input validation via Zod schemas before SQL execution

**Examples of Safe Code:**
```typescript
// Safe: Parameterized query
const rows = await sql`
  SELECT * FROM trips WHERE id = ${tripId} AND status = ${status}
`;

// Safe: Template literals prevent injection
await sql`UPDATE trips SET status = ${String(body.status)} WHERE id = ${id}`;

// Safe: Zod validation before query
const parsed = LoginSchema.safeParse(req.body);
if (!parsed.success) return reply.code(400).send(...);
```

**No SQL Injection Vulnerabilities Detected** ✅

---

## 📋 REMEDIATION ROADMAP

### Phase 1: CRITICAL (Do Immediately - Before ANY Production Use)
- [ ] Remove hardcoded credentials from `backend/src/routes/auth.ts` (line 143-149)
- [ ] Remove hardcoded fallback tokens from `backend/src/middleware/auth.ts` (line 14-19)
- [ ] Remove fallback tokens from `admin app/src/db/database.ts` (line 883-895)
- [ ] Remove fallback tokens from `DRIVER APP/src/db/database.ts` (line 939)
- [ ] Add authentication requirement to upload endpoint
- [ ] Validate all required environment variables at startup

**Timeline:** BEFORE DEPLOYMENT  
**Estimated Effort:** 4-6 hours

### Phase 2: HIGH (Do Before Beta/Testing)
- [ ] Implement TOTP-based MFA or OAuth for admin login
- [ ] Add role-based access control (RBAC) with permission matrix
- [ ] Add row-level authorization checks for sensitive operations
- [ ] Implement comprehensive input validation with file extension checks
- [ ] Add secret sanitization in logging
- [ ] Implement file upload audit logging

**Timeline:** Within 1-2 weeks  
**Estimated Effort:** 16-20 hours

### Phase 3: MEDIUM (Before GA Release)
- [ ] Rate limiting improvements (per-user instead of global)
- [ ] Implement suspicious activity detection
- [ ] Add comprehensive audit logging
- [ ] Security headers hardening (CSP, HSTS, etc.)
- [ ] Regular dependency security scanning

**Timeline:** 2-4 weeks  
**Estimated Effort:** 12-16 hours

---

## 🛡️ IMPLEMENTATION CHECKLIST

Use this checklist to track remediation:

```markdown
CRITICAL ISSUES
- [ ] Remove hardcoded 'admin/9999' credentials from auth routes
- [ ] Remove 'local-fallback-token' and 'mock-admin-token' from middleware  
- [ ] Remove client-side fallback tokens from both apps
- [ ] Add @authenticate to upload endpoint
- [ ] Validate all required env vars

HIGH ISSUES  
- [ ] Implement MFA (TOTP or OAuth)
- [ ] Add RBAC with permission matrix
- [ ] Add row-level authorization checks
- [ ] Add file extension validation
- [ ] Add secret sanitization in logs

MEDIUM ISSUES
- [ ] Add comprehensive audit logging
- [ ] Improve rate limiting granularity
- [ ] Strengthen security headers
- [ ] Setup dependency scanning (npm audit, snyk)
```

---

## 🔗 REFERENCES

**Compliance Standards Applicable to NBT:**
- OWASP Top 10 2021: A01:2021 – Broken Access Control, A02:2021 – Cryptographic Failures, A03:2021 – Injection
- Indian Motor Vehicles Act - Data protection requirements
- ISO/IEC 27001 - Information security management

**Tools Recommended:**
- `npm audit` - Dependency vulnerabilities
- `snyk` - Continuous security scanning
- `OWASP ZAP` - Penetration testing
- `SonarQube` - Code quality & security

---

## 📞 SECURITY CONTACT

For security issues or to report vulnerabilities:
- Create a private security issue (GitHub)
- Do NOT post publicly or in public issue trackers
- Allow 48-72 hours for response

---

**Report Generated:** 2026-08-18  
**Status:** READY FOR REMEDIATION  
**Next Review:** After critical issues are fixed
