import { Router, Request, Response } from "express";
import { prisma } from "../db";

const router = Router();

// Get all properties
router.get("/", async (req: Request, res: Response) => {
  try {
    const properties = await prisma.property.findMany({
      include: { rooms: true },
    });
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch properties", error });
  }
});

// Get property by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const property = await prisma.property.findUnique({
      where: { id: parseInt(id) },
      include: { rooms: true, bookings: true, channels: true },
    });

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    res.json(property);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch property", error });
  }
});

// Create property
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, description, address, city, country, zipCode, phone, email } =
      req.body;

    const property = await prisma.property.create({
      data: {
        name,
        description,
        address,
        city,
        country,
        zipCode,
        phone,
        email,
      },
    });

    res.status(201).json(property);
  } catch (error) {
    res.status(500).json({ message: "Failed to create property", error });
  }
});

// Update property
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, address, city, country, zipCode, phone, email } =
      req.body;

    const property = await prisma.property.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
        address,
        city,
        country,
        zipCode,
        phone,
        email,
      },
    });

    res.json(property);
  } catch (error) {
    res.status(500).json({ message: "Failed to update property", error });
  }
});

// Delete property
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.property.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: "Property deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete property", error });
  }
});

export default router;
