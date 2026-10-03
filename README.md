# Smart Reactive Safety System for Lone Workers

An organization-aware safety monitoring application for lone workers and their IoT devices. The system receives device telemetry, keeps historical readings, shows the latest worker and device state, and opens an incident when a device reports an emergency through `sos: true`.

This repository contains both the web application and its API. It uses the Next.js App Router, React, Prisma ORM, PostgreSQL, Redis, and Tailwind CSS.

## Contents

- [Features](#features)
- [System overview](#system-overview)
- [Technology stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Local installation](#local-installation)
- [First-time application setup](#first-time-application-setup)
- [Environment variables](#environment-variables)
- [Docker services](#docker-services)
- [Google sign-in setup](#google-sign-in-setup)
- [Password-reset email setup](#password-reset-email-setup)
- [Telemetry webhook setup](#telemetry-webhook-setup)
- [Authentication and authorization](#authentication-and-authorization)
- [API overview](#api-overview)
- [Database model](#database-model)
- [Project structure](#project-structure)
- [Available commands](#available-commands)
- [Production deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)
- [Security notes](#security-notes)

## Features

- Organization and license management for `SUPERADMIN` users.
- Organization-scoped administration for `ADMIN` users.
- Worker and Worker Node registration with a one-to-one assignment.
- Device quota enforcement from each organization's license.
- Historical storage of the complete 19-field telemetry payload.
- Latest telemetry, location, dashboard, and worker monitoring views.
- Emergency incident creation from `sos: true` telemetry.
- Manual incident resolution by an authorized administrator.
- Audit logging for important application actions.
- Password login, refresh tokens, Google sign-in, and password reset by OTP.
- Responsive navigation, light/dark themes, maps, charts, and profile settings.
- Soft deletion for business records.

## System overview

### Application flow

```text
Browser
  -> Next.js pages
  -> browser service layer (src/services)
  -> Next.js route handlers (src/app/api)
  -> domain/auth helpers (src/lib)
  -> Prisma ORM
  -> PostgreSQL

Redis
  <- OTP and reset-token state
  <- revoked refresh tokens
  <- telemetry deduplication keys
```

### Telemetry flow

```text
Worker Node
  -> POST /api/webhooks/telemetry/{token}
  -> validate the complete payload
  -> resolve WorkerNode by device worker_id
  -> verify device, worker, organization, and license
  -> append a Telemetry record
  -> create or preserve an ACTIVE Incident when sos is true
```

Relay transport does not change ownership. If Node A sends through Node B, `worker_id` must still identify Node A.

### Core ownership model

```text
License 1 <-> 0..1 Organization

Organization
  |-- Users
  |-- Workers
  |     `-- WorkerNode (one-to-one assignment)
  |           `-- Telemetry history
  |-- Incidents
  `-- AuditLogs
```

## Technology stack

| Area | Technology |
| --- | --- |
| Full-stack framework | Next.js App Router |
| UI | React 19, Tailwind CSS 4, Lucide React |
| Forms | Formik and Yup |
| Browser HTTP client | Axios |
| Maps | Leaflet and React Leaflet |
| Database | PostgreSQL 17 in the supplied Compose setup |
| ORM | Prisma ORM 7 with the PostgreSQL driver adapter |
| Temporary state | Redis |
| Authentication | HMAC-signed access/refresh tokens and Google Identity Services |
| Email | Nodemailer over SMTP, with a development log driver |
| Language | JavaScript |

Exact package versions are pinned in [`package.json`](package.json) and [`package-lock.json`](package-lock.json).

## Prerequisites

Install:

- Node.js `20.9.0` or newer (required by the installed Next.js package).
- npm, included with Node.js.
- Docker Desktop or Docker Engine with Docker Compose.
- Git.

Verify them:

```bash
node --version
npm --version
docker --version
docker compose version
git --version
```

PostgreSQL and Redis may be installed manually, but the supplied Docker Compose configuration is the supported local-development path.

## Local installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd smart-reactive-safety-system
```

### 2. Install dependencies

Use the lockfile for reproducible installation:

```bash
npm ci
```

### 3. Create `.env`

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS or Linux:

```bash
cp .env.example .env
```

At minimum, replace these values:

```dotenv
POSTGRES_PASSWORD=choose-a-local-database-password
DATABASE_URL=postgresql://srss:choose-a-local-database-password@localhost:5433/srss
JWT_SECRET=replace-with-a-long-random-secret
SUPERADMIN_EMAIL=admin@example.com
SUPERADMIN_PASSWORD=replace-with-a-strong-password
TELEMETRY_WEBHOOK_SECRET=replace-with-an-independent-random-secret
```

`POSTGRES_PASSWORD` and the password inside `DATABASE_URL` must match. URL-encode reserved characters inside `DATABASE_URL`; a long alphanumeric password is simpler locally.

Generate random secrets with Node.js. Run this separately for `JWT_SECRET` and `TELEMETRY_WEBHOOK_SECRET`:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Do not reuse the database password, JWT secret, or webhook secret.

### 4. Start PostgreSQL and Redis

```bash
docker compose up -d
docker compose ps
```

| Service | Container port | Host port |
| --- | ---: | ---: |
| PostgreSQL | `5432` | `5433` |
| Redis | `6379` | `6379` |

PostgreSQL uses host port `5433` to avoid a common conflict with an existing local PostgreSQL server on `5432`.

### 5. Generate the Prisma client

```bash
npx prisma generate
```

The client is generated in `src/generated/prisma` and excluded from Git. Regenerate it after schema or Prisma changes.

### 6. Apply migrations

```bash
npx prisma migrate deploy
```

This applies committed migrations from `prisma/migrations` without creating a new migration.

### 7. Seed the initial SUPERADMIN

```bash
npm run db:seed
```

The seed reads `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` and creates the account if it is absent. It does **not** create sample licenses, organizations, admins, workers, devices, telemetry, or incidents.

The seed uses an upsert with no update operation. Changing `SUPERADMIN_PASSWORD` and running it again will not reset an existing account's password.

### 8. Run the application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the seeded credentials. The browser API URL defaults to `http://localhost:3000/api`.

## First-time application setup

After signing in as `SUPERADMIN`, configure data in this order:

1. Create a **License** with a name, device limit, start date, and end date.
2. Create an **Organization** and assign that license. A license can belong to at most one non-deleted organization.
3. Create an `ADMIN` under **User Management** and assign the organization. Passwords require at least eight characters.
4. Create a **Worker** in the organization.
5. Register a **Worker Node** for the worker. Its numeric `deviceWorkerId` must equal the device payload's `worker_id`.
6. Configure the device with the telemetry webhook URL.
7. Send a valid reading and confirm that monitoring data appears.

An organization must be active and have a currently valid license before its admins can sign in or its devices can ingest telemetry. `License.maxDevice` limits non-deleted Worker Nodes in the organization.

## Environment variables

Start with [`.env.example`](.env.example). Server secrets must never use the `NEXT_PUBLIC_` prefix.

### Database and bootstrap

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `POSTGRES_PASSWORD` | For Compose | None | PostgreSQL container password. |
| `DATABASE_URL` | Yes | None | Prisma connection string. Compose uses `postgresql://srss:<password>@localhost:5433/srss`. |
| `SUPERADMIN_EMAIL` | For seed | Example value | Initial account email. |
| `SUPERADMIN_PASSWORD` | For seed | None | Initial account password; stored as a hash. |

### Authentication and frontend

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `JWT_SECRET` | Yes | None | Long random HMAC secret for access and refresh tokens. |
| `ACCESS_TOKEN_TTL_SECONDS` | No | `900` | Access-token lifetime. |
| `REFRESH_TOKEN_TTL_SECONDS` | No | `2592000` | Refresh-token lifetime. |
| `GOOGLE_CLIENT_ID` | For Google login | Empty | Server-side ID-token audience. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | For Google login | Empty | Same Google client ID used by the browser. |
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:3000/api` | Browser-side Axios base URL, embedded during build. |
| `BUSINESS_TIME_ZONE` | No | `Asia/Jakarta` | IANA zone used for license calendar dates. |

### Redis

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `REDIS_URL` | Yes normally | `redis://localhost:6379` | Preferred Redis URL. |
| `REDIS_KEY_PREFIX` | No | `app:` | Prefix for application-owned keys. Use separate prefixes if environments share Redis. |
| `REDIS_PASSWORD` | No | Empty | Optional password; the local Compose container does not set one. |
| `REDIS_HOST` | No | `localhost` | Fallback when `REDIS_URL` is absent. |
| `REDIS_PORT` | No | `6379` | Fallback when `REDIS_URL` is absent. |

Redis stores password-reset OTPs/tokens, revoked refresh tokens, and telemetry deduplication keys. If it is unavailable, affected operations return a service-unavailable response instead of bypassing protection.

### Password reset and email

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `OTP_EXPIRY_MINUTES` | No | `15` | OTP validity. |
| `OTP_RESEND_COOLDOWN_SECONDS` | No | `60` | Delay before requesting another OTP. |
| `OTP_MAX_ATTEMPTS` | No | `5` | Maximum verification attempts. |
| `RESET_TOKEN_TTL_SECONDS` | No | `900` | One-time reset-token lifetime. |
| `MAIL_DRIVER` | No | `log` | `smtp` sends email; any other value logs the OTP. |
| `SMTP_HOST` | For SMTP | Empty | SMTP hostname. |
| `SMTP_PORT` | For SMTP | `587` | SMTP port; `465` enables an immediately secure connection. |
| `SMTP_USER` | Provider-dependent | Empty | SMTP username. |
| `SMTP_PASSWORD` | Provider-dependent | Empty | SMTP password or app password. |
| `MAIL_FROM` | For SMTP | Example value | Sender name and address. |

### Telemetry

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `TELEMETRY_WEBHOOK_SECRET` | For ingestion | None | Shared secret in the webhook URL. Empty means all requests are rejected. |
| `TELEMETRY_WEBHOOK_MAX_BATCH` | No | `500` | Maximum readings per request. |
| `TELEMETRY_DEDUPE_TTL_SECONDS` | No | `3600` | Redis dedupe lifetime for `worker_id + sequence + timestamp`. |

## Docker services

[`docker-compose.yml`](docker-compose.yml) runs development infrastructure only: PostgreSQL and Redis. It does **not** build or run the Next.js application.

```bash
# Start/update services
docker compose up -d

# Inspect status or logs
docker compose ps
docker compose logs -f postgres redis

# Stop and restart without deleting data
docker compose stop
docker compose start

# Remove containers and network, preserving the database volume
docker compose down
```

PostgreSQL data lives in the named volume `smart-reactive-safety-system-postgres-data`. `docker compose down -v` permanently deletes that local database; do not use `-v` unless intentional.

If ports `5433` or `6379` are occupied, change the relevant Compose mapping and matching URL in `.env`.

## Google sign-in setup

The browser uses Google Identity Services and sends its ID token to the server for verification. The current flow does not use a redirect/callback route.

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create/select a project and configure the OAuth consent screen.
3. Add test users if the consent screen is still in testing mode.
4. Go to **APIs & Services -> Credentials**.
5. Choose **Create credentials -> OAuth client ID -> Web application**.
6. Add `http://localhost:3000` as an **Authorized JavaScript origin**.
7. Add every production origin separately, such as `https://safety.example.com`.
8. No authorized redirect URI is required for the current button flow.
9. Put the same client ID in both variables:

```dotenv
GOOGLE_CLIENT_ID=123456789-example.apps.googleusercontent.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-example.apps.googleusercontent.com
```

Restart development after editing `.env`; rebuild production because public variables are embedded at build time.

Account behavior:

- A verified Google email matching an existing active user signs into that account with its current role/organization.
- A new email creates a passwordless `PENDING` account with no permissions. A `SUPERADMIN` must assign `SUPERADMIN`, or `ADMIN` plus an organization.
- A deactivated matching account is rejected.
- The first successful Google login records `googleLinkedAt`.
- The server verifies signature, expiry, audience, and verified-email status.

Leave both client ID variables empty to disable Google login. The button is hidden and `POST /api/auth/google` returns `503`.

## Password-reset email setup

The Redis-backed flow is:

```text
request OTP -> verify OTP -> use one-time token to set a new password
```

### Development

```dotenv
MAIL_DRIVER=log
```

The server prints the OTP:

```text
[mail:log] Password reset OTP for user@example.com: 123456 (valid 15 min)
```

Do not use this driver in production because OTPs appear in logs.

### SMTP

```dotenv
MAIL_DRIVER=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-password-or-app-password
MAIL_FROM="Lone Worker Safety <no-reply@example.com>"
```

Restart after changing these settings and ensure the provider permits the sender. Port `465` uses an immediately secure connection; `587` is commonly used for SMTP submission.

The forgot-password endpoint intentionally returns a generic response regardless of whether the email exists, reducing account enumeration risk.

## Telemetry webhook setup

### Endpoint

```text
POST /api/webhooks/telemetry/{TELEMETRY_WEBHOOK_SECRET}
```

Local example:

```text
http://localhost:3000/api/webhooks/telemetry/<your-secret>
```

No authorization header is required. The secret is in the path because the current firmware builds the target from a host and token. Use HTTPS in production and avoid logging complete webhook URLs.

`worker_id` must match a non-deleted Worker Node's numeric `deviceWorkerId`. Unknown devices are rejected, never auto-registered. The device, assigned worker, organization, and license must be operational.

### Required 19-field payload

| Code | JSON field | Type/range |
| --- | --- | --- |
| V01 | `sequence` | Float |
| V02 | `accel_y` | Float |
| V03 | `longitude` | Decimal, -180 to 180 |
| V04 | `timestamp` | Float |
| V05 | `temperature` | Float |
| V06 | `sos` | Boolean |
| V07 | `gyro_z` | Float |
| V08 | `latitude` | Decimal, -90 to 90 |
| V09 | `satellites` | Float |
| V10 | `altitude` | Float |
| V11 | `battery_percent` | Float |
| V12 | `humidity` | Float |
| V13 | `worker_id` | Float; resolves `WorkerNode.deviceWorkerId` |
| V14 | `gyro_x` | Float |
| V15 | `pressure` | Float |
| V16 | `battery_voltage` | Float |
| V17 | `accel_x` | Float |
| V18 | `accel_z` | Float |
| V19 | `gyro_y` | Float |

All fields are required. Numbers must be JSON numbers, not strings, and `sos` must be a JSON boolean.

```json
{
  "sequence": 1,
  "accel_y": 0.02,
  "longitude": 106.84513,
  "timestamp": 1727769600,
  "temperature": 29.5,
  "sos": false,
  "gyro_z": 0.1,
  "latitude": -6.21462,
  "satellites": 8,
  "altitude": 12.4,
  "battery_percent": 94,
  "humidity": 71,
  "worker_id": 1001,
  "gyro_x": 0.02,
  "pressure": 1008.2,
  "battery_voltage": 4.08,
  "accel_x": 0.01,
  "accel_z": 0.98,
  "gyro_y": 0.04
}
```

Send a single reading after replacing the secret:

```bash
curl -X POST "http://localhost:3000/api/webhooks/telemetry/replace-with-your-secret" \
  -H "Content-Type: application/json" \
  --data-binary '{"sequence":1,"accel_y":0.02,"longitude":106.84513,"timestamp":1727769600,"temperature":29.5,"sos":false,"gyro_z":0.1,"latitude":-6.21462,"satellites":8,"altitude":12.4,"battery_percent":94,"humidity":71,"worker_id":1001,"gyro_x":0.02,"pressure":1008.2,"battery_voltage":4.08,"accel_x":0.01,"accel_z":0.98,"gyro_y":0.04}'
```

The endpoint accepts:

- One telemetry object.
- An array of telemetry objects.
- `{ "data": [/* telemetry objects */] }`.
- `{ "type": "telemetry", "data": {/* one telemetry object */}, "metadata": {} }`.

Batch responses report received, accepted, duplicate, and rejected items. One rejected batch item does not discard successful items.

### Deduplication and incidents

The tuple `worker_id + sequence + timestamp` is held in Redis for `TELEMETRY_DEDUPE_TTL_SECONDS`. Repeated readings during that period are not inserted twice.

When `sos` is `true`:

- Telemetry is stored.
- A new `ACTIVE` incident is created only if the Worker Node has none.
- Repeated emergency readings preserve the same active incident.
- A later `sos: false` does not resolve it.
- An owning `ADMIN` or any `SUPERADMIN` must resolve it explicitly.

The backend does not infer whether the signal came from a manual SOS, fall detection, or another device-side trigger.

## Authentication and authorization

### Token flow

- Password/Google login returns an access token and refresh token.
- The current internal admin frontend stores them in `localStorage`.
- Axios sends `Authorization: Bearer <access-token>`.
- On expiry, the client attempts one refresh and retries the request.
- Logout revokes the refresh token in Redis.
- Password/account changes can invalidate issued tokens through `tokenVersion`.

Client route protection and hidden menu items are only UI behavior. Every protected API authenticates and enforces role and organization scope server-side.

### Roles

| Role | Access |
| --- | --- |
| `SUPERADMIN` | Global licenses, organizations, users, workers, devices, telemetry, incidents, and audit data; can act in an organization context. |
| `ADMIN` | Assigned organization only; manages workers/devices, reads monitoring/telemetry/audit data, and resolves its incidents. |
| `PENDING` | No permissions; temporary state for a new Google-authenticated account. |

A Worker is a monitored person, not an application login role.

### API responses

Success:

```json
{ "status": "success", "message": "Human-readable message", "data": {} }
```

Error:

```json
{
  "status": "error",
  "message": "Human-readable message",
  "data": { "code": "OPTIONAL_MACHINE_READABLE_CODE" }
}
```

## API overview

The browser uses `/api`. The static OpenAPI document is available at [http://localhost:3000/openapi.json](http://localhost:3000/openapi.json) while running.

| Capability | Routes |
| --- | --- |
| Authentication | `/api/auth/login`, `/google`, `/refresh`, `/logout`, `/me`, `/change-password`, `/forgot-password`, `/verify-otp`, `/reset-password` |
| Organization context | `/api/auth/switch-organization` |
| Licenses | `/api/licenses`, `/api/licenses/{id}`, options and delete-preview |
| Organizations | `/api/organizations`, `/api/organizations/{id}`, options and delete-preview |
| Users | `/api/users`, `/api/users/{id}` |
| Workers | `/api/workers`, `/api/workers/{id}`, options and delete-preview |
| Worker Nodes | `/api/worker-nodes`, `/api/worker-nodes/{id}`, delete-preview |
| Telemetry | `/api/telemetry`, `/api/telemetry/latest` |
| Device ingestion | `/api/webhooks/telemetry/{token}` |
| Monitoring | `/api/monitoring`, `/api/monitoring/{workerId}`, `/api/dashboard/summary` |
| Incidents | `/api/incidents`, `/api/incidents/{id}`, `/api/incidents/{id}/resolve` |
| Audit | `/api/audit-logs` |

Use [`public/openapi.json`](public/openapi.json) for request/response details and keep it synchronized with route changes.

## Database model

The source schema is [`prisma/schema.prisma`](prisma/schema.prisma).

| Model | Purpose |
| --- | --- |
| `License` | Valid calendar period and device limit. |
| `Organization` | Tenant boundary for admins, workers, devices, incidents, and logs. |
| `User` | `SUPERADMIN`, `ADMIN`, or transitional `PENDING` account. |
| `Worker` | Human worker with a globally unique worker code. |
| `WorkerNode` | Physical device identified by `deviceWorkerId`, assigned one-to-one to a Worker. |
| `Telemetry` | Append-oriented device history with server `receivedAt`. |
| `Incident` | Emergency record with `ACTIVE` or `RESOLVED` status. |
| `AuditLog` | Important action and metadata. |

Entity IDs are UUIDs. Business tables use `is_deleted` soft deletion. Sensor values use PostgreSQL `REAL` via Prisma `Float @db.Real`; coordinates use `Decimal(10, 7)`.

Do not edit a committed migration after it reaches a shared database. For schema development, update `schema.prisma`, create/review a new migration in development, and commit both.

```bash
npx prisma generate          # rebuild generated client
npx prisma migrate deploy    # apply committed migrations
npx prisma studio            # inspect local data
```

## Project structure

```text
.
|-- .env.example                # Environment template
|-- docker-compose.yml          # Local PostgreSQL and Redis
|-- package.json                # npm scripts and dependencies
|-- next.config.mjs             # Next.js/React Compiler configuration
|-- postcss.config.mjs          # Tailwind CSS PostCSS plugin
|-- jsconfig.json               # @/* -> ./src/* alias
|-- prisma7.config.ts           # Prisma config, migrations, seed, datasource
|-- prisma/
|   |-- schema.prisma           # Database model
|   |-- migrations/             # Versioned migrations
|   `-- seed.mjs                # Initial SUPERADMIN seed
|-- public/
|   |-- openapi.json            # API contract
|   |-- sounds/                 # Emergency alarm asset
|   `-- uploads/                # Runtime avatars; ignored by Git
|-- scripts/                    # Operational scripts
|-- src/
|   |-- app/
|   |   |-- (auth)/             # Login/password-reset pages
|   |   |-- (main)/             # Authenticated pages/layout
|   |   |-- api/                # Next.js route handlers
|   |   |-- globals.css         # Tailwind, theme tokens, global styles
|   |   |-- layout.js           # Root layout
|   |   `-- page.js             # Root entry/redirect
|   |-- components/
|   |   |-- atoms/              # Small reusable controls
|   |   |-- organisms/          # Tables, navigation, maps, panels
|   |   |-- telemetry/          # Charts, gauges, telemetry maps
|   |   `-- template/           # Feature-specific composed UI
|   |-- lib/                    # Auth, domain, validation, persistence
|   |-- services/               # Browser API service modules
|   `-- generated/prisma/       # Generated client; ignored by Git
`-- tests/                      # Existing automated checks
```

Conventions:

- Pages call application APIs through `src/services`.
- API route handlers live in `src/app/api`.
- Server authorization and organization scoping are authoritative.
- Theme variables live in `src/app/globals.css`; dark mode uses `data-theme="dark"`.
- `@/` resolves to `src/`.
- Avatars are written to `public/uploads/avatars` and are not committed.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start development. |
| `npm run build` | Create a production build. |
| `npm run start` | Run a completed production build. |
| `npm run lint` | Run ESLint. |
| `npm run db:seed` | Create the configured initial `SUPERADMIN` if absent. |
| `npx prisma generate` | Generate `src/generated/prisma`. |
| `npx prisma migrate deploy` | Apply committed migrations. |
| `npx prisma studio` | Inspect the database locally. |

## Production deployment

There is no application Dockerfile. Compose is local infrastructure only; a production host/container platform must run Next.js separately.

### Build

```bash
npm ci
npx prisma generate
npm run build
```

Set production `NEXT_PUBLIC_*` values before building; they are embedded in browser assets.

### Release sequence

1. Provision reachable PostgreSQL and Redis services.
2. Configure production variables and independent high-entropy secrets.
3. Run `npm ci` and `npx prisma generate`.
4. Apply migrations once with `npx prisma migrate deploy`.
5. Run `npm run build`.
6. Start with `npm run start`; set `PORT` if the platform requires a port other than `3000`.
7. Put the application behind HTTPS/reverse proxy or a managed load balancer.
8. Configure database backups, Redis availability, monitoring, and appropriate log retention.

Do not seed on every production start. Run it deliberately only to bootstrap the first `SUPERADMIN`.

Example service URLs:

```dotenv
DATABASE_URL=postgresql://user:password@postgres-host:5432/srss
REDIS_URL=redis://redis-host:6379
NEXT_PUBLIC_API_URL=https://safety.example.com/api
```

Inside a container, `localhost` means that container, not the database/Redis service. Use service DNS/provider URLs and TLS options required by the provider.

### Avatar persistence

Profile images are stored in `public/uploads/avatars`. Production needs a persistent writable volume and infrastructure that can serve the same files. Ephemeral or multi-instance deployments require an approved shared/object-storage design before relying on uploads.

## Troubleshooting

### PostgreSQL connection fails

```bash
docker compose ps
docker compose logs postgres
```

Check that the passwords match, host-run apps use port `5433`, and PostgreSQL has finished starting. A volume created with an old password is not changed by editing `.env`; restore the old value, change the database user's password, or intentionally recreate disposable local data.

### Redis is unavailable

```bash
docker compose ps
docker compose logs redis
docker compose up -d --no-deps --force-recreate redis
```

Confirm `REDIS_URL`. The last command is useful if an older container predates the port mapping.

### Prisma client is missing

Run `npx prisma generate`. The generated directory is deliberately ignored.

### Seed fails or credentials do not change

Confirm PostgreSQL, migrations, `DATABASE_URL`, `SUPERADMIN_EMAIL`, and `SUPERADMIN_PASSWORD`. Reseeding does not update an existing account's password.

### Google login fails

Check that both client ID variables match, the origin is authorized, the account is allowed by the consent screen, and the server was restarted. Rebuild after changing a public variable in production.

### Password-reset email does not arrive

- `MAIL_DRIVER=log` prints an OTP; it sends no email.
- For SMTP, check host, port, credentials, authorized sender, and provider app-password requirements.
- Confirm Redis is available and inspect server logs.

### Telemetry errors

- `401 WEBHOOK_UNAUTHORIZED`: secret is empty/wrong; restart after changing it.
- `404 DEVICE_NOT_REGISTERED`: register a node whose `deviceWorkerId` equals payload `worker_id`.
- Inactive/license errors: verify device, worker, organization, soft-delete state, license period, and `BUSINESS_TIME_ZONE`.
- Duplicate result: the same `worker_id`, `sequence`, and `timestamp` was already received within the dedupe TTL.

### Build runs out of memory on Windows

Close memory-intensive programs and retry. If required:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=2048'
npm run build
Remove-Item Env:NODE_OPTIONS
```

macOS/Linux equivalent:

```bash
NODE_OPTIONS=--max-old-space-size=2048 npm run build
```

## Security notes

- Never commit `.env`.
- Never expose database, JWT, SMTP, Redis, or telemetry secrets through `NEXT_PUBLIC_*`.
- Use separate secrets per environment and rotate them through a controlled process.
- Use HTTPS for browsers and telemetry in production.
- Treat the full webhook URL as a credential.
- Keep PostgreSQL and Redis off the public internet.
- Tokens currently use `localStorage`; avoid untrusted scripts and maintain a restrictive production security policy.
- Browser checks are not security boundaries; preserve backend authorization and tenant isolation.
- Back up PostgreSQL and persistent avatar storage.
- Avoid logging passwords, tokens, OTPs, full webhook URLs, or unnecessary sensitive telemetry.

## License

No software license file is currently included. Add an approved license before distributing the project outside its intended organization.
