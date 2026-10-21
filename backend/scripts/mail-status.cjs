// Run inside the backend container. Prints no passwords, API keys, or guest payloads.
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const nodemailer = require("nodemailer");
(async () => {
  const provider = process.env.MAIL_PROVIDER || (process.env.RESEND_API_KEY ? "resend" : "smtp");
  console.log(JSON.stringify({
    provider, sender: process.env.MAIL_FROM || process.env.SMTP_FROM || null,
    hotelRecipient: process.env.BOOKING_NOTIFICATION_EMAIL || "hotel.valganna@libero.it",
    hasApiKey: Boolean(process.env.RESEND_API_KEY), hasSmtpPassword: Boolean(process.env.SMTP_PASS),
  }));
  if (provider === "smtp") {
    const port = Number(process.env.SMTP_PORT || 587);
    try {
      await nodemailer.createTransport({
        host: process.env.SMTP_HOST, port, secure: port === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 8000,
      }).verify();
      console.log("SMTP connection and authentication: OK (no email was sent)");
    } catch (error) {
      console.log(JSON.stringify({ smtpVerified: false, code: error.code || "FAILED", responseCode: error.responseCode || null }));
    }
  } else if (provider === "resend") {
    console.log("HTTPS email API selected. A verified sender domain and a valid sending API key are required.");
  }
  const prisma = new PrismaClient();
  try {
    const queue = await prisma.bookingEmailDelivery.findMany({
      select: { id: true, bookingId: true, recipientType: true, attempts: true, sentAt: true, nextAttempt: true, lastError: true, providerMessageId: true },
      orderBy: { id: "desc" }, take: 20,
    });
    console.log(JSON.stringify({ recentDeliveries: queue }, null, 2));
  } finally { await prisma.$disconnect(); }
})().catch(() => { console.error("Could not read email queue. Verify database migration."); process.exitCode = 1; });
