# ✅ IMPLEMENTATION CHECKLIST

Your Property Management System is complete. Use this checklist to get up and running.

---

## 📋 PRE-SETUP CHECKLIST

- [ ] Windows 10 or newer
- [ ] PowerShell or Command Prompt available
- [ ] Internet connection (for npm install)
- [ ] 2GB free disk space
- [ ] Administrator access for PostgreSQL

---

## 💻 INSTALLATION CHECKLIST

### Node.js Installation
- [ ] Download Node.js 18+ from https://nodejs.org/
- [ ] Run installer (accept defaults)
- [ ] Restart PowerShell/Command Prompt
- [ ] Verify: `node --version` (should show v18+)
- [ ] Verify: `npm --version` (should show 9+)

### PostgreSQL Installation
- [ ] Download PostgreSQL from https://postgresql.org/download/windows/
- [ ] Run installer
- [ ] Set password for `postgres` user (remember it!)
- [ ] Keep default port 5432
- [ ] Complete installation
- [ ] Verify: `psql --version` (should show 12+)

---

## 🗄️ DATABASE SETUP CHECKLIST

- [ ] Open PowerShell as Administrator
- [ ] Run: `psql -U postgres`
- [ ] Copy & paste first command:
  ```sql
  CREATE USER pms_user WITH PASSWORD 'pms_password';
  ```
- [ ] Copy & paste second command:
  ```sql
  CREATE DATABASE pms_db OWNER pms_user;
  ```
- [ ] Copy & paste third command:
  ```sql
  GRANT ALL PRIVILEGES ON DATABASE pms_db TO pms_user;
  ```
- [ ] Type: `\q` to exit psql
- [ ] Close PowerShell

---

## 📦 BACKEND SETUP CHECKLIST

- [ ] Open PowerShell
- [ ] Navigate: `cd D:\prog\pms-system\backend`
- [ ] Run: `npm install` (wait for completion)
- [ ] Verify: `.env` file exists in backend folder
  - If missing, create with these contents:
    ```
    DATABASE_URL=postgresql://pms_user:pms_password@localhost:5432/pms_db
    JWT_SECRET=your_jwt_secret_key_here_change_in_production
    NODE_ENV=development
    PORT=5000
    ```
- [ ] Run: `npm run prisma:migrate -- --name init`
- [ ] Run: `npm run dev`
- [ ] Verify: Backend running at http://localhost:5000
- [ ] **Keep terminal open!**

---

## 🎨 FRONTEND SETUP CHECKLIST

- [ ] Open **new PowerShell** window (keep backend one open!)
- [ ] Navigate: `cd D:\prog\pms-system\frontend`
- [ ] Run: `npm install` (wait for completion)
- [ ] Run: `npm run dev`
- [ ] Verify: Frontend running at http://localhost:3000
- [ ] **Keep terminal open!**

---

## 🧪 SYSTEM VERIFICATION CHECKLIST

### Backend Health Check
- [ ] Open third PowerShell window
- [ ] Run: `Invoke-RestMethod -Uri "http://localhost:5000/api/health"`
- [ ] Should return: `{"status":"ok"}`

### Frontend Access
- [ ] Open browser (Chrome, Firefox, Edge, etc.)
- [ ] Navigate to: http://localhost:3000
- [ ] Should see: Login page

### Database Connection
- [ ] Open new PowerShell
- [ ] Run: `psql -U pms_user -d pms_db`
- [ ] Should connect without error
- [ ] Run: `\dt` to see tables
- [ ] Should show 9 tables
- [ ] Type: `\q` to exit

---

## 👤 ACCOUNT CREATION CHECKLIST

- [ ] On http://localhost:3000, click "Register"
- [ ] Enter email: `test@example.com`
- [ ] Enter password: `Test@123456`
- [ ] Enter name: `Test User`
- [ ] Click "Register"
- [ ] Wait for redirect to login page
- [ ] Enter email and password
- [ ] Click "Login"
- [ ] Should see Dashboard

---

## 🏢 FEATURE TESTING CHECKLIST

### Test Properties
- [ ] Click "Properties" in sidebar
- [ ] Click "Add Property"
- [ ] Fill in hotel name: `Test Hotel`
- [ ] Fill in address
- [ ] Fill in city, country
- [ ] Click "Create Property"
- [ ] Verify property appears in list

### Test Rooms
- [ ] Click "Rooms" in sidebar
- [ ] Select your test property
- [ ] Click "Add Room"
- [ ] Fill in room number: `101`
- [ ] Select room type
- [ ] Set max guests
- [ ] Click "Create Room"
- [ ] Verify room appears in grid

### Test Bookings
- [ ] Click "Bookings" in sidebar
- [ ] Click "Add Booking"
- [ ] Fill in guest name: `John Doe`
- [ ] Select dates (today + 2 days)
- [ ] Set number of guests
- [ ] Click "Create Booking"
- [ ] Verify booking appears in table

### Test Dashboard
- [ ] Dashboard should show:
  - [ ] Property selector working
  - [ ] Room status grid populated
  - [ ] Booking table populated
  - [ ] Navigation menu functional
  - [ ] Logout button present

---

## 🔌 API TESTING CHECKLIST

### Test Registration
```powershell
$body = @{
    email = "api@test.com"
    password = "Test@123456"
    name = "API Test"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
  -Method Post -Body $body -ContentType "application/json"
```
- [ ] Should return user object with JWT token

### Test Login
```powershell
$body = @{
    email = "api@test.com"
    password = "Test@123456"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
  -Method Post -Body $body -ContentType "application/json"

$response
```
- [ ] Should return JWT token

### Test Get Properties
```powershell
$token = "YOUR_JWT_TOKEN_HERE"

$headers = @{
    "Authorization" = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/properties" `
  -Method Get -Headers $headers
```
- [ ] Should return property list

---

## 📊 DATABASE VERIFICATION CHECKLIST

Open psql and verify:

```sql
-- Check users
SELECT * FROM users;

-- Check properties  
SELECT * FROM properties;

-- Check rooms
SELECT * FROM rooms;

-- Check bookings
SELECT * FROM bookings;

-- Count all data
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'properties', COUNT(*) FROM properties
UNION ALL
SELECT 'rooms', COUNT(*) FROM rooms
UNION ALL
SELECT 'bookings', COUNT(*) FROM bookings;
```

- [ ] Users table has test account
- [ ] Properties table has test property
- [ ] Rooms table has test room
- [ ] Bookings table has test booking

---

## 🛑 TROUBLESHOOTING CHECKLIST

### Node.js Issues
- [ ] Run `node --version`
  - If "command not found": Restart PowerShell or reinstall Node.js
- [ ] Run `npm --version`
  - If "command not found": Restart PowerShell or reinstall Node.js

### PostgreSQL Issues
- [ ] Run `psql --version`
  - If "command not found": Add PostgreSQL to PATH or reinstall
- [ ] Run `psql -U postgres`
  - If "connection refused": PostgreSQL not running
  - Restart: Windows → Services → PostgreSQL

### Port Already in Use
- [ ] Port 5000 (backend):
  ```powershell
  Get-Process -Name node | Stop-Process -Force
  ```
- [ ] Port 3000 (frontend):
  ```powershell
  Get-Process -Name node | Stop-Process -Force
  ```
- [ ] Port 5432 (database):
  - Restart PostgreSQL service

### npm install Fails
- [ ] Delete `node_modules` folder
- [ ] Delete `package-lock.json`
- [ ] Run `npm install` again
- [ ] Check internet connection

### Database Connection Error
- [ ] Verify credentials in `.env`:
  ```
  DATABASE_URL=postgresql://pms_user:pms_password@localhost:5432/pms_db
  ```
- [ ] Verify database exists:
  ```sql
  psql -U postgres -l | grep pms_db
  ```
- [ ] Verify user permissions:
  ```sql
  psql -U postgres -c "GRANT ALL ON DATABASE pms_db TO pms_user;"
  ```

### Frontend Won't Load
- [ ] Backend running? Check http://localhost:5000/api/health
- [ ] Console error? Check browser DevTools (F12)
- [ ] Port 3000 conflict? Kill all node processes

### Backend Won't Start
- [ ] Database running? `psql -U postgres`
- [ ] .env file correct? Check DATABASE_URL
- [ ] Migrations complete? Run `npm run prisma:migrate`
- [ ] Check terminal for error messages

---

## 🎓 DOCUMENTATION REFERENCE

- [ ] Read [QUICK_START_WINDOWS.md](QUICK_START_WINDOWS.md) for overview
- [ ] Read [MANUAL_SETUP.md](MANUAL_SETUP.md) for detailed steps
- [ ] Read [README.md](README.md) for API documentation
- [ ] Read [README_NAVIGATION.md](README_NAVIGATION.md) for file guide
- [ ] Read [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for next steps

---

## 🎯 SUCCESS INDICATORS

You'll know everything is working when:

✅ **Backend Terminal Shows:**
```
Listening on port 5000
```

✅ **Frontend Terminal Shows:**
```
VITE v... ready in ... ms
Local:        http://localhost:3000
```

✅ **Browser Shows:**
- Login page at http://localhost:3000
- Can register account
- Can login to dashboard
- Can see sidebar menu
- Can see properties/rooms/bookings

✅ **Database Shows:**
- 9 tables created
- Test account in users
- Test property in properties
- Test room in rooms
- Test booking in bookings

✅ **API Works:**
- GET /api/health returns {"status":"ok"}
- POST /api/auth/register succeeds
- POST /api/auth/login returns JWT
- GET /api/properties returns data
- All endpoints respond correctly

---

## 🚀 YOU'RE READY!

Follow this checklist from top to bottom, and your PMS will be running in 30 minutes.

**Questions?** See [MANUAL_SETUP.md](MANUAL_SETUP.md) Troubleshooting section.

**Stuck?** Check [README_NAVIGATION.md](README_NAVIGATION.md) for all available documentation.

**Let's go! 🎉**

---

*Last Updated: January 18, 2026*  
*Status: Complete*  
*Estimated Setup Time: 30 minutes*
