import { Router, Request, Response } from "express";
import { prisma } from "../db";

const router = Router();

// Get all guests
router.get("/", async (_req: Request, res: Response) => {
  try {
    const guests = await prisma.guest.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(guests);
  } catch (error) {
    console.error("Guest fetch error:", error);
    res.status(500).json({ message: "Failed to fetch guests", error: error instanceof Error ? error.message : "Unknown error" });
  }
});

// Create or return existing guest by email
router.post("/", async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, country } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ message: "firstName, lastName, and email are required" });
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

// Update guest
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, country } = req.body;

    const existingGuest = await prisma.guest.findUnique({ where: { id: parseInt(id) } });
    if (!existingGuest) {
      return res.status(404).json({ message: "Guest not found" });
    }

    const updatedGuest = await prisma.$transaction(async (tx) => {
      const guest = await tx.guest.update({
        where: { id: parseInt(id) },
        data: { firstName, lastName, email, phone, country },
      });

      if (email && email !== existingGuest.email) {
        await tx.guestAccount.updateMany({
          where: { email: existingGuest.email },
          data: { email },
        });
      }

      return guest;
    });

    res.json(updatedGuest);
  } catch (error) {
    console.error("Guest update error:", error);
    res.status(500).json({ message: "Failed to update guest", error: error instanceof Error ? error.message : "Unknown error" });
  }
});

// Delete guest
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const guest = await prisma.guest.findUnique({ where: { id: parseInt(id) } });
    if (!guest) {
      return res.status(404).json({ message: "Guest not found" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.guestAccount.deleteMany({ where: { email: guest.email } });
      await tx.guest.delete({ where: { id: parseInt(id) } });
    });

    res.json({ message: "Guest deleted" });
  } catch (error) {
    console.error("Guest delete error:", error);
    res.status(500).json({ message: "Failed to delete guest", error: error instanceof Error ? error.message : "Unknown error" });
  }
});

export default router;
