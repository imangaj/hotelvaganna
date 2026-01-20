import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../db";
import bcrypt from "bcryptjs";
import authMiddleware from "../middleware/auth";

const router = Router();

interface AuthRequest extends Request {
  user?: { userId?: number };
}

const requireRole = (allowedRoles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!user || !allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      next();
    } catch (error) {
      return res.status(500).json({ message: "Authorization check failed" });
    }
  };
};

router.use(authMiddleware);

// Get all users (Staff)
router.get("/", requireRole(["ADMIN", "MANAGER", "RECEPTION"]), async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users", error });
  }
});

// Create new staff
router.post("/", requireRole(["ADMIN", "MANAGER"]), async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "STAFF"
      },
      select: { id: true, name: true, email: true, role: true }
    });

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to create user", error });
  }
});

// Update user (role, etc)
router.put("/:id", requireRole(["ADMIN", "MANAGER"]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role, name, email, password } = req.body;
    
    const data: any = {};
    if (role) data.role = role;
    if (name) data.name = name;
    if (email) data.email = email;
    if (password) data.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data,
      select: { id: true, name: true, email: true, role: true }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to update user", error });
  }
});

// Delete user
router.delete("/:id", requireRole(["ADMIN", "MANAGER"]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user", error });
  }
});

export default router;
