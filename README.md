# Logistics Management System (New Balaji Transports)

This is a comprehensive logistics fleet management system comprising three synchronized parts powered by a unified Supabase Realtime backend.

## Architecture Overview

The system consists of three separate applications that must run simultaneously for full functionality:

1. **Admin Backend Server (`admin-backend`)**
   - A Node.js Express server running securely on `localhost:3001`.
   - Purpose: Holds the Supabase Service Role Key securely to handle privileged operations like creating new Driver authentication accounts.
   
2. **Admin Web Dashboard (`NBT-main/NBT-main`)**
   - A React web application powered by Vite running on `localhost:5173`.
   - Purpose: The control center for admins to create trips, manage vehicles, track expenses, and oversee drivers in real-time.

3. **Driver Mobile App (`DRIVER APP`)**
   - A React Native mobile application powered by Expo.
   - Purpose: The mobile interface for truck drivers to view assigned trips, upload delivery photos, log expenses, and update their location.

---

## Prerequisites

Before running the applications, ensure you have the following installed on your machine:
- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)
- **Supabase Account** with an active project (Database, Auth, and Storage enabled).
- **Expo Go app** on your iOS/Android device (if you want to test the mobile app on a real phone).

## Environment Setup

You must ensure that your Supabase credentials (`URL` and `ANON_KEY`) are present in the environment files for both frontend apps, and the `SERVICE_ROLE_KEY` is present in the backend.

- `NBT-main/NBT-main/.env`: Requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- `DRIVER APP/.env.local`: Requires `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `admin-backend/.env`: Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

*(Note: Never expose the `SERVICE_ROLE_KEY` in the React or Expo environment files!)*

---

## How to Run the Applications

To spin up the entire system, you will need to open **three separate terminal windows**.

### Step 1: Start the Admin Backend Server
Open your first terminal and run:
```bash
cd "admin-backend"
npm install
node index.js
```
*You should see a message saying: `Server running on port 3001`*

### Step 2: Start the Admin Web Dashboard
Open a second terminal and run:
```bash
cd "NBT-main/NBT-main"
npm install
npm run dev
```
*You can now open your browser and navigate to `http://localhost:5173` to access the Admin Panel.*

### Step 3: Start the Driver Mobile App
Open a third terminal and run:
```bash
cd "DRIVER APP"
npm install
npx expo start
```
*A QR code will appear in your terminal. You can scan this QR code using the **Expo Go** app on your phone, or press `a` to run it on an Android emulator, or `i` to run it on an iOS simulator.*

---

## Testing the Realtime Sync

1. Go to the Admin Dashboard (`http://localhost:5173`).
2. Navigate to **Driver Management** and create a new driver (e.g., Driver ID: `1001`, PIN: `123456`).
3. Navigate to **Vehicles** and add a test vehicle.
4. Navigate to **Trips** and create a new trip, assigning it to Driver ID `1001`.
5. Open the Driver Mobile App and log in with ID `1001` and PIN `123456`.
6. You will instantly see the assigned trip. When you press "Start Trip" on the mobile app, you will immediately see the trip status change on the Admin Dashboard without refreshing the page!

## Troubleshooting

- **Admin panel says "Network Error" when creating a driver:** Ensure Step 1 (`node index.js` in `admin-backend`) is actively running on port 3001.
- **Mobile app isn't syncing trips:** Ensure the Supabase Realtime functionality is enabled for your `trips` and `expenses` tables in the Supabase Dashboard under Database -> Publications.
