-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "licenseId" UUID;

-- CreateTable
CREATE TABLE "License" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "maxMaster" INTEGER NOT NULL,
    "maxDevice" INTEGER NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
