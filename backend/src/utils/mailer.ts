import nodemailer from "nodemailer";
import axios from "axios";

export interface BookingEmailPayload {
  bookingNumber: string; checkInDate: Date; checkOutDate: Date; totalPrice: number;
  guestEmail: string; guestName: string; guestPhone?: string | null; numberOfGuests?: number;
  breakfastCount?: number; parkingIncluded?: boolean; notes?: string | null; paidAmount?: number;
  paymentStatus?: string; roomNumber?: string; roomType?: string; hotelEmail: string; source?: string;
  reservationUrl?: string;
}
type Recipient = "HOTEL" | "GUEST";
type Mail = { to: string; replyTo: string; subject: string; text: string; html: string };
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, char =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
export class EmailDeliveryError extends Error {
  code: string;
  constructor(code: string) { super(code); this.code = code; }
}
export const mailProvider = () => process.env.MAIL_PROVIDER || (process.env.RESEND_API_KEY ? "resend" : "smtp");
const buildMail = (payload: BookingEmailPayload, recipient: Recipient): Mail => {
  const date = (value: Date) => value.toLocaleDateString("it-IT", { timeZone: "Europe/Rome" });
  const fields: [string, unknown][] = [
    ["Reservation", payload.bookingNumber], ["Guest", payload.guestName], ["Guest email", payload.guestEmail],
    ["Phone", payload.guestPhone || "—"], ["Check-in", date(payload.checkInDate)], ["Check-out", date(payload.checkOutDate)],
    ["Room", [payload.roomType, payload.roomNumber].filter(Boolean).join(" · ") || "To be assigned"],
    ["Guests", payload.numberOfGuests ?? "—"], ["Breakfast", payload.breakfastCount ?? 0],
    ["Parking request", payload.parkingIncluded ? "Yes" : "No"], ["Total", "€" + payload.totalPrice.toFixed(2)],
    ["Paid", "€" + (payload.paidAmount ?? 0).toFixed(2)], ["Payment status", payload.paymentStatus || "PENDING"],
  ];
  if (recipient === "HOTEL") fields.push(["Source", payload.source || "Website"], ["Notes", payload.notes || "—"]);
  const text = fields.map(([label, value]) => label + ": " + value).join("\n");
  const heading = recipient === "HOTEL" ? "A new stay at Hotel Valganna" : "We look forward to welcoming you.";
  const link = payload.reservationUrl && /^https?:\/\//.test(payload.reservationUrl) ? payload.reservationUrl : "";
  const html = '<!doctype html><html><body style="margin:0;background:#f4f3ed;font-family:Arial,sans-serif;color:#284234"><table role="presentation" style="width:100%;max-width:620px;margin:auto;background:#fffdf9"><tr><td style="padding:34px 36px 20px"><p style="font-size:10px;letter-spacing:3px">HOTEL VALGANNA · MILANO</p><h1 style="font:32px/1.15 Georgia,serif">' + escapeHtml(heading) + '</h1><p style="font-size:13px;color:#6c7965">' + escapeHtml(payload.bookingNumber) + '</p></td></tr><tr><td style="padding:0 36px 25px"><table style="width:100%;border-collapse:collapse">' +
    fields.map(([label,value]) => '<tr><th style="font-size:12px;font-weight:400;text-align:left;padding:10px 12px 10px 0;vertical-align:top;color:#6d7867;border-bottom:1px solid #e7e9dd">' + escapeHtml(label) + '</th><td style="font-size:12px;padding:10px 0;white-space:pre-wrap;border-bottom:1px solid #e7e9dd">' + escapeHtml(value) + '</td></tr>').join("") +
    '</table>' + (link && recipient === "GUEST" ? '<p style="margin-top:28px"><a style="display:inline-block;padding:14px 22px;background:#284b3b;color:white;text-decoration:none;border-radius:5px" href="' + escapeHtml(link) + '">View your reservation</a></p>' : "") +
    '<p style="font-size:11px;color:#6c7965;margin-top:25px">Questions about your stay? Reply to this email.<br>Hotel Valganna · Milano</p></td></tr></table></body></html>';
  return {
    to: recipient === "HOTEL" ? payload.hotelEmail : payload.guestEmail,
    replyTo: recipient === "HOTEL" ? payload.guestEmail || payload.hotelEmail : payload.hotelEmail,
    subject: (recipient === "HOTEL" ? "New reservation · " : "Booking confirmation · ") + payload.bookingNumber,
    text: heading + "\n\n" + text + (link && recipient === "GUEST" ? "\n\nView your reservation: " + link : ""), html,
  };
};

export const sendBookingEmail = async (payload: BookingEmailPayload, recipient: Recipient, deliveryKey?: string): Promise<string | null> => {
  const mail = buildMail(payload, recipient);
  if (!mail.to) throw new EmailDeliveryError("MISSING_RECIPIENT");
  const provider = mailProvider();
  let deliver: () => Promise<string | null>;
  if (provider === "resend") {
    const key = process.env.RESEND_API_KEY;
    const from = process.env.MAIL_FROM;
    if (!key || !from) throw new EmailDeliveryError("RESEND_API_KEY_AND_MAIL_FROM_REQUIRED");
    deliver = async () => {
      try {
        const response = await axios.post("https://api.resend.com/emails", {
          from, to: [mail.to], reply_to: mail.replyTo, subject: mail.subject, text: mail.text, html: mail.html,
        }, { timeout: 20000, headers: { Authorization: "Bearer " + key, "Content-Type": "application/json", ...(deliveryKey ? { "Idempotency-Key": deliveryKey } : {}) } });
        if (!response.data?.id) throw new EmailDeliveryError("EMAIL_API_MISSING_MESSAGE_ID");
        return response.data.id;
      } catch (error: any) {
        // Never persist an Axios error: it contains the Authorization header.
        if (error instanceof EmailDeliveryError) throw error;
        throw new EmailDeliveryError(error.response?.status ? "EMAIL_API_HTTP_" + error.response.status : "EMAIL_API_NETWORK_ERROR");
      }
    };
  } else if (provider === "smtp") {
    const { SMTP_HOST: host, SMTP_USER: user, SMTP_PASS: pass } = process.env;
    const port = Number(process.env.SMTP_PORT || 587);
    if (!host || !user || !pass || !Number.isInteger(port) || port < 1 || port > 65535) {
      throw new EmailDeliveryError("SMTP_HOST_SMTP_PORT_SMTP_USER_SMTP_PASS_REQUIRED");
    }
    const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000 });
    deliver = async () => {
      try {
        const result = await transporter.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_FROM || user, ...mail });
        if (result.rejected?.length) throw new EmailDeliveryError("SMTP_RECIPIENT_REJECTED");
        return result.messageId || null;
      } catch (error: any) {
        if (error instanceof EmailDeliveryError) throw error;
        throw new EmailDeliveryError("SMTP_" + (String(error.code || "SEND_FAILED").replace(/[^A-Z0-9_]/g, "").slice(0,40)));
      }
    };
  } else throw new EmailDeliveryError("UNSUPPORTED_MAIL_PROVIDER");
  for (let attempt = 1; attempt <= 3; attempt++) {
    try { return await deliver(); }
    catch (error) { if (attempt === 3) throw error; await new Promise(resolve => setTimeout(resolve, attempt * 1000)); }
  }
  return null;
};

export const sendBookingEmails = async (payload: BookingEmailPayload) => {
  const resolved = { ...payload, hotelEmail: process.env.BOOKING_NOTIFICATION_EMAIL || process.env.HOTEL_EMAIL || payload.hotelEmail || "hotel.valganna@libero.it" };
  const results = await Promise.allSettled([
    sendBookingEmail(resolved, "HOTEL"),
    ...(payload.guestEmail ? [sendBookingEmail(resolved, "GUEST")] : []),
  ]);
  const failures = results.flatMap((result,index) => result.status === "rejected" ? [index === 0 ? "hotel" : "guest"] : []);
  if (failures.length) throw new Error("Booking " + payload.bookingNumber + ": email delivery failed for " + failures.join(", ") + " after 3 attempts");
};
