# Remaining Tasks for Cloud Deployment

## 1. Cloud & Server Setup
- [ ] **Buy Domain Name** (e.g., Namecheap, Cloudflare).
- [ ] **Buy VPS Server** (DigitalOcean, Hetzner).
- [ ] **Deploy Application**:
  - Clone code to server.
  - Run `docker-compose up`.
- [ ] **Configure Nginx**:
  - Set up Reverse Proxy.
  - Install free SSL Certificate (Let's Encrypt / Certbot).
  - *Effect: Browser "Not Secure" warning disappears.*

## 2. Payment Integration (Post-Deployment)
Once the server is running with SSL (`https://`):
- [ ] **Configure Stripe**:
  - Add Secret/Public keys to `.env` file on server.
- [ ] **Frontend Update**:
  - Replace "Simulation Mode" form with real Stripe Elements.
- [ ] **Webhooks**:
  - Configure Stripe Webhooks to auto-confirm bookings when payment succeeds.

## 3. Final Production Checks
- [ ] Disable "Test Mode" label in `PublicSite.tsx`.
- [ ] Change database to PostgreSQL (optional, for better performance).
- [ ] Set up automated database backups.
