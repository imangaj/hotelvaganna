import express, { Express, Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

// Import routes
import authRoutes from "./routes/auth";
import propertyRoutes from "./routes/property";
import roomRoutes from "./routes/room";
import bookingsRoutes from "./routes/booking";
import channelRoutes from "./routes/channel";
import guestRoutes from "./routes/guest";
import hotelProfileRoutes from "./routes/hotelProfile";
import housekeepingRoutes from "./routes/housekeeping";
import maintenanceRoutes from "./routes/maintenance";
import pricingRoutes from "./routes/pricing";
import ratesRoutes from "./routes/rates";
import dashboardRoutes from "./routes/dashboard";
import publicRoutes from "./routes/public";
import userRoutes from "./routes/users";
import guestAuthRoutes from "./routes/guestAuth";
import guestAccountRoutes from "./routes/guestAccounts";
import paymentsRoutes from "./routes/payments";
import pushRoutes from "./routes/push";

dotenv.config();

const app: Express = express();
const port = parseInt(process.env.PORT || "5000", 10);
const host = process.env.HOST || "0.0.0.0"; // Default to 0.0.0.0 for Docker compatibility

// Initialize Prisma Client - Moved to db.ts to avoid circular dependencies
// import { prisma } from "./db"; 

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS Middleware - simpler approach
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Health check endpoint
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Root endpoint
app.get("/", (req: Request, res: Response) => {
  res.json({ 
    message: "PMS Backend API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      properties: "/api/properties",
      rooms: "/api/rooms",
      bookings: "/api/bookings",
      channels: "/api/channels",
      guests: "/api/guests",
      hotelProfile: "/api/hotel-profile",
      housekeeping: "/api/housekeeping",
      maintenance: "/api/maintenance",
      pricing: "/api/pricing",
      rates: "/api/rates"
    }
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/bookings", bookingsRoutes); // Changed variable name in previous step
app.use("/api/channels", channelRoutes);
app.use("/api/guests", guestRoutes);
app.use("/api/hotel-profile", hotelProfileRoutes);
app.use("/api/housekeeping", housekeepingRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/pricing", pricingRoutes);
app.use("/api/rates", ratesRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/users", userRoutes);
app.use("/api/guest-auth", guestAuthRoutes);
app.use("/api/guest-accounts", guestAccountRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/push", pushRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Not Found" });
});

// Error handling middleware (must have 4 params)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

// Start server
if (process.env.VITEST) {
  // For testing, we export the app
} else {
  app.listen(port, host, () => {
    const hostLabel = host === "0.0.0.0" ? "localhost" : host;
    console.log(`🚀 Server is running at http://${hostLabel}:${port}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  });
}

export { app };
