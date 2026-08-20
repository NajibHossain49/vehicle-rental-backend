# Vehicle Rental Management API

REST API for staff authentication, vehicle inventory (with photo uploads), rental booking with date-overlap prevention, and monthly revenue reports.

## Tech Stack

- **Runtime:** Node.js
- **Language:** TypeScript
- **Framework:** Express 5
- **Database:** PostgreSQL
- **Query builder:** Knex
- **Auth:** JWT + bcrypt
- **Validation:** Joi
- **Uploads:** Multer (JPEG, PNG, WebP)

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/NajibHossain49/vehicle-rental-backend.git
cd vehicle-rental-backend
```

SSH:

```bash
git clone git@github.com:NajibHossain49/vehicle-rental-backend.git
cd vehicle-rental-backend
```

All later commands run from this project folder.

### 2. Create the database

```sql
CREATE DATABASE vehicle_rental;
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment

Copy `.env.example` to `.env` and fill in the values. The app reads them through `src/config/env.ts` (required variables are validated at startup):

```bash
cp .env.example .env
```

| Variable | Description | Example |
|---|---|---|
| `PORT` | HTTP port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `postgres` |
| `DB_NAME` | Database name | `vehicle_rental` |
| `DB_POOL_MIN` | Knex pool minimum connections | `2` |
| `DB_POOL_MAX` | Knex pool maximum connections | `10` |
| `JWT_SECRET` | Secret used to sign tokens | long random string |
| `JWT_EXPIRES_IN` | Token lifetime | `1d` |
| `UPLOAD_PATH` | Local folder for vehicle photos | `./uploads` |

### 5. Run migrations and seeds

```bash
npm run migrate:latest
npm run seed:run
```

Seeded staff login (password for both: `Password123!`):

- `admin@rental.com`
- `manager@rental.com`

The seed inserts 6 vehicles (one soft-deleted), 13 rentals across all statuses, and a month-boundary booking (`2026-07-28` to `2026-08-03`). Full table: [docs/API.md](./docs/API.md#10-seed-data).

## Run the server

Development (watch mode):

```bash
npm run dev
```

Production:

```bash
npm run build
npm start
```

Lint:

```bash
npm run lint
```

The API listens on `http://localhost:3000` by default. Uploaded images are served from `/uploads/<filename>`.

## Docker

Needs Docker Engine and a local `.env` (copy from `.env.example`). Compose starts PostgreSQL and the API. `DB_HOST` is set to `db` inside the network, so do not point the container at `localhost`.

```bash
cp .env.example .env
docker compose up --build
```

The API container runs `migrate:latest` on startup, then `node dist/server.js`. Seed is manual:

```bash
docker compose exec api npm run seed:run
```

Stop:

```bash
docker compose down
```

To drop the database volume as well: `docker compose down -v`.

## API Documentation

Full request/response reference, status codes, and examples: **[docs/API.md](./docs/API.md)**.

All routes except `POST /auth/login` require:

```http
Authorization: Bearer <token>
```

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | No | Authenticate staff and return a JWT |
| GET | `/vehicles` | Yes | List vehicles (`page`, `limit`, `category`, `search`). Soft-deleted rows are excluded |
| GET | `/vehicles/:id` | Yes | Get one active vehicle |
| POST | `/vehicles` | Yes | Create a vehicle (`multipart/form-data`, optional `photo`) |
| PUT | `/vehicles/:id` | Yes | Update a vehicle and optionally replace its photo |
| DELETE | `/vehicles/:id` | Yes | Soft-delete (`deleted_at` is set) |
| GET | `/rentals` | Yes | List rentals (`page`, `limit`, `vehicle_id`, `status`, `start_date`, `end_date`) |
| GET | `/rentals/:id` | Yes | Get a rental with vehicle details |
| POST | `/rentals` | Yes | Create a rental (overlap check + server-side total) |
| PUT | `/rentals/:id` | Yes | Update a rental (overlap re-checked if dates/vehicle change) |
| DELETE | `/rentals/:id` | Yes | Cancel a rental (`status = cancelled`) |
| GET | `/reports/rentals` | Yes | Monthly per-vehicle report (`month=YYYY-MM`, optional `vehicle_id`) |

### Auth

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rental.com","password":"Password123!"}'
```

### Create a vehicle

```bash
curl -X POST http://localhost:3000/vehicles \
  -H "Authorization: Bearer <token>" \
  -F "name=Mazda CX-5" \
  -F "plate_number=DEF-9012" \
  -F "category=suv" \
  -F "daily_rate=70" \
  -F "photo=@./car.png"
```

### Create a rental

```bash
curl -X POST http://localhost:3000/rentals \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"vehicle_id":1,"customer_name":"Alex Rahman","customer_phone":"+15551234009","start_date":"2026-08-10","end_date":"2026-08-12"}'
```

`total_amount` is calculated on the server. Same calendar day counts as 1 day: `daily_rate × days`.

### Monthly report

```bash
curl "http://localhost:3000/reports/rentals?month=2026-08" \
  -H "Authorization: Bearer <token>"
```

`month` defaults to the current calendar month if omitted.

## Overlap Prevention

A vehicle cannot have two **active** rentals (`booked` or `ongoing`) on overlapping dates. Completed and cancelled rentals are ignored.

Two date ranges overlap when:

```text
new.start_date <= existing.end_date
AND new.end_date   >= existing.start_date
```

`createRental` runs this check inside a Knex transaction and locks the vehicle row (`FOR UPDATE`) so two concurrent bookings cannot slip through. If an overlap exists, the API returns **409 Conflict**.

`updateRental` repeats the same check, excluding the rental being edited, whenever the resulting status is still `booked` or `ongoing`.

## Monthly Report Query

The report counts only the days of each rental that fall **inside** the requested month:

```text
overlap_start = GREATEST(rental.start_date, month_start)
overlap_end   = LEAST(rental.end_date, month_end)
days_in_month = overlap_end - overlap_start + 1
```

Rentals that do not intersect the month are excluded. Cancelled rentals are excluded.

Per vehicle:

- **total_bookings** — number of intersecting rentals
- **days_rented** — sum of `days_in_month`
- **revenue** — sum of `daily_rate × days_in_month`

The vehicle with the highest revenue is returned as `highest_revenue_vehicle`.

This is why the seed includes a rental from **2026-07-28 to 2026-08-03**:

| Month | Days counted | Revenue at $45/day |
|---|---|---|
| 2026-07 | Jul 28–31 (4 days) | 180.00 |
| 2026-08 | Aug 1–3 (3 days) | 135.00 |

## Documentation status

| Document | Status | Notes |
|---|---|---|
| [docs/API.md](./docs/API.md) | Complete | Full API reference: auth, vehicles, rentals, reports, errors, overlap, and seed data |
| [README.md](./README.md) | Complete | Setup, env, migrate/seed, and run instructions |
| [Postman collection](./Postman_Collection/Vehicle-Rental-API.postman_collection.json) | Ready | Import into Postman; run Login first to save `token` |
| [Dockerfile](./Dockerfile) / [docker-compose.yml](./docker-compose.yml) | Ready | API + PostgreSQL; `docker compose up --build` |
