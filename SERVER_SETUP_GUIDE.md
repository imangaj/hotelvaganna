# Server Setup & Deployment Guide

## 1. Prepare Your Server (DigitalOcean/Hetzner)
1.  **Create a Droplet/Server**: Choose Ubuntu 22.04 or 24.04.
2.  **Login**: `ssh root@your_server_ip`
3.  **Install Docker & Git**:
    ```bash
    apt update
    apt install -y docker.io docker-compose git
    ```

## 2. Deploy Your PMS
Run these commands on your server:

```bash
# 1. Clone your project (or upload your files via SFTP)
git clone https://github.com/yourusername/pms-system.git
cd pms-system

# 2. Build and Run
docker-compose up -d --build
```

## 3. Persistent Data (SQLite)
Because we configured `docker-compose.yml` to save data to `./backend/prisma`, your database file `dev.db` is safe even if you restart containers.
- **Backup**: To backup your database, just download `backend/prisma/dev.db`.

## 4. Accessing the Site
- **Backend API**: `http://your_server_ip:5000`
- **Frontend**: `http://your_server_ip:3000`
- **Note**: For a real domain (myhotel.com), you should set up Nginx as a "Reverse Proxy".

## 5. (Optional) Production Optimization
Currently, the system runs in "Development Mode" (React dev server).
To make it faster and more secure for a real hotel:
1.  Change `docker-compose.yml`:
    - Update `frontend` to use a production build (requires Nginx).
    - Change backend command to `npm start`.
