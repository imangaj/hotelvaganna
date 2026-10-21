import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { processBookingEmailQueue } from "../utils/bookingEmailQueue";
import { randomUUID } from "crypto";
import { sendPushToAll } from "../utils/push";

const router = Router();

// Get all bookings
router.get("/", async (req: Request, res: Response) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        property: true,
        room: {
          include: {
            roomType: true
          }
        },
        guest: true,
      },
    });
    
    // Transform to match frontend expectations
    const transformedBookings = bookings.map((booking: any) => ({
      id: booking.id,
      propertyId: booking.propertyId,
      roomId: booking.roomId,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      numberOfGuests: booking.numberOfGuests,
      totalPrice: booking.totalPrice,
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
      source: booking.source,
      notes: booking.notes,
      breakfastCount: booking.breakfastCount,
      parkingIncluded: booking.parkingIncluded,
      paidAmount: booking.paidAmount,
      createdAt: booking.createdAt,
      property: booking.property,
      guest: booking.guest,
      room: {
        id: booking.room.id,
        roomNumber: booking.room.roomNumber,
        roomType: booking.room.roomType?.name,
        breakfastIncluded: booking.room.breakfastIncluded,
        breakfastPrice: booking.room.breakfastPrice
      }
    }));
    
    res.json(transformedBookings);
  } catch (error) {
    console.error("Fetch bookings error:", error);
    res.status(500).json({ message: "Failed to fetch bookings", error: error instanceof Error ? error.message : "Unknown error" });
  }
});

// Get bookings for property
router.get("/property/:propertyId", async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const bookings = await prisma.booking.findMany({
      where: { propertyId: parseInt(propertyId) },
      include: {
        room: true,
        guest: true,
      },
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch bookings", error });
  }
});

// Get bookings for date range
router.get("/available", async (req: Request, res: Response) => {
  try {
    const { propertyId, startDate, endDate } = req.query;

    const bookings = await prisma.booking.findMany({
      where: {
        propertyId: parseInt(propertyId as string),
        checkInDate: {
          lte: new Date(endDate as string),
        },
        checkOutDate: {
          gte: new Date(startDate as string),
        },
      },
      include: { room: true, guest: true },
    });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch bookings", error });
  }
});

// Create booking
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      propertyId,
      roomId,
      guestId,
      checkInDate,
      checkOutDate,
      numberOfGuests,
      totalPrice,
      source,
      sourceBookingId,
      notes,
      breakfastCount = 0,
      parkingIncluded = false,
      paidAmount = 0
    } = req.body;

    const checkoutKey = typeof req.body.checkoutKey === "string" ? req.body.checkoutKey : undefined;
    if (checkoutKey) {
      if (!/^cs_[A-Za-z0-9_]+:\d+$/.test(checkoutKey) || checkoutKey.length > 220) return res.status(400).json({ message: "Invalid checkout reference" });
      const existing = await prisma.booking.findUnique({ where: { checkoutKey } });
      if (existing) {
        if (existing.guestId !== Number(guestId)) return res.status(409).json({ message: "Checkout already used" });
        return res.status(200).json(existing);
      }
    }
    const bookingNumber = "BK-" + randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
    const total = parseFloat(totalPrice);
    const paid = parseFloat(paidAmount);
    
    let paymentStatus = "PENDING";
    if (paid >= total) paymentStatus = "PAID";
    else if (paid > 0) paymentStatus = "PARTIAL";

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    // Normalize check-in/out times: 15:00 check-in, 11:00 check-out
    checkIn.setHours(15, 0, 0, 0);
    checkOut.setHours(11, 0, 0, 0);

    if (!Number.isFinite(total) || total < 0 || !Number.isFinite(paid) || paid < 0 ||
        !Number.isFinite(checkIn.getTime()) || !Number.isFinite(checkOut.getTime()) || checkOut <= checkIn) {
      return res.status(400).json({ message: "Invalid booking dates or amounts" });
    }
    const [emailGuest, emailRoom] = await Promise.all([
      prisma.guest.findUnique({ where: { id: Number(guestId) } }),
      prisma.room.findUnique({ where: { id: Number(roomId) }, include: { roomType: true } }),
    ]);
    if (!emailGuest || !emailRoom) return res.status(400).json({ message: "Guest or room not found" });
    const hotelEmail = process.env.BOOKING_NOTIFICATION_EMAIL || "hotel.valganna@libero.it";
    const payloadJson = JSON.stringify({
      bookingNumber, checkInDate: checkIn, checkOutDate: checkOut, totalPrice: total, paidAmount: paid, paymentStatus,
      guestEmail: emailGuest.email, guestName: [emailGuest.firstName,emailGuest.lastName].filter(Boolean).join(" "),
      guestPhone: emailGuest.phone, numberOfGuests: Number(numberOfGuests), breakfastCount: Number(breakfastCount),
      parkingIncluded: Boolean(parkingIncluded), roomNumber: emailRoom.roomNumber, roomType: emailRoom.roomType.name,
      hotelEmail, notes, source, reservationUrl: (process.env.FRONTEND_URL || "https://hotelvalganna.it").replace(/[/]$/, "") + "/guest",
    });
    const deliveryJobs = [{ recipientType: "HOTEL", recipientEmail: hotelEmail, payloadJson }];
    if (emailGuest.email) deliveryJobs.push({ recipientType: "GUEST", recipientEmail: emailGuest.email, payloadJson });
    // Nested writes commit the booking and both delivery jobs atomically.
    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        checkoutKey,
        emailDeliveries: { create: deliveryJobs },
        propertyId: parseInt(propertyId),
        roomId: parseInt(roomId),
        guestId: parseInt(guestId),
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests: parseInt(numberOfGuests),
        totalPrice: total,
        paidAmount: paid,
        source,
        sourceBookingId,
        notes,
        bookingStatus: "CONFIRMED",
        paymentStatus,
        breakfastCount: parseInt(String(breakfastCount)),
        parkingIncluded: Boolean(parkingIncluded)
      },
    });

    const isWebsiteBooking = typeof source === "string" && /website|direct_website/i.test(source);

    try {
      const fullBooking = await prisma.booking.findUnique({
        where: { id: booking.id },
        include: {
          guest: true,
          room: { include: { roomType: true } },
          property: true,
        }
      });

      void processBookingEmailQueue();

      if (isWebsiteBooking && fullBooking) {
        const guestName = `${fullBooking.guest?.firstName || ""} ${fullBooking.guest?.lastName || ""}`.trim() || "Guest";
        const roomType = fullBooking.room?.roomType?.name || "Room";
        await sendPushToAll({
          title: "New website reservation",
          body: `${guestName} · ${roomType} · ${fullBooking.checkInDate.toISOString().split("T")[0]} → ${fullBooking.checkOutDate.toISOString().split("T")[0]}`,
          url: "/admin",
        });
      }
    } catch (emailError) {
      console.error("Email sending failed", emailError);
    }

    res.status(201).json(booking);
  } catch (error) {
    const checkoutKey = req.body?.checkoutKey;
    if ((error as any)?.code === "P2002" && typeof checkoutKey === "string") {
      const existing = await prisma.booking.findUnique({ where: { checkoutKey } });
      if (existing && existing.guestId === Number(req.body.guestId)) return res.status(200).json(existing);
    }
    res.status(500).json({ message: "Failed to create booking" });
  }
});

// Update booking status
router.put("/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { bookingStatus, paymentStatus, roomId } = req.body;
    const bookingId = parseInt(id);

    const dataToUpdate: any = {
      bookingStatus: bookingStatus || undefined,
      paymentStatus: paymentStatus || undefined,
    };
    
    // Allow updating room if provided
    if (roomId) {
      dataToUpdate.roomId = parseInt(roomId);
    }

    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: dataToUpdate,
    });

    if (bookingStatus === "CHECKED_IN") {
      await prisma.room.update({
        where: { id: booking.roomId },
        data: { status: "OCCUPIED" },
      });
    }

    if (bookingStatus === "CHECKED_OUT") {
      await prisma.room.update({
        where: { id: booking.roomId },
        data: { status: "LOCKED" }, // Locked until key is dropped at reception
      });

      const room = await prisma.room.findUnique({
        where: { id: booking.roomId },
        select: { id: true, roomNumber: true, propertyId: true },
      });

      if (room) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const existingTask = await prisma.housekeepingTask.findFirst({
          where: {
            roomId: room.id,
            title: { startsWith: "P - Room" },
            createdAt: { gte: startOfDay },
          },
        });

        if (!existingTask) {
          await prisma.housekeepingTask.create({
            data: {
              title: `P - Room ${room.roomNumber}`,
              description: "Checkout - needs cleaning",
              priority: "NORMAL",
              status: "PENDING",
              propertyId: room.propertyId,
              roomId: room.id,
            },
          });
        }
      }
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: "Failed to update booking", error });
  }
});

// Cancel booking
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const booking = await prisma.booking.update({
      where: { id: parseInt(id) },
      data: { bookingStatus: "CANCELLED" },
    });

    res.json({ message: "Booking cancelled", booking });
  } catch (error) {
    res.status(500).json({ message: "Failed to cancel booking", error });
  }
});

// Permanently delete booking
router.delete("/:id/hard", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.booking.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Booking deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete booking", error });
  }
});

export default router;
