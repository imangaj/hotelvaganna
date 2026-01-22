import { Router, Request, Response } from "express";
import { prisma } from "../db";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { requireGuestAuth, GuestAuthRequest } from "../middleware/guestAuth";

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

export default router;
