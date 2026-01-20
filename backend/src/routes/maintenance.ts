import { Router, Request, Response } from "express";
import { prisma } from "../db";

const router = Router();

// Get requests
router.get("/", async (req: Request, res: Response) => {
  try {
    const { propertyId, status } = req.query;
    
    const where: any = {};
    if (propertyId) where.propertyId = parseInt(propertyId as string);
    if (status) where.status = status as string;

    const requests = await prisma.maintenanceRequest.findMany({
      where,
      include: {
        room: true,
        property: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch maintenance requests", error });
  }
});

// Create request
router.post("/", async (req: Request, res: Response) => {
  try {
    const { propertyId, roomId, title, description, type, priority, assignedTo, estimatedCost, startDate, endDate } = req.body;
    
    if (!propertyId || !title || !type) {
        return res.status(400).json({ message: "Property ID, Title, and Type are required" });
    }

    const request = await prisma.maintenanceRequest.create({
      data: {
        propertyId: parseInt(propertyId),
        roomId: roomId ? parseInt(roomId) : null,
        title,
        description,
        type,
        priority: priority || "NORMAL",
        assignedTo,
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: "OPEN"
      }
    });

    // Optional: If active immediately, update room status? 
    // Usually calendar handles logic, but let's leave room status as generic 'AVAILABLE' or 'MAINTENANCE' text.
    // If startDate is today, maybe set room.status = "MAINTENANCE"
    if (startDate && roomId) {
        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : new Date(startDate);
        const now = new Date();
        
        if (start <= now && end >= now) {
            await prisma.room.update({
                where: { id: parseInt(roomId) },
                data: { status: "MAINTENANCE" }
            });
        }
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: "Failed to create maintenance request", error });
  }
});

// Update request
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, assignedTo, priority, actualCost, estimatedCost, startDate, endDate } = req.body;
    
    const data: any = {};
    if (status) data.status = status;
    if (assignedTo !== undefined) data.assignedTo = assignedTo;
    if (priority) data.priority = priority;
    if (actualCost) data.actualCost = parseFloat(actualCost);
    if (estimatedCost) data.estimatedCost = parseFloat(estimatedCost);
    if (startDate) data.startDate = new Date(startDate);
    if (endDate) data.endDate = new Date(endDate);

    const request = await prisma.maintenanceRequest.update({
      where: { id: parseInt(id) },
      data
    });
    
    // Auto-update room status if requested complete
    if (status === "COMPLETED" && request.roomId) {
         await prisma.room.update({
             where: { id: request.roomId },
             data: { status: "AVAILABLE" } 
         });
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: "Failed to update maintenance request", error });
  }
});

// Delete request
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.maintenanceRequest.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: "Request deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete maintenance request", error });
  }
});

export default router;
