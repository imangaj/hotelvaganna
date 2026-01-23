import express, { Request, Response } from "express";
import Stripe from "stripe";

const router = express.Router();

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Stripe secret key is not configured");
  }
  return new Stripe(secretKey, { apiVersion: "2023-10-16" });
};

router.post("/checkout-session", async (req: Request, res: Response) => {
  try {
    const stripe = getStripe();
    const {
      amount,
      currency = "eur",
      description = "Hotel Booking",
      customerEmail,
      successUrl,
      cancelUrl,
      metadata = {},
    } = req.body || {};

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const success = successUrl || process.env.STRIPE_SUCCESS_URL;
    const cancel = cancelUrl || process.env.STRIPE_CANCEL_URL;

    if (!success || !cancel) {
      return res.status(400).json({ message: "Missing success/cancel URL" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: description,
            },
            unit_amount: Math.round(Number(amount) * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${success}?session_id={CHECKOUT_SESSION_ID}&stripe=success`,
      cancel_url: `${cancel}?stripe=cancel`,
      metadata,
    });

    return res.json({ url: session.url, id: session.id });
  } catch (error: any) {
    console.error("Stripe checkout error", error);
    return res.status(500).json({ message: error.message || "Stripe error" });
  }
});

router.get("/verify-session", async (req: Request, res: Response) => {
  try {
    const stripe = getStripe();
    const sessionId = String(req.query.session_id || "");

    if (!sessionId) {
      return res.status(400).json({ message: "Missing session_id" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return res.json({
      status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency,
      customer_email: session.customer_details?.email || session.customer_email,
    });
  } catch (error: any) {
    console.error("Stripe verify error", error);
    return res.status(500).json({ message: error.message || "Stripe error" });
  }
});

export default router;
