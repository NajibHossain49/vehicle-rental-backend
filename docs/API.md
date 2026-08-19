# Vehicle Rental Management — API Reference

Complete REST API documentation for the Vehicle Rental Management backend.

| | |
|---|---|
| **Base URL** | `http://localhost:3000` |
| **Format** | JSON (`application/json`) unless noted |
| **Auth** | JWT Bearer token on every route except login |
| **Dates** | `YYYY-MM-DD` |

---

## Contents

1. [Authentication](#1-authentication)
2. [Common conventions](#2-common-conventions)
3. [Auth](#3-auth)
4. [Vehicles](#4-vehicles)
5. [Rentals](#5-rentals)
6. [Reports](#6-reports)
7. [Static uploads](#7-static-uploads)
8. [Error catalog](#8-error-catalog)
9. [Business rules](#9-business-rules)
10. [Seed data](#10-seed-data)

---

## 1. Authentication

1. Call `POST /auth/login` with staff email and password.
2. Copy `token` from the response.
3. Send it on later requests:

```http
Authorization: Bearer <token>
```

Missing, malformed, or expired tokens return **401**.

Token lifetime comes from `JWT_EXPIRES_IN` (default `1d`).

---

## 2. Common conventions

### Pagination

List endpoints accept:

| Query | Default | Notes |
|---|---|---|
| `page` | `1` | Positive integer |
| `limit` | `10` | Capped at `100` |

List responses look like:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 0
  }
}
```

### Validation errors

```json
{
  "message": "Validation failed",
  "errors": ["\"email\" must be a valid email"]
}
```

Status: **400**.

### IDs

`:id` must be a positive integer. Invalid IDs return **400** (`Invalid vehicle ID` / `Invalid rental ID`).

---

## 3. Auth

### `POST /auth/login`

Public. Returns a JWT for staff.

**Body**

| Field | Type | Required | Rules |
|---|---|---|---|
| `email` | string | Yes | Valid email (trimmed, lowercased) |
| `password` | string | Yes | Non-empty |

**Success — 200**

```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@rental.com",
    "name": "Admin User"
  }
}
```

| Status | When |
|---|---|
| 400 | Invalid email or missing password |
| 401 | Wrong email or password |

**Example**

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rental.com","password":"Password123!"}'
```

---

## 4. Vehicles

All vehicle routes require a Bearer token. Soft-deleted vehicles (`deleted_at` set) are hidden from list and get-by-id.

### Vehicle object

| Field | Type | Notes |
|---|---|---|
| `id` | number | Auto-increment |
| `name` | string | |
| `plate_number` | string | Unique |
| `category` | string | e.g. `sedan`, `suv`, `bike` |
| `daily_rate` | number | Stored as `decimal(10,2)` |
| `photo_path` | string \| null | Public path, e.g. `/uploads/1724….jpg` |
| `deleted_at` | string \| null | Soft-delete timestamp |
| `created_at` | string | |
| `updated_at` | string | |

### `GET /vehicles`

List active vehicles.

| Query | Required | Description |
|---|---|---|
| `page` | No | Page number |
| `limit` | No | Page size |
| `category` | No | Exact match, case-insensitive |
| `search` | No | Case-insensitive name contains |

**Success — 200**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Toyota Camry",
      "plate_number": "ABC-1234",
      "category": "sedan",
      "daily_rate": 45,
      "photo_path": null,
      "deleted_at": null,
      "created_at": "2026-08-19T05:57:40.723Z",
      "updated_at": "2026-08-19T05:57:40.723Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "totalPages": 1
  }
}
```

```bash
curl "http://localhost:3000/vehicles?page=1&limit=10&category=sedan&search=Camry" \
  -H "Authorization: Bearer <token>"
```

### `GET /vehicles/:id`

**Success — 200**

```json
{
  "data": {
    "id": 1,
    "name": "Toyota Camry",
    "plate_number": "ABC-1234",
    "category": "sedan",
    "daily_rate": 45,
    "photo_path": null,
    "deleted_at": null,
    "created_at": "2026-08-19T05:57:40.723Z",
    "updated_at": "2026-08-19T05:57:40.723Z"
  }
}
```

| Status | When |
|---|---|
| 400 | Invalid id |
| 404 | Missing or soft-deleted |

### `POST /vehicles`

`multipart/form-data`. Photo field name: `photo`.

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | Yes | 1–255 chars |
| `plate_number` | string | Yes | 1–50 chars, unique |
| `category` | string | Yes | 1–100 chars |
| `daily_rate` | number | Yes | Positive |
| `photo` | file | No | JPEG, PNG, or WebP, max 5MB |

**Success — 201**

```json
{
  "message": "Vehicle created",
  "data": {
    "id": 3,
    "name": "Nissan Sunny",
    "plate_number": "DHA-2291",
    "category": "sedan",
    "daily_rate": 38,
    "photo_path": "/uploads/1724059200123-ab12cd34.jpg",
    "deleted_at": null,
    "created_at": "2026-08-19T12:00:00.000Z",
    "updated_at": "2026-08-19T12:00:00.000Z"
  }
}
```

| Status | When |
|---|---|
| 400 | Validation failed, bad file type, or file larger than 5MB |
| 409 | Plate number already exists |

```bash
curl -X POST http://localhost:3000/vehicles \
  -H "Authorization: Bearer <token>" \
  -F "name=Nissan Sunny" \
  -F "plate_number=DHA-2291" \
  -F "category=sedan" \
  -F "daily_rate=38" \
  -F "photo=@./car.png"
```

### `PUT /vehicles/:id`

Same `multipart/form-data` fields as create; every field is optional. Sending a new `photo` replaces the previous file.

**Success — 200** — `{ "message": "Vehicle updated", "data": { ... } }`

| Status | When |
|---|---|
| 400 | Validation / file error |
| 404 | Vehicle not found or already deleted |
| 409 | Plate number already exists |

### `DELETE /vehicles/:id`

Soft delete: sets `deleted_at`. The row stays for rental history.

**Success — 200**

```json
{ "message": "Vehicle deleted" }
```

---

## 5. Rentals

All rental routes require a Bearer token.

`total_amount` is **never** taken from the client. The server computes:

```text
days = (end_date − start_date) + 1   // same calendar day = 1
total_amount = daily_rate × days
```

### Rental object

| Field | Type | Notes |
|---|---|---|
| `id` | number | |
| `vehicle_id` | number | FK → vehicles |
| `customer_name` | string | |
| `customer_phone` | string | |
| `start_date` | string | `YYYY-MM-DD` |
| `end_date` | string | `YYYY-MM-DD` |
| `total_amount` | number | Server-calculated |
| `status` | string | `booked` \| `ongoing` \| `completed` \| `cancelled` |
| `created_at` | string | |
| `updated_at` | string | |
| `vehicle` | object | Present on get-by-id and create/update responses |

`vehicle` (when included): `id`, `name`, `plate_number`, `category`, `daily_rate`, `photo_path`.

### `GET /rentals`

| Query | Required | Description |
|---|---|---|
| `page` | No | Page number |
| `limit` | No | Page size |
| `vehicle_id` | No | Exact vehicle |
| `status` | No | `booked`, `ongoing`, `completed`, or `cancelled` |
| `start_date` | No | Keep rentals with `start_date >=` this date |
| `end_date` | No | Keep rentals with `end_date <=` this date |

`start_date` + `end_date` together mean “fully inside this window”, not “overlaps this window”.

**Success — 200** — paginated list (`data` + `pagination`). List items do not embed `vehicle`.

```bash
curl "http://localhost:3000/rentals?page=1&limit=10&status=booked&start_date=2026-09-01&end_date=2026-09-30" \
  -H "Authorization: Bearer <token>"
```

### `GET /rentals/:id`

**Success — 200**

```json
{
  "data": {
    "id": 4,
    "vehicle_id": 3,
    "customer_name": "Farhan Ahmed",
    "customer_phone": "+8801711002200",
    "start_date": "2026-09-01",
    "end_date": "2026-09-04",
    "total_amount": 152,
    "status": "booked",
    "created_at": "2026-08-19T12:10:00.000Z",
    "updated_at": "2026-08-19T12:10:00.000Z",
    "vehicle": {
      "id": 3,
      "name": "Nissan Sunny",
      "plate_number": "DHA-2291",
      "category": "sedan",
      "daily_rate": 38,
      "photo_path": "/uploads/1724059200123-ab12cd34.jpg"
    }
  }
}
```

| Status | When |
|---|---|
| 400 | Invalid id |
| 404 | Rental not found |

### `POST /rentals`

**Body**

| Field | Type | Required | Rules |
|---|---|---|---|
| `vehicle_id` | number | Yes | Must be an active vehicle |
| `customer_name` | string | Yes | 1–255 chars |
| `customer_phone` | string | Yes | 3–30 chars |
| `start_date` | string | Yes | `YYYY-MM-DD` |
| `end_date` | string | Yes | `YYYY-MM-DD`, on or after `start_date` |
| `status` | string | No | Default `booked` |

Runs inside a Knex transaction and locks the vehicle row. If another **active** rental (`booked` or `ongoing`) overlaps, the API returns **409**.

**Success — 201** — `{ "message": "Rental created", "data": { ... } }` including `vehicle`.

| Status | When |
|---|---|
| 400 | Validation failed, or `end_date` before `start_date` |
| 404 | Vehicle missing or soft-deleted |
| 409 | `"Vehicle is already booked for the selected dates"` |

```bash
curl -X POST http://localhost:3000/rentals \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_id": 3,
    "customer_name": "Farhan Ahmed",
    "customer_phone": "+8801711002200",
    "start_date": "2026-09-01",
    "end_date": "2026-09-04"
  }'
```

### `PUT /rentals/:id`

Any subset of the create fields. At least one field is required.

If the resulting status is `booked` or `ongoing`, overlap is checked again (this rental is excluded). Changing dates or `vehicle_id` recalculates `total_amount`.

**Success — 200** — `{ "message": "Rental updated", "data": { ... } }`

| Status | When |
|---|---|
| 400 | Validation, or resulting `end_date` before `start_date` |
| 404 | Rental not found |
| 409 | Overlap with another active rental |

### `DELETE /rentals/:id`

Cancels the rental (`status = cancelled`). The row is kept so reports and history stay intact. Already-cancelled rentals still return 200.

**Success — 200**

```json
{ "message": "Rental cancelled" }
```

---

## 6. Reports

### `GET /reports/rentals`

Requires a Bearer token.

| Query | Required | Description |
|---|---|---|
| `month` | No | `YYYY-MM`. Defaults to the current calendar month |
| `vehicle_id` | No | Limit the report to one vehicle |

Only rentals that **intersect** the month are counted. Cancelled rentals are excluded.

Days and revenue use only the slice inside that month:

```text
overlap_start = GREATEST(rental.start_date, month_start)
overlap_end   = LEAST(rental.end_date, month_end)
days_in_month = overlap_end − overlap_start + 1
revenue       = daily_rate × days_in_month
```

**Success — 200**

```json
{
  "month": "2026-08",
  "vehicles": [
    {
      "id": 2,
      "name": "Honda CR-V",
      "total_bookings": 1,
      "days_rented": 5,
      "revenue": 325
    },
    {
      "id": 1,
      "name": "Toyota Camry",
      "total_bookings": 2,
      "days_rented": 6,
      "revenue": 270
    }
  ],
  "highest_revenue_vehicle": {
    "id": 2,
    "name": "Honda CR-V",
    "total_bookings": 1,
    "days_rented": 5,
    "revenue": 325
  }
}
```

`highest_revenue_vehicle` is the first row after sorting by revenue descending (then name). It is `null` when there is no activity.

| Status | When |
|---|---|
| 400 | `month` is not `YYYY-MM` (e.g. `2026-13`) |

```bash
curl "http://localhost:3000/reports/rentals?month=2026-08" \
  -H "Authorization: Bearer <token>"
```

Seeded cross-month rental `2026-07-28` → `2026-08-03` at $45/day:

| Month | Days counted | Revenue |
|---|---|---|
| 2026-07 | Jul 28–31 (4) | 180.00 |
| 2026-08 | Aug 1–3 (3) | 135.00 |

---

## 7. Static uploads

Uploaded photos are served without auth:

```text
GET /uploads/<filename>
```

Example: `http://localhost:3000/uploads/1724059200123-ab12cd34.jpg`

The stored `photo_path` is already this URL path.

---

## 8. Error catalog

| Status | Typical `message` | Where |
|---|---|---|
| 400 | `Validation failed` | Invalid body / query |
| 400 | `Invalid vehicle ID` / `Invalid rental ID` | Bad `:id` |
| 400 | `Image must be 5MB or smaller` | Multer size limit |
| 400 | `Only JPEG, PNG, and WebP images are allowed` | Bad photo type |
| 400 | `month must be in YYYY-MM format` | Reports |
| 400 | `end_date must be on or after start_date` | Rentals |
| 401 | `Authorization token missing` | No Bearer header |
| 401 | `Invalid or expired token` | Bad JWT |
| 401 | `Invalid email or password` | Login |
| 404 | `Vehicle not found` / `Rental not found` | Missing resource |
| 409 | `Plate number already exists` | Vehicles |
| 409 | `Vehicle is already booked for the selected dates` | Rentals |
| 500 | `Internal server error` | Unexpected failure |

---

## 9. Business rules

### Overlap prevention

Two rentals conflict only when **both** are active (`booked` or `ongoing`) **and** their dates overlap:

```text
new.start_date <= existing.end_date
AND new.end_date   >= existing.start_date
```

Completed and cancelled bookings do not block new ones.

Create and update run this check in a transaction. Create also uses `SELECT … FOR UPDATE` on the vehicle so two simultaneous bookings cannot both succeed.

### Soft delete vs cancel

| Action | Effect |
|---|---|
| `DELETE /vehicles/:id` | Sets `deleted_at`. Vehicle disappears from inventory APIs. |
| `DELETE /rentals/:id` | Sets `status` to `cancelled`. Row remains for history and reports. |

---

## 10. Seed data

After `npm run seed:run`:

**Staff** (password for both: `Password123!`)

| Email | Name |
|---|---|
| `admin@rental.com` | Admin User |
| `manager@rental.com` | Fleet Manager |

**Vehicles**

| ID | Name | Plate | Category | Rate | Notes |
|---|---|---|---|---|---|
| 1 | Toyota Camry | `ABC-1234` | sedan | 45.00 | |
| 2 | Honda CR-V | `XYZ-5678` | suv | 65.00 | |
| 3 | Nissan Sunny | `DHA-2291` | sedan | 38.00 | |
| 4 | Yamaha FZ-X | `CTG-7744` | bike | 22.50 | |
| 5 | Toyota Hiace | `KHL-1102` | van | 90.00 | |
| 6 | Suzuki Alto | `RAJ-3001` | sedan | 25.00 | Soft-deleted (hidden from `GET /vehicles`) |

**Rentals**

| ID | Vehicle | Customer | Dates | Amount | Status |
|---|---|---|---|---|---|
| 1 | Camry | John Doe | 2026-07-28 → 2026-08-03 | 315.00 | completed (month boundary) |
| 2 | Camry | Laila Rahman | 2026-06-01 → 2026-06-03 | 135.00 | completed |
| 3 | Camry | Robert Chen | 2026-08-25 → 2026-08-27 | 135.00 | booked |
| 4 | Camry | Arif Khan | 2026-08-10 → 2026-08-11 | 90.00 | cancelled |
| 5 | CR-V | Jane Smith | 2026-08-18 → 2026-08-22 | 325.00 | ongoing |
| 6 | CR-V | Imran Hossain | 2026-07-05 → 2026-07-07 | 195.00 | completed |
| 7 | CR-V | Nadia Akter | 2026-09-01 → 2026-09-03 | 195.00 | booked |
| 8 | Sunny | Farhan Ahmed | 2026-09-01 → 2026-09-04 | 152.00 | booked |
| 9 | Sunny | Nabila Chowdhury | 2026-07-10 → 2026-07-12 | 114.00 | completed |
| 10 | Yamaha | Tahmid Hasan | 2026-08-08 → 2026-08-09 | 45.00 | completed |
| 11 | Yamaha | Rafiul Islam | 2026-09-20 → 2026-09-21 | 45.00 | booked |
| 12 | Hiace | Bengal Tours Ltd | 2026-08-01 → 2026-08-05 | 450.00 | completed |
| 13 | Hiace | Summit Logistics | 2026-09-15 → 2026-09-18 | 360.00 | booked |

Active bookings that block new ones: Camry Aug 25–27, CR-V Aug 18–22, CR-V Sep 1–3, Sunny Sep 1–4, Yamaha Sep 20–21, Hiace Sep 15–18. Cancelled and completed do not block. August report should list Hiace as `highest_revenue_vehicle` (450).

For a ready-made request set, import [Postman_Collection/Vehicle-Rental-API.postman_collection.json](../Postman_Collection/Vehicle-Rental-API.postman_collection.json). Run **Auth → Login (success)** first so the collection stores `token`.
