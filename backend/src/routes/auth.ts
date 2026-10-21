import { Router, Request, Response } from "express";
import { prisma } from "../db";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();
import { getJwtSecret } from "../utils/authConfig";
import authMiddleware from "../middleware/auth";

interface AuthRequest extends Request {
  user?: any;
}

// Register
router.post("/register", async (req: AuthRequest, res: Response) => {
  return res.status(403).json({
    message: "Registration is disabled. Please contact an administrator.",
  });
});

// Login
router.post("/login", async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email: email.trim() } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      getJwtSecret(),
      { expiresIn: "7d" } as any
    );

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error });
  }
});

router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!user) return res.status(401).json({ message: "Session is no longer valid" });
    return res.json(user);
  } catch {
    return res.status(500).json({ message: "Unable to validate session" });
  }
});

export default router;
