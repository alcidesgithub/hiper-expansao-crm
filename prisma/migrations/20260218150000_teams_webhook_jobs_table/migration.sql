-- Dedicated queue table for Microsoft Teams webhook notifications.
DO $$
BEGIN
  CREATE TYPE "TeamsWebhookJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "TeamsWebhookJob" (
  "id" TEXT NOT NULL,
  "status" "TeamsWebhookJobStatus" NOT NULL DEFAULT 'PENDING',
  "notification" JSONB NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeamsWebhookJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TeamsWebhookJob_status_nextRunAt_idx"
  ON "TeamsWebhookJob" ("status", "nextRunAt");

CREATE INDEX IF NOT EXISTS "TeamsWebhookJob_status_lockedAt_idx"
  ON "TeamsWebhookJob" ("status", "lockedAt");

CREATE INDEX IF NOT EXISTS "TeamsWebhookJob_createdAt_idx"
  ON "TeamsWebhookJob" ("createdAt");
