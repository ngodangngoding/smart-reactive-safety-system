# Smart Reactive Safety System for Lone Worker

Next.js (App Router) + Prisma 7 + PostgreSQL + Redis. Backend in `src/app/api/**`, shared helpers in `src/lib/**`, browser API calls in `src/services/**`. Repository rules live in [AGENTS.md](AGENTS.md).

## Setup

```bash
cp .env.example .env            # then fill DATABASE_URL, JWT_SECRET, SUPERADMIN_*, TELEMETRY_WEBHOOK_SECRET
docker compose up -d            # Postgres (host port 5433) and Redis (host port 6379)
npm install
npx prisma migrate deploy
npx prisma generate
npm run db:seed                 # SUPERADMIN + a sample license, organization, ADMIN, 3 workers, 2 devices
npm run dev
```

If the Redis container already existed from before the `ports` mapping was added, recreate it: `docker compose up -d --no-deps redis`.

`npm run build` needs a few GB of free memory (the React compiler runs in a Node subprocess). If it crashes with `os error 10054` or "paging file is too small", close other apps or run `NODE_OPTIONS=--max-old-space-size=768 npm run build`.

## Environment

See [.env.example](.env.example). Highlights:

| Variable | Purpose |
|---|---|
| `REDIS_URL`, `REDIS_KEY_PREFIX` | OTP, reset tokens, revoked refresh tokens, telemetry dedupe |
| `OTP_*`, `RESET_TOKEN_TTL_SECONDS` | forgot-password limits |
| `MAIL_DRIVER` | `log` prints the OTP to the server log; `smtp` sends real email (needs `SMTP_*`, `MAIL_FROM`) |
| `GOOGLE_CLIENT_ID` | enables `POST /api/auth/google` (body `{ idToken }`, a Google Identity Services ID token). Empty = endpoint returns 503. Also set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` for the frontend button |
| `TELEMETRY_WEBHOOK_SECRET` | shared secret for device telemetry. Without it every webhook request is rejected |

## Google sign-in

Sign-in only: the Google account must use the email of an existing, active user (accounts are still created by a SUPERADMIN). Flow: the login page shows Google's button, Google returns an ID token, the page posts it to `POST /api/auth/google`, and the server verifies it with `google-auth-library` (signature, expiry, audience, verified email).

Setup:

1. Google Cloud Console > APIs & Services > Credentials > Create credentials > OAuth client ID > **Web application**.
2. Add **Authorized JavaScript origins**: `http://localhost:3000` (and your production origin). No redirect URI is needed.
3. Put the client ID in `.env`, in both variables (same value), then restart the server:
   ```
   GOOGLE_CLIENT_ID=<id>.apps.googleusercontent.com
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=<id>.apps.googleusercontent.com
   ```

Leave both empty to keep Google disabled: the login button then explains it is not configured and the endpoint answers 503. The first successful Google login stamps `googleLinkedAt` (shown in Settings > Google Account).

## Telemetry webhook

One endpoint: `POST /api/webhooks/telemetry/<TELEMETRY_WEBHOOK_SECRET>`. The secret is the last part of the URL, which is what the firmware builds (`CENTRA_HOST + CENTRA_TOKEN`), so no header is needed. Accepts one reading, an array, `{ "data": [...] }`, or the firmware envelope `{ "type": "telemetry", "data": {...}, "metadata": {...} }`. Max `TELEMETRY_WEBHOOK_MAX_BATCH` items per request. A wrong or missing secret returns 401.

```bash
curl -X POST http://localhost:3000/api/webhooks/telemetry/$TELEMETRY_WEBHOOK_SECRET \
  -H "Content-Type: application/json" \
  -d @scripts/sample-telemetry.json

curl -X POST http://localhost:3000/api/webhooks/telemetry/$TELEMETRY_WEBHOOK_SECRET \
  -H "Content-Type: application/json" \
  -d @scripts/sample-telemetry-batch.json
```

The device's `worker_id` must match a registered Worker Node's `deviceWorkerId`. Unknown devices are rejected, never auto-registered.

## Tests

`npm run test:smoke` runs the HTTP scenarios against a live server, database and Redis. Start the server with a fast OTP cooldown and its output in a file (the OTPs are read from it):

```bash
OTP_RESEND_COOLDOWN_SECONDS=2 MAIL_DRIVER=log TELEMETRY_WEBHOOK_SECRET=test-secret npm run start > /tmp/server.log 2>&1 &
SMOKE_LOG_FILE=/tmp/server.log TELEMETRY_WEBHOOK_SECRET=test-secret OTP_RESEND_COOLDOWN_SECONDS=2 \
SUPERADMIN_EMAIL=... SUPERADMIN_PASSWORD=... npm run test:smoke
```

The test creates and removes its own license, organizations, users and devices.
