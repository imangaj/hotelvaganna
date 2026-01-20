# 🚀 MANUAL SETUP GUIDE - Property Management System

Since Docker daemon is not running, follow this guide to set up the system manually on Windows.

---

## Step 1: Install Node.js (Required)

### Option A: Using Chocolatey (Recommended for Windows)
```powershell
# Run PowerShell as Administrator, then:
choco install nodejs -y
```

### Option B: Direct Download
1. Visit https://nodejs.org/
2. Download **LTS version** (18.x or newer)
3. Run installer, use default settings
4. Verify installation:
```powershell
node --version
npm --version
```

### Option C: Using Windows Package Manager
```powershell
winget install OpenJS.NodeJS.LTS
```

---

## Step 2: Install PostgreSQL (Required)

### Option A: Using Chocolatey
```powershell
choco install postgresql -y
```
When prompted, set password for `postgres` user (remember this!)

### Option B: Direct Download
1. Visit https://www.postgresql.org/download/windows/
2. Download PostgreSQL 15+ installer
3. Run installer:
   - Password for postgres user: `pms_password` (or your choice)
   - Port: 5432
   - Locale: Default
4. Complete installation

### Option C: Using Windows Package Manager
```powershell
winget install PostgreSQL.PostgreSQL
```

---

## Step 3: Create Database

Open PostgreSQL command line (psql):

```powershell
# In PowerShell:
psql -U postgres

# Then in psql prompt:
CREATE USER pms_user WITH PASSWORD 'pms_password';
CREATE DATABASE pms_db OWNER pms_user;
GRANT ALL PRIVILEGES ON DATABASE pms_db TO pms_user;
\q
```

Or create script file `create-db.sql`:
```sql
CREATE USER pms_user WITH PASSWORD 'pms_password';
CREATE DATABASE pms_db OWNER pms_user;
GRANT ALL PRIVILEGES ON DATABASE pms_db TO pms_user;
```

Then run:
```powershell
psql -U postgres -f create-db.sql
```

---

## Step 4: Setup Backend

```powershell
# Navigate to backend
cd D:\prog\pms-system\backend

# Install dependencies
npm install

# Create .env file
echo "DATABASE_URL=postgresql://pms_user:pms_password@localhost:5432/pms_db" > .env
echo "JWT_SECRET=your_jwt_secret_key_here_change_in_production" >> .env
echo "NODE_ENV=development" >> .env
echo "PORT=5000" >> .env

# Run Prisma migrations
npm run prisma:migrate

# Start backend (will run on port 5000)
npm run dev
```

---

## Step 5: Setup Frontend (New Terminal)

Open **new PowerShell window**:

```powershell
# Navigate to frontend
cd D:\prog\pms-system\frontend

# Install dependencies
npm install

# Start frontend (will run on port 3000)
npm run dev
```

---

## Step 6: Access the System

Once both services are running:

**Frontend (Admin Dashboard):**
- URL: http://localhost:3000
- Register a new account
- Login to access dashboard

**Backend API:**
- Health check: http://localhost:5000/api/health
- Should return `{ "status": "ok" }`

**API Documentation:**
- See `GETTING_STARTED.md` for endpoint details
- See `README.md` for API reference

---

## ✅ Verification Checklist

### PostgreSQL Running
```powershell
# Check if PostgreSQL is running
psql -U pms_user -d pms_db -c "SELECT version();"
```

### Backend Running
```powershell
# Test backend health
Invoke-RestMethod -Uri "http://localhost:5000/api/health"
# Should return: {"status":"ok"}
```

### Frontend Running
```powershell
# Open in browser
Start-Process http://localhost:3000
```

---

## 🧪 Test User Account

Once system is running, register with:
- **Email:** test@example.com
- **Password:** Test@123456
- **Name:** Test User

---

## 📝 Environment Variables

Backend `.env` file should contain:
```
DATABASE_URL=postgresql://pms_user:pms_password@localhost:5432/pms_db
JWT_SECRET=your_jwt_secret_key_here_change_in_production
NODE_ENV=development
PORT=5000
```

Frontend uses hardcoded API URL: `http://localhost:5000`
(Update `frontend/src/api/client.ts` if needed)

---

## 🛑 Stopping Services

### Stop Frontend
- In terminal where frontend is running, press `Ctrl+C`

### Stop Backend  
- In terminal where backend is running, press `Ctrl+C`

### Stop PostgreSQL
```powershell
# Windows only - Stop the service:
Get-Service PostgreSQL* | Stop-Service
```

---

## ❌ Troubleshooting

### "node: command not found"
- Node.js not installed or not in PATH
- Restart PowerShell after installation
- Verify: `node --version`

### "npm ERR! code ENOENT"
- Missing package.json
- Verify you're in correct directory: `cd D:\prog\pms-system\backend`
- Check file exists: `ls package.json`

### "FATAL: database 'pms_db' does not exist"
- Database not created
- Run: `psql -U postgres -f create-db.sql`

### "Port 5000 already in use"
- Backend service already running or another app using port
- Kill process: `Get-Process -Name node | Stop-Process -Force`
- Or use different port: Change PORT in backend `.env`

### "Connection refused" on localhost:3000
- Frontend not started
- Verify frontend terminal shows "VITE v..." message
- Check for compilation errors

### "ECONNREFUSED" in frontend console
- Backend not running
- Start backend: `cd backend && npm run dev`
- Wait for "Listening on port 5000" message

### Database migration errors
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Run: `npm run prisma:migrate -- --name init`

---

## 📊 System Architecture

```
┌─────────────────────────────────────────┐
│         Frontend (React)                 │
│       http://localhost:3000              │
│                                           │
│  - AuthPage (Login/Register)              │
│  - AdminDashboard (Properties/Rooms)      │
│  - BookingForm (Create bookings)          │
│  - AvailabilitySearch (Search rooms)      │
└────────────────┬────────────────────────┘
                 │ (Axios HTTP)
                 ↓
┌─────────────────────────────────────────┐
│      Backend API (Express.js)            │
│       http://localhost:5000              │
│                                           │
│  - Authentication (JWT)                   │
│  - Properties CRUD                        │
│  - Rooms Management                       │
│  - Bookings System                        │
│  - Channel Integration                    │
└────────────────┬────────────────────────┘
                 │ (Prisma ORM)
                 ↓
┌─────────────────────────────────────────┐
│     PostgreSQL Database                  │
│      localhost:5432                      │
│                                           │
│  9 Tables:                                │
│  - users, properties, rooms               │
│  - guests, bookings, daily_prices         │
│  - room_types, channels, channel_syncs    │
└─────────────────────────────────────────┘
```

---

## 🎯 Quick Start Commands

Copy & paste these for quick setup:

### Install Node.js (if not installed)
```powershell
winget install OpenJS.NodeJS.LTS
```

### Install PostgreSQL (if not installed)
```powershell
winget install PostgreSQL.PostgreSQL
```

### Create database (in new PowerShell)
```powershell
$env:PGPASSWORD='postgres'; psql -U postgres -c "CREATE USER pms_user WITH PASSWORD 'pms_password'; CREATE DATABASE pms_db OWNER pms_user; GRANT ALL PRIVILEGES ON DATABASE pms_db TO pms_user;"
```

### Setup & run backend
```powershell
cd D:\prog\pms-system\backend
npm install
@"
DATABASE_URL=postgresql://pms_user:pms_password@localhost:5432/pms_db
JWT_SECRET=your_jwt_secret_key_here_change_in_production
NODE_ENV=development
PORT=5000
"@ | Out-File .env
npm run prisma:migrate -- --name init
npm run dev
```

### Setup & run frontend (new terminal)
```powershell
cd D:\prog\pms-system\frontend
npm install
npm run dev
```

---

## ✨ Next Steps

1. ✅ Install Node.js & PostgreSQL
2. ✅ Create database with credentials
3. ✅ Run backend setup commands
4. ✅ Run frontend setup commands
5. ✅ Access http://localhost:3000
6. ✅ Register & login
7. ✅ Create test property
8. ✅ Add test rooms
9. ✅ Test booking functionality
10. ✅ Verify API endpoints

---

**Your system is ready to run! Follow the steps above to get it working in minutes.** 🚀

For detailed API documentation, see [GETTING_STARTED.md](GETTING_STARTED.md).
