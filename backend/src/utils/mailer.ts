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

interface PasswordResetEmailPayload {
  email: string;
  resetToken: string;
  frontendUrl: string;
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

export const sendBookingEmails = async (payload: BookingEmailPayload) => {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("SMTP not configured. Skipping email sending.");
    return;
  }

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

export const sendPasswordResetEmail = async (payload: PasswordResetEmailPayload): Promise<boolean> => {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("SMTP not configured. Password reset email not sent.");
    return false;
  }

  const from = process.env.SMTP_FROM || "no-reply@hotel.local";
  const resetUrl = `${payload.frontendUrl}/reset-password?token=${payload.resetToken}`;
  
  const subject = "Password Reset Request";
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Password Reset Request</h2>
      <p>You have requested to reset your password for your guest account.</p>
      <p>Please click the link below to reset your password:</p>
      <p><a href="${resetUrl}" style="color: #2E5D4B; font-weight: bold;">Reset Password</a></p>
      <p>Or copy and paste this URL into your browser:</p>
      <p style="color: #666; word-break: break-all;">${resetUrl}</p>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request this password reset, please ignore this email.</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from,
      to: payload.email,
      subject,
      html
    });
    return true;
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return false;
  }
};
