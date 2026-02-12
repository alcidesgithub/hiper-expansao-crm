/*
  Warnings:

  - You are about to drop the column `avgSavingsPercent` on the `AssociationPricing` table. All the data in the column will be lost.
  - You are about to drop the column `initialFee` on the `AssociationPricing` table. All the data in the column will be lost.
  - You are about to drop the column `initialFeeDescription` on the `AssociationPricing` table. All the data in the column will be lost.
  - You are about to drop the column `purchasePercent` on the `AssociationPricing` table. All the data in the column will be lost.
  - You are about to drop the column `googleEventId` on the `Meeting` table. All the data in the column will be lost.
  - You are about to drop the column `googleMeetLink` on the `Meeting` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[externalEventId]` on the table `Meeting` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Meeting_googleEventId_idx";

-- DropIndex
DROP INDEX "Meeting_googleEventId_key";

-- AlterTable
ALTER TABLE "AssociationPricing" DROP COLUMN "avgSavingsPercent",
DROP COLUMN "initialFee",
DROP COLUMN "initialFeeDescription",
DROP COLUMN "purchasePercent";

-- AlterTable
ALTER TABLE "Meeting" DROP COLUMN "googleEventId",
DROP COLUMN "googleMeetLink",
ADD COLUMN     "externalEventId" TEXT,
ADD COLUMN     "meetingLink" TEXT,
ADD COLUMN     "provider" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_externalEventId_key" ON "Meeting"("externalEventId");

-- CreateIndex
CREATE INDEX "Meeting_externalEventId_idx" ON "Meeting"("externalEventId");
