ALTER TABLE "bookings" ADD COLUMN "checkoutKey" TEXT;
CREATE UNIQUE INDEX "bookings_checkoutKey_key" ON "bookings"("checkoutKey");
CREATE TABLE "booking_email_deliveries" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "bookingId" INTEGER NOT NULL,
  "recipientType" TEXT NOT NULL,
  "recipientEmail" TEXT NOT NULL,
  "payloadJson" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttempt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseUntil" DATETIME,
  "sentAt" DATETIME,
  "providerMessageId" TEXT,
  "lastError" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "booking_email_deliveries_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "booking_email_deliveries_bookingId_recipientType_key" ON "booking_email_deliveries"("bookingId", "recipientType");
CREATE INDEX "booking_email_deliveries_sentAt_nextAttempt_idx" ON "booking_email_deliveries"("sentAt", "nextAttempt");
