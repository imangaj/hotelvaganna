// Explicitly requeue failed/pending mail for one existing booking, never every historical booking.
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { processBookingEmailQueue } = require("../dist/utils/bookingEmailQueue");
const id = Number(process.argv[2]);
if (!Number.isInteger(id) || id < 1) { console.error("Usage: node scripts/retry-booking-mail.cjs BOOKING_ID"); process.exit(1); }
(async () => {
  const prisma = new PrismaClient();
  try {
    const result = await prisma.bookingEmailDelivery.updateMany({
      where: { bookingId: id, sentAt: null, OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] },
      data: { nextAttempt: new Date() },
    });
    console.log("Pending delivery jobs scheduled:", result.count);
    await processBookingEmailQueue();
  } finally { await prisma.$disconnect(); }
})().catch(() => { console.error("Unable to retry booking emails"); process.exitCode = 1; });
