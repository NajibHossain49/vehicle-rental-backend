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

### 1. Create the database

```sql
CREATE DATABASE vehicle_rental;
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy `.env.example` to `.env` and fill in the values:

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
| `JWT_SECRET` | Secret used to sign tokens | long random string |
| `JWT_EXPIRES_IN` | Token lifetime | `1d` |
| `UPLOAD_PATH` | Local folder for vehicle photos | `./uploads` |

### 4. Run migrations and seeds

```bash
npm run migrate:latest
npm run seed:run
```

Seeded staff login:

- **Email:** `admin@rental.com`
- **Password:** `Password123!`

The seed also inserts two vehicles and three rentals, including one booking that crosses a month boundary (`2026-07-28` to `2026-08-03`) so the monthly report can be tested.

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

The API listens on `http://localhost:3000` by default. Uploaded images are served from `/uploads/<filename>`.

## API Documentation

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
