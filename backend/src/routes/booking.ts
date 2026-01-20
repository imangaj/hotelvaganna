import { Router, Request, Response } from "express";
import { prisma } from "../db";

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

    const bookingNumber = `BK-${Date.now()}`;
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

    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
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

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: "Failed to create booking", error });
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
        data: { status: "DIRTY" }, // Changed from CLEANING to DIRTY to match frontend expectations
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

export default router;
