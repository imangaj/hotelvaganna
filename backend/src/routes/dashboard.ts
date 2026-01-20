import { Router, Request, Response } from "express";
import { prisma } from "../db";

const router = Router();

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const [
      propertyCount,
      roomCount,
      activeBookingsCount,
      totalRevenueResult
    ] = await Promise.all([
      prisma.property.count(),
      prisma.room.count(),
      prisma.booking.count({
        where: {
          bookingStatus: {
            in: ["CONFIRMED", "CHECKED_IN"]
          }
        }
      }),
      prisma.booking.aggregate({
        _sum: {
          totalPrice: true
        },
        where: {
          bookingStatus: {
            notIn: ["CANCELLED"]
          }
        }
      })
    ]);

    res.json({
      properties: propertyCount,
      rooms: roomCount,
      bookings: activeBookingsCount,
      revenue: totalRevenueResult._sum.totalPrice || 0
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ message: "Failed to fetch dashboard stats", error });
  }
});

export default router;
