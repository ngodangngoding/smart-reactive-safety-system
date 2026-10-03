-- License validity period: calendar dates (DATE, no timezone), required.
-- Staged so existing rows survive: add nullable, backfill, then enforce NOT NULL.
ALTER TABLE "License" ADD COLUMN "startDate" DATE,
ADD COLUMN "endDate" DATE;

-- Legacy licenses start on their creation date and stay valid for at least one year from this migration,
-- so no organization is locked out by the rollout. A SUPERADMIN can edit the dates afterwards.
UPDATE "License"
SET "startDate" = "createdAt"::date,
    "endDate" = GREATEST("createdAt"::date + 365, CURRENT_DATE + 365);

ALTER TABLE "License" ALTER COLUMN "startDate" SET NOT NULL,
ALTER COLUMN "endDate" SET NOT NULL;
