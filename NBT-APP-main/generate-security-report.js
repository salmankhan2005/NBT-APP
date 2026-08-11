const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, PageNumber, BorderStyle, WidthType, ShadingType, Header, Footer } = require('docx');
const fs = require('fs');
const path = require('path');

const OUTPUT = path.join(__dirname, 'NBT_Security_Report.docx');

function makeInfoTable(rows) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
  const borders = { top: border, bottom: border, left: border, right: border };
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3120, 6240],
    rows: rows.map(row => new TableRow({
      children: [
        new TableCell({
          borders, width: { size: 3120, type: WidthType.DXA },
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          shading: { fill: 'E8F0F8', type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun(row[0])] })]
        }),
        new TableCell({
          borders, width: { size: 6240, type: WidthType.DXA },
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          children: [new Paragraph({ children: [new TextRun(row[1])] })]
        })
      ]
    }))
  });
}

function makeSimpleTable(headers, rows) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
  const borders = { top: border, bottom: border, left: border, right: border };
  const colWidth = Math.floor(9360 / headers.length);
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: headers.map(() => colWidth),
    rows: [
      new TableRow({
        children: headers.map(h => new TableCell({
          borders, width: { size: colWidth, type: WidthType.DXA },
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
          shading: { fill: '1A3A5C', type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 10 })] })]
        }))
      }),
      ...rows.map(row => new TableRow({
        children: row.map(cell => new TableCell({
          borders, width: { size: colWidth, type: WidthType.DXA },
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
          shading: { fill: 'F5F5F5', type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun(typeof cell === 'string' ? cell : '')] })]
        }))
      }))
    ]
  });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 24 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: 'Arial', color: '1A3A5C' },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: 'Arial', color: '2B5F8E' },
        paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 22, bold: true, font: 'Arial', color: '3A7AB5' },
        paragraph: { spacing: { before: 120, after: 60 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
    },
    headers: {
      default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: 'NBT + ARS Fleet Transit \u2014 Security Report', style: 'Hyperlink' })] })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({ children: [new TextRun('NBT + ARS Fleet Transit \u2014 Security Report')] })] })
    },
    children: [
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('NBT + ARS Fleet Transit')] }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Security Assessment Report')] }),
      new Paragraph({ children: [new TextRun('')] }),
      new Paragraph({ children: [new TextRun('Classification: CONFIDENTIAL \u2014 Internal Use Only')] }),
      new Paragraph({ children: [new TextRun('Report Date: August 2026')] }),
      new Paragraph({ children: [new TextRun('System: NBT & ARS Fleet Transit Portal (Admin + Driver Ecosystem)')] }),
      new Paragraph({ children: [new TextRun('Version Analyzed: Admin Console V2.4.1 \u00b7 Driver App V1.0.0')] }),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('1. Executive Summary')] }),
      new Paragraph({ children: [new TextRun('This security assessment covers the NBT + ARS Fleet Transit platform \u2014 a logistics fleet management system built on React Native (Expo) with a Fastify/Neon Postgres backend. The system comprises three components: an Admin Console (mobile/PWA), a Driver App (Android), and a Node.js backend API server.')] }),
      new Paragraph({ children: [new TextRun('')] }),
      new Paragraph({ children: [new TextRun('Overall Security Posture: WEAK \u2014 Multiple critical vulnerabilities were identified, including hardcoded credentials, exposed API keys, authentication backdoors, and missing HTTPS enforcement. Several security controls are present (Argon2 hashing, JWT with revocation, Zod validation, rate limiting, Helmet headers) but are undermined by severe implementation flaws.')] }),
      new Paragraph({ children: [new TextRun('')] }),
      makeInfoTable([
        ['Total Findings', '23'],
        ['Critical', '5'],
        ['High', '6'],
        ['Medium', '7'],
        ['Low', '5'],
      ]),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('2. Application Architecture Overview')] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('2.1 Components')] }),
      makeInfoTable([
        ['Admin App', 'React Native (Expo SDK 57) \u2014 Web/Android/iOS, primary target: desktop browser at localhost:8081'],
        ['Driver App', 'React Native (Expo SDK 57) \u2014 Android primary, Web secondary'],
        ['Backend', 'Fastify v4.28 + TypeScript + Neon Postgres (serverless PostgreSQL)'],
        ['Auth', 'JWT (HS256) + Argon2id password/PIN hashing + server-side token revocation'],
        ['Database', 'Neon Postgres (12 tables) + AsyncStorage (client-side persistence)'],
        ['Maps', 'Google Maps API (proxied through backend, but key exposed in source)'],
      ]),
      new Paragraph({ children: [new TextRun('')] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('2.2 API Endpoints')] }),
      new Paragraph({ children: [new TextRun('The backend exposes 35+ endpoints across auth, trips, admin, docs, memos, and maps routes. All protected routes require JWT authentication; admin routes additionally require admin role verification.')] }),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('3. Security Findings')] }),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('3.1 CRITICAL Findings')] }),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('FINDING C-1: Hardcoded Admin Credentials in Source Code')] }),
      makeInfoTable([
        ['Severity', 'CRITICAL'],
        ['Location', 'backend/.env (lines 8-9), backend/src/routes/auth.ts (lines 151-158), admin app/src/db/database.ts (line 396), admin app/src/screens/LoginScreen.tsx (line 113)'],
        ['Description', 'Admin credentials username=admin / PIN=9999 are hardcoded in multiple locations. The backend auth route has a dev fallback that accepts these credentials even when DB lookup fails. The admin app database also falls back to these credentials when the backend is offline.'],
        ['Impact', 'Any person with access to the source code or compiled bundle has full admin access. No password change is possible without code modification.'],
        ['Recommendation', 'Remove hardcoded credentials. Implement proper admin user management with secure credential storage. Use environment variables with a secrets manager for production. Remove the dev fallback entirely.'],
      ]),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('FINDING C-2: Authentication Backdoor in Middleware')] }),
      makeInfoTable([
        ['Severity', 'CRITICAL'],
        ['Location', 'backend/src/middleware/auth.ts (lines 16-19)'],
        ['Description', 'The authenticate middleware accepts hardcoded tokens "local-fallback-token" and "mock-admin-token" as valid admin tokens, completely bypassing JWT verification and all authorization checks.'],
        ['Impact', 'Anyone who knows these token values (which are in source code) gains full admin access to all admin endpoints without any authentication.'],
        ['Recommendation', 'Remove the backdoor tokens immediately. Ensure all authentication paths go through proper JWT verification.'],
      ]),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('FINDING C-3: Google Maps API Key Exposed in Source Code')] }),
      makeInfoTable([
        ['Severity', 'CRITICAL'],
        ['Location', 'backend/.env (line 12), admin app/.env (lines 2-3), DRIVER APP/.env (lines 2-3), backend/src/routes/maps.ts (line 27 as fallback), admin app/app.json (Android config), DRIVER APP/app.json (Android config)'],
        ['Description', 'The Google Maps API key AIzaSyCRQ3QPWMeXqYFOBtayGkScl7lXynWqNus is hardcoded in .env files, source code (maps.ts fallback), and app.json configuration files. It is also exposed in the JavaScript bundle when the admin app runs as a PWA.'],
        ['Impact', 'Anyone can extract this key and use it to consume Google Maps API services, leading to potential financial abuse and quota exhaustion. The key is also visible to anyone inspecting the web bundle.'],
        ['Recommendation', 'Remove the API key from all source files and .env files. Use a server-side proxy exclusively (already implemented in maps.ts but with a hardcoded fallback). Store the key in a secrets manager and load it at runtime only.'],
      ]),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('FINDING C-4: No HTTPS Enforcement')] }),
      makeInfoTable([
        ['Severity', 'CRITICAL'],
        ['Location', '.expo/settings.json (https: false), backend listens on localhost without TLS'],
        ['Description', 'The development server runs with HTTPS disabled. All API traffic between client apps and the backend is transmitted in plaintext. The Expo settings also have hostType: "lan" and dev: true.'],
        ['Impact', 'All credentials, tokens, and data transmitted between clients and the backend are susceptible to interception via man-in-the-middle attacks.'],
        ['Recommendation', 'Enable HTTPS in all environments. Use TLS termination at the reverse proxy level. Implement HSTS headers.'],
      ]),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('FINDING C-5: No Admin Login UI \u2014 Silent Session Loading')] }),
      makeInfoTable([
        ['Severity', 'CRITICAL'],
        ['Location', 'admin app/src/screens/LoginScreen.tsx (exists but not in navigation), admin app/src/db/database.ts (lines 352-359)'],
        ['Description', 'The Admin App has a LoginScreen component but it is not integrated into the app navigation. Sessions are loaded silently from SecureStore on app startup. If no session exists, the admin is locked out with no UI to log in.'],
        ['Impact', 'Users cannot log in through the UI. The only way to access the admin console is to have a pre-existing session token in SecureStore, which is impractical for new users.'],
        ['Recommendation', 'Integrate the LoginScreen into the app navigation flow. Ensure the app handles missing sessions gracefully with a visible login screen.'],
      ]),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('3.2 HIGH Findings')] }),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('FINDING H-1: Driver PIN Exposed in Admin UI')] }),
      makeInfoTable([
        ['Severity', 'HIGH'],
        ['Location', 'admin app/src/db/database.ts (line 569), admin app/src/screens/TripsScreen.tsx'],
        ['Description', 'Driver PINs are stored in plaintext in the Trip interface (driverPin field) and displayed on admin trip cards. The enterprise architecture doc explicitly flags this as a risk.'],
        ['Impact', 'Anyone with admin console access can view driver PINs in plaintext, violating the principle of least privilege and credential confidentiality.'],
        ['Recommendation', 'Never store or display driver PINs in plaintext. Strip PIN values from API responses and admin UI views.'],
      ]),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('FINDING H-2: Admin Backdoor in Driver App')] }),
      makeInfoTable([
        ['Severity', 'HIGH'],
        ['Location', 'DRIVER APP \u2014 admin login with credentials admin/9999 gives full admin session'],
        ['Description', 'The Driver App allows login with admin credentials (admin/9999), granting full admin access from a driver device. This bypasses all data isolation between driver and admin views.'],
        ['Impact', 'A compromised driver device or a malicious driver can gain full admin privileges, accessing all trips, vehicles, financial data, and system settings.'],
        ['Recommendation', 'Remove admin login capability from the Driver App entirely. Enforce strict role separation.'],
      ]),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('FINDING H-3: No Token Expiry Enforcement')] }),
      makeInfoTable([
        ['Severity', 'HIGH'],
        ['Location', 'backend/src/routes/auth.ts (admin token expiresIn: 12h but no refresh mechanism), admin app (no token expiry check)'],
        ['Description', 'Admin JWT tokens have a 12-hour expiry but no refresh token mechanism. Driver tokens have 8-hour expiry. Neither the client nor the server enforces token rotation or refresh. Sessions persist indefinitely in SecureStore.'],
        ['Impact', 'Stolen tokens remain valid for their full lifespan. No mechanism exists to forcefully invalidate sessions across all devices.'],
        ['Recommendation', 'Implement rotating refresh tokens with server-side revocation. Add token expiry checks on the client side. Implement remote session kill capability.'],
      ]),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('FINDING H-4: Memory-Only Data Loss')] }),
      makeInfoTable([
        ['Severity', 'HIGH'],
        ['Location', 'admin app/src/db/database.ts (all data in memory arrays except GC Notes and Memos)'],
        ['Description', 'All trips, vehicles, drivers, and fleet data are stored in memory arrays only. Reloading the admin app destroys all data except GC Notes and Memos (which persist via AsyncStorage).'],
        ['Impact', 'Complete data loss on app reload. No persistence for critical operational data.'],
        ['Recommendation', 'Migrate all data to the Neon Postgres backend. Remove in-memory mock data arrays.'],
      ]),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('FINDING H-5: No Inter-App Sync')] }),
      makeInfoTable([
        ['Severity', 'HIGH'],
        ['Location', 'Both apps use entirely separate in-memory databases'],
        ['Description', 'Admin and Driver databases are completely separate. Trips created in Admin do not automatically appear in the Driver app. The "sync" is simulated via in-process JavaScript object mutation.'],
        ['Impact', 'Drivers cannot see trips assigned to them in real-time. The system relies on manual credential sharing (out-of-band) for driver assignment.'],
        ['Recommendation', 'Implement real backend-based sync. Both apps should read from and write to the Neon Postgres backend.'],
      ]),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('FINDING H-6: JWT Secret Weakness')] }),
      makeInfoTable([
        ['Severity', 'HIGH'],
        ['Location', 'backend/.env (line 15)'],
        ['Description', 'The JWT_SECRET is only 48 hex characters (24 bytes). While the code validates a minimum of 32 characters, the secret is exposed in .env files committed to the repository and has low entropy.'],
        ['Impact', 'A compromised JWT secret allows an attacker to forge valid tokens for any user, including admin.'],
        ['Recommendation', 'Use a cryptographically secure random secret of at least 256 bits (64 hex chars). Store in a secrets manager, never in source control.'],
      ]),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('3.3 MEDIUM Findings')] }),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('FINDING M-1: No Root/Jailbreak Detection')] }),
      makeInfoTable([
        ['Severity', 'MEDIUM'],
        ['Location', 'Both mobile apps'],
        ['Description', 'Neither the Admin App nor the Driver App implements root or jailbreak detection. A compromised device could access sensitive data or manipulate app behavior.'],
        ['Recommendation', 'Implement root/jailbreak detection as a risk signal. Log and flag compromised devices server-side rather than hard-blocking.']
      ]),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('FINDING M-2: No Certificate Pinning')] }),
      makeInfoTable([
        ['Severity', 'MEDIUM'],
        ['Location', 'Both mobile apps'],
        ['Description', 'Neither app implements certificate pinning for API calls. This makes them susceptible to man-in-the-middle attacks using forged certificates.'],
        ['Recommendation', 'Implement certificate pinning where the platform/build pipeline supports it.']
      ]),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('FINDING M-3: GPS Tracking Foreground Only')] }),
      makeInfoTable([
        ['Severity', 'MEDIUM'],
        ['Location', 'Driver App \u2014 Location.watchPositionAsync() is foreground only'],
        ['Description', 'GPS tracking stops when the driver locks the phone or switches apps. No background service or foreground service is implemented for continuous tracking.'],
        ['Recommendation', 'Implement Android Foreground Service for continuous GPS tracking. Add background fetch capability.']
      ]),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('FINDING M-4: No Push Notifications')] }),
      makeInfoTable([
        ['Severity', 'MEDIUM'],
        ['Location', 'Both apps'],
        ['Description', 'Push notifications (FCM/APNs) are not implemented. Drivers and admins receive no real-time alerts for trip assignments, status changes, or system events.'],
        ['Recommendation', 'Implement push notification infrastructure for critical events.']
      ]),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('FINDING M-5: No Audit Trail Persistence')] }),
      makeInfoTable([
        ['Severity', 'MEDIUM'],
        ['Location', 'admin app/src/db/database.ts (activity logs are memory-only)'],
        ['Description', 'Activity logs are stored in memory only and lost on app reload. The backend has an activity_logs table but it is not populated by the client apps.'],
        ['Recommendation', 'Persist audit logs to the backend database. Ensure all admin actions are logged with actor, timestamp, and before/after state.']
      ]),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('FINDING M-6: Debug Mode Easter Egg')] }),
      makeInfoTable([
        ['Severity', 'MEDIUM'],
        ['Location', 'Driver App \u2014 5 taps reveals demo credentials panel'],
        ['Description', 'A debug easter egg in the Driver App reveals demo credentials when triggered by tapping the app icon 5 times. This provides a backdoor for unauthorized access.'],
        ['Recommendation', 'Remove debug easter eggs from production code. Disable all debug features in release builds.']
      ]),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('FINDING M-7: No App Version Enforcement')] }),
      makeInfoTable([
        ['Severity', 'MEDIUM'],
        ['Location', 'Both apps'],
        ['Description', 'There is no mechanism to enforce minimum app versions. Outdated app versions with known vulnerabilities can continue to operate.'],
        ['Recommendation', 'Implement app version enforcement on the backend. Reject requests from outdated clients.']
      ]),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('3.4 LOW Findings')] }),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('FINDING L-1: No .gitignore at Repository Root')] }),
      makeInfoTable([
        ['Severity', 'LOW'],
        ['Location', 'Repository root'],
        ['Description', 'There is no .gitignore file at the repository root. Only individual sub-projects have .gitignore files. This increases the risk of accidental commits of sensitive files.'],
        ['Recommendation', 'Add a comprehensive .gitignore at the repository root that covers all sub-projects.']
      ]),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('FINDING L-2: CORS Allows All Localhost Origins')] }),
      makeInfoTable([
        ['Severity', 'LOW'],
        ['Location', 'backend/.env (line 22), backend/src/index.ts (lines 65-83)'],
        ['Description', 'CORS is configured to allow all localhost origins (8081, 8082, 8083, 19006, 3000). In production, this should be restricted to specific trusted origins.'],
        ['Recommendation', 'Restrict CORS to specific production origins. Remove localhost origins from the allowed list in production configuration.']
      ]),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('FINDING L-3: Helmet CSP Disabled')] }),
      makeInfoTable([
        ['Severity', 'LOW'],
        ['Location', 'backend/src/index.ts (line 61)'],
        ['Description', 'Content Security Policy is explicitly disabled in Helmet configuration with the comment "Mobile app does not need strict CSP." While this may be intentional for mobile apps, it removes a layer of defense against XSS for the web-based Admin Console.'],
        ['Recommendation', 'Consider enabling a relaxed CSP for the web version of the Admin Console. At minimum, enable CSP for production deployments.']
      ]),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('FINDING L-4: Rate Limit Too Permissive')] }),
      makeInfoTable([
        ['Severity', 'LOW'],
        ['Location', 'backend/src/index.ts (line 88), backend/.env (lines 25-26)'],
        ['Description', 'Global rate limit is set to 200 requests per minute, which is very permissive. Auth endpoints are limited to 10 requests per minute, but this may still be insufficient for brute-force protection.'],
        ['Recommendation', 'Reduce global rate limit to 100/min. Reduce auth rate limit to 5/min with account lockout after 10 failed attempts.']
      ]),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('FINDING L-5: No Multi-Admin Support')] }),
      makeInfoTable([
        ['Severity', 'LOW'],
        ['Location', 'System-wide'],
        ['Description', 'The system only supports a single hardcoded admin account. There is no multi-admin support, no role hierarchy, and no admin activity tracking beyond the basic activity_logs table.'],
        ['Recommendation', 'Implement multi-admin support with role-based access control (RBAC). Add admin activity tracking and session management.']
      ]),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('4. Security Controls Assessment')] }),
      new Paragraph({ children: [new TextRun('')] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('4.1 Controls in Place')] }),
      makeSimpleTable(['Control', 'Status', 'Details'], [
        ['Argon2id Password Hashing', 'GOOD', 'Used for both admin and driver PIN/password hashing on the backend'],
        ['JWT Authentication', 'GOOD', 'HS256 algorithm with JTI for token revocation'],
        ['Server-Side Token Revocation', 'GOOD', 'Revoked tokens stored in DB and checked on each request'],
        ['Zod Request Validation', 'GOOD', 'All request bodies validated against schemas'],
        ['Rate Limiting', 'PARTIAL', 'Global 200/min, auth 10/min \u2014 too permissive'],
        ['Helmet Security Headers', 'PARTIAL', 'CSP disabled; other headers applied'],
        ['CORS Restriction', 'PARTIAL', 'Restricted to localhost origins only'],
        ['SecureStore for Sessions', 'GOOD', 'Uses Keychain/Keystore for encrypted session storage'],
        ['Parameterized SQL Queries', 'GOOD', 'Neon sql tagged template prevents SQL injection'],
        ['Generic Error Messages', 'GOOD', 'Production errors do not leak stack traces'],
      ]),
      new Paragraph({ children: [new TextRun('')] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('4.2 Controls Missing or Deficient')] }),
      makeSimpleTable(['Missing Control', 'Severity', 'Impact'], [
        ['HTTPS/TLS Everywhere', 'CRITICAL', 'All traffic in plaintext'],
        ['MFA for Admin Accounts', 'HIGH', 'Single-factor auth for high-value target'],
        ['Token Expiry Enforcement', 'HIGH', 'Sessions persist indefinitely'],
        ['Root/Jailbreak Detection', 'MEDIUM', 'Compromised devices can access sensitive data'],
        ['Certificate Pinning', 'MEDIUM', 'Susceptible to MITM attacks'],
        ['Audit Trail Persistence', 'MEDIUM', 'No permanent record of admin actions'],
        ['Push Notifications', 'MEDIUM', 'No real-time alerting for critical events'],
        ['App Version Enforcement', 'MEDIUM', 'Outdated vulnerable versions can operate'],
        ['Remote Session Kill', 'HIGH', 'No way to invalidate sessions across devices'],
        ['Account Lockout', 'MEDIUM', 'No brute-force protection beyond rate limiting'],
      ]),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('5. Dependency Security Analysis')] }),
      new Paragraph({ children: [new TextRun('')] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('5.1 Backend Dependencies')] }),
      makeSimpleTable(['Package', 'Version', 'Security Role'], [
        ['fastify', '^4.28.1', 'Web framework \u2014 actively maintained'],
        ['@fastify/helmet', '^11.1.1', 'HTTP security headers (CSP disabled)'],
        ['@fastify/cors', '^9.0.1', 'CORS restriction'],
        ['@fastify/jwt', '^8.0.1', 'JWT authentication (HS256)'],
        ['@fastify/rate-limit', '^9.1.0', 'Rate limiting (global + per-route)'],
        ['argon2', '^0.31.2', 'Argon2id password/PIN hashing'],
        ['@neondatabase/serverless', '^0.9.3', 'Neon Postgres driver'],
        ['zod', '^3.23.8', 'Request body validation schemas'],
        ['pino + pino-pretty', '^9.3 / ^11.2', 'Structured logging'],
        ['dotenv', '^16.4.5', 'Environment variable loading'],
      ]),
      new Paragraph({ children: [new TextRun('')] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('5.2 Admin App Dependencies')] }),
      makeSimpleTable(['Package', 'Version', 'Security Role'], [
        ['expo-secure-store', '^57.0.1', 'Encrypted session storage (Keychain/Keystore)'],
        ['expo-file-system', '^57.0.1', 'File operations'],
        ['expo-document-picker', '~57.0.1', 'Document upload for vehicle docs'],
        ['expo-image-picker', '~57.0.6', 'Photo capture for POD/receipts'],
        ['react-native-webview', '^14.0.1', 'WebView (installed but not used in navigation)'],
        ['nativewind + tailwindcss', '^4.2.6', 'Styling'],
      ]),
      new Paragraph({ children: [new TextRun('')] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('5.3 Driver App Dependencies')] }),
      makeSimpleTable(['Package', 'Version', 'Security Role'], [
        ['crypto-js', '^4.2.0', 'SHA-256 PIN hashing (not Argon2id)'],
        ['expo-secure-store', '^57.0.1', 'Encrypted session storage'],
        ['expo-image-picker', '~57.0.6', 'Camera for POD/receipts'],
        ['expo-location', '~57.0.6', 'GPS tracking'],
      ]),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('6. Reference: AGENTS.md Security Rules')] }),
      new Paragraph({ children: [new TextRun('The project includes comprehensive security rules in AGENTS.md files (Driver App and Admin App). These rules define a security-first development framework covering:')] }),
      new Paragraph({ children: [new TextRun('')] }),
      makeSimpleTable(['Section', 'Topic'], [
        ['0', 'Prime Directive \u2014 Security before functionality'],
        ['1', 'Pre-Code Security Gate (5 questions)'],
        ['2', 'Threat Model Assumptions (Zero Trust)'],
        ['3', 'Layer-by-Layer Requirements (Auth, RBAC, Backend, DB, Mobile)'],
        ['4', 'Absolute Prohibitions (12 rules)'],
        ['5', 'Post-Code Self-Audit (9 checks)'],
        ['6', 'When Security and Speed Conflict'],
      ]),
      new Paragraph({ children: [new TextRun('')] }),
      new Paragraph({ children: [new TextRun('Note: The AGENTS.md rules are well-defined but are not enforced by the current codebase. The codebase has multiple violations of these rules, including hardcoded credentials (violating Section 4, rule 3), the auth backdoor (violating Section 4, rule 11), and the missing admin login UI (violating Section 3.6, device binding requirement).')] }),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('7. Recommendations Summary')] }),
      new Paragraph({ children: [new TextRun('')] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Immediate Actions (Critical)')] }),
      makeSimpleTable(['#', 'Action', 'Effort'], [
        ['1', 'Remove hardcoded admin credentials from all source files and .env files', 'Low'],
        ['2', 'Remove authentication backdoor tokens from auth middleware', 'Low'],
        ['3', 'Remove Google Maps API key from source code and .env files', 'Low'],
        ['4', 'Enable HTTPS in all environments', 'Medium'],
        ['5', 'Integrate LoginScreen into admin app navigation', 'Medium'],
      ]),
      new Paragraph({ children: [new TextRun('')] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Short-Term Actions (High)')] }),
      makeSimpleTable(['#', 'Action', 'Effort'], [
        ['6', 'Remove driver PIN display from admin UI', 'Low'],
        ['7', 'Remove admin login from Driver App', 'Low'],
        ['8', 'Implement rotating refresh tokens with server-side revocation', 'Medium'],
        ['9', 'Migrate all client data to Neon Postgres backend', 'High'],
        ['10', 'Implement real backend-based sync between Admin and Driver apps', 'High'],
        ['11', 'Replace weak JWT_SECRET with cryptographically secure random secret', 'Low'],
      ]),
      new Paragraph({ children: [new TextRun('')] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Medium-Term Actions (Medium)')] }),
      makeSimpleTable(['#', 'Action', 'Effort'], [
        ['12', 'Implement root/jailbreak detection', 'Medium'],
        ['13', 'Implement certificate pinning', 'Medium'],
        ['14', 'Add Android Foreground Service for GPS tracking', 'Medium'],
        ['15', 'Implement push notification infrastructure', 'High'],
        ['16', 'Persist audit logs to backend database', 'Medium'],
        ['17', 'Remove debug easter eggs from production code', 'Low'],
        ['18', 'Implement app version enforcement', 'Medium'],
      ]),
      new Paragraph({ children: [new TextRun('')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('8. Conclusion')] }),
      new Paragraph({ children: [new TextRun('The NBT + ARS Fleet Transit platform has a fundamentally insecure foundation. While the backend implements several standard security controls (Argon2 hashing, JWT auth, rate limiting, Helmet headers, Zod validation), these are severely undermined by hardcoded credentials, authentication backdoors, exposed API keys, and missing HTTPS enforcement.')] }),
      new Paragraph({ children: [new TextRun('')] }),
      new Paragraph({ children: [new TextRun('The most urgent issues are:')] }),
      new Paragraph({ children: [new TextRun('1. Hardcoded admin credentials (admin/9999) that cannot be changed without code modification')] }),
      new Paragraph({ children: [new TextRun('2. Authentication backdoor tokens in the middleware that bypass all security')] }),
      new Paragraph({ children: [new TextRun('3. Google Maps API key exposed in source code and JavaScript bundles')] }),
      new Paragraph({ children: [new TextRun('4. No HTTPS enforcement, leaving all traffic susceptible to interception')] }),
      new Paragraph({ children: [new TextRun('')] }),
      new Paragraph({ children: [new TextRun('The project also has comprehensive security rules defined in AGENTS.md that are not reflected in the actual implementation. Aligning the codebase with these rules should be a priority.')] }),
      new Paragraph({ children: [new TextRun('')] }),
      new Paragraph({ children: [new TextRun('This report should be treated as a living document and updated as security issues are addressed.')] }),
    ]
  }]
});

async function main() {
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUTPUT, buffer);
  console.log('Security report generated: ' + OUTPUT);
}

main().catch(err => {
  console.error('Error generating report:', err);
  process.exit(1);
});
