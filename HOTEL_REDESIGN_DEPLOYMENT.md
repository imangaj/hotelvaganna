# Modern hotel experience and durable booking emails

## What changed
- One compact hotel footer on the public and guest pages. Company name, VAT/tax code, REA, address and contact links appear once; share capital is no longer displayed. Verified CIN/CIR can still be added to hotelCompany.ts.
- /rooms lists the actual room categories from the database. /rooms/:id shows the room photo, database description, capacity and availability link. Photos use the existing hotel assets, not reference-site images or invented rooms.
- /booking has a responsive search form, animated skeletons only during live searches, room cards, a sticky stay summary and a three-step room/details/payment flow. Reduced-motion preferences disable animations.
- A paid Stripe return is verified before creating the reservations. The browser shows a welcome/confirmation screen only after booking creation succeeds, then opens the guest's confirmed reservation. A unique checkout key prevents repeated return-page requests from creating duplicate reservations or duplicate email jobs.
- /guest shows photo reservation cards; /guest/reservations/:id shows dates, guest information, extras, recorded payments and arrival information. Saved guest sessions and language preferences remain supported.
- The printable confirmation shares the same visual theme and real photos. All user-provided text is escaped. Printing waits for photos/fonts, and totals come from recorded booking values rather than invented nightly breakdowns. City tax is shown separately as information, not added to the recorded paid total. This is a booking confirmation, not a fiscal invoice.
- Each new booking commits hotel and guest email jobs in the same database write. A worker leases and retries unfinished jobs across restarts. Sent jobs are retained and not automatically re-sent. Guest and hotel delivery are independent.
- HTTPS delivery through Resend works on port 443. SMTP remains an optional transport for environments that allow it. No actual provider key was added to source.
- The existing browser-return Stripe flow is retained. It does not create bookings when a guest pays and never returns to the website; a verified Stripe webhook/checkout-intent redesign would be needed for that separate change.

## Why SMTP may fail on this Droplet
DigitalOcean documents outbound SMTP ports 25, 465 and 587 as blocked by default:
https://docs.digitalocean.com/support/why-is-smtp-blocked/
Libero's SMTP settings use smtp.libero.it:465:
https://aiuto.libero.it/articolo/mail/configurare-libero-mail-con-client-di-posta-imap-e-smtp/
A successful API health check does not test outbound email, provider acceptance, or inbox receipt.

## Configure email privately on the server
Use a transactional HTTPS email provider account. The implemented provider is Resend:
https://resend.com/docs/dashboard/domains/introduction
https://resend.com/docs/api-reference/emails/send-email
Verify a sending domain you own (for example hotelvalganna.it or a subdomain) using the DNS records supplied by the provider. Do not replace the hotel's inbound MX records just to enable sending.

Add these settings to the server-only env file already used for deployment:
MAIL_PROVIDER=resend
RESEND_API_KEY=<private sending key>
MAIL_FROM=Hotel Valganna <reservations@hotelvalganna.it>
BOOKING_NOTIFICATION_EMAIL=hotel.valganna@libero.it
FRONTEND_URL=https://hotelvalganna.it

MAIL_FROM must be a verified sender. Libero remains the hotel recipient and reply-to mailbox; it cannot be used as the Resend sending domain because you do not own libero.it. No API keys/passwords should be pasted into chat or committed. Keep the previous SMTP password rotation requirement in place.

The API supports a stable idempotency key per delivery:
https://resend.com/docs/dashboard/emails/idempotency-keys
Provider idempotency is retained for 24 hours; the database sent flag provides the persistent normal-case guard. A crash after provider acceptance but before storing sentAt can still produce a duplicate after that provider window. Provider acceptance does not guarantee inbox placement; inspect provider delivery/bounce logs.

## Migration and rollout
This version adds nullable bookings.checkoutKey and booking_email_deliveries. A database migration is required BEFORE starting the new backend. Existing reservations are preserved and historical email is not automatically backfilled or sent.

1. Take and verify a fresh SQLite backup and preserve the running images/settings.
2. Inspect the production Prisma migration history before deciding how to apply pending migrations. Do not use db push, migrate reset or schema recreation on production.
3. Build backend and frontend sequentially using the existing private env file (the 1 GB Droplet needs its existing swap).
4. If the production migration history matches the repository, run prisma migrate deploy from the new backend image with the persistent Prisma folder mounted, while the old backend is still running. Otherwise reconcile/baseline the existing history before applying the additive SQL migration. Never skip the migration and restart.
5. Start the new containers with the same persistent database mount.
6. Check backend, frontend /api/health, /api/public/room-types and a normal staff/guest session.
7. Run docker exec pms-backend node scripts/mail-status.cjs. This reports the provider, configuration presence and delivery status codes, without printing keys, passwords or guest payloads.
8. With a verified provider configured, make an explicitly authorized test reservation and confirm both the guest and hotel inboxes plus the provider's delivery logs. Do not use live charges just to test the UI.
9. To expedite failed/pending jobs for one booking after fixing provider settings: docker exec pms-backend node scripts/retry-booking-mail.cjs BOOKING_ID. This does not re-send successful jobs or enqueue historical bookings.

The outbox holds guest information needed to deliver confirmations, just as the booking tables do. Keep database backups private and apply the hotel's retention policy to sent delivery records as appropriate.

## Verification
The workflow runs session/email/print regressions, both production builds, and integration checks for the room catalogue, invalid search inputs, staff/guest auth, reservation history, duplicate checkout handling and durable two-recipient email jobs.
No live website, real booking, payment or outbound email was changed during implementation. Visual browser QA and live provider delivery must be checked during deployment because browser control and server credentials were unavailable here.
