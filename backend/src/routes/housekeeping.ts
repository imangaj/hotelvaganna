import { Router, Request, Response } from "express";
import { prisma } from "../db";

const router = Router();

// Get tasks (optionally filter by property)
router.get("/", async (req: Request, res: Response) => {
  try {
    const { propertyId, status } = req.query;
    
    const where: any = {};
    if (propertyId) where.propertyId = parseInt(propertyId as string);
    if (status) where.status = status as string;

    const tasks = await prisma.housekeepingTask.findMany({
      where,
      include: {
        room: true,
        property: true,
        assignee: { select: { id: true, name: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch housekeeping tasks", error });
  }
});

// Create task
router.post("/", async (req: Request, res: Response) => {
  try {
    const { propertyId, roomId, title, description, priority, assignedToUserId } = req.body;
    
    // Validate required fields
    if (!propertyId || !title) {
        return res.status(400).json({ message: "Property ID and Title are required" });
    }

    const task = await prisma.housekeepingTask.create({
      data: {
        propertyId: parseInt(propertyId),
        roomId: roomId ? parseInt(roomId) : null,
        title,
        description,
        priority: priority || "NORMAL",
        assignedToUserId: assignedToUserId ? parseInt(assignedToUserId) : null,
        status: "PENDING"
      }
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Failed to create housekeeping task", error });
  }
});

// Update task
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, assignedToUserId, priority, description } = req.body;
    
    const task = await prisma.housekeepingTask.update({
      where: { id: parseInt(id) },
      data: {
        status,
        assignedToUserId: assignedToUserId === null ? null : (assignedToUserId ? parseInt(assignedToUserId) : undefined),
        priority,
        description
      },
      include: { assignee: true }
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Failed to update housekeeping task", error });
  }
});

// Delete task
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.housekeepingTask.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete housekeeping task", error });
  }
});

export default router;
