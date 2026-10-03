-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "deletedAt" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "License" DROP COLUMN "maxMaster";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "WorkerNode" ADD COLUMN     "archivedDeviceWorkerId" REAL,
ADD COLUMN     "archivedWorkerId" UUID,
ALTER COLUMN "deviceWorkerId" DROP NOT NULL,
ALTER COLUMN "workerId" DROP NOT NULL;

