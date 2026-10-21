import nodemailer from "nodemailer";

interface BookingEmailPayload {
  bookingNumber: string;
  checkInDate: Date;
  checkOutDate: Date;
  totalPrice: number;
  guestEmail: string;
  guestName: string;
  guestPhone?: string | null;
  numberOfGuests?: number;
  breakfastCount?: number;
  parkingIncluded?: boolean;
  notes?: string | null;
  paidAmount?: number;
  paymentStatus?: string;
  roomNumber?: string;
  roomType?: string;
  hotelEmail: string;
  source?: string;
}

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));

export const sendBookingEmails = async (payload: BookingEmailPayload) => {
  const { SMTP_HOST: host, SMTP_USER: user, SMTP_PASS: pass } = process.env;
  const port = Number(process.env.SMTP_PORT || 587);
  if (!host || !user || !pass || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Booking email delivery requires valid SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS");
  }
  const hotelEmail = process.env.BOOKING_NOTIFICATION_EMAIL || process.env.HOTEL_EMAIL || payload.hotelEmail;
  if (!hotelEmail) throw new Error("Hotel booking notification address is not configured");
  const transporter = nodemailer.createTransport({
    host, port, secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  });
  const from = process.env.SMTP_FROM || user;
  const date = (value: Date) => value.toLocaleDateString("it-IT", { timeZone: "Europe/Rome" });
  const fields: [string, unknown][] = [
    ["Reservation", payload.bookingNumber], ["Guest", payload.guestName],
    ["Guest email", payload.guestEmail], ["Phone", payload.guestPhone || "—"],
    ["Check-in", date(payload.checkInDate)], ["Check-out", date(payload.checkOutDate)],
    ["Room", [payload.roomType, payload.roomNumber].filter(Boolean).join(" · ") || "To be assigned"],
    ["Guests", payload.numberOfGuests ?? "—"], ["Breakfast", payload.breakfastCount ?? 0],
    ["Parking", payload.parkingIncluded ? "Yes" : "No"],
    ["Total", `€${payload.totalPrice.toFixed(2)}`],
    ["Paid", `€${(payload.paidAmount ?? 0).toFixed(2)}`],
    ["Payment status", payload.paymentStatus || "PENDING"],
    ["Source", payload.source || "Website"], ["Notes", payload.notes || "—"],
  ];
  const text = fields.map(([label, value]) => `${label}: ${value}`).join("\n");
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#243f32"><h2>Reservation details</h2><table>${fields.map(([label, value]) =>
    `<tr><th style="text-align:left;padding:6px 16px 6px 0;vertical-align:top">${escapeHtml(label)}</th><td style="white-space:pre-wrap">${escapeHtml(value)}</td></tr>`).join("")}</table></div>`;

  const deliver = async (to: string, subject: string, replyTo: string) => {
    // Retry each recipient separately; guest failure cannot suppress the hotel alert.
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await transporter.sendMail({ from, to, replyTo, subject, text, html });
        if (result.rejected?.length) throw new Error("SMTP rejected recipient");
        return;
      } catch (error) {
        if (attempt === 3) throw error;
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  };

  const results = await Promise.allSettled([
    deliver(hotelEmail, `New reservation · ${payload.bookingNumber}`, payload.guestEmail || hotelEmail),
    ...(payload.guestEmail ? [deliver(payload.guestEmail, `Booking confirmation · ${payload.bookingNumber}`, payload.hotelEmail || hotelEmail)] : []),
  ]);
  const failures = results.flatMap((result, index) => result.status === "rejected" ? [index === 0 ? "hotel" : "guest"] : []);
  if (failures.length) throw new Error(`Booking ${payload.bookingNumber}: email delivery failed for ${failures.join(", ")} after 3 attempts`);
};
