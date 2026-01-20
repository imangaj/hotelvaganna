import { Router, Request, Response } from "express";
import { prisma } from "../db";

const router = Router();

// Get prices for a room in a date range
router.get("/", async (req: Request, res: Response) => {
  try {
    const { roomId, startDate, endDate } = req.query;
    
    if (!roomId || !startDate || !endDate) {
        return res.status(400).json({ message: "roomId, startDate, and endDate are required" });
    }

    const prices = await prisma.dailyPrice.findMany({
      where: {
        roomId: parseInt(roomId as string),
        date: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        }
      }
    });
    res.json(prices);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch prices", error });
  }
});

// Set price (upsert)
router.post("/", async (req: Request, res: Response) => {
  try {
    const { roomId, date, price } = req.body;
    
    if (!roomId || !date || price === undefined) {
        return res.status(400).json({ message: "roomId, date, and price are required" });
    }

    const priceRecord = await prisma.dailyPrice.upsert({
      where: {
        roomId_date: {
          roomId: parseInt(roomId),
          date: new Date(date)
        }
      },
      update: {
        price: parseFloat(price)
      },
      create: {
        roomId: parseInt(roomId),
        date: new Date(date),
        price: parseFloat(price)
      }
    });
    res.json(priceRecord);
  } catch (error) {
    res.status(500).json({ message: "Failed to set price", error });
  }
});

export default router;
