# NBT + ARS Fleet Transit — Enterprise Architecture & Communication Analysis

> **Classification:** Internal Engineering Documentation  
> **System:** NBT & ARS Fleet Transit Portal (Admin + Driver Ecosystem)  
> **Version Analyzed:** Admin Console V2.4.1 · Driver App V1.0.0  
> **Analysis Date:** August 2026  
> **Prepared By:** Enterprise Solution Architecture Review

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Application Overview](#2-application-overview)
3. [System Architecture](#3-system-architecture)
4. [Module Analysis — Admin App](#4-module-analysis--admin-app)
5. [Module Analysis — Driver App](#5-module-analysis--driver-app)
6. [Authentication & Authorization Flow](#6-authentication--authorization-flow)
7. [Database Architecture & Data Models](#7-database-architecture--data-models)
8. [API & Service Layer](#8-api--service-layer)
9. [Admin → Driver Communication Matrix](#9-admin--driver-communication-matrix)
10. [Driver → Admin Communication Matrix](#10-driver--admin-communication-matrix)
11. [Complete Trip Lifecycle Flow](#11-complete-trip-lifecycle-flow)
12. [Real-Time Synchronization Architecture](#12-real-time-synchronization-architecture)
13. [Offline & Sync Queue Architecture](#13-offline--sync-queue-architecture)
14. [Screen Flow Analysis](#14-screen-flow-analysis)
15. [State Management Architecture](#15-state-management-architecture)
16. [Local Storage Architecture](#16-local-storage-architecture)
17. [Security Architecture](#17-security-architecture)
18. [Background Services & Permissions](#18-background-services--permissions)
19. [Business Rules Registry](#19-business-rules-registry)
20. [Dependency Analysis](#20-dependency-analysis)
21. [Risks & Missing Features](#21-risks--missing-features)
22. [Improvement Recommendations](#22-improvement-recommendations)
23. [Scalability Recommendations](#23-scalability-recommendations)
24. [Final End-to-End Enterprise Architecture Diagram](#24-final-end-to-end-enterprise-architecture-diagram)

---

## 1. Executive Summary

The **NBT + ARS Fleet Transit** system is a two-application enterprise logistics platform built on **React Native (Expo)** targeting Indian freight transportation operations. It comprises:

- **Admin Console** (Web-first React Native app, runs on Web/Android/iOS, primarily used on desktop browsers at `localhost:8081`) — the command-and-control plane for fleet, trip, vehicle, and document management.
- **Driver App** (React Native Android app) — the field-execution plane for drivers to receive trip assignments, execute trips, log expenses, capture GPS telemetry, and submit Proof-of-Delivery (POD).

**Key Architectural Insight:** Both applications share data exclusively through a **single in-memory `AdminDatabase` class** on the Admin side and a **single `DatabaseService` class** on the Driver side. There is **no persistent backend server**, no REST API, and no real-time messaging infrastructure deployed. All "synchronization" is simulated via in-process JavaScript object mutation, `AsyncStorage` for persistence, and polling timers (every 3–4 seconds) on the Admin side.

The primary business workflow is: Admin creates a trip (generating a unique Driver ID + PIN + Tracking ID) → credentials are communicated to driver out-of-band (e.g., phone call, WhatsApp) → Driver logs in using the Tracking ID and PIN → Driver executes trip → Admin monitors in real-time via shared database.

---

## 2. Application Overview

### 2.1 Admin Application

| Property | Value |
|---|---|
| Name | NBT & ARS Fleet Transit Portal |
| Platform | React Native (Expo) — Web / Android / iOS |
| Primary Target | Desktop Browser (Chrome/Safari/Edge) |
| Entry Point | `admin app/App.tsx` |
| Database | `admin app/src/db/database.ts` (`AdminDatabase` class) |
| Authentication | Hardcoded username=`admin`, PIN=`9999` |
| Session Storage | `expo-secure-store` (key: `admin_session_token`, `admin_username`) |
| Version | V2.4.1 |
| App Name | nbt-ars-admin-dashboard |

**Admin Modules:**
1. Dashboard (KPI overview, fleet timeline, expiry alerts)
2. Trip Creation (multi-step wizard with Google Maps integration)
3. Trips Registry (list, filter, detail view, payment management)
4. Live GPS Status (driver location monitoring, expense logs)
5. GC Notes (Goods Consignment/freight billing documents)
6. Memo (internal memos, HTML editor)
7. Vehicle Management (Lorry Directory — documents, status, history)
8. GPS Management (Fleet vehicle GPS device registry)
9. System Settings (diagnostics, data reset, logout)

### 2.2 Driver Application

| Property | Value |
|---|---|
| Name | NBT + ARS Driver Console |
| Platform | React Native (Expo) — Android (primary), Web |
| Entry Point | `DRIVER APP/App.tsx` |
| Database | `DRIVER APP/src/db/database.ts` (`DatabaseService` class) |
| Authentication | Tracking ID + 6-digit PIN (SHA-256 hashed) |
| Session Storage | `expo-secure-store` (keys: `session_driver_id`, `session_token`, `session_admin_role`) + `AsyncStorage` fallback on web |
| Offline Support | Yes — `SyncAction` queue, manual toggle |
| Auto-Lock | Yes — 300 seconds background inactivity |

**Driver Screens:**
1. Login (Tracking ID + PIN authentication)
2. Home (trip overview, action buttons, stepper progress)
3. Start Trip Workflow (2-step: driver name + odometer/diesel)
4. Map/Navigation (live GPS tracking, Google Maps deep-link)
5. Add Expense (6 categories, camera, GPS capture, voice input)
6. POD (Proof of Delivery — photo, signature pad, odometer end)
7. Profile (statistics, expense ledger, completed trip history)

---

## 3. System Architecture

### 3.1 High-Level Architecture

```mermaid
graph TB
    subgraph ADMIN_PLANE["Admin Console (Web/Desktop)"]
        A_UI["Admin UI\n(React Native Web)"]
        A_DB["AdminDatabase\n(In-Memory + AsyncStorage)"]
        A_MAPS["Google Maps\nService Layer"]
        A_SECURE["SecureStore\n(Admin Session)"]
    end

    subgraph DRIVER_PLANE["Driver App (Android Mobile)"]
        D_UI["Driver UI\n(React Native Android)"]
        D_DB["DatabaseService\n(In-Memory + AsyncStorage)"]
        D_GPS["expo-location\n(GPS Tracking)"]
        D_CAM["expo-image-picker\n(Camera/POD)"]
        D_SECURE["SecureStore\n(Driver Session)"]
    end

    subgraph SHARED_STORAGE["Shared Local Storage (AsyncStorage)"]
        AS_TRIPS["@nbt_ars_trips_data"]
        AS_QUEUE["@nbt_ars_sync_queue"]
        AS_COMPLETED["@nbt_ars_completed_trips"]
        AS_GC["nbt_gc_notes"]
        AS_MEMO["nbt_memo_documents"]
    end

    subgraph EXTERNAL["External Services"]
        GMAPS["Google Maps Platform\n(Places, Directions,\nGeocoding, Static Maps)"]
        THERMAL["Bluetooth Thermal Printer\n(Stub/Simulated)"]
    end

    A_DB -->|"notify() → listeners"| A_UI
    D_DB -->|"notify() → listeners"| D_UI

    A_DB -->|"persist GC Notes"| AS_GC
    A_DB -->|"persist Memos"| AS_MEMO

    D_DB -->|"persist trips"| AS_TRIPS
    D_DB -->|"persist queue"| AS_QUEUE
    D_DB -->|"persist history"| AS_COMPLETED

    A_MAPS <-->|"HTTPS REST"| GMAPS
    D_GPS -->|"device GPS"| D_DB
    D_CAM -->|"URI"| D_DB

    A_UI -->|"login/logout"| A_SECURE
    D_UI -->|"login/logout"| D_SECURE
```

> **Critical Note:** The Admin and Driver apps do NOT communicate directly over a network. They share data when running on the same device (e.g., in Expo Dev environment) through the in-memory state. In production deployment intent, a shared backend (described as "Next.js API (db.json)") is referenced in comments but not implemented.

### 3.2 Communication Architecture

```mermaid
graph LR
    subgraph CREATION["Trip Creation (Admin)"]
        ADMIN_CREATE["Admin creates trip\nGenerates:\n• tripId: TRIP-YYYY-NNNN\n• driverId: DRV-XXXXX\n• driverPin: 6-digit\n• trackingId: NBT-TRK-XXXXX"]
    end

    subgraph OUT_OF_BAND["Out-of-Band Channel"]
        OOB["WhatsApp / Phone Call\n(Tracking ID + PIN\ncommunicated manually)"]
    end

    subgraph DRIVER_LOGIN["Driver Login"]
        DRV_LOGIN["Driver enters:\n• Tracking ID\n• PIN\n→ SHA-256 hash match"]
    end

    ADMIN_CREATE -->|"credentials exposed in Admin UI"| OOB
    OOB -->|"driver receives credentials"| DRV_LOGIN
```

---

## 4. Module Analysis — Admin App

### 4.1 Navigation Architecture

The Admin app uses a **custom tab navigation** implemented directly in `App.tsx` (no React Navigation library for routing despite it being a dependency). Navigation state is managed via `useState<AdminTab>`.

```mermaid
graph TD
    ROOT["App.tsx\n(SafeAreaProvider)"]
    ROOT --> LAYOUT{Device Width?}
    LAYOUT -->|">= 880px"| DESKTOP["Desktop Layout\n(Collapsible Sidebar + Main Content)"]
    LAYOUT -->|"< 880px"| MOBILE["Mobile Layout\n(Header + Body + Bottom Nav + Drawer)"]
    
    DESKTOP --> SIDEBAR["Sidebar Navigation\n9 items"]
    MOBILE --> BOTTOM_NAV["Bottom Nav\n(5 items: Dashboard, +Trip, Trips, Live GPS, Menu)"]
    MOBILE --> DRAWER["Slide-in Drawer\n(full nav list)"]
```

**Admin Tabs:**

| Tab ID | Label | Icon | Access |
|---|---|---|---|
| DASHBOARD | Dashboard | dashboard | Bottom Nav + Sidebar |
| CREATE_TRIP | Trip Creation | add-circle | Bottom Nav + Sidebar |
| TRIPS | Trips Registry | local-shipping | Bottom Nav + Sidebar |
| LIVE | Live GPS Status | my-location | Bottom Nav + Sidebar |
| GC | GC Notes | description | Sidebar + Drawer |
| MEMO | Memo | sticky-note-2 | Sidebar + Drawer |
| VEHICLES | Vehicle Management | directions-bus | Menu + Sidebar |
| GPS_VEHICLES | GPS Management | gps-fixed | Menu + Sidebar |
| SETTINGS | System Settings | settings | Menu + Sidebar |
| MENU | Control Center | grid-view | Mobile Bottom Nav |

### 4.2 DashboardScreen

**File:** `src/screens/DashboardScreen.tsx` (1,498 lines)

**Purpose:** Command-and-control KPI overview for fleet operations.

**Data Sources:**
- `db.getTrips()` — all trips
- `db.getFleetVehicles()` — GPS fleet registry
- `db.getActivityLogs()` — audit trail
- `db.getVehicleDocumentExpiryAlerts()` — compliance alerts

**Key Metrics Computed:**
- Total registered vehicles
- Active trips count (NOT COMPLETED)
  - Started count
  - In-transit count
  - Reached destination count
  - POD pending count
- Available vehicles (Active + not on trip + not under maintenance)
- Completed trips this month (date-filtered)
- Document expiry alerts (expired / expiring in 7 days / expiring in 30 days)

**Real-Time Mechanism:**
- `db.subscribe()` — instant listener on in-memory mutations
- `setInterval(fetchData, 3000)` — 3-second polling fallback

**Simulator:** Dashboard contains a developer simulation drawer (`showSimulator`) that can trigger:
- `START_TRIP`, `UPDATE_LOCATION`, `ADD_EXPENSE`, `REACH_DESTINATION`, `UPLOAD_POD`, `COMPLETE_TRIP`
These are called via `db.simulateDriverAction()`.

**Monthly Report Modal:** Filters completed trips by selected month/year. Displays trip-by-trip freight, expenses, driver payments.

### 4.3 CreateTripScreen

**File:** `src/screens/CreateTripScreen.tsx` (2,049 lines)

**Purpose:** Multi-step trip creation wizard — the primary Admin→Driver data injection point.

**External Integration:**
- Google Maps Places Autocomplete API
- Google Maps Place Details API
- Google Maps Directions API
- Google Maps Static Maps API
- Offline fallback: 11 hardcoded Tamil Nadu/Karnataka logistics locations

**Trip Creation Output (all auto-generated):**

| Field | Generation Logic |
|---|---|
| `tripId` | `TRIP-{YEAR}-{random 4-digit}` |
| `driverId` | `DRV-{random 5-char alphanumeric uppercase}` |
| `driverPin` | `Math.floor(100000 + Math.random() * 900000)` (6-digit) |
| `trackingId` | `NBT-TRK-{random 5-char alphanumeric uppercase}` |

**Trip creation also:**
- Auto-sets vehicle status to `ON TRIP` in `managedVehicles`
- Links GPS device if vehicle matches a `FleetVehicle` record
- Writes an `ActivityLog` entry: "Trip Created"
- Notifies all database listeners

### 4.4 TripsScreen

**File:** `src/screens/TripsScreen.tsx` (759 lines)

**Purpose:** Read-only registry of all trips with search, status filtering, detail modal.

**Operations:**
- Search by Trip ID, driver name, vehicle number
- Filter by: ALL / ASSIGNED / IN TRANSIT / REACHED_DESTINATION / COMPLETED
- View full trip detail (modal)
- Enter driver payment → calculates profit/loss
- Print PDF link (stub: `https://dummy.pdf`)
- 4-second auto-refresh polling

### 4.5 LiveStatusScreen

**File:** `src/screens/LiveStatusScreen.tsx` (566 lines)

**Purpose:** Real-time GPS monitoring of individual drivers by Driver ID.

**Operations:**
- Search by Driver ID
- Displays: driver name, vehicle, status, GPS coordinates, last telemetry timestamp
- Shows all expenses with GPS coordinates per expense
- "View on Map" deep-links to Google/Apple Maps
- 3-second polling

### 4.6 GcScreen

**File:** `src/screens/GcScreen.tsx` (85,402 bytes — largest file)

**Purpose:** Goods Consignment Note management — freight billing documents.

**GC Note auto-numbering:** Sequential per month: `{MON}-{YY}-{NN}` (e.g., `AUG-26-01`)

**GC Note Fields:** Full freight billing: consignor, consignee, GST numbers, PAN, items (articles count, description, weight, value), freight amount, CGST/SGST/IGST, total, advance, balance, payable at, payment type, bank details, lorry owner, driver signature, DL number, terms.

**Persistence:** `AsyncStorage` key: `nbt_gc_notes`

### 4.7 MemoScreen

**File:** `src/screens/MemoScreen.tsx` (43,658 bytes)

**Purpose:** Internal memo/communication documents with HTML content editor.

**Persistence:** `AsyncStorage` key: `nbt_memo_documents`

### 4.8 VehiclesScreen

**File:** `src/screens/VehiclesScreen.tsx` (805 lines)

**Purpose:** Lorry Directory — complete vehicle registry with document lifecycle management.

**Vehicle Documents Tracked:**
- RC Front Photo
- RC Back Photo
- Insurance Photo (with expiry)
- Pollution Certificate (with expiry)
- Permit (with expiry)
- FC Certificate (with expiry)

**Document Expiry Status Engine:**
- `VALID` — > 30 days
- `EXPIRING_SOON` — ≤ 30 days
- `EXPIRING_IN_7_DAYS` — ≤ 7 days
- `EXPIRED` — past date
- `DATE_NOT_AVAILABLE` — no date set

**Document Upload:** Uses `expo-document-picker` to select files. File stored as URI reference (not uploaded to server).

### 4.9 GpsVehicleScreen

**File:** `src/screens/GpsVehicleScreen.tsx` (62,434 bytes)

**Purpose:** GPS device registry — maps physical GPS trackers to fleet vehicles.

**FleetVehicle fields:** vehicleNumber, vehicleType/Model/Make, owner, registration date, vehicleStatus, GPS provider, device brand/model, GPS device ID, IMEI, SIM number, installation date, GPS status, last known lat/lng/city/address, GPS history.

**GPS Status Values:** `Connected` | `Offline` | `Not Configured` | `Signal Lost` | `Device Error`

**Operations:** Create, update, replace GPS device (with history tracking), disconnect GPS device.

### 4.10 SettingsScreen

**File:** `src/screens/SettingsScreen.tsx` (263 lines)

**Operations:**
- Display admin profile (hardcoded: "NBT+ARS Administrator", "Super Admin")
- System diagnostics display (database link status, SHA-256 auth status, app version)
- Reset shared database (calls `db.resetData()`)
- Logout session

---

## 5. Module Analysis — Driver App

### 5.1 Navigation Architecture

```mermaid
stateDiagram-v2
    [*] --> SplashScreen
    SplashScreen --> AuthCheck
    AuthCheck --> LoginScreen : not authenticated
    AuthCheck --> HomeScreen : authenticated
    
    LoginScreen --> HomeScreen : login success
    
    HomeScreen --> StartTripWorkflow : has active ASSIGNED trip
    StartTripWorkflow --> MapScreen : trip started
    
    HomeScreen --> MapScreen : navigate
    HomeScreen --> AddExpenseScreen : add expense
    HomeScreen --> PodScreen : upload POD / arrived
    HomeScreen --> ProfileScreen : profile tab
    
    MapScreen --> AddExpenseScreen : expense shortcut
    MapScreen --> PodScreen : arrived shortcut
    
    PodScreen --> HomeScreen : trip completed
    
    HomeScreen --> LoginScreen : logout / session lock
```

**Auto-Lock:** App monitors `AppState`. If backgrounded > 300 seconds while authenticated, auto-calls `handleLogout()`.

### 5.2 LoginScreen

**Authentication Flow:**
1. Driver enters Tracking ID (field labeled "Email" in state, "Tracking ID" in UI)
2. Driver enters 6-digit PIN
3. `db.login(trackingId, pin)` called
4. PIN is SHA-256 hashed: `SHA256(pin.trim()).toString()`
5. Matched against `driverPinHash` in trip cache
6. On match: session token generated (`SEC_TOK_` + random + timestamp), stored in SecureStore
7. Returns `tripId` (the internal trip record ID used as `currentDriverId`)

**Special backdoor:** `trackingId === 'admin'` && `pin === '9999'` → grants admin session in driver app.

**Easter egg debug mode:** 5 rapid taps on the header title → reveals debug credentials panel.

### 5.3 HomeScreen

**Business Logic:**
- Displays greeting based on time of day (Morning/Afternoon/Evening)
- Shows driver ID badge and vehicle info from active trip
- If `activeTrip.status === 'ASSIGNED'` → pulsing START TRIP button
- If started/in_transit → Navigation + Add Expense + Arrived Depot buttons
- If `REACHED_DESTINATION` → UPLOAD POD & COMPLETE button
- Trip progress stepper: Start → Transit → Arrival → POD

### 5.4 StartTripScreen

**2-Step Workflow:**

**Step 1 — Driver Identity:**
- Voice input (simulated — picks random Tamil names)
- Manual text entry
- Confirmation required before proceeding

**Step 2 — Vehicle Initial State:**
- Odometer reading (km, numeric, required)
- Diesel level selection (EMPTY / 1/4 / 1/2 / 3/4 / FULL)
- Captures GPS location (`expo-location`, 2-second timeout fallback)
- Reverse geocodes via `Location.reverseGeocodeAsync()`
- Calls `db.startTrip(tripId, driverName, odometer, dieselLevel, gps)`
- GPS data sanitized (HTML stripped, control chars stripped)
- Voice announcement via `expo-speech`
- Enqueues `START_TRIP` to sync queue
- Trip status set to `in_transit`

### 5.5 MapScreen

**GPS Tracking:**
- Requests `Location.requestForegroundPermissionsAsync()`
- `Location.watchPositionAsync()` with:
  - `accuracy: Location.Accuracy.Balanced`
  - `timeInterval: 10000` (10 seconds)
  - `distanceInterval: 50` (50 meters)
- On each update: reverse geocodes, calls `db.updateGPS(tripId, gps)`
- GPS data enqueued: `UPDATE_GPS` action

**Navigation:**
- "GOOGLE MAPS" button deep-links to: `google.navigation:q={destination}` (Android) or `maps://app?daddr={destination}` (iOS)
- Distance remaining: simulated countdown (mock, not real routing)
- Turn guidance: simulated text transitions based on mocked distance

### 5.6 AddExpenseScreen

**Expense Categories:** `FUEL` | `TOLL` | `RTO` | `POLICE` | `LORRY` | `OTHER`

**FUEL-specific fields:**
- Liters consumed
- Fuel bunk location (auto-populated from GPS)
- Price per liter (auto-calculated: amount ÷ liters)

**Data Capture:**
- GPS location: required before save
- Receipt photo: optional (camera via `expo-image-picker`)
- Voice input for reason: simulated (picks mock reason text)
- All text sanitized via `sanitizeInput()` (strips HTML tags, control chars)

**Calls:** `db.addExpense(tripId, expense)` → enqueues `ADD_EXPENSE`

**Voice feedback after save:** announces offline/online sync status.

### 5.7 PodScreen

**Proof of Delivery Workflow:**
1. Photo capture: `expo-image-picker` camera
2. Signature pad: `PanResponder` touch drawing (records any touch as "signed")
3. Delivery notes: free text
4. Odometer end reading (km)
5. Diesel end level selection
6. Submit → calls `db.uploadPOD()` → calls `db.completeTrip()`
7. Status set to `completed`
8. Enqueues `UPLOAD_POD` + `COMPLETE_TRIP`
9. Shows Summary Docket (printable trip record)
10. Print button: stub alert ("Bluetooth thermal printer")
11. Share button: stub alert ("PDF shared")

### 5.8 ProfileScreen

**Data Sources:**
- `db.getTrips()` — active trips
- `db.getCompletedTrips()` — completed trips history (from `AsyncStorage`)
- `db.getDriverProfile(driverId)` — always returns `null` (not implemented)

**Computed Stats:**
- Completed trips count
- Total KM (odometerEnd - odometerStart per trip)
- Performance rating (always `5.0/5.0` if any trips)
- POD submission rate (always `100%`)
- Expense breakdown: fuel / toll / other totals with visual bar charts

---

## 6. Authentication & Authorization Flow

### 6.1 Admin Authentication

```mermaid
sequenceDiagram
    participant Admin
    participant AdminApp
    participant SecureStore
    participant AdminDB

    Admin->>AdminApp: Opens app
    AdminApp->>SecureStore: getItemAsync('admin_session_token')
    SecureStore-->>AdminApp: token (or null)
    
    alt Token exists
        AdminApp->>AdminDB: loadSession()
        AdminDB->>AdminApp: session restored
        AdminApp->>Admin: Shows admin dashboard
    else No token
        AdminApp->>Admin: Shows login screen
        Admin->>AdminApp: Enter username='admin', PIN='9999'
        AdminApp->>AdminDB: login(username, pin)
        AdminDB->>AdminDB: if username==='admin' && pin==='9999'
        AdminDB->>SecureStore: setItemAsync('admin_session_token', 'mock-admin-token')
        AdminDB->>SecureStore: setItemAsync('admin_username', 'admin')
        AdminDB-->>AdminApp: true
        AdminApp->>Admin: Shows admin dashboard
    end

    Admin->>AdminApp: Logout
    AdminApp->>AdminDB: logout()
    AdminDB->>SecureStore: deleteItemAsync('admin_session_token')
    AdminDB->>SecureStore: deleteItemAsync('admin_username')
    AdminDB-->>AdminApp: void
    AdminApp->>Admin: Shows login screen
```

**Admin Auth Implementation Details:**
- Token value: hardcoded string `'mock-admin-token'`
- No token expiry
- No JWT, no OAuth
- No multi-user support (single hardcoded admin account)
- Session persisted via `expo-secure-store` (uses Android Keystore / iOS Keychain)

### 6.2 Driver Authentication

```mermaid
sequenceDiagram
    participant Driver
    participant DriverApp
    participant SecureStore
    participant AsyncStorage
    participant DriverDB

    Driver->>DriverApp: Opens app
    DriverApp->>DriverDB: init()
    DriverDB->>SecureStore: getItemAsync('session_driver_id')
    DriverDB->>SecureStore: getItemAsync('session_token')
    DriverDB->>SecureStore: getItemAsync('session_admin_role')
    DriverDB->>AsyncStorage: getItem('@nbt_ars_trips_data')
    DriverDB-->>DriverApp: initialTrips
    
    alt Session exists
        DriverApp->>DriverApp: setAuthenticatedDriverId(driverId)
        DriverApp->>Driver: Shows Home screen with active trip
    else No session
        DriverApp->>Driver: Shows Login screen
    end

    Driver->>DriverApp: Enter Tracking ID + PIN
    DriverApp->>DriverDB: login(trackingId, pin)
    DriverDB->>DriverDB: sha256(pin.trim())
    DriverDB->>DriverDB: find trip where trackingId matches AND driverPinHash matches
    
    alt Match found
        DriverDB->>DriverDB: currentDriverId = matchedTrip.id
        DriverDB->>DriverDB: currentToken = 'SEC_TOK_' + random + timestamp
        DriverDB->>SecureStore: setItemAsync('session_driver_id', matchedTrip.id)
        DriverDB->>SecureStore: setItemAsync('session_token', token)
        DriverDB->>SecureStore: setItemAsync('session_admin_role', 'false')
        DriverDB-->>DriverApp: matchedTrip.id
        DriverApp->>Driver: Shows Home screen
    else No match
        DriverDB-->>DriverApp: null
        DriverApp->>Driver: Shows error: "Invalid Tracking ID or PIN"
    end
```

### 6.3 Credential Lifecycle (Admin creates → Driver uses)

```mermaid
flowchart TD
    A["Admin: Fill Trip Creation Form\n(route, vehicle, freight, customer)"] -->
    B["db.createTrip() called in AdminDatabase"]
    B --> C["Auto-generate:\ntripId = TRIP-YYYY-NNNN\ndriverId = DRV-XXXXX\ndriverPin = 6-digit random\ntrackingId = NBT-TRK-XXXXX"]
    C --> D["Trip stored in AdminDatabase.mockTrips[]"]
    D --> E["Admin UI shows credentials:\nDriver ID, PIN, Tracking ID\nin trip detail card"]
    E --> F["OUT-OF-BAND: Admin calls/WhatsApps\ntracking ID and PIN to driver"]
    F --> G["Driver opens Driver App"]
    G --> H["Driver enters Tracking ID + PIN in Login screen"]
    H --> I["DriverDB.login(): SHA-256(PIN) compared\nagainst driverPinHash in cache"]
    
    subgraph DRIVER_DB_INIT["Driver DB Must Have Trip Pre-Loaded"]
        NOTE["⚠ Critical Gap: Driver's local DB\nmust have the trip pre-loaded.\nCurrently this happens only when\nRunning on same device OR\nvia manual db.createTrip() call\nin DriverDB"]
    end
    
    I --> NOTE
    NOTE --> J["On match: session token issued\nDriver authenticated\nTrip data filtered to only show driver's trip"]
```

### 6.4 Authorization Model (Zero-Trust Data Filtering)

The Driver app implements a zero-trust data isolation model in `getFilteredTrips()`:

```
if (adminSession) → return ALL trips
if (currentDriverId) → return ONLY trips where trip.id === currentDriverId
else → return [] (empty — no data exposed to unauthenticated actors)
```

`driverPinHash` is **always stripped** from returned trip objects (destructured out before returning).

---

## 7. Database Architecture & Data Models

### 7.1 Admin Database (AdminDatabase class)

**Storage Engine:** In-memory JavaScript arrays + `AsyncStorage` for persistence of GC Notes and Memos. All other data (trips, vehicles, fleet, drivers) is **ephemeral** — lost on app reload.

#### Entity: Trip (Admin)

| Field | Type | Description |
|---|---|---|
| `id` | string | Primary Key — `TRIP-YYYY-NNNN` |
| `driverId` | string | Auto-generated `DRV-XXXXX` |
| `driverPin` | string | Plaintext 6-digit PIN (admin view only) |
| `driverName` | string | Initially "Unassigned Driver" or loader name |
| `trackingId` | string | `NBT-TRK-XXXXX` — driver login credential |
| `status` | enum | `NOT STARTED` / `ASSIGNED` / `STARTED` / `ON_THE_WAY` / `REACHED_DESTINATION` / `COMPLETED` |
| `customerCompany` | string? | Customer company name |
| `loaderName` | string? | Contact person at load point |
| `loaderPhone` | string? | Contact phone |
| `startingPoint` | string | Origin place name |
| `startingAddress` | string? | Full origin address |
| `startingLat/Lng` | number? | Origin coordinates |
| `startingPlaceId` | string? | Google Places ID |
| `startingMapsUrl` | string? | Google Maps URL |
| `destination` | string | Destination place name |
| `destinationAddress` | string? | Full destination address |
| `destinationLat/Lng` | number? | Destination coordinates |
| `destinationPlaceId` | string? | Google Places ID |
| `destinationMapsUrl` | string? | Google Maps URL |
| `distanceKm` | number? | Calculated route distance |
| `estimatedTravelTime` | string? | e.g., "4 Hours 15 Mins" |
| `recommendedRoute` | string? | e.g., "via NH44 & NH544" |
| `tollsCount` | number | Number of toll plazas |
| `estimatedTollCost` | number | Estimated total toll cost (INR) |
| `tollPlazas` | TollPlazaDetail[]? | Per-plaza name + cost |
| `vehicleId` | string? | Reference to `ManagedVehicle.vehicle_id` |
| `vehicleNumber` | string | Truck registration number |
| `vehicleType` | enum | `6/10/12/14/16 Wheel` |
| `agreedFreight` | number? | Contract freight amount (INR) |
| `odometerStart` | number? | Start odometer reading (km) |
| `odometerEnd` | number? | End odometer reading (km) |
| `dieselStart/End` | enum? | `EMPTY/1/4/1/2/3/4/FULL` |
| `startDate/Time` | string? | Trip start timestamp |
| `endDate/Time` | string? | Trip end timestamp |
| `currentGPS` | GPSLocation? | Latest GPS telemetry |
| `lastKnownLocation` | string? | Human-readable location name |
| `locationIsGps` | boolean? | True if GPS device is connected |
| `expenses` | Expense[] | Running expense log |
| `podPhotoUri` | string? | Proof of delivery photo URI |
| `podSignature` | string? | Driver signature (base64/URI) |
| `podNotes` | string? | Delivery notes |
| `driverPayment` | number? | Admin-entered driver payment (INR) |
| `profitOrLoss` | number? | Computed P&L |
| `linkedGpsDeviceId` | string? | GPS device ID from FleetVehicle |
| `linkedImei` | string? | GPS device IMEI |
| `lastUpdatedDate/Time` | string? | Last update timestamp |
| `createdAt` | string? | ISO creation timestamp |

#### Entity: Driver (Admin)

| Field | Type | Description |
|---|---|---|
| `id` | string | Driver ID |
| `name` | string | Full name |
| `pin` | string | Plaintext PIN |
| `pinHash` | string | Hash (currently `'mockHash'`) |
| `phone` | string | Contact number |
| `license` | string | DL number |
| `vehicleNumber` | string | Assigned vehicle |
| `active` | boolean | Account status |

#### Entity: ManagedVehicle (Admin)

| Field | Type | Description |
|---|---|---|
| `vehicle_id` | string | PK: `VEH-{timestamp}` |
| `vehicleNumber` | string | Registration number (uppercase) |
| `vehicleType` | string | Wheel count type |
| `wheelType` | string | Same as vehicleType |
| `vehicleMake` | string | Manufacturer (Tata/Ashok Leyland/Eicher) |
| `vehicleModel` | string | Model name |
| `ownerName` | string | Vehicle owner |
| `ownerPhone` | string | Owner contact |
| `rcNumber` | string | RC document number |
| `engineNumber` | string | Engine number |
| `chassisNumber` | string | Chassis number |
| `yearOfManufacture` | string | Year |
| `status` | enum | `AVAILABLE/ON TRIP/UNDER MAINTENANCE/INACTIVE` |
| `rcFrontUrl/rcBackUrl` | string? | RC photo URIs |
| `insuranceUrl` | string? | Insurance photo URI |
| `insuranceExpiryDate` | string? | ISO date |
| `pollutionUrl` | string? | PUC photo URI |
| `pollutionExpiryDate` | string? | ISO date |
| `permitUrl` | string? | Permit photo URI |
| `permitExpiryDate` | string? | ISO date |
| `fcUrl` | string? | FC certificate photo URI |
| `fcExpiryDate` | string? | ISO date |
| `createdAt/updatedAt` | string | ISO timestamps |

#### Entity: VehicleDocument (Admin)

| Field | Type | Description |
|---|---|---|
| `doc_id` | string | PK: `DOC-{timestamp}` |
| `vehicle_id` | string | FK → ManagedVehicle |
| `docType` | DocType | `RC/RC_FRONT/RC_BACK/INSURANCE/POLLUTION/ROAD_TAX/FITNESS/PERMIT/FC/OTHER` |
| `docLabel` | string | Human-readable label |
| `docNumber` | string | Document number |
| `issueDate` | string | Date issued |
| `expiryDate` | string | Expiry date (drives compliance alerts) |
| `fileUri` | string | Local file URI |
| `fileName` | string | Original filename |
| `fileType` | string | MIME type |
| `uploadedAt` | string | ISO upload timestamp |
| `uploadedBy` | string | Uploader identity |
| `isActive` | boolean | Soft-delete flag |
| `history` | VehicleDocumentHistory[] | Replacement audit trail |

#### Entity: FleetVehicle (Admin)

| Field | Type | Description |
|---|---|---|
| `id` | string | PK: `FV-{timestamp}` |
| `vehicleNumber` | string | Registration |
| `vehicleType/Model/Make` | string | Vehicle specs |
| `ownerName` | string | Owner |
| `registrationDate` | string | Date |
| `vehicleStatus` | enum | `Active/Inactive/Under Maintenance` |
| `gpsProvider` | string | e.g., "Jio GPS" |
| `gpsDeviceBrand` | string | Hardware brand |
| `gpsDeviceModel` | string | Model |
| `gpsDeviceId` | string | Device ID |
| `imeiNumber` | string | 15-digit IMEI |
| `simNumber` | string? | SIM number |
| `externalGpsDeviceId` | string? | Provider's external ID |
| `gpsInstallationDate` | string | Date |
| `gpsDeviceStatus` | GpsStatus | `Connected/Offline/Not Configured/Signal Lost/Device Error` |
| `lastKnownLat/Lng` | number? | Last telemetry |
| `lastKnownCity/Address` | string? | Location description |
| `gpsHistory` | GpsDeviceHistory[] | Device replacement audit |
| `createdAt/updatedAt` | string | Timestamps |

#### Entity: GcNote (Admin) — persisted in AsyncStorage

Full freight billing document with ~35 fields covering consignor/consignee, items, GST computation, bank details, driver signature, and terms.

**Auto-numbering:** `{MON}-{YY}-{NN}` sequential per month.

**Persistence:** `AsyncStorage` key `nbt_gc_notes` — survives app restarts.

#### Entity: MemoDocument (Admin) — persisted in AsyncStorage

| Field | Type |
|---|---|
| `id/memoId` | string |
| `date` | string |
| `contentHtml` | string — rich HTML content |
| `createdAt/updatedAt` | string |
| `createdBy` | string |
| `status` | `DRAFT/SAVED` |

**Persistence:** `AsyncStorage` key `nbt_memo_documents`

#### Entity: ActivityLog (Admin)

| Field | Description |
|---|---|
| `id` | `LOG-{timestamp}` |
| `tripId` | Associated trip |
| `driverId` | Driver ID |
| `driverName` | Driver name |
| `vehicleNumber` | Vehicle |
| `action` | Action description (e.g., "Trip Created") |
| `timestamp` | Date + time string |
| `details` | Route + freight summary |
| `currentLocation` | Location at time of action |
| `statusLabel` | Status text |
| `isGpsLocation` | GPS vs manual location |

### 7.2 Driver Database (DatabaseService class)

**Storage Engine:**
- In-memory cache (`this.cache: Trip[]`)
- `AsyncStorage` key `@nbt_ars_trips_data` — trips persist across sessions
- `AsyncStorage` key `@nbt_ars_sync_queue` — offline action queue
- `AsyncStorage` key `@nbt_ars_completed_trips` — completed trip history
- `SecureStore` (with `AsyncStorage` fallback) — session state

#### Entity: Trip (Driver)

Subset of Admin Trip model, driver-visible fields only:

| Field | Type | Notes |
|---|---|---|
| `id` | string | Trip ID (= `currentDriverId` after login) |
| `driverId` | string | Driver credential ID |
| `driverPinHash` | string? | SHA-256 hash — **stripped before return to UI** |
| `driverName` | string | Driver's name (set at trip start) |
| `vehicleNumber` | string | Sanitized |
| `vehicleType` | enum | Wheel type |
| `startingPoint` | string | Sanitized |
| `destination` | string | Sanitized |
| `tollsCount` | number | |
| `estimatedTollCost` | number | |
| `status` | multi-enum | `ASSIGNED/IN_TRANSIT/ON_THE_WAY/REACHED_DESTINATION/COMPLETED/CANCELLED/STARTED/dispatched/acknowledged/in_transit/completed` |
| `odometerStart/End` | number? | Captured at start/end |
| `dieselStart/End` | enum? | Fuel level |
| `startDate/Time` | string? | |
| `endDate/Time` | string? | |
| `currentGPS` | GPSLocation? | Live telemetry |
| `expenses` | Expense[] | Running log |
| `podPhotoUri` | string? | Sanitized URI |
| `podSignature` | string? | Sanitized |
| `podNotes` | string? | Sanitized |
| `trackingId` | string | Login credential — sanitized |

#### Entity: Expense (Driver)

| Field | Type |
|---|---|
| `id` | `EXP-{timestamp}-{random}` |
| `category` | `FUEL/TOLL/RTO/POLICE/LORRY/OTHER` |
| `amount` | number |
| `reason` | string (sanitized) |
| `liters` | number? (fuel only) |
| `location` | GPSLocation? (sanitized) |
| `receiptUri` | string? (sanitized) |
| `timestamp` | string |
| `pendingSync` | boolean (offline flag) |

#### Entity: SyncAction (Driver)

| Field | Type |
|---|---|
| `id` | `ACT-{timestamp}-{random}` |
| `type` | `START_TRIP/ADD_EXPENSE/UPLOAD_POD/COMPLETE_TRIP/UPDATE_GPS` |
| `payload` | any (sanitized data) |
| `timestamp` | string |

### 7.3 Database Classification Table

| Entity | Classification | Persisted? | Owner |
|---|---|---|---|
| AdminDatabase.mockTrips | Transactional | ❌ Memory only | Admin |
| AdminDatabase.mockDrivers | Master | ❌ Memory only | Admin |
| AdminDatabase.managedVehicles | Master | ❌ Memory only | Admin |
| AdminDatabase.vehicleDocuments | Master | ❌ Memory only | Admin |
| AdminDatabase.mockFleetVehicles | Master | ❌ Memory only | Admin |
| AdminDatabase.mockGcNotes | Transactional/Document | ✅ AsyncStorage | Admin |
| AdminDatabase.mockMemoDocuments | Document | ✅ AsyncStorage | Admin |
| AdminDatabase.mockActivityLogs | Audit/Log | ❌ Memory only | Admin |
| DriverDB.cache | Transactional | ✅ AsyncStorage | Shared |
| DriverDB.syncQueue | Queue | ✅ AsyncStorage | Driver |
| DriverDB.completedTrips | History | ✅ AsyncStorage | Driver |
| Admin SecureStore token | Auth | ✅ SecureStore | Admin |
| Driver SecureStore session | Auth | ✅ SecureStore | Driver |

---

## 8. API & Service Layer

### 8.1 Google Maps Platform APIs (Admin App Only)

**Service File:** `admin app/src/services/googleMapsService.ts`

**API Key:** Reads from environment variables `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` / `VITE_GOOGLE_MAPS_API_KEY` / `GOOGLE_MAPS_API_KEY`, falls back to hardcoded key `AIzaSyDkSt7O6BPRa2pvOfPiryfaCiLZ7YJg_F8`.

> **⚠ Security Risk:** API key is hardcoded in source code.

| API Function | Endpoint | Purpose | Called From |
|---|---|---|---|
| `searchPlacesAutocomplete()` | `POST /maps/api/place/autocomplete/json` | As-you-type location suggestions | CreateTripScreen |
| `getPlaceDetails()` | `GET /maps/api/place/details/json` | Full place info (lat/lng, address, Place ID) | CreateTripScreen |
| `resolveGoogleMapsUrl()` | `GET /maps/api/geocode/json` | Resolve pasted Google Maps URLs | CreateTripScreen |
| `getDirections()` | `GET /maps/api/directions/json` | Route distance + duration + summary | CreateTripScreen |
| `buildStaticMapUrl()` | `GET /maps/api/staticmap` | Map thumbnail preview | CreateTripScreen |
| `estimateTolls()` | Internal calculation | Toll cost estimation | CreateTripScreen |

**Session Tokens:** Places Autocomplete uses session tokens (`generateSessionToken()`) for billing optimization.

**Offline Fallback:** 11 hardcoded Tamil Nadu/Karnataka freight locations used when API key not configured or call fails.

### 8.2 Device APIs (Driver App)

| API | Package | Used In | Permission Required |
|---|---|---|---|
| GPS Location | `expo-location` | StartTrip, Map, AddExpense | `ACCESS_FINE_LOCATION` |
| Foreground Location Watch | `expo-location` | MapScreen | `ACCESS_FINE_LOCATION` |
| Reverse Geocoding | `expo-location` | StartTrip, Map, AddExpense | None (uses GPS) |
| Camera | `expo-image-picker` | AddExpense, PODScreen | `CAMERA` |
| Photo Library | `expo-image-picker` | AddExpense | `READ_EXTERNAL_STORAGE` |
| Text-to-Speech | `expo-speech` | StartTrip, AddExpense, POD | None |
| Secure Storage | `expo-secure-store` | Login, Logout | None |

### 8.3 Internal "API" — Database Method Registry

All data operations are method calls on singleton database instances (`db`). There are no HTTP endpoints.

**Admin Database Methods:**

| Method | Operation | Triggers notify() |
|---|---|---|
| `login(username, pin)` | Auth | ✅ |
| `logout()` | Auth | ✅ |
| `loadSession()` | Auth restore | ❌ |
| `getTrips()` | Read | ❌ |
| `createTrip(input)` | Write | ✅ |
| `updateTripPayment(tripId, amount)` | Write | ✅ |
| `completeTrip(tripId)` | Write | ✅ |
| `simulateDriverAction(type, tripId)` | Write | ✅ |
| `getDrivers()` | Read | ❌ |
| `createDriver(data)` | Write | ✅ |
| `getManagedVehicles()` | Read | ❌ |
| `getAvailableManagedVehicles()` | Read | ❌ |
| `createManagedVehicle(data)` | Write | ✅ |
| `updateManagedVehicle(id, data)` | Write | ✅ |
| `deleteManagedVehicle(id)` | Write | ✅ |
| `setVehicleStatus(id, status)` | Write | ✅ |
| `getVehicleDocuments(vehicle_id)` | Read | ❌ |
| `addVehicleDocument(data)` | Write | ✅ |
| `replaceVehicleDocument(id, data, by)` | Write | ✅ |
| `deleteVehicleDocument(id)` | Write | ✅ |
| `getDocumentExpiryStatus(date)` | Compute | ❌ |
| `getVehicleDocumentExpiryAlerts()` | Read+Compute | ❌ |
| `getFleetVehicles()` | Read | ❌ |
| `createFleetVehicle(data)` | Write | ✅ |
| `updateFleetVehicle(id, data)` | Write | ✅ |
| `replaceGpsDevice(id, data, reason)` | Write | ✅ |
| `disconnectGpsDevice(id)` | Write | ✅ |
| `getActivityLogs()` | Read | ❌ |
| `getGcNotes()` | Read | ❌ |
| `createGcNote(data)` | Write+Persist | ✅ |
| `deleteGcNote(id)` | Write+Persist | ✅ |
| `getMemoDocuments()` | Read | ❌ |
| `saveMemoDocument(data)` | Write+Persist | ✅ |
| `deleteMemoDocument(id)` | Write+Persist | ✅ |

**Driver Database Methods:**

| Method | Operation | Enqueues Action | Persists |
|---|---|---|---|
| `init()` | Init | ❌ | ❌ |
| `login(trackingId, pin)` | Auth | ❌ | SecureStore |
| `logout()` | Auth | ❌ | AsyncStorage |
| `getTrips()` | Read (filtered) | ❌ | ❌ |
| `getTripById(id)` | Read (filtered) | ❌ | ❌ |
| `getTripByTrackingId(id)` | Read (filtered) | ❌ | ❌ |
| `getActiveTripForDriver(id)` | Read (filtered) | ❌ | ❌ |
| `createTrip(trip)` | Write | ❌ | AsyncStorage |
| `updateTripStatus(id, status)` | Write | ❌ | AsyncStorage |
| `startTrip(id, name, odo, diesel, gps)` | Write | `START_TRIP` | AsyncStorage |
| `updateGPS(id, gps)` | Write | `UPDATE_GPS` | AsyncStorage |
| `addExpense(id, expense)` | Write | `ADD_EXPENSE` | AsyncStorage |
| `uploadPOD(id, photo, sig, notes, gps)` | Write | `UPLOAD_POD` | AsyncStorage |
| `completeTrip(id, odoEnd, dieselEnd)` | Write | `COMPLETE_TRIP` | AsyncStorage |
| `getCompletedTrips()` | Read (filtered) | ❌ | ❌ |
| `processSyncQueue()` | Process | ❌ | AsyncStorage |
| `setOffline(bool)` | Config | ❌ | ❌ |
| `resetData()` | Danger | ❌ | AsyncStorage |

---

## 9. Admin → Driver Communication Matrix

| Admin Action | Field(s) Changed | Vehicle Status Update | Activity Log | Driver App Impact | Driver Screen Change | Notification |
|---|---|---|---|---|---|---|
| **Create Trip** | All trip fields created; `driverId`, `driverPin`, `trackingId` auto-generated | Vehicle → `ON TRIP` | "Trip Created" entry | Trip appears in driver's login-accessible cache | Driver can now log in with Tracking ID + PIN | None (out-of-band: phone/WhatsApp) |
| **Update Driver Payment** | `trip.driverPayment` | None | None | Driver Profile expense ledger unchanged (payment is admin-only field) | None | None |
| **Complete Trip (Admin)** | `trip.status = 'COMPLETED'` | Vehicle → `AVAILABLE` | None | Trip moves to completed state | HomeScreen shows "No Active Trips" | None |
| **Simulate Driver Start** | `trip.status = 'STARTED'` | None | None | Driver Home shows "Trip Started" status | Status badge updates | None |
| **Simulate Location Update** | `trip.status = 'ON_THE_WAY'`, `lastKnownLocation` | None | None | Driver Map screen shows updated distance | Status updates | None |
| **Simulate Complete Trip** | `trip.status = 'COMPLETED'` | Vehicle → `AVAILABLE` | None | Trip completed | Driver returns to empty Home | None |
| **Set Vehicle Status (Maintenance)** | `managedVehicle.status` | Vehicle → `UNDER MAINTENANCE` | None | Vehicle no longer shows as available in trip creation | N/A (admin only) | None |
| **Delete Vehicle** | Vehicle removed from DB | Vehicle removed | None | No active trips affected (trips keep vehicleNumber string) | None | None |
| **Add GPS Device** | `fleetVehicle.gpsDeviceId`, `imeiNumber`, `gpsDeviceStatus` | None | None | On next trip, `linkedGpsDeviceId` and `locationIsGps` set | GPS icon shown in Admin Live Status | None |
| **Disconnect GPS Device** | `fleetVehicle.gpsDeviceStatus = 'Not Configured'` | None | None | `locationIsGps` = false on future trips | GPS icon hidden | None |
| **Replace GPS Device** | New device fields + history entry | None | None | Next trip uses new IMEI | Admin GPS screen shows new device | None |
| **Reset Database** | All in-memory data cleared | N/A | N/A | All active trips disappear | Driver Home shows "No Active Trips" | None |
| **Logout (Admin)** | Admin session cleared | None | None | No effect on driver | None | None |

---

## 10. Driver → Admin Communication Matrix

| Driver Action | Driver DB Method | SyncQueue Type | Fields Updated in Trip | Admin Dashboard Impact | Admin Live Status Impact | Admin Trips Registry Impact |
|---|---|---|---|---|---|---|
| **Login** | `db.login()` | None | None | None | None | None |
| **Start Trip** | `db.startTrip()` | `START_TRIP` | `driverName`, `odometerStart`, `dieselStart`, `status='in_transit'`, `currentGPS`, `startDate`, `startTime` | Active trip count +1, vehicle shown in fleet timeline | Driver GPS panel appears with start location | Status badge changes from "ASSIGNED" to "STARTED" |
| **GPS Update (Map)** | `db.updateGPS()` | `UPDATE_GPS` | `currentGPS` (lat/lng/city/address/lastUpdated) | Fleet timeline shows current location | GPS panel updates lat/lng/city | Trip card shows last known location |
| **Add Expense — Fuel** | `db.addExpense()` | `ADD_EXPENSE` | `expenses[]` — new FUEL record with liters, location, receipt URI | Expense total in trip card increases | Expense log visible in Live Status | Expense list in trip detail modal |
| **Add Expense — Toll** | `db.addExpense()` | `ADD_EXPENSE` | `expenses[]` — TOLL record with location | Same | Same | Same |
| **Add Expense — RTO** | `db.addExpense()` | `ADD_EXPENSE` | `expenses[]` — RTO record | Same | Same | Same |
| **Add Expense — Police** | `db.addExpense()` | `ADD_EXPENSE` | `expenses[]` — POLICE record | Same | Same | Same |
| **Add Expense — Lorry** | `db.addExpense()` | `ADD_EXPENSE` | `expenses[]` — LORRY record | Same | Same | Same |
| **Add Expense — Other** | `db.addExpense()` | `ADD_EXPENSE` | `expenses[]` — OTHER record | Same | Same | Same |
| **Upload POD** | `db.uploadPOD()` | `UPLOAD_POD` | `podPhotoUri`, `podSignature`, `podNotes`, `status='completed'`, `currentGPS` | POD pending count decreases | Trip moves to completed in status | Status = COMPLETED, POD photo visible |
| **Complete Trip** | `db.completeTrip()` | `COMPLETE_TRIP` | `odometerEnd`, `dieselEnd`, `endDate`, `endTime`, pushed to `completedTrips[]` | Completed trips this month +1, active trips -1 | Driver removed from fleet timeline | Completed filter shows trip |
| **Logout** | `db.logout()` | None | `currentDriverId = null`, cache cleared | No admin change | No admin change | No admin change |
| **Go Offline** | `db.setOffline(true)` | None (queue accumulates) | No server push | No real-time update until reconnect | Live status stale | Registry stale |
| **Reconnect (Go Online)** | `db.setOffline(false)` | `processSyncQueue()` | All queued actions flushed | All queued updates appear | Live data restored | Registry updated |

---

## 11. Complete Trip Lifecycle Flow

```mermaid
flowchart TD
    START(["Admin: Trip Creation Form"]) --> FILL["Fill: Origin, Destination\nVehicle, Freight, Customer"]
    FILL --> MAPS["Google Maps APIs:\n- Places Autocomplete\n- Place Details (lat/lng)\n- Directions (distance/time/route)\n- Toll Estimation"]
    MAPS --> CREATE["db.createTrip() →\nAuto-generate:\ntripId, driverId, driverPin,\ntrackingId, tollPlazas"]
    CREATE --> STORE_ADMIN["Trip stored in\nAdminDatabase.mockTrips[]"]
    CREATE --> VEH_STATUS["Vehicle status →\nON TRIP"]
    CREATE --> ACT_LOG["ActivityLog:\n'Trip Created'\nwritten"]
    STORE_ADMIN --> NOTIFY_ADMIN["db.notify() →\nDashboard + Trips\nscreens refresh"]
    
    STORE_ADMIN --> OOB(["Admin communicates\nTrackingID + PIN\nto Driver via phone/WhatsApp"])
    
    OOB --> DRV_OPEN["Driver opens app"]
    DRV_OPEN --> DRV_LOGIN["Driver enters Tracking ID + PIN\n→ SHA-256 hash match\n→ Session token issued"]
    DRV_LOGIN --> DRV_HOME["Driver sees Home screen\nwith trip details (ASSIGNED)"]
    
    DRV_HOME --> DRV_START_PRESS["Driver taps START TRIP\n→ StartTripScreen"]
    DRV_START_PRESS --> DRV_NAME["Step 1: Voice / Manual\nDriver Name entry"]
    DRV_NAME --> DRV_ODO["Step 2: Odometer reading\n+ Diesel level\n+ GPS capture"]
    DRV_ODO --> DB_STARTTRIP["db.startTrip()\nstatus → in_transit\nGPS captured\nEnqueue: START_TRIP"]
    DB_STARTTRIP --> DRV_MAP["Driver auto-navigates\nto Map screen\n(Location tracking active)"]
    
    DRV_MAP --> GPS_LOOP["watchPositionAsync()\nevery 10s / 50m\n→ db.updateGPS()\n→ Enqueue: UPDATE_GPS"]
    GPS_LOOP --> ADMIN_LIVE["Admin Live Status\n3-sec poll → sees\ndriver location update"]
    
    DRV_MAP --> EXPENSE_BTN["Driver taps + EXPENSE"]
    EXPENSE_BTN --> DRV_EXPENSE["AddExpenseScreen:\nCategory + Amount + GPS\n+ Photo (optional)"]
    DRV_EXPENSE --> DB_EXPENSE["db.addExpense()\nEnqueue: ADD_EXPENSE"]
    DB_EXPENSE --> ADMIN_TRIPS["Admin Trips Registry\nshows updated expense total"]
    
    DRV_MAP --> ARRIVED_BTN["Driver taps ARRIVED DEPOT"]
    ARRIVED_BTN --> DRV_POD["PodScreen:\n1. Camera POD photo\n2. Signature pad\n3. Delivery notes\n4. Odometer end\n5. Diesel end"]
    DRV_POD --> DB_POD["db.uploadPOD()\ndb.completeTrip()\nEnqueue: UPLOAD_POD\nEnqueue: COMPLETE_TRIP\nstatus → completed"]
    DB_POD --> DOCKET["Summary Docket shown\n(print/share stub)"]
    DB_POD --> VEH_AVAIL["Vehicle status →\nAVAILABLE"]
    DB_POD --> ADMIN_COMPLETE["Admin Dashboard:\nCompleted trips this month +1\nActive trips -1"]
    
    DOCKET --> DRV_HOME2["Driver returns to Home\n(No Active Trips)"]
    
    ADMIN_COMPLETE --> ADMIN_PAYMENT["Admin enters\nDriver Payment in\nTrips Registry"]
    ADMIN_PAYMENT --> PROFIT["profit/loss =\nagreedFreight - driverPayment - totalExpenses"]
```

---

## 12. Real-Time Synchronization Architecture

### 12.1 Mechanisms

The system does **not** use WebSocket, Socket.IO, Firebase, or any true real-time protocol. Instead:

| Mechanism | Implementation | Frequency | Scope |
|---|---|---|---|
| **Observer pattern** | `db.subscribe(listener)` — Set of callbacks called on every `db.notify()` | Instant (synchronous) | Same process/device only |
| **Polling — Dashboard** | `setInterval(fetchData, 3000)` | Every 3 seconds | Admin Dashboard |
| **Polling — Trips** | `setInterval(fetchTrips, 4000)` | Every 4 seconds | Admin Trips Registry |
| **Polling — Live Status** | `setInterval(fetchLiveStatus, 3000)` | Every 3 seconds | Admin Live GPS |
| **GPS Watch** | `Location.watchPositionAsync()` | Every 10s / 50m movement | Driver Map screen |

### 12.2 Observer / Pub-Sub Architecture

```mermaid
graph LR
    subgraph ADMIN_DB["AdminDatabase"]
        LISTENERS_A["listeners: Set<DatabaseListener>"]
        NOTIFY_A["notify() → forEach listener()"]
    end
    
    subgraph SUBSCRIPTIONS["Admin UI Subscriptions"]
        DASH["DashboardScreen.useEffect:\ndb.subscribe(fetchData)"]
        VEHSCR["VehiclesScreen.useEffect:\ndb.subscribe(fetchVehicles)"]
        ROOT["App.tsx:\ndb.subscribe(notify)"]
    end
    
    subgraph MUTATIONS["Any db.write*() call"]
        CT["createTrip()"]
        CMV["createManagedVehicle()"]
        UMV["updateManagedVehicle()"]
        CGC["createGcNote()"]
        SIM["simulateDriverAction()"]
    end
    
    MUTATIONS --> NOTIFY_A
    NOTIFY_A --> LISTENERS_A
    LISTENERS_A --> DASH
    LISTENERS_A --> VEHSCR
    LISTENERS_A --> ROOT
```

### 12.3 Driver DB Observer

```mermaid
graph LR
    subgraph DRIVER_DB["DatabaseService"]
        LISTENERS_D["listeners: Set<DatabaseListener>"]
        NOTIFY_D["notify() → AsyncStorage.setItem → forEach listener(trips)"]
    end
    
    subgraph APP["Driver App.tsx"]
        SUB["db.subscribe(updatedTrips =>\n  setTrips(updatedTrips)\n  setIsOffline(db.isOffline())\n  setSyncQueueLength(queue.length))"]
    end
    
    subgraph MUTATIONS_D["db.startTrip / addExpense / updateGPS / uploadPOD / completeTrip"]
        WRITE["Any write method"]
    end
    
    WRITE --> NOTIFY_D
    NOTIFY_D --> LISTENERS_D
    LISTENERS_D --> SUB
```

---

## 13. Offline & Sync Queue Architecture

```mermaid
sequenceDiagram
    participant Driver
    participant DriverApp
    participant DriverDB
    participant AsyncStorage
    participant SyncQueue

    Note over Driver,SyncQueue: OFFLINE MODE ACTIVE

    Driver->>DriverApp: Start trip
    DriverApp->>DriverDB: startTrip()
    DriverDB->>DriverDB: offlineMode = true
    DriverDB->>AsyncStorage: save updated trips
    DriverDB->>SyncQueue: enqueue {type: START_TRIP, payload}
    DriverDB->>AsyncStorage: save queue

    Driver->>DriverApp: Add expense
    DriverApp->>DriverDB: addExpense() → expense.pendingSync = true
    DriverDB->>SyncQueue: enqueue {type: ADD_EXPENSE, payload}
    DriverDB->>AsyncStorage: save queue

    Note over Driver,SyncQueue: DRIVER GOES ONLINE (taps CONNECT button)

    Driver->>DriverApp: Toggle CONNECT
    DriverApp->>DriverDB: setOffline(false)
    DriverDB->>DriverDB: processSyncQueue()
    Note over DriverDB: Stub — marks expenses pendingSync=false\nClears queue (no real server call)
    DriverDB->>AsyncStorage: clear queue
    DriverDB->>DriverDB: syncFromServer() [stub — returns void]
    DriverDB->>DriverApp: notify(updatedTrips)
    DriverApp->>Driver: UI updates, syncQueueLength = 0
```

**Sync Queue Actions:**

| Action Type | Payload |
|---|---|
| `START_TRIP` | `{tripId, driverName, odometer, dieselLevel, gps}` |
| `UPDATE_GPS` | `{tripId, gps}` |
| `ADD_EXPENSE` | `{tripId, expense}` |
| `UPLOAD_POD` | `{tripId, podPhotoUri, signature, notes, gps}` |
| `COMPLETE_TRIP` | `{tripId, odometerEnd, dieselEnd}` |

**Offline status indicator:** Header bar shows `Offline Mode (N pending)` with orange dot when offline, `Secure Server Channel Online` with green dot when online.

---

## 14. Screen Flow Analysis

### 14.1 Admin Screen Flow

```mermaid
flowchart LR
    LAUNCH["App Launch"] --> SPLASH["SplashScreen.hideAsync()\n(800ms delay)"]
    SPLASH --> AUTH{isAuthenticated?}
    AUTH -->|No| LOGIN_A["[No Login Screen in App.tsx]\nApp loads session from SecureStore\nIf token exists → show dashboard"]
    AUTH -->|Yes| DASH_SCR["DashboardScreen"]
    
    DASH_SCR -->|"CREATE_TRIP tab"| CREATE_SCR["CreateTripScreen"]
    DASH_SCR -->|"TRIPS tab"| TRIPS_SCR["TripsScreen"]
    DASH_SCR -->|"LIVE tab"| LIVE_SCR["LiveStatusScreen"]
    DASH_SCR -->|"GC tab"| GC_SCR["GcScreen"]
    DASH_SCR -->|"MEMO tab"| MEMO_SCR["MemoScreen"]
    DASH_SCR -->|"MENU/VEHICLES"| VEH_SCR["VehiclesScreen"]
    DASH_SCR -->|"MENU/GPS"| GPS_SCR["GpsVehicleScreen"]
    DASH_SCR -->|"MENU/SETTINGS"| SETT_SCR["SettingsScreen"]
    
    CREATE_SCR -->|"onTripCreated"| TRIPS_SCR
    SETT_SCR -->|"onLogout"| LOGOUT_A["db.logout()\nSession cleared"]
```

> **Note:** Admin App does not have a visible Login Screen. Authentication check (`db.loadSession()`) runs silently at startup. If no token exists in SecureStore, the admin has no way to log in via UI — this appears to be a design gap; the admin credentials are currently used only in the Driver App's admin backdoor.

### 14.2 Driver Screen Flow

```mermaid
flowchart LR
    LAUNCH_D["App Launch"] --> FONTS["Load Fonts\n(expo-font)"]
    FONTS --> SPLASH_D["SplashScreen animation\n(custom component)"]
    SPLASH_D --> DB_INIT["db.init()\nRestore session\nLoad trips from AsyncStorage"]
    DB_INIT --> AUTH_D{isAuthenticated?}
    
    AUTH_D -->|No| LOGIN_D["LoginScreen\n(Tracking ID + PIN)"]
    AUTH_D -->|Yes| HOME_D["HomeScreen"]
    
    LOGIN_D -->|"login success"| HOME_D
    
    HOME_D -->|"ASSIGNED trip + Start"| START_D["StartTripScreen\n(2-step wizard)"]
    HOME_D -->|"MAP tab"| MAP_D["MapScreen\n(requires started trip)"]
    HOME_D -->|"EXPENSE tab"| EXP_D["AddExpenseScreen\n(requires active trip)"]
    HOME_D -->|"DELIVERY tab"| POD_D["PodScreen\n(requires started trip)"]
    HOME_D -->|"PROFILE tab"| PROF_D["ProfileScreen"]
    
    START_D -->|"onTripStarted"| MAP_D
    MAP_D -->|"expense shortcut"| EXP_D
    MAP_D -->|"arrived shortcut"| POD_D
    EXP_D -->|"saved"| MAP_D
    POD_D -->|"trip completed"| HOME_D
    
    HOME_D -->|"logout / auto-lock"| LOGIN_D
```

---

## 15. State Management Architecture

### 15.1 Pattern

Both applications use **React local state** (`useState`, `useEffect`) only. No Redux, Context API, MobX, Zustand, Recoil, RTK Query, or React Query is used.

All shared state is managed through the singleton database classes acting as a **custom in-memory store with observer pattern**.

### 15.2 Admin State Topology

| Component | Local State | DB Subscription |
|---|---|---|
| `App.tsx` | `adminTab`, `isKeyboardVisible`, `sidebarCollapsed`, `mobileDrawerOpen` | `db.subscribe()` for session |
| `DashboardScreen` | `trips`, `fleetVehicles`, `activityLogs`, `expiryAlerts`, `loading`, `refreshing`, `monthlyReportVisible`, `showSimulator` | `db.subscribe()` + 3s poll |
| `CreateTripScreen` | Full form state (30+ fields), `vehicles`, `sessionToken`, `suggestions`, `loading` | `db.getManagedVehicles()` on mount |
| `TripsScreen` | `trips`, `search`, `statusFilter`, `selectedTrip`, `detailModalVisible`, `driverPaymentInput` | 4s poll |
| `LiveStatusScreen` | `searchId`, `driverTrip`, `allLogs`, `loading` | 3s poll |
| `VehiclesScreen` | `vehicles`, `allVehicleDocuments`, `selectedVehicle`, 20+ form fields | `db.subscribe()` |
| `GpsVehicleScreen` | `fleetVehicles`, `selectedVehicle`, 15+ form fields | `db.subscribe()` + `db.subscribe()` |

### 15.3 Driver State Topology

| Component | Local State | DB Subscription |
|---|---|---|
| `App.tsx` | `authenticatedDriverId`, `trips`, `activeTrip`, `driverTab`, `showSplash`, `isOffline`, `syncQueueLength`, `isKeyboardVisible`, `fontsLoaded` | `db.subscribe()` for all trip updates |
| `LoginScreen` | `email`, `pin`, `showPin`, `error`, `loading`, `debugClickCount` | None |
| `HomeScreen` | None (all props) | None |
| `StartTripScreen` | `step`, `driverName`, `isListening`, `odometer`, `dieselLevel`, `loading` | None |
| `MapScreen` | `location`, `distanceRemaining`, `eta`, `currentTurn`, `turnIcon` | None (GPS subscription) |
| `AddExpenseScreen` | `selectedCategory`, `amount`, `reason`, `capturedLocation`, `receiptImage`, `liters`, `isListening` | None |
| `PodScreen` | `podPhoto`, `isSigned`, `notes`, `odometerEnd`, `dieselEnd`, `showSummaryDocket`, `loading` | None |
| `ProfileScreen` | `driverName`, `completedTripsCount`, `totalKm`, `ratings`, `completedTrips`, `expenseLedger` | None |

---

## 16. Local Storage Architecture

### 16.1 Admin App Storage

| Key | Storage | Type | Content | Persists Restart? |
|---|---|---|---|---|
| `admin_session_token` | SecureStore | String | `'mock-admin-token'` | ✅ |
| `admin_username` | SecureStore | String | `'admin'` | ✅ |
| `nbt_gc_notes` | AsyncStorage | JSON Array | All GC Note documents | ✅ |
| `nbt_memo_documents` | AsyncStorage | JSON Array | All Memo documents | ✅ |

**Not persisted (memory-only):** trips, drivers, vehicles, vehicle documents, fleet vehicles, activity logs.

### 16.2 Driver App Storage

| Key | Storage | Type | Content | Persists Restart? |
|---|---|---|---|---|
| `session_driver_id` | SecureStore | String | Trip ID (driver's session) | ✅ |
| `session_token` | SecureStore | String | `'SEC_TOK_...'` | ✅ |
| `session_admin_role` | SecureStore | String | `'true'/'false'` | ✅ |
| `@nbt_ars_trips_data` | AsyncStorage | JSON Array | All active trips (with pinHash) | ✅ |
| `@nbt_ars_sync_queue` | AsyncStorage | JSON Array | Pending sync actions | ✅ |
| `@nbt_ars_completed_trips` | AsyncStorage | JSON Array | Completed trip history | ✅ |

**SecureStore fallback:** On web platform, all SecureStore operations fall back to AsyncStorage.

---

## 17. Security Architecture

### 17.1 Authentication Security

| Control | Implementation | Status |
|---|---|---|
| Admin credential | Hardcoded username=`admin`, pin=`9999` | ⚠️ **CRITICAL — hardcoded, no way to change** |
| Admin token | Static string `'mock-admin-token'` | ⚠️ **CRITICAL — no entropy, no expiry** |
| Driver PIN hashing | SHA-256 via `crypto-js` | ✅ Good |
| Session persistence | SecureStore (Android Keystore / iOS Keychain) | ✅ Good |
| Session token | Random + timestamp-based string | ✅ Acceptable |
| Token expiry | None | ⚠️ No token expiry |
| Auto-lock | 300s background inactivity → logout | ✅ Good |
| Zero-trust data filtering | Driver can only see own trip | ✅ Excellent |
| PIN hash strip | `driverPinHash` stripped before UI | ✅ Excellent |

### 17.2 Input Sanitization

Driver App implements `sanitizeInput()` on all user-supplied text:
```
text.replace(/<[^>]*>/g, '')           // Strip HTML tags
    .replace(/[\r\n\x00-\x1F]/g, ' ') // Strip control chars (prevents log injection)
    .trim()
```

Applied to: `driverName`, `vehicleNumber`, `startingPoint`, `destination`, `trackingId`, GPS city/address, expense reason, expense receipt URI, POD notes.

### 17.3 API Key Security

| Risk | Detail |
|---|---|
| **Google Maps API key hardcoded** | Key `AIzaSyDkSt7O6BPRa2pvOfPiryfaCiLZ7YJg_F8` is in source code | 
| **No server-side proxy** | Direct client-to-Google Maps API calls |
| **Exposed in JavaScript bundle** | Key visible to anyone inspecting the web bundle |

### 17.4 Data Exposure Risks

| Risk | Detail |
|---|---|
| `driverPin` exposed in Admin UI | Trip cards in Admin show plaintext driver PIN |
| Admin backdoor in Driver App | `admin`/`9999` login gives full admin session in driver app |
| Debug mode easter egg | 5 taps reveals demo credentials panel |
| No HTTPS enforcement | Local dev server, no TLS |
| Memory-only data | Trips/vehicles/drivers lost on admin app reload |

### 17.5 Permissions (Driver App)

| Permission | Purpose | Requested |
|---|---|---|
| `ACCESS_FINE_LOCATION` | GPS tracking | On trip start + map load |
| `CAMERA` | POD photo + expense receipt | On expense/POD action |
| `READ_EXTERNAL_STORAGE` | Photo library | On expense/POD action |

---

## 18. Background Services & Permissions

### 18.1 Background Processing

| Service | Implementation | Platform |
|---|---|---|
| **App state monitoring** | `AppState.addEventListener('change')` — auto-lock logic | Both |
| **Keyboard visibility** | `Keyboard.addListener('keyboardDidShow/Hide')` | Both |
| **GPS location watch** | `Location.watchPositionAsync()` — foreground only | Driver (Map screen) |
| **Polling intervals** | `setInterval()` on Dashboard/Trips/Live screens | Admin |
| **Splash screen** | `expo-splash-screen` | Both |
| **Text-to-speech** | `expo-speech` — voice announcements | Driver |
| **Font loading** | `expo-font` — MaterialIcons pre-load | Driver |

### 18.2 No Background Services

The system does **not** implement:
- Android Foreground Service for continuous GPS
- Background fetch
- Push notifications (FCM/APNs)
- WorkManager or JobScheduler
- Background sync tasks

GPS tracking only works while the app is in foreground.

---

## 19. Business Rules Registry

| Rule ID | Business Rule | Implementation Location |
|---|---|---|
| BR-001 | Only Admin can create trips | `AdminDatabase.createTrip()` — no driver-side trip creation |
| BR-002 | Trip credentials auto-generated — never manual | `createTrip()` — all IDs randomly generated |
| BR-003 | Driver can only see own trip | `getFilteredTrips()` zero-trust filter |
| BR-004 | PIN hash never exposed to driver UI | `getFilteredTrips()` — destructure removes `driverPinHash` |
| BR-005 | Vehicle moves to ON TRIP on trip creation | `createTrip()` — auto-updates `managedVehicles` |
| BR-006 | Vehicle returns to AVAILABLE on trip completion | `completeTrip()` + `simulateDriverAction('COMPLETE_TRIP')` |
| BR-007 | Driver session auto-locks after 5 minutes background | `AppState` listener in `App.tsx` |
| BR-008 | GPS location required before expense save | `AddExpenseScreen.handleSaveExpense()` — validation |
| BR-009 | Odometer required before trip start | `StartTripScreen.handleStartTrip()` — validation |
| BR-010 | Diesel level required before trip start | Same |
| BR-011 | Trip must be started before expense logging | `App.tsx` render logic — EXPENSE tab shows empty if no active trip |
| BR-012 | Trip must be started before POD submission | `App.tsx` render logic — DELIVERY tab requires started trip |
| BR-013 | POD photo required for delivery | `PodScreen` validation |
| BR-014 | Signature required for delivery | `PodScreen` — `isSigned` check |
| BR-015 | Odometer end required at trip completion | `PodScreen` validation |
| BR-016 | GC Notes auto-numbered per month | `createGcNote()` — sequential `{MON}-{YY}-{NN}` |
| BR-017 | Duplicate GC note numbers rejected | `createGcNote()` — duplicate check before create |
| BR-018 | Admin can override driver payment | `updateTripPayment()` — admin-only write |
| BR-019 | Document expiry alerts: 7-day, 30-day, expired | `getDocumentExpiryStatus()` — 3-tier classification |
| BR-020 | Vehicle with expired documents still operational | System only alerts, no enforcement |
| BR-021 | Admin reset clears both Admin and Driver data | `resetData()` note in Settings description |
| BR-022 | Fuel expense requires liters > 0 | `AddExpenseScreen` validation |
| BR-023 | All user input sanitized against injection | `sanitizeInput()` in Driver DB |
| BR-024 | Offline actions queued for later sync | `enqueueAction()` → `syncQueue[]` |

---

## 20. Dependency Analysis

### 20.1 Admin App Dependencies

| Package | Version | Purpose |
|---|---|---|
| `expo` | ~57.0.8 | Framework |
| `react-native` | 0.86.0 | Core framework |
| `react-native-web` | ^0.21.2 | Web rendering |
| `@react-native-async-storage/async-storage` | 2.2.0 | Data persistence |
| `expo-secure-store` | ^57.0.1 | Encrypted session storage |
| `expo-document-picker` | ~57.0.1 | File upload for vehicle docs |
| `expo-image-picker` | ~57.0.6 | Photo capture |
| `expo-location` | ~57.0.6 | GPS (used in CreateTripScreen) |
| `expo-speech` | ~57.0.1 | Voice announcements |
| `expo-splash-screen` | ~57.0.5 | Splash screen |
| `expo-print` | ^57.0.1 | Print (stub) |
| `expo-sharing` | ^57.0.8 | Share (stub) |
| `expo-file-system` | ^57.0.1 | File operations |
| `react-native-safe-area-context` | ~5.7.0 | Safe area insets |
| `react-native-screens` | ~4.26.0 | Screen optimization |
| `@react-navigation/*` | ^7.x | Navigation (installed, not used for routing) |
| `nativewind` | ^4.2.6 | Tailwind CSS (installed, not used) |
| `react-native-webview` | ^14.0.1 | WebView (not used) |

### 20.2 Driver App Dependencies

| Package | Version | Purpose |
|---|---|---|
| `expo` | ~57.0.8 | Framework |
| `react-native` | 0.86.0 | Core framework |
| `crypto-js` | ^4.2.0 | SHA-256 PIN hashing |
| `@react-native-async-storage/async-storage` | 2.2.0 | Data persistence |
| `expo-secure-store` | ^57.0.1 | Session security |
| `expo-location` | ~57.0.6 | GPS tracking |
| `expo-image-picker` | ~57.0.6 | Camera for receipts/POD |
| `expo-speech` | ~57.0.1 | Voice announcements |
| `expo-font` | ~57.0.1 | Icon font loading |
| `react-native-safe-area-context` | ~5.7.0 | Safe area |
| `@react-navigation/*` | ^7.x | Navigation (installed, not used) |

---

## 21. Risks & Missing Features

### 21.1 Critical Risks

| Risk | Severity | Detail |
|---|---|---|
| **No backend server** | 🔴 Critical | All data is in-memory. Admin app reload destroys all trips, vehicles, drivers except GC Notes and Memos. |
| **Admin credentials hardcoded** | 🔴 Critical | Username `admin`, PIN `9999` is hardcoded in source. Cannot be changed without code change. |
| **Google Maps API key in source** | 🔴 Critical | Key exposed in JavaScript bundle, visible to anyone |
| **No Admin Login UI** | 🔴 Critical | Admin app has no login screen — session loaded from SecureStore silently. If no session exists, admin is locked out with no UI to log in. |
| **Driver PIN exposed in Admin UI** | 🟠 High | Admin trip cards show plaintext `driverPin`. Should never display plaintext credential. |
| **Admin backdoor in Driver app** | 🟠 High | `admin`/`9999` gives full admin session in Driver app — bypasses all data isolation. |
| **No token expiry** | 🟠 High | Admin token never expires. Session persists indefinitely. |
| **Memory-only data loss** | 🟠 High | All vehicles, trips, fleet vehicles lost on admin app reload. |
| **No inter-app sync** | 🟠 High | Admin and Driver databases are entirely separate. Trips created in Admin do not automatically appear in Driver app. |
| **GPS foreground-only** | 🟡 Medium | Location tracking stops when driver locks phone. |
| **Voice recognition simulated** | 🟡 Medium | Both voice input implementations are simulated with mock responses. |

### 21.2 Missing Features

| Feature | Status |
|---|---|
| Backend API / Database server | ❌ Not implemented (stubbed) |
| Push notifications | ❌ Not implemented |
| Real-time WebSocket / Firebase | ❌ Not implemented |
| Admin Login Screen | ❌ Missing from Admin App |
| Password change / reset | ❌ Not implemented |
| Driver registration / management | ❌ Partial (DriversScreen exists but is not in navigation) |
| Multi-admin support | ❌ Single hardcoded account |
| Real voice recognition | ❌ Simulated only |
| Real thermal printer integration | ❌ Alert stub only |
| Real PDF generation | ❌ `https://dummy.pdf` stub |
| WhatsApp sharing integration | ❌ Alert stub only |
| Route calculation in Driver app | ❌ Distance is simulated countdown |
| Background GPS | ❌ Foreground only |
| Certificate pinning | ❌ Not implemented |
| Root/jailbreak detection | ❌ Not implemented |
| App version enforcement | ❌ Not implemented |
| Audit trail persistence | ❌ Activity logs are memory-only |
| Multi-language support | ❌ English only (voice claims English/Tamil) |
| Customer tracking portal | ❌ Tracking IDs generated but no public tracking page |

---

## 22. Improvement Recommendations

### 22.1 Immediate (Critical Path)

1. **Implement backend server** — Express.js/Next.js API with PostgreSQL or MongoDB. Replace all in-memory `mock*` arrays with database-backed API calls.

2. **Remove hardcoded credentials** — Implement proper admin user table with bcrypt-hashed passwords, changeable via UI.

3. **Move Google Maps API key to server proxy** — Never expose API keys in client-side code. Route all Maps API calls through a server endpoint.

4. **Add Admin Login Screen** — The Admin app has no login UI. Implement a proper login screen.

5. **Hide plaintext driver PIN** — Never display `driverPin` in Admin UI. Show only the Tracking ID; PIN should only be shown once at creation time.

6. **Real inter-app sync** — Implement WebSocket or Firebase Firestore real-time sync so trips created in Admin appear instantly in Driver app.

### 22.2 Short-term (Architecture)

7. **Background GPS service** — Implement Android Foreground Service for continuous GPS tracking when screen is locked.

8. **Push notifications** — FCM for trip assignments, emergency alerts, status updates from Admin to Driver.

9. **JWT authentication** — Replace mock tokens with proper JWT with refresh token rotation.

10. **Persist admin data** — Trips, vehicles, fleet data must survive app restarts. Store in backend database.

11. **Real sync queue processing** — `processSyncQueue()` is a stub. Implement actual API calls to flush queued actions.

12. **Remove admin backdoor from Driver app** — The `admin`/`9999` login in Driver app is a severe security risk.

### 22.3 Medium-term (Features)

13. **Real PDF generation** — Use `expo-print` properly to generate trip dockets and GC notes as actual PDFs.

14. **WhatsApp API integration** — Deep-link to WhatsApp pre-filled with trip credentials for credential sharing.

15. **Real voice recognition** — Integrate Google Cloud Speech-to-Text or on-device speech recognition.

16. **Customer tracking portal** — Public web page where customers enter Tracking ID to see live trip status.

17. **Background sync** — React Native background task for offline queue processing.

18. **Bluetooth thermal printer SDK** — Integrate a real Bluetooth printer SDK (e.g., Star Micronics, Epson ePOS).

---

## 23. Scalability Recommendations

| Area | Recommendation |
|---|---|
| **Database** | PostgreSQL + Redis (hot data caching). Indexed on `tripId`, `driverId`, `vehicleNumber`, `status`. |
| **Real-time** | Firebase Firestore or Supabase Realtime for instant cross-device sync. |
| **GPS telemetry** | Time-series database (InfluxDB) for GPS history at scale. |
| **Document storage** | AWS S3 or Google Cloud Storage for vehicle documents, POD photos, receipts. |
| **API layer** | GraphQL subscription or REST + WebSocket (Socket.IO) for Admin dashboard. |
| **Offline sync** | CRDT or operational transform for conflict-free merge of offline actions. |
| **Notifications** | FCM (Android) + APNs (iOS) via backend notification service. |
| **Auth** | Supabase Auth or Clerk for multi-tenant admin management. |
| **Audit** | Append-only audit log in dedicated table (never overwritten). |
| **Multi-company** | Tenant isolation if supporting multiple logistics companies. |

---

## 24. Final End-to-End Enterprise Architecture Diagram

```mermaid
graph TB
    subgraph ADMIN_SIDE["🖥 ADMIN CONSOLE (React Native Web)"]
        direction TB
        ADMIN_AUTH["Admin Auth\n(admin/9999 → SecureStore)"]
        DASH["Dashboard\n(KPIs, fleet timeline, alerts)"]
        CREATE["Trip Creation\n(Google Maps integration)"]
        TRIPS_R["Trips Registry\n(filter, detail, payment)"]
        LIVE_GPS["Live GPS Status\n(driver tracking)"]
        VEH_MGT["Vehicle Management\n(docs, expiry, status)"]
        GPS_MGT["GPS Device Management\n(IMEI, provider, history)"]
        GC["GC Notes\n(freight billing)"]
        MEMO["Memo\n(internal docs)"]
        SETTINGS["Settings\n(diagnostics, reset, logout)"]
        
        ADMIN_DB[("AdminDatabase\n(In-Memory)\nmockTrips[]\nmanagedVehicles[]\nfleetVehicles[]\ngcNotes → AsyncStorage\nmemos → AsyncStorage")]
    end
    
    subgraph EXTERNAL_APIS["🌐 External APIs"]
        GMAPS_API["Google Maps Platform\n• Places Autocomplete\n• Place Details\n• Directions\n• Static Maps\n• Geocoding"]
    end
    
    subgraph COMM_CHANNEL["📱 Out-of-Band Credential Delivery"]
        OOB_PHONE["Phone / WhatsApp\nTrackingID + PIN"]
    end
    
    subgraph DRIVER_SIDE["📱 DRIVER APP (React Native Android)"]
        direction TB
        DRIVER_AUTH["Driver Auth\n(Tracking ID + SHA-256 PIN)"]
        HOME["Home Screen\n(trip status, action buttons)"]
        START_TRIP["Start Trip\n(name, odometer, diesel, GPS)"]
        MAP_SCR["Map Screen\n(GPS watch, navigation)"]
        EXPENSE_SCR["Expense Screen\n(fuel, toll, RTO, police, lorry)"]
        POD_SCR["POD Screen\n(photo, signature, odometer end)"]
        PROFILE_SCR["Profile\n(stats, history)"]
        
        DRIVER_DB[("DatabaseService\n(In-Memory + AsyncStorage)\ncache: Trip[]\nsyncQueue: SyncAction[]\ncompletedTrips: Trip[]\nSecureStore: session")]
        
        GPS_MOD["expo-location\n(GPS watch 10s/50m)"]
        CAM_MOD["expo-image-picker\n(camera)"]
        SPEECH_MOD["expo-speech\n(TTS)"]
        SYNC_Q["Offline Queue\n(START_TRIP\nUPDATE_GPS\nADD_EXPENSE\nUPLOAD_POD\nCOMPLETE_TRIP)"]
    end
    
    subgraph SYNC_MECH["🔄 Sync Mechanisms"]
        direction LR
        OBSERVER["Observer Pattern\n(db.subscribe/notify)"]
        POLLING["Polling\n(3-4 second intervals)"]
        GPS_WATCH["GPS watchPositionAsync\n(foreground only)"]
    end
    
    subgraph STORAGE["💾 Persistent Storage"]
        ASYNC_TRIPS["@nbt_ars_trips_data"]
        ASYNC_QUEUE["@nbt_ars_sync_queue"]
        ASYNC_HIST["@nbt_ars_completed_trips"]
        ASYNC_GC["nbt_gc_notes"]
        ASYNC_MEMO["nbt_memo_documents"]
        SECURE_ADMIN["Admin SecureStore\n(token, username)"]
        SECURE_DRIVER["Driver SecureStore\n(driver_id, token, role)"]
    end

    CREATE -->|"createTrip()\nAuto-generates IDs"| ADMIN_DB
    ADMIN_DB -->|"notify() listeners"| DASH
    ADMIN_DB -->|"notify() listeners"| TRIPS_R
    ADMIN_DB -->|"notify() listeners"| LIVE_GPS
    ADMIN_DB -->|"notify() listeners"| VEH_MGT
    
    CREATE <-->|"HTTPS REST"| GMAPS_API
    
    ADMIN_DB -->|"tripId + driverId + driverPin + trackingId"| OOB_PHONE
    OOB_PHONE -->|"driver receives credentials"| DRIVER_AUTH
    
    DRIVER_AUTH -->|"trackingId + SHA-256(PIN)\nmatch in cache"| DRIVER_DB
    DRIVER_DB -->|"notify() → filtered trips"| HOME
    
    HOME --> START_TRIP
    START_TRIP -->|"startTrip()\nGPS + odometer + diesel"| DRIVER_DB
    DRIVER_DB --> SYNC_Q
    
    MAP_SCR <-->|"watchPositionAsync"| GPS_MOD
    GPS_MOD -->|"updateGPS()"| DRIVER_DB
    
    EXPENSE_SCR <-->|"requestPermissions"| CAM_MOD
    EXPENSE_SCR -->|"addExpense()"| DRIVER_DB
    
    POD_SCR <-->|"requestPermissions"| CAM_MOD
    POD_SCR -->|"uploadPOD()\ncompleteTrip()"| DRIVER_DB
    
    DRIVER_DB -->|"persist"| ASYNC_TRIPS
    DRIVER_DB -->|"persist"| ASYNC_QUEUE
    DRIVER_DB -->|"persist"| ASYNC_HIST
    DRIVER_DB <-->|"session"| SECURE_DRIVER
    
    ADMIN_DB -->|"persist GC"| ASYNC_GC
    ADMIN_DB -->|"persist Memos"| ASYNC_MEMO
    ADMIN_DB <-->|"session"| SECURE_ADMIN
    
    OBSERVER -.->|"in-process"| ADMIN_DB
    POLLING -.->|"4s Admin screens"| ADMIN_DB
    GPS_WATCH -.->|"10s / 50m"| DRIVER_DB
    
    SPEECH_MOD <-.->|"TTS announcements"| START_TRIP
    SPEECH_MOD <-.->|"TTS announcements"| EXPENSE_SCR
    SPEECH_MOD <-.->|"TTS announcements"| POD_SCR
```

---

## Appendix A: Status Enum Cross-Reference

| Admin Status | Driver Status | Meaning |
|---|---|---|
| `NOT STARTED` | — | Trip created, not yet assigned to driver login |
| `ASSIGNED` | `ASSIGNED` | Driver logged in, not started |
| `STARTED` | `in_transit` | Driver began trip (odometer captured) |
| `ON_THE_WAY` | `in_transit`/`ON_THE_WAY` | Driver en route |
| `REACHED_DESTINATION` | `REACHED_DESTINATION` | Driver at destination |
| `COMPLETED` | `completed` | POD submitted, trip closed |

> **Note:** There is a status naming inconsistency between Admin (PascalCase, UNDERSCORE) and Driver (lowercase, mixed) that creates mapping complexity. The driver database supports: `ASSIGNED/IN_TRANSIT/ON_THE_WAY/REACHED_DESTINATION/COMPLETED/CANCELLED/STARTED/dispatched/acknowledged/in_transit/completed` — many of these are redundant or legacy.

## Appendix B: Sequence Diagrams

### B.1 Complete Authentication Sequence

```mermaid
sequenceDiagram
    autonumber
    participant Admin as Admin User
    participant AdminApp as Admin App
    participant DriverOps as Driver (Out-of-Band)
    participant DriverApp as Driver App

    Admin->>AdminApp: Open app (session auto-loaded)
    AdminApp->>AdminApp: db.loadSession() → SecureStore
    AdminApp->>Admin: Dashboard displayed

    Admin->>AdminApp: Create Trip (route, vehicle, freight)
    AdminApp->>AdminApp: Google Maps APIs → coordinates, distance, tolls
    AdminApp->>AdminApp: db.createTrip() → generate tripId, driverId, driverPin, trackingId
    AdminApp->>Admin: Show: Driver ID, PIN, Tracking ID, Trip Details

    Admin->>DriverOps: Phone/WhatsApp: "Tracking ID: NBT-TRK-XY123, PIN: 583214"
    
    DriverOps->>DriverApp: Open app
    DriverApp->>DriverApp: db.init() → load session + cache
    DriverApp->>DriverOps: Login screen

    DriverOps->>DriverApp: Enter Tracking ID: NBT-TRK-XY123, PIN: 583214
    DriverApp->>DriverApp: sha256("583214") → compare driverPinHash in cache
    DriverApp->>DriverApp: Match found → session token issued → SecureStore
    DriverApp->>DriverOps: Home screen: Active trip details shown
    
    DriverOps->>DriverApp: Tap START TRIP
    DriverApp->>DriverApp: StartTripScreen: name + odometer + diesel + GPS
    DriverApp->>DriverApp: db.startTrip() → status=in_transit, GPS captured
    DriverApp->>DriverApp: SyncQueue.enqueue(START_TRIP)
    DriverApp->>DriverOps: MapScreen with live GPS tracking
    
    AdminApp->>AdminApp: 3-second poll → db.getTrips()
    AdminApp->>Admin: Live Status shows driver location, status=STARTED
```

### B.2 Expense Logging Sequence

```mermaid
sequenceDiagram
    autonumber
    participant Driver
    participant DriverApp
    participant GPSModule
    participant Camera
    participant DriverDB
    participant SyncQueue
    participant AdminDash

    Driver->>DriverApp: Tap EXPENSE
    DriverApp->>Driver: AddExpenseScreen: Category selection
    Driver->>DriverApp: Select FUEL category
    Driver->>DriverApp: Enter amount (e.g., ₹4500), liters (50)
    DriverApp->>DriverApp: Auto-calculate: ₹90/liter
    Driver->>DriverApp: Tap 📍 GIVE LOCATION
    DriverApp->>GPSModule: requestForegroundPermissionsAsync()
    GPSModule->>DriverApp: Permission granted
    DriverApp->>GPSModule: getCurrentPositionAsync() + reverseGeocodeAsync()
    GPSModule-->>DriverApp: GPS coords + address
    DriverApp->>Driver: GPS captured: "Salem Bypass, NH544"
    Driver->>DriverApp: Tap camera icon (optional)
    DriverApp->>Camera: launchCameraAsync()
    Camera-->>DriverApp: Receipt photo URI
    Driver->>DriverApp: Tap SAVE EXPENSE
    DriverApp->>DriverDB: addExpense(tripId, {category:FUEL, amount:4500, liters:50, location, receiptUri})
    DriverDB->>DriverDB: sanitizeInput() all text fields
    DriverDB->>DriverDB: Create expense: EXP-{timestamp}-{random}
    DriverDB->>SyncQueue: enqueue {type:ADD_EXPENSE, payload}
    DriverDB->>DriverDB: notify() → save to AsyncStorage
    DriverApp->>Driver: Voice: "Expense of 4500 rupees for FUEL synchronized with admin panel"
    DriverApp->>Driver: Navigate back to MapScreen
    
    AdminDash->>AdminDash: 3-second poll → expenses in trip updated
    AdminDash->>AdminDash: Live Status: expense row with GPS coords visible
```

---

*End of Enterprise Architecture Documentation*

*Document generated by comprehensive code analysis of both application codebases.*
*All findings derived directly from source code — no assumptions made.*
