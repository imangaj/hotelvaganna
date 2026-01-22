import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const GUEST_JWT_SECRET = process.env.GUEST_JWT_SECRET || process.env.JWT_SECRET || "secret_jwt_key_change_in_production";

export interface GuestAuthRequest extends Request {
  guest?: {
    email: string;
  };
}

export const requireGuestAuth = (req: GuestAuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return res.status(401).json({ message: "Missing guest token" });
  }

  try {
    const payload = jwt.verify(token, GUEST_JWT_SECRET) as { email: string };
    req.guest = { email: payload.email };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired guest token" });
  }
};
