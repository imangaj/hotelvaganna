import { Router, Request, Response } from "express";
import { prisma } from "../db";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { requireGuestAuth, GuestAuthRequest } from "../middleware/guestAuth";
import { sendPasswordResetEmail } from "../utils/mailer";

const router = Router();
const GUEST_JWT_SECRET = process.env.GUEST_JWT_SECRET || process.env.JWT_SECRET || "secret_jwt_key_change_in_production";

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const existing = await prisma.guestAccount.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Account already exists" });
    }

    const passwordHash = await bcryptjs.hash(password, 10);
    const account = await prisma.guestAccount.create({
      data: { email, passwordHash },
    });

    const token = jwt.sign({ email: account.email }, GUEST_JWT_SECRET, { expiresIn: "7d" } as any);

    return res.json({
      message: "Guest account created",
      token,
      guest: { email: account.email },
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
      guest: { email: account.email },
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

  return res.json({ email });
});

router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const account = await prisma.guestAccount.findUnique({ where: { email } });
    
    // Always return the same response to avoid leaking user existence
    // Generate token only if account exists
    if (account) {
      // Generate secure random token (32 bytes = 64 hex chars)
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      await prisma.guestAccount.update({
        where: { email },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpires: resetExpires,
        },
      });

      // Send email or log the reset link for DEV mode
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const emailSent = await sendPasswordResetEmail({
        email,
        resetToken,
        frontendUrl,
      });

      // If email not configured (DEV mode), return token in response for testing
      if (!emailSent) {
        console.log(`[DEV MODE] Password reset link for ${email}:`);
        console.log(`${frontendUrl}/reset-password?token=${resetToken}`);
        return res.json({
          message: "If an account exists with this email, a password reset link has been sent.",
          devMode: true,
          resetLink: `${frontendUrl}/reset-password?token=${resetToken}`,
        });
      }
    }

    // Always return same success message whether account exists or not
    return res.json({
      message: "If an account exists with this email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ message: "Failed to process request" });
  }
});

router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    // Find account with valid token
    const account = await prisma.guestAccount.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(), // Token hasn't expired yet
        },
      },
    });

    if (!account) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    // Hash new password and clear reset token
    const passwordHash = await bcryptjs.hash(newPassword, 10);
    await prisma.guestAccount.update({
      where: { id: account.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return res.json({ message: "Password reset successful. You can now login with your new password." });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ message: "Failed to reset password" });
  }
});

export default router;
