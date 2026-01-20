# PMS System - Quick Start Guide

## Project Setup Complete ✅

Your Property Management System is ready to use!

## 📦 Installation

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your PostgreSQL credentials
npm run prisma:migrate  # Create database tables
npm run prisma:generate # Generate Prisma client
npm run dev             # Start server on port 5000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev             # Start dev server on port 3000
```

## 🎯 What's Included

### Backend Features
- ✅ User authentication (register/login)
- ✅ Property management
- ✅ Room management with status tracking
- ✅ Booking system with multiple sources
- ✅ Channel integration framework
- ✅ Dynamic pricing
- ✅ Booking prevention system

### Frontend Features
- ✅ Authentication page (login/register)
- ✅ Admin dashboard with property selection
- ✅ Real-time room status display
- ✅ Booking management
- ✅ Availability search component

### Database
- ✅ Complete Prisma schema
- ✅ User and property management tables
- ✅ Room and booking tracking
- ✅ Channel integration tables
- ✅ Dynamic pricing support

## 🚀 First Steps

1. **Set up PostgreSQL Database**
   - Update `backend/.env` with your PostgreSQL connection string
   - Format: `DATABASE_URL="postgresql://user:password@localhost:5432/pms_db"`

2. **Initialize Database**
   ```bash
   cd backend
   npm run prisma:migrate
   ```

3. **Start Backend Server**
   ```bash
   npm run dev
   ```

4. **Start Frontend Dev Server**
   ```bash
   cd frontend
   npm run dev
   ```

5. **Access the Application**
   - Frontend: http://localhost:3000
   - API: http://localhost:5000/api

## 📝 Default Test Credentials
You'll need to register first via the UI, then log in.

## 🔧 Key API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login with credentials

### Properties
- `GET /api/properties` - List all properties
- `POST /api/properties` - Create new property

### Rooms
- `GET /api/rooms/property/:id` - Get rooms for property
- `POST /api/rooms/:id/status` - Update room status

### Bookings
- `GET /api/bookings/property/:id` - Get bookings for property
- `POST /api/bookings` - Create new booking
- `PUT /api/bookings/:id/status` - Update booking status

### Channels
- `GET /api/channels/property/:id` - Get integrated channels
- `POST /api/channels` - Add channel integration
- `POST /api/channels/:id/sync/availability` - Sync to channel

## 📚 Project Structure

```
pms-system/
├── backend/
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── controllers/     # Business logic
│   │   ├── middleware/      # Custom middleware
│   │   └── index.ts         # Server entry
│   └── prisma/
│       └── schema.prisma    # Database schema
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── api/            # API client
│   │   └── styles/         # CSS styles
│   └── vite.config.ts      # Vite configuration
│
└── README.md               # Full documentation
```

## 🛠️ Next Steps

1. **Create your first property** via API or eventually through UI
2. **Add rooms** to your property
3. **Connect booking channels** (Booking.com, Airbnb)
4. **Create test bookings** to verify sync engine
5. **Customize pricing** based on seasons/demand

## 📞 Need Help?

Refer to the main `README.md` for:
- Complete API documentation
- Database schema details
- Authentication flow
- Channel manager setup
- Deployment instructions

## 🔐 Security Notes

- Update `JWT_SECRET` in `.env` before production
- Use strong database passwords
- Enable HTTPS in production
- Validate all user inputs
- Never commit `.env` file

## 🎉 You're All Set!

Your PMS system is ready to manage properties, bookings, and channels. Start by registering a user and creating your first property!
