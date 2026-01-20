# 🏨 Property Management System - Complete Implementation Guide

Welcome to your complete Property Management System! This comprehensive guide will help you understand and use all the features.

## ✅ What Has Been Created

Your PMS system includes everything you need for a professional property management solution:

### 📦 Backend (Node.js + Express + PostgreSQL)
- **Complete REST API** with authentication, properties, rooms, bookings, and channels
- **Database Schema** with Prisma ORM for managing all PMS data
- **Channel Integration Framework** for Booking.com, Airbnb, VRBO, Expedia
- **JWT Authentication** for secure access
- **Dynamic Pricing System** for per-day room pricing
- **Booking Management** with multiple source tracking
- **Sync Engine** to prevent double bookings

### 🎨 Frontend (React + TypeScript + Vite)
- **Admin Dashboard** for property and booking management
- **Authentication System** with login/registration
- **Room Status Overview** with real-time updates
- **Booking Management Interface** with CRUD operations
- **Availability Search** for guests to find rooms
- **Responsive Design** that works on desktop and mobile

### 🗄️ Database
- **Users** - Admin and staff accounts
- **Properties** - Hotels/accommodations
- **Rooms** - Individual rooms with types
- **Bookings** - Reservations with source tracking
- **Guests** - Guest information
- **Channels** - Integration with OTAs
- **DailyPrice** - Dynamic pricing
- **ChannelSync** - Sync logging and monitoring

## 🚀 Quick Start (Choose One Method)

### Method 1: Docker Compose (Recommended)
```bash
cd d:\prog\pms-system
docker-compose up
```
Then visit http://localhost:3000

### Method 2: Manual Setup

**Terminal 1 - Backend:**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with PostgreSQL credentials
npm run prisma:migrate
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Terminal 3 - Database (if not using Docker):**
```bash
# PostgreSQL must be running
# Default: localhost:5432
```

### Method 3: Windows Batch File
```bash
cd d:\prog\pms-system
setup.bat
```

## 📁 Project Structure

```
pms-system/
├── backend/                    # Node.js + Express server
│   ├── src/
│   │   ├── routes/            # API route handlers
│   │   │   ├── auth.ts        # User authentication
│   │   │   ├── property.ts    # Property CRUD
│   │   │   ├── room.ts        # Room management
│   │   │   ├── booking.ts     # Booking operations
│   │   │   └── channel.ts     # Channel sync
│   │   ├── controllers/       # Business logic (ready to expand)
│   │   ├── models/            # Data models
│   │   ├── middleware/        # Auth middleware
│   │   └── index.ts           # Server entry point
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── migrations.sql     # Migration templates
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example           # Environment template
│   └── Dockerfile
│
├── frontend/                  # React admin dashboard
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AuthPage.tsx
│   │   │   ├── AvailabilitySearch.tsx
│   │   │   └── BookingForm.tsx
│   │   ├── api/              # API integration
│   │   │   ├── client.ts     # Axios config
│   │   │   └── endpoints.ts  # API calls
│   │   ├── pages/            # Page components (expandable)
│   │   ├── styles/           # CSS styles
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── Dockerfile.dev
│
├── .github/
│   └── copilot-instructions.md
│
├── docker-compose.yml         # Multi-container setup
├── setup.sh                   # Linux/Mac setup
├── setup.bat                  # Windows setup
├── README.md                  # Full documentation
├── QUICKSTART.md             # Quick start guide
├── DEPLOYMENT.md             # Production deployment
└── .gitignore
```

## 🔑 Key Features Explained

### 1. Admin Dashboard
- **Property Selection** - Switch between multiple properties
- **Room Status Overview** - Color-coded room availability
- **Recent Bookings** - Quick view of latest reservations
- **Navigation Menu** - Dashboard, Analytics, Settings

### 2. Booking Engine
- **Date Selection** - Check-in and check-out dates
- **Guest Count** - Number of people
- **Real-time Availability** - See available rooms
- **Instant Booking** - Direct reservation creation

### 3. Channel Manager
- **Multi-channel Support** - Booking.com, Airbnb, VRBO, Expedia
- **Inventory Sync** - Prevent double bookings
- **Price Sync** - Uniform pricing across channels
- **Sync Logging** - Track all synchronization events

## 📡 API Reference

### Authentication Endpoints
```
POST   /api/auth/register        Register new user
POST   /api/auth/login           User login
```

### Property Endpoints
```
GET    /api/properties           Get all properties
GET    /api/properties/:id       Get property details
POST   /api/properties           Create property
PUT    /api/properties/:id       Update property
DELETE /api/properties/:id       Delete property
```

### Room Endpoints
```
GET    /api/rooms/property/:propertyId     Get rooms
GET    /api/rooms/:id                      Get room details
POST   /api/rooms                          Create room
PUT    /api/rooms/:id/status               Update status
POST   /api/rooms/:id/price                Set daily price
```

### Booking Endpoints
```
GET    /api/bookings                               Get all
GET    /api/bookings/property/:propertyId         Property bookings
GET    /api/bookings/available                    Search availability
POST   /api/bookings                              Create booking
PUT    /api/bookings/:id/status                   Update status
DELETE /api/bookings/:id                          Cancel booking
```

### Channel Endpoints
```
GET    /api/channels/property/:propertyId         Get channels
POST   /api/channels                              Add channel
POST   /api/channels/:id/sync/availability        Sync availability
POST   /api/channels/:id/sync/pricing             Sync pricing
```

## 🔐 Authentication Flow

1. **Register** - User creates account with email/password
2. **Login** - User logs in, receives JWT token
3. **Token Storage** - Token saved in localStorage
4. **Protected Routes** - Token sent in Authorization header
5. **Token Expiry** - 7 days (configurable)

## 💾 Database Configuration

### PostgreSQL Setup
```bash
# Using Docker
docker run --name pms-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15-alpine

# Using native PostgreSQL
createdb -U postgres pms_db
```

### Prisma Commands
```bash
# Initialize database
npm run prisma:migrate

# Generate Prisma Client
npm run prisma:generate

# Open Prisma Studio (GUI)
npm run prisma:studio

# Reset database (dev only)
npm run prisma:migrate reset
```

## 🎯 Booking Source Tracking

System tracks where each booking comes from:
- **DIRECT_WEBSITE** - Booked through your website
- **BOOKING_COM** - Synced from Booking.com
- **AIRBNB** - Synced from Airbnb
- **PHONE** - Booked by phone
- **WALK_IN** - Walk-in guests

## 💰 Pricing System

### Base Pricing
- Set per room type (Deluxe, Suite, etc.)
- Inherited by all rooms of that type

### Dynamic Pricing
- Override per room per day
- Seasonally-based pricing
- Occupancy-based pricing

### API Example
```typescript
// Set room price for specific date
POST /api/rooms/101/price
{
  "date": "2024-02-01",
  "price": 150
}
```

## 🔄 Channel Integration Workflow

### 1. Add Channel
```
POST /api/channels
{
  "propertyId": 1,
  "name": "Booking.com",
  "type": "BOOKING_COM",
  "apiKey": "your-api-key"
}
```

### 2. Sync Availability
```
POST /api/channels/1/sync/availability
```

### 3. Monitor Sync
- Check sync logs in database
- View sync status and messages
- Retry failed syncs

### 4. Webhook (Receive Bookings)
```
POST /api/channels/webhook/booking
{
  "sourceBookingId": "BKG-12345",
  "channel": "booking_com",
  "guestData": { ... },
  "roomData": { ... },
  "dates": { ... }
}
```

## 📊 Room Status Types

- **AVAILABLE** - Open for booking
- **OCCUPIED** - Guest currently staying
- **MAINTENANCE** - Under maintenance
- **BLOCKED** - Blocked for other reasons

## 🧪 Testing the System

### 1. Register Account
- Visit http://localhost:3000
- Click "Sign Up"
- Enter email, password, name

### 2. Create Property
- Use API: `POST /api/properties`
```json
{
  "name": "Sample Hotel",
  "address": "123 Main St",
  "city": "New York",
  "country": "USA"
}
```

### 3. Add Rooms
- Use API: `POST /api/rooms`
```json
{
  "roomNumber": "101",
  "propertyId": 1,
  "roomTypeId": 1
}
```

### 4. Create Booking
- Use API or frontend booking form

### 5. Sync to Channel
- Use API: `POST /api/channels/1/sync/availability`

## 🛠️ Configuration Files

### .env (Backend)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/pms_db
JWT_SECRET=your_secure_key_here
JWT_EXPIRE=7d
PORT=5000
NODE_ENV=development
```

### Environment Variables (Frontend)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## 📦 Dependencies

### Backend
- express - Web framework
- prisma - ORM
- jsonwebtoken - Authentication
- bcryptjs - Password hashing
- axios - HTTP client
- morgan - Logging

### Frontend
- react - UI framework
- react-big-calendar - Calendar component
- axios - HTTP client
- lucide-react - Icons
- vite - Build tool

## 🚢 Deployment Checklist

- [ ] Update JWT_SECRET
- [ ] Configure PostgreSQL
- [ ] Set NODE_ENV to production
- [ ] Enable HTTPS
- [ ] Configure CORS
- [ ] Set up database backups
- [ ] Configure email service
- [ ] Set up monitoring/logging
- [ ] Configure CDN for frontend
- [ ] Test all API endpoints

## 📞 Common Tasks

### Add New Property Type
Edit `backend/prisma/schema.prisma` and run migrations

### Add New Room Type
```
POST /api/room-types
{
  "name": "Luxury Suite",
  "maxGuests": 4,
  "basePrice": 299.99
}
```

### View All Bookings
```
GET /api/bookings?propertyId=1&startDate=2024-01-01&endDate=2024-12-31
```

### Export Data
Query database directly via Prisma Studio:
```
npm run prisma:studio
```

## 🐛 Troubleshooting

### Database Connection Failed
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- Check network connectivity

### API 401 Unauthorized
- Ensure token is in Authorization header
- Check token expiry
- Re-login to get fresh token

### Frontend Can't Connect to Backend
- Check backend is running on port 5000
- Verify CORS is enabled
- Check REACT_APP_API_URL is correct

### Prisma Migration Issues
```bash
npm run prisma:migrate reset
npm run prisma:migrate dev
```

## 📚 Next Steps

1. **Customize UI** - Brand it with your logo and colors
2. **Add Features** - Implement house rules, policies, etc.
3. **Integrations** - Add payment processors, SMS/email
4. **Analytics** - Build revenue and occupancy reports
5. **Mobile App** - Create companion mobile app
6. **AI Features** - Add pricing recommendations
7. **Staff Management** - Add housekeeping scheduling

## 🎓 Learning Resources

- Express.js: https://expressjs.com
- Prisma: https://www.prisma.io/docs
- React: https://react.dev
- PostgreSQL: https://www.postgresql.org/docs

## 📄 Documentation

- **README.md** - Complete project overview
- **QUICKSTART.md** - Quick setup guide
- **DEPLOYMENT.md** - Production deployment guide
- **.github/copilot-instructions.md** - AI assistant guidelines

## 🎉 Success!

Your Property Management System is ready for development! Start by running the setup and creating your first property. Enjoy building!

---

**Created**: January 2026  
**Version**: 1.0.0  
**License**: MIT

For support and updates, visit the project repository.
