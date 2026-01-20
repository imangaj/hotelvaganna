# Payment & Money Management Guide

## 1. Why you get a "Not Secure" Error
Browsers (Chrome, Edge) automatically block credit card autofill on sites that do not use `https://`.
- **Reason**: You are currently running on `http://` (unencrypted).
- **Fix**: When you deploy to a real server (DigitalOcean/Hetzner) and set up a domain (myhotel.com), we will enable **SSL (HTTPS)**. This error will disappear automatically.

## 2. Where does the money go?
**Currently, NOWHERE.**
The system is in **"Simulation Mode"**.
- The credit card form you see is a **dummy form**.
- It does **not** send data to any bank.
- It simple waits 1.5 seconds and marks the booking as "Paid" in your database.

## 3. How to accept REAL money?
To accept real credit card payments, we need to integrate **Stripe**.

### Steps to Enable Real Payments:
1.  **Create a Stripe Account**: Go to [Stripe.com](https://stripe.com) and sign up.
2.  **Get API Keys**: Get your `Publishable Key` and `Secret Key`.
3.  **Update Code**: I need to replace the "dummy form" with real Stripe code.

### Where is the "Admin Place"?
Once Stripe is connected:
1.  **Stripe Dashboard**: This is where you see your actual balance, payouts to your bank account, and refunds.
2.  **PMS Bookings Page**: In your Admin Panel -> **Bookings**, you will see which guests have paid.

---

## 4. Do you want me to add Stripe now?
If yes, I need you to:
1.  Register at Stripe.com.
2.  Tell me you are ready.
3.  I will write the code to:
    - Add a real credit card form.
    - Connect it to your Stripe account.
    - Record secure transactions.

For now, I can remove the "fake" credit card fields to stop the browser error, or leave them for testing.
