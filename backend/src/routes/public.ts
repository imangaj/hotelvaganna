import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { addDays, differenceInCalendarDays, format, startOfDay } from "date-fns";

const router = Router();

// Public Search Endpoint
router.get("/search", async (req: Request, res: Response) => {
  try {
    const { propertyId, checkIn, checkOut, guests, rooms: roomCountParam } = req.query;

    if (!propertyId || !checkIn || !checkOut) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    const start = new Date(checkIn as string);
    const end = new Date(checkOut as string);
    const propId = parseInt(propertyId as string);
    const guestCount = guests ? parseInt(guests as string) : 1;
    const requiredRooms = roomCountParam ? parseInt(roomCountParam as string) : 1;

    // 1. Get Room Types associated with Property
    // Note: Schema links Rooms to Property, RoomTypes are global but rooms link them.
    // We need to find which room types are present in this property.
    const rooms = await prisma.room.findMany({
      where: { propertyId: propId },
      include: { roomType: true }
    });

    const roomTypesMap = new Map();
    rooms.forEach((room: any) => {
        if (!roomTypesMap.has(room.roomTypeId)) {
            roomTypesMap.set(room.roomTypeId, {
                ...room.roomType,
                count: 0
            });
        }
        roomTypesMap.get(room.roomTypeId).count++;
    });
    
    const availableTypes: any[] = [];

    // 2. For each Room Type, check availability sequence
    for (const [typeId, typeData] of roomTypesMap.entries()) {
        // Capacity check: Can the requested number of rooms accommodate the guests?
        // Assumes guests can be distributed optimally.
        if ((typeData.maxGuests * requiredRooms) < guestCount) continue;

        // Get Rates & Flags for the range
        const rates = await prisma.dailyRate.findMany({
            where: {
                propertyId: propId,
                roomTypeId: typeId,
                date: {
                    gte: start,
                    lt: end // Pricing is per night, so < checkOut
                }
            }
        });

        // Check if ANY day is closed
        const isClosed = rates.some((r: any) => r.isClosed);
        if (isClosed) continue; 

        // Calculate Price and check Inventory per day
        let totalPrice = 0;
        let valid = true;
        let minInventory = typeData.count; // Start with physical count

        let curr = new Date(start);
        while (curr < end) {
            const dateStr = format(curr, 'yyyy-MM-dd');
            const rate = rates.find((r: any) => format(r.date, 'yyyy-MM-dd') === dateStr);

            // Price
            const price = rate ? rate.price : typeData.basePrice;
            totalPrice += price;

            // Inventory Check
            // Bookings for this specific day
            const dayStart = startOfDay(curr);
            const nextDay = addDays(dayStart, 1);
            
            // Count bookings overlapping this night
            // A booking overlaps if checkIn < nextDay AND checkOut > dayStart
            const bookingsCount = await prisma.booking.count({
                where: {
                    propertyId: propId,
                    roomId: { in: rooms.filter((r: any) => r.roomTypeId === typeId).map((r: any) => r.id) },
                    bookingStatus: { in: ["CONFIRMED", "CHECKED_IN", "PENDING"] }, // Pending blocks too? Usually yes.
                    checkInDate: { lt: nextDay },
                    checkOutDate: { gt: dayStart }
                }
            });

            const override = rate?.availableCount;
            const totalSellable = (override !== null && override !== undefined) 
                ? override 
                : typeData.count;

            const remaining = totalSellable - bookingsCount;
            
            if (remaining <= 0) {
                valid = false;
                break;
            }
            
            minInventory = Math.min(minInventory, remaining);
            curr = addDays(curr, 1);
        }

        if (valid) {
            const allDaysBreakfast = rates.every((r: any) => r.enableBreakfast !== false);

            // Find valid Assignable Room IDs for the whole duration
            const physicalRooms = rooms.filter((r: any) => r.roomTypeId === typeId);
            const assignableRoomIds: number[] = [];

            for (const room of physicalRooms) {
                const conflicts = await prisma.booking.count({
                    where: {
                        roomId: room.id,
                        bookingStatus: { in: ["CONFIRMED", "CHECKED_IN", "PENDING"] },
                        checkInDate: { lt: end },
                        checkOutDate: { gt: start }
                    }
                });
                
                if (conflicts === 0) {
                    assignableRoomIds.push(room.id);
                }
            }

            if (assignableRoomIds.length > 0) {
                availableTypes.push({
                    roomTypeId: typeId,
                    name: typeData.name,
                    description: typeData.description,
                    maxGuests: typeData.maxGuests,
                    isAvailable: true,
                    totalPrice,
                    availableCount: Math.min(minInventory, assignableRoomIds.length), // Ensure we don't oversell
                    breakfastAvailable: allDaysBreakfast,
                    assignableRoomIds // Return ALL available IDs
                });
            }
        }
    }

    res.json(availableTypes);

  } catch (error) {
    console.error("Public search error:", error);
    res.status(500).json({ message: "Search failed", error });
  }
});

export default router;
