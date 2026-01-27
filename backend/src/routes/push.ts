import { Router, Request, Response } from "express";
import authMiddleware from "../middleware/auth";
import { getPublicKey, removeSubscription, saveSubscription } from "../utils/push";

const router = Router();

router.get("/vapid-public-key", (_req: Request, res: Response) => {
  res.json({ publicKey: getPublicKey() });
});

router.post("/subscribe", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { subscription } = req.body || {};
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ message: "Invalid subscription" });
    }

    const userId = (req as any).user?.userId ? Number((req as any).user.userId) : null;

    await saveSubscription({
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userId,
      userAgent: req.headers["user-agent"],
    });

    res.json({ ok: true });
  } catch (error) {
    console.error("Push subscribe error", error);
    res.status(500).json({ message: "Failed to save subscription" });
  }
});

router.post("/unsubscribe", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ message: "Endpoint required" });
    await removeSubscription(endpoint);
    res.json({ ok: true });
  } catch (error) {
    console.error("Push unsubscribe error", error);
    res.status(500).json({ message: "Failed to remove subscription" });
  }
});

export default router;
