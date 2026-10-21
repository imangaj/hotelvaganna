# Login, guest portal, footer, and booking email fixes

## Behavior

- The PMS validates saved sessions against GET /api/auth/me. Expired or rejected sessions return to login automatically, without deleting browser history, language preferences, or the guest session.
- Signing and verification resolve the same JWT secret after environment loading. Staff tokens must contain a staff userId; guest tokens cannot be used as staff tokens.
- API responses use Cache-Control: no-store. Vite prefers TypeScript sources to legacy generated JavaScript siblings.
- The guest portal, recovery form, and reservation details support English, Italian, and Chinese. The language preference and guest token persist in the browser; a valid token restores the guest profile and full booking history on reopening. After the seven-day token expires, signing in again reloads history from the database.
- The footer identifies HOTEL VALGANNA S.R.L., VAT/tax ID 03192130965, registered office Via Giovanni Battista Varè 32, 20158 Milano, REA MI-1656828, and share capital €11,000. Source supplied by the owner: https://www.ufficiocamerale.it/6783/hotel-valganna-srl . This directory is not an official visura; confirm changes against company records. No paid-up-capital status, CIN, CIR, or PEC was inferred. Add verified CIN/CIR/PEC values to frontend/src/public/hotelCompany.ts when available.
- Hotel and guest notifications send independently, with up to three attempts each, and include guest contact details, dates, room, occupancy, extras, total, paid amount, payment status, source, and notes. User-supplied HTML is escaped. Missing SMTP settings and permanent failures produce explicit backend errors instead of silently skipping.
- Mail retries are in-process, not a durable delivery queue; permanent SMTP errors or server termination still require operational follow-up. The Stripe flow still creates bookings after the browser returns from payment; this change does not replace that flow with a webhook.

## Before deployment

1. Rotate the SMTP password that was previously committed to this public repository. Removing it from the current compose file does not remove it from Git history.
2. Set JWT_SECRET on the server to a strong secret. If changing the deployed signing secret, existing sessions will need one new login. GUEST_JWT_SECRET is optional.
3. Set SMTP_PASS through the server environment or a local, untracked root .env used by Docker Compose. Existing compose defaults retain smtp.libero.it, port 465 and the hotel sender. Other SMTP deployments must set the backend SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_FROM as appropriate. Never put these secrets in the frontend or Git.
4. Set BOOKING_NOTIFICATION_EMAIL to the hotel inbox that should receive reservations (default hotel.valganna@libero.it); FRONTEND_URL defaults to https://hotelvalganna.it for password recovery links.
5. Confirm the deployed server is using this repository and the intended production database. No database migration is required.

## Deploy using this repository's Compose configuration

Run from the checkout on the existing host, after configuring secrets:

```sh
docker compose build backend frontend
docker compose up -d backend frontend
docker compose logs --tail=100 backend
```

The frontend now has a build section; the prior configuration pulled a prebuilt image and setting VITE_API_URL only at runtime did not affect the compiled website. The default build uses same-origin /api. Keep the existing reverse proxy forwarding /api to the backend; Vite preview inherits the configured backend proxy on the Compose network. Preserve HTTPS and the site's existing hostname/proxy configuration.

## Validation

Local dependency-free regression checks:

```sh
node --test scripts/auth-booking-regression.test.cjs
```

Use Node 24 for this test harness (the application build target is unchanged). The GitHub workflow runs these checks, both production builds, and real API login/history checks against a fresh SQLite CI database.

Production acceptance: log in as staff, open staff and guest-account lists, reopen PMS with an expired token and sign in again; create/sign into a guest account, switch languages, reopen the portal and inspect past/upcoming reservations; check the footer on mobile; make an authorized test reservation and confirm hotel and guest inbox receipt. No real booking, charge, email, or production data change was performed during development.
