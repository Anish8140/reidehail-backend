# Ride-Hailing Backend

Express + TypeScript + Mongoose API for Passenger and Driver apps.

## Prerequisites

- Node.js 18+
- MongoDB running locally (`mongodb://127.0.0.1:27017`) or set `MONGODB_URI`

## Setup

```bash
cd backend
npm install
```

## Run

**Development (with auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

Server runs at `http://localhost:3000`.

## Authentication

- **Method:** Bearer token (custom in-memory store; swap for JWT in production).
- **Flow:** `POST /auth/login` or `POST /auth/signup` returns `{ user, token }`. Client stores the token and sends it on every request as `Authorization: Bearer <token>`.
- **Session:** `GET /auth/session` validates the token and returns `{ user, token }` (or 401).
- **User model:** Each user has a `role`: `'passenger'` or `'driver'` (set at signup; demo logins create the correct role).

## Role-based access

- **Passenger (rider) only** – require `role === 'passenger'`:
  - `POST /ride/book`, `GET /ride/active`, `POST /ride/:id/assign`, `PATCH /ride/:id/status`, `POST /ride/:id/cancel`
  - `GET /history`, `GET /history/:id`
  - If a driver token is used: **403** `Access denied. Passenger only.`

- **Driver only** – require `role === 'driver'`:
  - All `/driver/*` routes (availability, ride-requests, accept, reject, ride/active, ride status, cancel, history)
  - `PATCH /ride/:id/driver-location` (driver updates own location)
  - If a passenger token is used: **403** `Access denied. Driver only.`

- **Public (no auth):** `POST /auth/login`, `POST /auth/signup`, `POST /ride/estimate`, `GET /health`

## Demo logins

- **Passenger:** email `root`, password `root`
- **Driver:** email `driver`, password `driver`

## API overview

- `POST /auth/login` – login (body: `{ email, password }`)
- `POST /auth/signup` – signup (body: `{ email, password, role?: 'passenger' | 'driver' }`)
- `GET /auth/session` – current session (header: `Authorization: Bearer <token>`)
- `POST /ride/estimate` – fare estimate (body: `{ pickup, dropoff }`)
- `POST /ride/book` – book ride (auth; body: `{ pickup, dropoff, fare, distanceKm, durationMinutes }`)
- `GET /ride/active` – passenger active ride (auth)
- `PATCH /ride/:id/status` – update ride status (auth)
- `POST /ride/:id/cancel` – cancel ride (auth)
- `GET /history` – passenger ride history (auth)
- `GET /history/:id` – passenger ride detail (auth)
- `GET /driver/availability` – driver online status (auth)
- `PATCH /driver/availability` – set online/offline (auth; body: `{ isOnline }`)
- `GET /driver/ride-requests` – pending ride requests (auth)
- `POST /driver/ride/:id/accept` – accept ride (auth)
- `POST /driver/ride/:id/reject` – reject ride (auth)
- `GET /driver/ride/active` – driver active ride (auth)
- `PATCH /driver/ride/:id/status` – update ride status (auth; body: `{ status }`)
- `POST /driver/ride/:id/cancel` – cancel ride (auth)
- `GET /driver/history` – driver ride history (auth)
- `GET /driver/history/:id` – driver ride detail (auth)
