import { Router, Request, Response } from "express";
import { prisma } from "../db";

const router = Router();

// Get all rooms for a property
router.get("/property/:propertyId", async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const rooms = await prisma.room.findMany({
      where: { propertyId: parseInt(propertyId) },
      include: { 
        roomType: true, 
        bookings: {
          where: {
            bookingStatus: {
              in: ['CONFIRMED', 'CHECKED_IN']
            }
          }
        }
      },
    });
    
    // Transform to match frontend expectations
    const transformedRooms = rooms.map(room => ({
      id: room.id,
      roomNumber: room.roomNumber,
      propertyId: room.propertyId,
      roomType: room.roomType.name,
      maxGuests: room.roomType.maxGuests,
      basePrice: room.roomType.basePrice,
      status: room.status,
      description: room.roomType.description,
      breakfastIncluded: room.breakfastIncluded,
      breakfastPrice: room.breakfastPrice,
    }));
    
    res.json(transformedRooms);
  } catch (error) {
    console.error("Fetch rooms error:", error);
    res.status(500).json({ message: "Failed to fetch rooms", error: error instanceof Error ? error.message : "Unknown error" });
  }
});

// Get room by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const room = await prisma.room.findUnique({
      where: { id: parseInt(id) },
      include: { roomType: true, bookings: true, prices: true },
    });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch room", error });
  }
});

// Create room
router.post("/", async (req: Request, res: Response) => {
  try {
    const { roomNumber, propertyId, roomType, maxGuests, basePrice, status, description, breakfastIncluded, breakfastPrice } = req.body;

    // Find or create room type
    let roomTypeRecord = await prisma.roomType.findFirst({
      where: { 
        name: roomType,
        maxGuests: parseInt(maxGuests) || 2,
        basePrice: parseFloat(basePrice) || 100
      }
    });

    if (!roomTypeRecord) {
      roomTypeRecord = await prisma.roomType.create({
        data: {
          name: roomType,
          description: description || `${roomType} room`,
          maxGuests: parseInt(maxGuests) || 2,
          basePrice: parseFloat(basePrice) || 100,
        }
      });
    }

    const room = await prisma.room.create({
      data: {
        roomNumber,
        propertyId: parseInt(propertyId),
        roomTypeId: roomTypeRecord.id,
        status: status || "AVAILABLE",
        breakfastIncluded: !!breakfastIncluded,
        breakfastPrice: parseFloat(breakfastPrice) || 0,
      },
      include: {
        roomType: true
      }
    });

    res.status(201).json(room);
  } catch (error) {
    console.error("Room creation error:", error);
    res.status(500).json({ message: "Failed to create room", error: error instanceof Error ? error.message : "Unknown error" });
  }
});

// Update room details
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { roomNumber, propertyId, roomType, maxGuests, basePrice, status, description, breakfastIncluded, breakfastPrice } = req.body;

    // Find or create room type
    let roomTypeRecord = await prisma.roomType.findFirst({
      where: {
        name: roomType,
        maxGuests: parseInt(maxGuests) || 2,
        basePrice: parseFloat(basePrice) || 100
      }
    });

    if (!roomTypeRecord) {
      roomTypeRecord = await prisma.roomType.create({
        data: {
          name: roomType,
          description: description || `${roomType} room`,
          maxGuests: parseInt(maxGuests) || 2,
          basePrice: parseFloat(basePrice) || 100,
        }
      });
    }

    const room = await prisma.room.update({
      where: { id: parseInt(id) },
      data: {
        roomNumber,
        propertyId: parseInt(propertyId),
        roomTypeId: roomTypeRecord.id,
        status: status || "AVAILABLE",
        breakfastIncluded: !!breakfastIncluded,
        breakfastPrice: parseFloat(breakfastPrice) || 0,
      },
      include: { roomType: true }
    });

    res.json(room);
  } catch (error) {
    console.error("Room update error:", error);
    res.status(500).json({ message: "Failed to update room", error: error instanceof Error ? error.message : "Unknown error" });
  }
});

// Update room status
router.put("/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const room = await prisma.room.update({
      where: { id: parseInt(id) },
      data: { status },
    });

    if (status === "DIRTY") {
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

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: "Failed to update room", error });
  }
});

// Set daily price for room
router.post("/:id/price", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { date, price } = req.body;

    const dailyPrice = await prisma.dailyPrice.upsert({
      where: {
        roomId_date: {
          roomId: parseInt(id),
          date: new Date(date),
        },
      },
      update: { price: parseFloat(price) },
      create: {
        roomId: parseInt(id),
        date: new Date(date),
        price: parseFloat(price),
      },
    });

    res.json(dailyPrice);
  } catch (error) {
    res.status(500).json({ message: "Failed to set daily price", error });
  }
});

export default router;
