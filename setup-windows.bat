@echo off
REM Windows Setup Script for Property Management System
REM This script automates the setup process

setlocal enabledelayedexpansion

echo.
echo ==========================================
echo  PMS Setup Initialization
echo ==========================================
echo.

REM Check if Node.js is installed
echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Or run: winget install OpenJS.NodeJS.LTS
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% installed

REM Check if npm is installed
echo Checking npm installation...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm not found. Please install Node.js properly.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] npm %NPM_VERSION% installed

REM Setup Backend
echo.
echo ==========================================
echo  Setting up Backend
echo ==========================================
echo.

cd /d %~dp0backend

if not exist "package.json" (
    echo [ERROR] package.json not found in backend directory
    pause
    exit /b 1
)

echo Installing backend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install backend dependencies
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed

REM Create .env file for backend
echo Creating backend .env file...
(
    echo DATABASE_URL=postgresql://pms_user:pms_password@localhost:5432/pms_db
    echo JWT_SECRET=your_jwt_secret_key_here_change_in_production
    echo NODE_ENV=development
    echo PORT=5000
) > .env

if exist ".env" (
    echo [OK] Backend .env created
) else (
    echo [WARNING] Failed to create .env file
)

REM Setup Frontend
echo.
echo ==========================================
echo  Setting up Frontend
echo ==========================================
echo.

cd /d %~dp0frontend

if not exist "package.json" (
    echo [ERROR] package.json not found in frontend directory
    pause
    exit /b 1
)

echo Installing frontend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install frontend dependencies
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed

REM Success message
echo.
echo ==========================================
echo  Setup Complete!
echo ==========================================
echo.
echo Next steps:
echo.
echo 1. Ensure PostgreSQL is installed and running:
echo    - Download from: https://www.postgresql.org/download/windows/
echo    - Or run: winget install PostgreSQL.PostgreSQL
echo.
echo 2. Create the database by opening PowerShell and running:
echo    psql -U postgres
echo    Then in psql prompt:
echo    CREATE USER pms_user WITH PASSWORD 'pms_password';
echo    CREATE DATABASE pms_db OWNER pms_user;
echo    GRANT ALL PRIVILEGES ON DATABASE pms_db TO pms_user;
echo    \q
echo.
echo 3. Run database migrations in backend folder:
echo    cd %~dp0backend
echo    npm run prisma:migrate -- --name init
echo.
echo 4. Start backend (keep terminal open):
echo    cd %~dp0backend
echo    npm run dev
echo.
echo 5. Start frontend (in NEW terminal):
echo    cd %~dp0frontend
echo    npm run dev
echo.
echo 6. Open browser to: http://localhost:3000
echo.
echo ==========================================
echo.
pause
