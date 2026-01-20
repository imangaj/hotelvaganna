import { Router, Request, Response } from "express";
import { prisma } from "../db";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "secret_jwt_key_change_in_production";

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

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
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

export default router;
