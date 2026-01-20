# ⚡ QUICK START - 5 MINUTE SETUP

**Windows Only - For fastest setup**

---

## 📋 Prerequisites Check

Open PowerShell and verify:

```powershell
# Check Node.js
node --version    # Should show v18 or newer

# Check npm
npm --version     # Should show 9 or newer

# Check PostgreSQL
psql --version    # Should show PostgreSQL 12 or newer
```

If any command fails, install from:
- **Node.js:** https://nodejs.org/ (LTS)
- **PostgreSQL:** https://postgresql.org/download/windows/

---

## 🚀 Step 1: Create Database (2 minutes)

Open PowerShell **as Administrator:**

```powershell
# Connect to PostgreSQL
psql -U postgres

# In psql prompt, paste these lines one by one:
CREATE USER pms_user WITH PASSWORD 'pms_password';
CREATE DATABASE pms_db OWNER pms_user;
GRANT ALL PRIVILEGES ON DATABASE pms_db TO pms_user;

# Exit psql
\q
```

✅ **Done! Database created.**

---

## 🚀 Step 2: Setup Backend (2 minutes)

Open PowerShell in `D:\prog\pms-system\backend`:

```powershell
# Navigate
cd D:\prog\pms-system\backend

# Install dependencies
npm install

# Create .env file
@"
DATABASE_URL=postgresql://pms_user:pms_password@localhost:5432/pms_db
JWT_SECRET=your_jwt_secret_key_here_change_in_production
NODE_ENV=development
PORT=5000
"@ | Out-File .env

# Run migrations
npm run prisma:migrate -- --name init

# Start backend
npm run dev
```

✅ **Backend running on port 5000**

**Keep this terminal open!** You should see: `Listening on port 5000`

---

## 🚀 Step 3: Setup Frontend (1 minute)

Open **new PowerShell** in `D:\prog\pms-system\frontend`:

```powershell
# Navigate
cd D:\prog\pms-system\frontend

# Install dependencies
npm install

# Start frontend
npm run dev
```

✅ **Frontend running on port 3000**

You should see: `VITE v... ready in ... ms` and a URL like `http://localhost:3000`

---

## 🎉 Step 4: Access System

**Open browser:** http://localhost:3000

You'll see the login page. **Register a new account:**

```
Email:    test@example.com
Password: Test@123456
Name:     Test User
```

Click **Register** → **Login** → **Dashboard appears!**

---

## ✅ Verify Everything Works

### Test Backend API

```powershell
# In a third PowerShell window:
Invoke-RestMethod -Uri "http://localhost:5000/api/health"
```

Should return: `{"status":"ok"}`

### Test Frontend

- You're already viewing it at http://localhost:3000
- Sidebar shows: Properties, Rooms, Bookings, Channels

---

## 🧪 Quick Test Flow

1. **Create Property**
   - Click "Properties" in sidebar
   - Click "Add Property"
   - Fill in hotel details
   - Click "Create"

2. **Add Rooms**
   - Click "Rooms" in sidebar
   - Select your property
   - Click "Add Room"
   - Fill in room details
   - Click "Create"

3. **Create Booking**
   - Click "Bookings" in sidebar
   - Click "Add Booking"
   - Fill in guest & date info
   - Click "Create"

4. **View Dashboard**
   - Dashboard shows all your data
   - Real-time updates when you add data

---

## 🛑 Stop Services

When done, press `Ctrl+C` in each terminal:

1. **Backend terminal:** `Ctrl+C`
2. **Frontend terminal:** `Ctrl+C`
3. PostgreSQL keeps running (that's fine)

---

## ⚠️ Common Issues

| Problem | Solution |
|---------|----------|
| "node: command not found" | Install Node.js from nodejs.org |
| "psql: command not found" | Install PostgreSQL or add to PATH |
| "Port 5000 already in use" | Kill other node process or change PORT in .env |
| "Cannot connect to database" | Check psql connection, verify credentials |
| "Frontend won't load" | Check backend is running (port 5000) |

---

## 📚 Full Documentation

For detailed information:
- [GETTING_STARTED.md](GETTING_STARTED.md) - Full setup guide
- [MANUAL_SETUP.md](MANUAL_SETUP.md) - Detailed manual setup
- [README.md](README.md) - API documentation
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment

---

## 🎯 What's Running

```
Frontend (React)      → http://localhost:3000
Backend (Express)     → http://localhost:5000
Database (PostgreSQL) → localhost:5432
```

All three must be running for the system to work!

---

**✨ You're done! Your PMS is live in 5 minutes!** 🚀

For help, check the docs or re-read the steps above.
