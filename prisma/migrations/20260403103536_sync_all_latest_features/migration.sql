/*
  Warnings:

  - A unique constraint covering the columns `[paymentSessionId]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Contact_userId_email_key";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "contactId" TEXT,
ADD COLUMN     "isSingleUse" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentSessionId" TEXT,
ADD COLUMN     "paymentStatus" TEXT DEFAULT 'none';

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "dodoProductId" TEXT;

-- AlterTable
ALTER TABLE "RoutingRule" ADD COLUMN     "conditions" JSONB,
ADD COLUMN     "logicType" TEXT NOT NULL DEFAULT 'AND';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dodoApiKey" TEXT,
ADD COLUMN     "dodoWebhookSecret" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_paymentSessionId_key" ON "Booking"("paymentSessionId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
