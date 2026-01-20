@echo off
echo 🚀 Starting PMS System Setup...

REM Backend setup
echo 📦 Setting up Backend...
cd backend
call npm install
copy .env.example .env
call npm run prisma:generate

REM Frontend setup
echo 📦 Setting up Frontend...
cd ..\frontend
call npm install

REM Back to root
cd ..

echo ✅ Setup complete!
echo.
echo 📝 Next steps:
echo 1. Update backend\.env with your PostgreSQL credentials
echo 2. Run 'npm run prisma:migrate' in the backend directory
echo 3. Run 'npm run dev' in backend directory (Terminal 1)
echo 4. Run 'npm run dev' in frontend directory (Terminal 2)
echo.
echo 🎉 Your PMS system will be available at http://localhost:3000
pause
