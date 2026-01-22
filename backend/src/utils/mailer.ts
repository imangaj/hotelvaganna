import nodemailer from "nodemailer";

interface BookingEmailPayload {
  bookingNumber: string;
  checkInDate: Date;
  checkOutDate: Date;
  totalPrice: number;
  guestEmail: string;
  guestName: string;
  roomNumber?: string;
  roomType?: string;
  hotelEmail: string;
  source?: string;
}

const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
};

const sendMailgun = async (payload: BookingEmailPayload, subject: string, html: string, to: string) => {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  if (!apiKey || !domain) return false;

  const from = process.env.MAILGUN_FROM || payload.hotelEmail || "hotel.valganna2023@gmail.com";
  const params = new URLSearchParams();
  params.append("from", from);
  params.append("to", to);
  params.append("subject", subject);
  params.append("html", html);

  const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });

  if (!res.ok) {
    const msg = await res.text();
    console.error("Mailgun error", res.status, msg);
    return false;
  }

  return true;
};

export const sendBookingEmails = async (payload: BookingEmailPayload) => {
  const from = process.env.SMTP_FROM || payload.hotelEmail || "no-reply@hotel.local";
  const checkIn = payload.checkInDate.toLocaleDateString("it-IT");
  const checkOut = payload.checkOutDate.toLocaleDateString("it-IT");

  const subjectGuest = `Booking Confirmation ${payload.bookingNumber}`;
  const subjectHotel = `New Booking ${payload.bookingNumber}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Booking Confirmation</h2>
      <p>Thank you, ${payload.guestName}.</p>
      <p><strong>Booking:</strong> ${payload.bookingNumber}</p>
      <p><strong>Check-in:</strong> ${checkIn}</p>
      <p><strong>Check-out:</strong> ${checkOut}</p>
      <p><strong>Room:</strong> ${payload.roomNumber || "TBD"} ${payload.roomType ? `(${payload.roomType})` : ""}</p>
      <p><strong>Total:</strong> €${payload.totalPrice.toFixed(2)}</p>
      <p>If you have any questions, reply to this email.</p>
    </div>
  `;

  const mailgunOk = await sendMailgun(payload, subjectGuest, html, payload.guestEmail);
  await sendMailgun(payload, subjectHotel, html, payload.hotelEmail);

  if (mailgunOk) return;

  const transporter = getTransporter();
  if (!transporter) {
    console.warn("SMTP not configured. Skipping email sending.");
    return;
  }

  await transporter.sendMail({
    from,
    to: payload.guestEmail,
    replyTo: payload.hotelEmail,
    subject: subjectGuest,
    html
  });

  await transporter.sendMail({
    from,
    to: payload.hotelEmail,
    subject: subjectHotel,
    html
  });
};
