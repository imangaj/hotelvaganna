# Property Management System (PMS)

A comprehensive Property Management System with integrated Booking Engine and Channel Manager. This system allows property managers to manage rooms, bookings, and integrate with multiple booking channels like Booking.com and Airbnb.

## 🏗️ Architecture

### Three Core Components:

1. **Admin Dashboard (PMS)** - Backend management interface for properties, rooms, and reservations
2. **Booking Engine** - Public-facing website where guests can book rooms directly
3. **Channel Manager (Sync Engine)** - Manages integration with Booking.com, Airbnb, and prevents double bookings

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT

### Frontend
- **Framework**: React.js with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Calendar**: react-big-calendar
- **HTTP Client**: Axios

## 📁 Project Structure

```
pms-system/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts           # Authentication endpoints
│   │   │   ├── property.ts       # Property management
│   │   │   ├── room.ts           # Room management
│   │   │   ├── booking.ts        # Booking management
│   │   │   └── channel.ts        # Channel manager integration
│   │   ├── controllers/          # Business logic
│   │   ├── models/               # Data models
│   │   ├── middleware/           # Express middleware
│   │   └── index.ts              # Server entry point
│   ├── prisma/
│   │   └── schema.prisma         # Database schema
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AuthPage.tsx
│   │   │   └── AvailabilitySearch.tsx
│   │   ├── pages/
│   │   ├── api/
│   │   │   ├── client.ts         # Axios configuration
│   │   │   └── endpoints.ts      # API endpoints
│   │   ├── styles/
│   │   │   └── global.css
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
└── README.md
```

## 🗄️ Database Schema

### Key Tables

- **Users** - Admin and staff accounts
- **Properties** - Hotels/accommodation properties
- **Rooms** - Individual rooms in properties
- **RoomTypes** - Room categories (Deluxe, Suite, etc.)
- **Guests** - Guest information
- **Bookings** - Reservations with source tracking
- **DailyPrice** - Dynamic pricing per room per day
- **Channels** - Integration configurations (Booking.com, Airbnb, etc.)
- **ChannelSync** - Sync logs for debugging

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials and API keys
```

4. Set up database:
```bash
npm run prisma:migrate
npm run prisma:generate
```

5. Start development server:
```bash
npm run dev
```

Backend runs on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

Frontend runs on `http://localhost:3000`

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Properties
- `GET /api/properties` - Get all properties
- `GET /api/properties/:id` - Get property details
- `POST /api/properties` - Create property
- `PUT /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property

### Rooms
- `GET /api/rooms/property/:propertyId` - Get rooms for property
- `GET /api/rooms/:id` - Get room details
- `POST /api/rooms` - Create room
- `PUT /api/rooms/:id/status` - Update room status
- `POST /api/rooms/:id/price` - Set daily price

### Bookings
- `GET /api/bookings` - Get all bookings
- `GET /api/bookings/property/:propertyId` - Get property bookings
- `GET /api/bookings/available` - Search available rooms
- `POST /api/bookings` - Create booking
- `PUT /api/bookings/:id/status` - Update booking status
- `DELETE /api/bookings/:id` - Cancel booking

### Channel Manager
- `GET /api/channels/property/:propertyId` - Get property channels
- `POST /api/channels` - Add channel integration
- `POST /api/channels/:channelId/sync/availability` - Sync availability
- `POST /api/channels/:channelId/sync/pricing` - Sync pricing

## 🔄 Key Features

### Admin Dashboard
- ✅ Real-time room availability view
- ✅ Graphical calendar interface
- ✅ Booking management
- ✅ Guest information tracking
- ✅ Dynamic pricing management
- ✅ Channel synchronization

### Booking Engine
- ✅ Guest self-service booking
- ✅ Real-time availability check
- ✅ Secure payment integration (ready)
- ✅ Confirmation emails (ready)

### Channel Manager
- ✅ Multi-channel integration (Booking.com, Airbnb, VRBO, Expedia)
- ✅ Prevent double bookings
- ✅ Automatic inventory sync
- ✅ Price synchronization
- ✅ Sync status tracking and logging

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- Input validation
- CORS protection
- Rate limiting ready
- SQL injection prevention via Prisma ORM

## 📊 Booking Sources

The system tracks booking sources for analytics:
- **DIRECT_WEBSITE** - Direct bookings from your website
- **BOOKING_COM** - Bookings from Booking.com
- **AIRBNB** - Bookings from Airbnb
- **PHONE** - Phone bookings
- **WALK_IN** - Walk-in guests

## 💰 Pricing

- Base price per room type
- Dynamic daily pricing override
- Occupancy-based pricing ready
- Season-based pricing ready

## 🔄 Sync Engine

The Channel Manager ensures:
1. **No Double Bookings** - Cross-channel inventory sync
2. **Availability Updates** - Real-time room availability
3. **Price Synchronization** - Consistent pricing across channels
4. **Booking Webhooks** - Instant booking notifications

## 📝 Environment Variables

```
DATABASE_URL=postgresql://user:password@localhost:5432/pms_db
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
PORT=5000
NODE_ENV=development
BOOKING_COM_API_KEY=your_booking_com_api_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

## 🧪 Testing

Backend:
```bash
cd backend
npm run build
```

Frontend:
```bash
cd frontend
npm run build
```

## 📦 Deployment

### Backend (Heroku/Railway)
```bash
npm run build
npm start
```

### Frontend (Vercel/Netlify)
```bash
npm run build
# Deploy dist folder
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, email support@pms.local or create an issue on GitHub.

## 🎯 Future Enhancements

- [ ] Mobile app for guest check-in
- [ ] Advanced analytics dashboard
- [ ] AI-powered pricing recommendations
- [ ] Multi-language support
- [ ] Payment gateway integration
- [ ] Email/SMS notifications
- [ ] Guest review system
- [ ] Housekeeping management
- [ ] Staff scheduling
- [ ] Revenue management features

---

Built with ❤️ for property managers worldwide.
