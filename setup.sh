#!/bin/bash

echo "🚀 Starting PMS System Setup..."

# Backend setup
echo "📦 Setting up Backend..."
cd backend
npm install
cp .env.example .env
npm run prisma:generate

# Frontend setup
echo "📦 Setting up Frontend..."
cd ../frontend
npm install

# Back to root
cd ..

echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update backend/.env with your PostgreSQL credentials"
echo "2. Run 'npm run prisma:migrate' in the backend directory"
echo "3. Run 'npm run dev' in backend directory (Terminal 1)"
echo "4. Run 'npm run dev' in frontend directory (Terminal 2)"
echo ""
echo "🎉 Your PMS system will be available at http://localhost:3000"
