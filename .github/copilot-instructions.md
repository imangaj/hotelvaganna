# Copilot Instructions for PMS System

## Project Overview
This is a comprehensive Property Management System (PMS) with three integrated components:
1. Admin Dashboard (Backend PMS)
2. Public Booking Engine (Frontend)
3. Channel Manager (Sync Engine for Booking.com, Airbnb, etc.)

## Tech Stack
- **Backend**: Node.js, Express, TypeScript, PostgreSQL, Prisma
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Authentication**: JWT
- **Database**: PostgreSQL with Prisma ORM

## Key Directories
- `/backend` - Express server with API routes
- `/frontend` - React admin dashboard and booking engine
- `/backend/prisma` - Database schema and migrations
- `/frontend/src/api` - API client and endpoints
- `/frontend/src/components` - React components

## Development Commands

### Backend
```bash
cd backend
npm install
npm run prisma:migrate
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Database
- Uses PostgreSQL (configure in .env)
- Prisma ORM for migrations
- Schema includes: Users, Properties, Rooms, Bookings, Channels, DailyPrice

## API Structure
All API routes are RESTful and prefixed with `/api/`:
- `/auth` - Authentication
- `/properties` - Property management
- `/rooms` - Room management
- `/bookings` - Booking management
- `/channels` - Channel integration (Booking.com, Airbnb, etc.)

## Important Files to Update When Adding Features
1. Backend routes in `/backend/src/routes/`
2. Database schema in `/backend/prisma/schema.prisma`
3. Frontend API endpoints in `/frontend/src/api/endpoints.ts`
4. Frontend components in `/frontend/src/components/`

## Configuration
- Backend port: 5000
- Frontend port: 3000
- Environment variables in `.env` file (use `.env.example` as template)

## Authentication
- Uses JWT tokens stored in localStorage
- Protected routes should verify token in Authorization header
- Token expiration: 7 days (configurable)
