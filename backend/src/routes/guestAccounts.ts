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

// List guest accounts
router.get("/", requireRole(["ADMIN", "MANAGER"]), async (_req: Request, res: Response) => {
  try {
    const accounts = await prisma.guestAccount.findMany({
      select: { id: true, email: true, createdAt: true, updatedAt: true },
      orderBy: { email: "asc" },
    });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch guest accounts", error });
  }
});

// Update guest account (email)
router.put("/:id", requireRole(["ADMIN", "MANAGER"]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    const data: { email?: string } = {};
    if (email) data.email = email;

    const account = await prisma.guestAccount.update({
      where: { id: parseInt(id) },
      data,
      select: { id: true, email: true, createdAt: true, updatedAt: true },
    });
    res.json(account);
  } catch (error) {
    res.status(500).json({ message: "Failed to update guest account", error });
  }
});

// Reset guest password
router.post("/:id/reset-password", requireRole(["ADMIN", "MANAGER"]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.guestAccount.update({
      where: { id: parseInt(id) },
      data: { passwordHash },
    });

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to reset password", error });
  }
});

// Delete guest account
router.delete("/:id", requireRole(["ADMIN", "MANAGER"]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.guestAccount.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Guest account deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete guest account", error });
  }
});

export default router;