-- Device (WorkerNode) credentials for the web app's DEVICE sign-in. Both columns are additive:
-- existing nodes keep working through the telemetry webhook and simply have no password until one is set.
ALTER TABLE "WorkerNode" ADD COLUMN "passwordHash" TEXT,
ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
