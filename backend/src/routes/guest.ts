import { Router, Request, Response } from "express";
import { prisma } from "../db";

const router = Router();

// Create or return existing guest by email
router.post("/", async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, country } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ message: "firstName, lastName, and email are required" });
    }

    const existing = await prisma.guest.findFirst({
      where: { email },
    });

    if (existing) {
      const updated = await prisma.guest.update({
        where: { id: existing.id },
        data: {
          firstName,
          lastName,
          phone: phone ?? existing.phone,
          country: country ?? existing.country,
        },
      });
      return res.status(200).json(updated);
    }

    const guest = await prisma.guest.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        country,
      },
    });

    res.status(201).json(guest);
  } catch (error) {
    console.error("Guest create error:", error);
    res.status(500).json({ message: "Failed to create guest", error: error instanceof Error ? error.message : "Unknown error" });
  }
});

export default router;
