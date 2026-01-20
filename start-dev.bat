@echo off
echo Starting Backend...
start "Backend Server" cmd /k "cd backend && npm run dev"

echo Starting Frontend...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo Systems starting... Please wait a moment for valid connection.
echo Admin: http://localhost:3001/admin
echo Public: http://localhost:3001/
