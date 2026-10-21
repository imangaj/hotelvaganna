import { prisma } from "../db";
import { BookingEmailPayload, sendBookingEmail } from "./mailer";

let busy = false;
export const processBookingEmailQueue = async (): Promise<void> => {
  if (busy) return;
  busy = true;
  try {
    const now = new Date();
    const jobs = await prisma.bookingEmailDelivery.findMany({
      where: { sentAt: null, nextAttempt: { lte: now }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] },
      orderBy: { id: "asc" }, take: 10,
    });
    for (const job of jobs) {
      const claimTime = new Date();
      const claimed = await prisma.bookingEmailDelivery.updateMany({
        where: { id: job.id, sentAt: null, OR: [{ leaseUntil: null }, { leaseUntil: { lt: claimTime } }] },
        data: { leaseUntil: new Date(Date.now() + 5 * 60000), attempts: { increment: 1 } },
      });
      if (!claimed.count) continue;
      try {
        const raw = JSON.parse(job.payloadJson);
        const payload: BookingEmailPayload = { ...raw, checkInDate: new Date(raw.checkInDate), checkOutDate: new Date(raw.checkOutDate) };
        const providerMessageId = await sendBookingEmail(payload, job.recipientType === "HOTEL" ? "HOTEL" : "GUEST", "booking-delivery-" + job.id);
        await prisma.bookingEmailDelivery.update({ where: { id: job.id }, data: { sentAt: new Date(), leaseUntil: null, lastError: null, providerMessageId } });
      } catch (error: any) {
        const code = typeof error.code === "string" && /^[A-Z0-9_]+$/.test(error.code) ? error.code : "DELIVERY_FAILED";
        const delay = Math.min(3600000, 30000 * Math.pow(2, Math.min(job.attempts, 7)));
        await prisma.bookingEmailDelivery.update({ where: { id: job.id }, data: { leaseUntil: null, lastError: code, nextAttempt: new Date(Date.now() + delay) } });
        console.error("Booking email pending", { deliveryId: job.id, bookingId: job.bookingId, recipientType: job.recipientType, code });
      }
    }
  } catch {
    console.error("Booking email queue unavailable. Confirm database migration has been applied.");
  } finally { busy = false; }
};

export const startBookingEmailWorker = (): void => {
  void processBookingEmailQueue();
  const timer = setInterval(() => void processBookingEmailQueue(), 30000);
  timer.unref();
};
