import { Router, Request, Response } from "express";
import { prisma } from "../db";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { requireGuestAuth, GuestAuthRequest } from "../middleware/guestAuth";
import crypto from "crypto";
import nodemailer from "nodemailer";

const router = Router();
const GUEST_JWT_SECRET = process.env.GUEST_JWT_SECRET || process.env.JWT_SECRET || "secret_jwt_key_change_in_production";


router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    if (!email || !password || !firstName || !lastName || !phone) {
      return res.status(400).json({ message: "Email, password, first name, last name, and phone are required" });
    }

    const existing = await prisma.guestAccount.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Account already exists" });
    }

    const passwordHash = await bcryptjs.hash(password, 10);
    const account = await prisma.guestAccount.create({
      data: { email, passwordHash, firstName, lastName, phone },
    });

    const token = jwt.sign({ email: account.email }, GUEST_JWT_SECRET, { expiresIn: "7d" } as any);

    return res.json({
      message: "Guest account created",
      token,
      guest: { email: account.email, firstName: account.firstName, lastName: account.lastName, phone: account.phone },
    });
  } catch (error) {
    return res.status(500).json({ message: "Registration failed", error });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const account = await prisma.guestAccount.findUnique({ where: { email } });
    if (!account) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValid = await bcryptjs.compare(password, account.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ email: account.email }, GUEST_JWT_SECRET, { expiresIn: "7d" } as any);

    return res.json({
      message: "Login successful",
      token,
      guest: { email: account.email, firstName: account.firstName, lastName: account.lastName, phone: account.phone },
    });
  } catch (error) {
    return res.status(500).json({ message: "Login failed", error });
  }
});

router.get("/bookings", requireGuestAuth, async (req: GuestAuthRequest, res: Response) => {
  try {
    const email = req.guest?.email;
    if (!email) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        guest: { email },
      },
      include: {
        guest: true,
        room: { include: { roomType: true } },
        property: true,
      },
      orderBy: { checkInDate: "desc" },
    });

    const transformed = bookings.map((booking: any) => ({
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      numberOfGuests: booking.numberOfGuests,
      totalPrice: booking.totalPrice,
      paidAmount: booking.paidAmount,
      paymentStatus: booking.paymentStatus,
      bookingStatus: booking.bookingStatus,
      source: booking.source,
      notes: booking.notes,
      breakfastCount: booking.breakfastCount,
      parkingIncluded: booking.parkingIncluded,
      createdAt: booking.createdAt,
      guest: booking.guest,
      property: booking.property,
      room: {
        id: booking.room.id,
        roomNumber: booking.room.roomNumber,
        roomType: booking.room.roomType?.name,
      },
    }));

    return res.json(transformed);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch bookings", error });
  }
});

router.get("/me", requireGuestAuth, async (req: GuestAuthRequest, res: Response) => {
  const email = req.guest?.email;
  if (!email) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const account = await prisma.guestAccount.findUnique({ where: { email } });

  return res.json({
    email,
    firstName: account?.firstName || "",
    lastName: account?.lastName || "",
    phone: account?.phone || "",
  });
});

// Request password reset (send email with token)
router.post("/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const account = await prisma.guestAccount.findUnique({ where: { email } });
    if (!account) {
      // We send a success message even if the account doesn't exist to prevent email enumeration
      return res.status(200).json({ message: "If the email exists, a reset link will be sent." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes

    await prisma.guestPasswordResetToken.create({
      data: {
        token,
        guestAccountId: account.id,
        expiresAt,
      },
    });

    // Send email (replace with your SMTP config)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${token}`;
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "Password Reset Request",
      text: `Reset your password: ${resetUrl}`,
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 30 minutes.</p>`,
    });

    return res.json({ message: "If the email exists, a reset link will be sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    // Generic error to avoid leaking information
    return res.status(500).json({ message: "An error occurred while trying to send the reset link." });
  }
});

// Reset password with token
router.post("/reset-password", async (req: Request, res: Response) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ message: "Token and new password are required" });
  }

  try {
    const resetToken = await prisma.guestPasswordResetToken.findUnique({
      where: { token },
      include: { guestAccount: true },
    });

    if (!resetToken || resetToken.expiresAt < new Date()) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const passwordHash = await bcryptjs.hash(password, 10);

    await prisma.guestAccount.update({
      where: { id: resetToken.guestAccountId },
      data: { passwordHash },
    });

    // Delete the token so it can't be reused
    await prisma.guestPasswordResetToken.delete({ where: { id: resetToken.id } });

    return res.json({ message: "Password has been reset. You can now log in." });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ message: "An error occurred while resetting your password." });
  }
});

export default router;
