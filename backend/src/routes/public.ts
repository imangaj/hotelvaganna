import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { addDays, differenceInCalendarDays, format, startOfDay } from "date-fns";

const router = Router();

const SPECIAL_SECOND_FLOOR = new Set([204, 205]);
const SPECIAL_FOURTH_FLOOR = new Set([411, 412, 413, 414]);

const parseRoomNumber = (roomNumber: string): number => {
    const digits = roomNumber.match(/\d+/g)?.join("") || "";
    const num = parseInt(digits, 10);
    return Number.isNaN(num) ? 9999 : num;
};

const getRoomPriority = (roomNumber: string) => {
    const num = parseRoomNumber(roomNumber);
    if (num >= 100 && num < 200) return { group: 0, num };
    if (SPECIAL_SECOND_FLOOR.has(num)) return { group: 1, num };
    if (SPECIAL_FOURTH_FLOOR.has(num)) return { group: 2, num };
    if (num >= 200 && num < 400) return { group: 3, num };
    if (num >= 400 && num < 500) return { group: 4, num };
    return { group: 5, num };
};

const sortRoomsByPreference = (rooms: any[]) => {
    return [...rooms].sort((a, b) => {
        const pa = getRoomPriority(a.roomNumber);
        const pb = getRoomPriority(b.roomNumber);
        if (pa.group !== pb.group) return pa.group - pb.group;
        return pa.num - pb.num;
    });
};

const isMatrimonialePiccola = (name: string) => {
    const n = name.toLowerCase();
    return n.includes("matrimoniale") && (n.includes("piccola") || n.includes("picola"));
};

const isMatrimonialeStandard = (name: string) => {
    const n = name.toLowerCase();
    return n.includes("matrimoniale") && !n.includes("piccola") && !n.includes("picola");
};

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
    const roomTypesArray = Array.from(roomTypesMap.entries());
    const standardMatrimonialeType = roomTypesArray.find(([, data]: any) => isMatrimonialeStandard(data.name));

    const checkTypeAvailability = async (typeId: number, typeData: any) => {
        // Get Rates & Flags for the range
        const rates = await prisma.dailyRate.findMany({
            where: {
                propertyId: propId,
                roomTypeId: typeId,
                date: {
                    gte: start,
                    lt: end
                }
            }
        });

        const isClosed = rates.some((r: any) => r.isClosed);
        if (isClosed) return { valid: false };

        let totalPrice = 0;
        let valid = true;
        let minInventory = typeData.count;

        let curr = new Date(start);
        while (curr < end) {
            const dateStr = format(curr, 'yyyy-MM-dd');
            const rate = rates.find((r: any) => format(r.date, 'yyyy-MM-dd') === dateStr);

            const price = rate ? rate.price : typeData.basePrice;
            totalPrice += price;

            const dayStart = startOfDay(curr);
            const nextDay = addDays(dayStart, 1);

            const bookingsCount = await prisma.booking.count({
                where: {
                    propertyId: propId,
                    roomId: { in: rooms.filter((r: any) => r.roomTypeId === typeId).map((r: any) => r.id) },
                    bookingStatus: { in: ["CONFIRMED", "CHECKED_IN", "PENDING"] },
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

        const allDaysBreakfast = rates.every((r: any) => r.enableBreakfast !== false);

        return { valid, totalPrice, minInventory, allDaysBreakfast };
    };

    // 2. For each Room Type, check availability sequence
    for (const [typeId, typeData] of roomTypesArray) {
        // Capacity check: Can the requested number of rooms accommodate the guests?
        // Assumes guests can be distributed optimally.
        if ((typeData.maxGuests * requiredRooms) < guestCount) continue;

        const availability = await checkTypeAvailability(typeId, typeData);
        let valid = availability.valid;
        let totalPrice = availability.totalPrice ?? 0;
        let minInventory = availability.minInventory ?? typeData.count;
        let allDaysBreakfast = availability.allDaysBreakfast ?? true;

        let fallbackTypeData = null as any;
        let fallbackTypeId = null as number | null;

        if (!valid && isMatrimonialePiccola(typeData.name) && standardMatrimonialeType) {
            const [standardTypeId, standardTypeData] = standardMatrimonialeType as any;
            const standardAvailability = await checkTypeAvailability(standardTypeId, standardTypeData);
            if (standardAvailability.valid) {
                fallbackTypeData = standardTypeData;
                fallbackTypeId = standardTypeId;
                valid = true;
                totalPrice = standardAvailability.totalPrice ?? 0;
                minInventory = standardAvailability.minInventory ?? standardTypeData.count;
                allDaysBreakfast = standardAvailability.allDaysBreakfast ?? true;
            }
        }

        if (valid) {
            const effectiveTypeId = fallbackTypeId || typeId;

            // Find valid Assignable Room IDs for the whole duration
            const physicalRooms = sortRoomsByPreference(rooms.filter((r: any) => r.roomTypeId === effectiveTypeId));

            const buildAssignableRoomIds = async (orderedRooms: any[]) => {
                const ids: number[] = [];
                for (const room of orderedRooms) {
                    const conflicts = await prisma.booking.count({
                        where: {
                            roomId: room.id,
                            bookingStatus: { in: ["CONFIRMED", "CHECKED_IN", "PENDING"] },
                            checkInDate: { lt: end },
                            checkOutDate: { gt: start }
                        }
                    });
                    if (conflicts === 0) {
                        ids.push(room.id);
                    }
                }
                return ids;
            };

            let assignableRoomIds = await buildAssignableRoomIds(physicalRooms);

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
