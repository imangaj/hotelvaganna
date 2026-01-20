import { Router, Request, Response } from "express";
import { prisma } from "../db";
import axios from "axios";

const router = Router();

// Get all channels for property
router.get("/property/:propertyId", async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const channels = await prisma.channel.findMany({
      where: { propertyId: parseInt(propertyId) },
      include: { syncs: true },
    });
    res.json(channels);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch channels", error });
  }
});

// Create channel connection
router.post("/", async (req: Request, res: Response) => {
  try {
    const { propertyId, name, type, apiKey } = req.body;

    const channel = await prisma.channel.create({
      data: {
        propertyId: parseInt(propertyId),
        name,
        type,
        apiKey,
        isActive: true,
      },
    });

    res.status(201).json(channel);
  } catch (error) {
    res.status(500).json({ message: "Failed to create channel", error });
  }
});

// Sync availability to channels
router.post("/:channelId/sync/availability", async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;

    const channel = await prisma.channel.findUnique({
      where: { id: parseInt(channelId) },
    });

    if (!channel || !channel.isActive) {
      return res.status(400).json({ message: "Channel not found or inactive" });
    }

    // Log sync attempt
    await prisma.channelSync.create({
      data: {
        channelId: parseInt(channelId),
        syncType: "AVAILABILITY",
        status: "PENDING",
      },
    });

    // In real implementation, call actual channel API
    // For now, just log success
    const sync = await prisma.channelSync.update({
      where: {
        id: (
          await prisma.channelSync.findFirst({
            where: {
              channelId: parseInt(channelId),
              syncType: "AVAILABILITY",
              status: "PENDING",
            },
            orderBy: { createdAt: "desc" },
          })
        )?.id!,
      },
      data: { status: "SUCCESS" },
    });

    res.json({ message: "Availability sync initiated", sync });
  } catch (error) {
    res.status(500).json({ message: "Failed to sync availability", error });
  }
});

// Sync pricing to channels
router.post("/:channelId/sync/pricing", async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;

    const channel = await prisma.channel.findUnique({
      where: { id: parseInt(channelId) },
    });

    if (!channel || !channel.isActive) {
      return res.status(400).json({ message: "Channel not found or inactive" });
    }

    // Log sync attempt
    await prisma.channelSync.create({
      data: {
        channelId: parseInt(channelId),
        syncType: "PRICING",
        status: "PENDING",
      },
    });

    // In real implementation, call actual channel API
    const sync = await prisma.channelSync.findFirst({
      where: {
        channelId: parseInt(channelId),
        syncType: "PRICING",
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ message: "Pricing sync initiated", sync });
  } catch (error) {
    res.status(500).json({ message: "Failed to sync pricing", error });
  }
});

// Check booking from channel
router.post("/webhook/booking", async (req: Request, res: Response) => {
  try {
    const { sourceBookingId, channel, guestData, roomData, dates } = req.body;

    // Check if booking already exists from this channel
    const existingBooking = await prisma.booking.findFirst({
      where: { sourceBookingId },
    });

    if (existingBooking) {
      return res
        .status(400)
        .json({ message: "Booking already exists", booking: existingBooking });
    }

    // Create guest if doesn't exist
    let guest = await prisma.guest.findFirst({
      where: { email: guestData.email },
    });

    if (!guest) {
      guest = await prisma.guest.create({
        data: {
          firstName: guestData.firstName,
          lastName: guestData.lastName,
          email: guestData.email,
          phone: guestData.phone,
          country: guestData.country,
        },
      });
    }

    // Create booking from channel
    const booking = await prisma.booking.create({
      data: {
        bookingNumber: `BK-${Date.now()}`,
        propertyId: roomData.propertyId,
        roomId: roomData.roomId,
        guestId: guest.id,
        checkInDate: new Date(dates.checkIn),
        checkOutDate: new Date(dates.checkOut),
        numberOfGuests: roomData.numberOfGuests,
        totalPrice: roomData.totalPrice,
        source: channel.toUpperCase(),
        sourceBookingId,
        bookingStatus: "CONFIRMED",
      },
    });

    res.status(201).json({
      message: "Booking synced from channel",
      booking,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to sync booking", error });
  }
});

export default router;
