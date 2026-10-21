import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { getJwtSecret } from "../utils/authConfig";

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
    const payload = jwt.verify(token, getJwtSecret(true)) as jwt.JwtPayload;
    if (typeof payload.email !== "string" || !payload.email || payload.userId !== undefined) {
      return res.status(401).json({ message: "Invalid guest token" });
    }
    req.guest = { email: payload.email };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired guest token" });
  }
};
