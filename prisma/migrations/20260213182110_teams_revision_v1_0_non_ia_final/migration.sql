/*
  Warnings:

  - You are about to drop the column `externalEventId` on the `Meeting` table. All the data in the column will be lost.
  - You are about to drop the column `meetingLink` on the `Meeting` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Meeting` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[teamsEventId]` on the table `Meeting` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[teamsMeetingId]` on the table `Meeting` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Meeting_externalEventId_idx";

-- DropIndex
DROP INDEX "Meeting_externalEventId_key";

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "lastMeetingAt" TIMESTAMP(3),
ADD COLUMN     "meetingScheduled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Meeting" DROP COLUMN "externalEventId",
DROP COLUMN "meetingLink",
DROP COLUMN "notes",
ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "consultantNotes" TEXT,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "duration" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "leadNotes" TEXT,
ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "teamsEventId" TEXT,
ADD COLUMN     "teamsJoinUrl" TEXT,
ADD COLUMN     "teamsMeetingId" TEXT,
ADD COLUMN     "teamsThreadId" TEXT,
ALTER COLUMN "provider" SET DEFAULT 'teams';

-- CreateTable
CREATE TABLE "ConsultantAvailability" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "consultantId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotDuration" INTEGER NOT NULL DEFAULT 60,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ConsultantAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsultantAvailability_consultantId_isActive_idx" ON "ConsultantAvailability"("consultantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultantAvailability_consultantId_dayOfWeek_startTime_end_key" ON "ConsultantAvailability"("consultantId", "dayOfWeek", "startTime", "endTime");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_teamsEventId_key" ON "Meeting"("teamsEventId");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_teamsMeetingId_key" ON "Meeting"("teamsMeetingId");

-- CreateIndex
CREATE INDEX "Meeting_teamsEventId_idx" ON "Meeting"("teamsEventId");

-- AddForeignKey
ALTER TABLE "ConsultantAvailability" ADD CONSTRAINT "ConsultantAvailability_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
