#!/usr/bin/env pwsh
# Windows PowerShell Setup Script for Property Management System

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " PMS Setup Initialization" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
$nodeCheck = node --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "Or run: winget install OpenJS.NodeJS.LTS" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[OK] Node.js $nodeCheck installed" -ForegroundColor Green

# Check if npm is installed
Write-Host "Checking npm installation..." -ForegroundColor Yellow
$npmCheck = npm --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] npm not found. Please install Node.js properly." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[OK] npm $npmCheck installed" -ForegroundColor Green

# Setup Backend
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Setting up Backend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$backendPath = Join-Path (Get-Location) "backend"
Push-Location $backendPath

if (!(Test-Path "package.json")) {
    Write-Host "[ERROR] package.json not found in backend directory" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install backend dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] Backend dependencies installed" -ForegroundColor Green

# Create .env file for backend
Write-Host "Creating backend .env file..." -ForegroundColor Yellow
$envContent = @"
DATABASE_URL=postgresql://pms_user:pms_password@localhost:5432/pms_db
JWT_SECRET=your_jwt_secret_key_here_change_in_production
NODE_ENV=development
PORT=5000
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8 -Force

if (Test-Path ".env") {
    Write-Host "[OK] Backend .env created" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Failed to create .env file" -ForegroundColor Yellow
}

Pop-Location

# Setup Frontend
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Setting up Frontend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$frontendPath = Join-Path (Get-Location) "frontend"
Push-Location $frontendPath

if (!(Test-Path "package.json")) {
    Write-Host "[ERROR] package.json not found in frontend directory" -ForegroundColor Red
    Pop-Location
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install frontend dependencies" -ForegroundColor Red
    Pop-Location
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] Frontend dependencies installed" -ForegroundColor Green

Pop-Location

# Success message
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Ensure PostgreSQL is installed and running:" -ForegroundColor White
Write-Host "   - Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Gray
Write-Host "   - Or run: winget install PostgreSQL.PostgreSQL" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Create the database by opening PowerShell and running:" -ForegroundColor White
Write-Host "   psql -U postgres" -ForegroundColor Cyan
Write-Host "   Then in psql prompt:" -ForegroundColor Gray
Write-Host "   CREATE USER pms_user WITH PASSWORD 'pms_password';" -ForegroundColor Cyan
Write-Host "   CREATE DATABASE pms_db OWNER pms_user;" -ForegroundColor Cyan
Write-Host "   GRANT ALL PRIVILEGES ON DATABASE pms_db TO pms_user;" -ForegroundColor Cyan
Write-Host "   \q" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Run database migrations in backend folder:" -ForegroundColor White
Write-Host "   cd $backendPath" -ForegroundColor Cyan
Write-Host "   npm run prisma:migrate -- --name init" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Start backend (keep terminal open):" -ForegroundColor White
Write-Host "   cd $backendPath" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Start frontend (in NEW terminal):" -ForegroundColor White
Write-Host "   cd $frontendPath" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "6. Open browser to: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "For more details, see MANUAL_SETUP.md" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to close"
