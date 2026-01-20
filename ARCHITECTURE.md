# 🏗️ PMS System Architecture & Visual Guide

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER BROWSER                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    HTTP Requests
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
   ┌─────────────┐              ┌─────────────────┐
   │   Frontend  │              │   API Gateway   │
   │  Port 3000  │              │  (nginx/proxy)  │
   └──────┬──────┘              └────────┬────────┘
          │                              │
   React 18 + TypeScript         CORS Handling
          │                              │
          └──────────────┬───────────────┘
                         │
                    REST API Calls
                    (Axios + Auth)
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
┌──────────────────────┐      ┌──────────────────────┐
│   Backend Server     │      │   Authentication     │
│   (Express.js)       │◄──────►   JWT Tokens       │
│   Port 5000          │      │                      │
└──────────┬───────────┘      └──────────────────────┘
           │
      Routes/Controllers
           │
      ┌────┴──────────────────┬──────────────────┐
      │                       │                  │
      ▼                       ▼                  ▼
┌──────────────┐     ┌──────────────┐    ┌──────────────┐
│ Auth Routes  │     │ Booking      │    │ Room Routes  │
│              │     │ Routes       │    │              │
│ 2 endpoints  │     │ 6 endpoints  │    │ 5 endpoints  │
└──────────────┘     └──────────────┘    └──────────────┘
      │                       │                  │
      ├───────────────────────┼──────────────────┤
      │                       │                  │
      ▼                       ▼                  ▼
┌──────────────┐     ┌──────────────┐    ┌──────────────┐
│ Property     │     │ Channel      │    │ Middleware   │
│ Routes       │     │ Routes       │    │ (Auth, etc)  │
│              │     │              │    │              │
│ 5 endpoints  │     │ 4 endpoints  │    │              │
└──────────────┘     └──────────────┘    └──────────────┘
      │                       │                  │
      └───────────────────────┼──────────────────┘
                              │
                         Prisma ORM
                              │
                              ▼
                    ┌──────────────────┐
                    │    SQLite DB     │
                    │                  │
                    │  9 Tables:       │
                    │  • Users         │
                    │  • Properties    │
                    │  • Rooms         │
                    │  • RoomTypes     │
                    │  • Bookings      │
                    │  • Guests        │
                    │  • Channels      │
                    │  • Pricing       │
                    │  • Sessions      │
                    └──────────────────┘
```

---

## Data Flow Architecture

### User Login Flow:
```
User Input (Email/Password)
           ↓
    Form Submission
           ↓
   POST /auth/login
           ↓
Backend Validation
           ↓
Hash Comparison
           ↓
   Generate JWT Token
           ↓
Response with Token
           ↓
Frontend stores Token
   (localStorage)
           ↓
Token added to all
  subsequent requests
           ↓
    Access Dashboard
```

### Property Management Flow:
```
User clicks Properties
           ↓
Load PropertiesPage
           ↓
GET /properties
           ↓
Display Property Cards
           ↓
User clicks Add/Edit/Delete
           ↓
Submit Form
           ↓
POST/PUT/DELETE /properties
           ↓
Update Database
           ↓
Reload Properties List
           ↓
Display Updated Data
```

### Booking Workflow:
```
Create Booking
           ↓
GET /rooms (available)
           ↓
Display room options
           ↓
User selects room/dates
           ↓
POST /bookings
           ↓
Backend creates:
• Booking record
• Auto-create Guest
• Calculate price
           ↓
Return booking ID
           ↓
Display Booking Confirmation
           ↓
Guest appears in:
• Bookings list
• Guest list
• Analytics
           ↓
Check-in available
```

### Check-In/Out Workflow:
```
Daily Task: Review Check-Ins
           ↓
GET /bookings (today's dates)
           ↓
Filter CONFIRMED bookings
           ↓
Display Pending Check-Ins
           ↓
Staff clicks "Check In"
           ↓
PUT /bookings/:id/status
   (→ CHECKED_IN)
           ↓
Guest moves to
"Currently Checked In"
           ↓
At checkout time:
Check-Out section shows guest
           ↓
Staff clicks "Check Out"
           ↓
PUT /bookings/:id/status
   (→ CHECKED_OUT)
           ↓
Booking complete
Guest auto-moved to history
```

---

## Component Hierarchy

```
App.tsx
├── AuthPage (Login/Register)
│   ├── Email input
│   ├── Password input
│   └── Submit button
│
└── AdminDashboard (Router)
    ├── Sidebar Navigation
    │   ├── Dashboard button
    │   ├── Properties button
    │   ├── Bookings button
    │   ├── Rooms button
    │   ├── Check-in button ✨
    │   ├── Guests button ✨
    │   ├── Pricing button ✨
    │   ├── Analytics button ✨
    │   └── Logout button
    │
    ├── Header
    │   ├── Page title
    │   └── Logout button
    │
    └── Content Area (Dynamic)
        │
        ├── DashboardOverview
        │   ├── Welcome section
        │   ├── Stats grid
        │   └── Quick actions
        │
        ├── PropertiesPage
        │   ├── Form card (add/edit)
        │   └── Properties grid
        │
        ├── BookingsPage
        │   ├── Status filter
        │   ├── Bookings table
        │   └── Statistics
        │
        ├── RoomsPage
        │   ├── Property selector
        │   ├── Room type guide
        │   ├── Room form
        │   └── Rooms grid
        │
        ├── AnalyticsPage ✨
        │   ├── Property selector
        │   ├── Date range filter
        │   ├── Metrics grid (6 cards)
        │   └── Reports grid (2 sections)
        │
        ├── GuestsPage ✨
        │   ├── Search input
        │   ├── Guest cards grid
        │   └── Summary statistics
        │
        ├── PricingPage ✨
        │   ├── Mode tabs (Daily/Seasonal)
        │   ├── Property selector
        │   ├── Form section
        │   └── Tips card
        │
        └── CheckInOutPage ✨
            ├── Statistics cards
            ├── Pending Check-Ins section
            ├── Currently Checked In section
            └── Pending Check-Outs section
```

---

## Data Model Relationships

```
┌─────────────────────────────────────────────┐
│                    USER                     │
│  ┌──────────────────────────────────────┐  │
│  │ id (PK)                              │  │
│  │ email (Unique)                       │  │
│  │ password (Hashed)                    │  │
│  │ createdAt                            │  │
│  └──────────────────────────────────────┘  │
│                    │                        │
│                    │ (1:N)                  │
│                    ▼                        │
└─────────────────────────────────────────────┘
                    │
                    ▼
        ┌──────────────────────────────┐
        │       PROPERTY               │
        │  ┌────────────────────────┐  │
        │  │ id (PK)                │  │
        │  │ name                   │  │
        │  │ address                │  │
        │  │ description            │  │
        │  │ contactPerson          │  │
        │  │ contactEmail           │  │
        │  │ contactPhone           │  │
        │  │ userId (FK → User)     │  │
        │  └────────────────────────┘  │
        │          │                    │
        │      ┌───┴────┐               │
        │      │(1:N)   │(1:N)          │
        │      ▼        ▼               │
        └──────────────────────────────┘
             │            │
    ┌────────┴────┐    ┌──┴──────────────┐
    │             │    │                 │
    ▼             ▼    ▼                 ▼
┌─────────┐  ┌──────────────┐   ┌──────────────┐
│  ROOM   │  │  ROOMTYPE    │   │  BOOKING     │
│         │  │              │   │              │
│ id (PK)│◄─┼─(roomTypeId)  │   │ id (PK)      │
│ number │  │              │   │ roomId (FK)  │
│basePrice   │ id (PK)      │   │ guestId (FK) │
│maxGuests   │ name         │   │ checkInDate  │
│status  │  │ beds         │   │ checkOutDate │
│property(FK) │ maxGuests   │   │ totalPrice   │
│description │              │   │ status       │
│           │              │   │              │
└─────────┘  └──────────────┘   └──────────────┘
                                        │
                                        │(1:N)
                                        ▼
                                    ┌──────────┐
                                    │  GUEST   │
                                    │          │
                                    │ id (PK)  │
                                    │ firstName│
                                    │ lastName │
                                    │ email    │
                                    │ phone    │
                                    │ country  │
                                    └──────────┘

┌──────────────┐         ┌──────────────┐
│  CHANNEL     │         │  PRICING     │
│              │         │              │
│ id (PK)      │         │ id (PK)      │
│ name         │         │ roomId (FK)  │
│ type         │         │ date         │
│ credentials  │         │ price        │
│ propertyId   │         │ type         │
└──────────────┘         └──────────────┘
```

---

## API Request/Response Flow

### Example: Create Booking

**Frontend Request:**
```
POST /api/bookings
Headers:
  Authorization: Bearer {JWT_TOKEN}
  Content-Type: application/json

Body:
{
  "roomId": 5,
  "guestFirstName": "John",
  "guestLastName": "Doe",
  "guestEmail": "john@example.com",
  "guestPhone": "+1234567890",
  "checkInDate": "2024-06-15",
  "checkOutDate": "2024-06-18",
  "numberOfGuests": 2,
  "totalPrice": 450
}
```

**Backend Processing:**
```
1. Validate JWT token (Middleware)
2. Validate input fields
3. Check room availability
4. Check guest exists (create if needed)
5. Create booking record
6. Update room status
7. Calculate revenue
```

**Backend Response:**
```
HTTP 201 Created

{
  "success": true,
  "data": {
    "id": 42,
    "roomId": 5,
    "guestId": 12,
    "checkInDate": "2024-06-15",
    "checkOutDate": "2024-06-18",
    "numberOfGuests": 2,
    "totalPrice": 450,
    "bookingStatus": "CONFIRMED",
    "createdAt": "2024-06-01T10:30:00Z"
  }
}
```

**Frontend Handling:**
```
1. Receive response
2. Store in state
3. Update bookings list
4. Show success message
5. Navigate to bookings page
6. Guest auto-appears in guest list
7. Analytics updates automatically
```

---

## State Management Flow

### Example: Analytics Page State

```
AnalyticsPage Component
│
├── State Variables:
│   ├── properties[] (loaded from API)
│   ├── selectedProperty (dropdown selection)
│   ├── bookings[] (filtered by property)
│   ├── dateRange { startDate, endDate }
│   ├── loading (boolean)
│   └── error (error message)
│
├── Effects:
│   ├── useEffect (on mount) → Load properties
│   └── useEffect (selectedProperty changes) → Load bookings
│
├── Event Handlers:
│   ├── handlePropertyChange → Update selectedProperty
│   ├── handleDateChange → Update dateRange
│   └── loadAnalytics → Fetch bookings from API
│
├── Calculations:
│   ├── calculateMetrics() → Sum revenues, count statuses
│   ├── getRevenueBySource() → Group revenue
│   └── getBookingsByStatus() → Count statuses
│
└── Render:
    ├── Property selector dropdown
    ├── Date range pickers
    ├── Metric cards (display state)
    ├── Report cards (computed values)
    └── Bookings table (mapped from state)
```

---

## CSS Layout Architecture

### Responsive Grid System

```
Desktop (1024px+)
┌──────────────────────────────────────────┐
│          6-column metric grid            │
├──────────────────────────────────────────┤
│    Revenue  │ Bookings │ Occupancy      │
│    Metric   │ Metric   │ Metric         │
├──────────────────────────────────────────┤
│         2-column report grid             │
├──────────────────────────────────────────┤
│ Revenue by │   Bookings by Status       │
│ Source     │                            │
└──────────────────────────────────────────┘

Tablet (768px - 1024px)
┌──────────────────────────────────┐
│    3-column metric grid          │
├──────────────────────────────────┤
│ Metric  │  Metric  │  Metric    │
├──────────────────────────────────┤
│      2-column report grid        │
├──────────────────────────────────┤
│ Report 1  │  Report 2           │
└──────────────────────────────────┘

Mobile (< 768px)
┌──────────────────┐
│  1-column grid   │
├──────────────────┤
│     Metric 1     │
├──────────────────┤
│     Metric 2     │
├──────────────────┤
│     Report 1     │
├──────────────────┤
│     Report 2     │
└──────────────────┘
```

---

## Authentication Flow

```
┌─────────────────────────────────────────┐
│       User Opens Application            │
└────────────────┬────────────────────────┘
                 │
        ┌────────▼────────┐
        │ Check localStorage
        │ for JWT token   │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │ Token exists?   │
        └────┬───────┬────┘
             │       │
           YES      NO
             │       │
             ▼       ▼
        ┌─────┐  ┌──────────────┐
        │Use  │  │ Show AuthPage│
        │Token│  │ (Login)      │
        └─────┘  └──────┬───────┘
             │          │
             │    ┌──────▼──────┐
             │    │ User enters │
             │    │ credentials │
             │    └──────┬──────┘
             │           │
             │    ┌──────▼────────────┐
             │    │POST /auth/login   │
             │    └──────┬────────────┘
             │           │
             │    ┌──────▼─────┐
             │    │ Valid?      │
             │    └─┬────────┬──┘
             │      │        │
             │     YES      NO
             │      │        │
             │      ▼        ▼
             │   ┌──┐  ┌──────────┐
             │   │✓ │  │Error msg │
             │   └──┘  └──────────┘
             │    │
        ┌────▼────▼─────────┐
        │Set token in       │
        │localStorage       │
        │Add to API headers │
        └────────┬──────────┘
                 │
        ┌────────▼─────────┐
        │Load Dashboard    │
        │(AdminDashboard)  │
        └─────────────────┘
```

---

## Performance Optimization Points

```
Frontend Optimization:
├── Code Splitting
│   └── Each page is separate component
├── CSS Optimization
│   └── Utility-based CSS
├── Image Optimization
│   └── Emoji icons (no images)
├── Lazy Loading
│   └── Components load on route change
└── Caching
    └── Browser cache for static assets

Backend Optimization:
├── Database Indexing
│   ├── userId on bookings
│   ├── roomId on bookings
│   └── propertyId relationships
├── Query Optimization
│   ├── Prisma include relations
│   └── Filtered queries
├── API Response Caching
│   └── Properties, rooms (slow-changing)
└── Pagination (ready)
    └── GET /bookings?page=1&limit=10
```

---

## Security Architecture

```
┌──────────────────────────────────────┐
│      Security Layers                 │
└────────────────┬─────────────────────┘
                 │
        ┌────────▼─────────┐
        │ HTTPS/SSL Layer  │
        │ (Production)     │
        └────────┬─────────┘
                 │
        ┌────────▼──────────┐
        │ JWT Token Auth    │
        │ Bearer tokens     │
        │ Expiry validation │
        └────────┬──────────┘
                 │
        ┌────────▼───────────┐
        │ Input Validation   │
        │ • Frontend: Form   │
        │ • Backend: Prisma  │
        │ • Type checking    │
        └────────┬───────────┘
                 │
        ┌────────▼─────────────┐
        │ Database Security    │
        │ • Prepared statements│
        │ • ORM protection     │
        │ • Constraints        │
        └────────┬─────────────┘
                 │
        ┌────────▼──────────┐
        │ Error Handling    │
        │ • No stack traces │
        │ • Safe messages   │
        │ • Logging         │
        └───────────────────┘
```

---

## Deployment Architecture

```
Local Development:
┌────────────────────┐
│ Backend (localhost │
│ :5000)             │
└────────┬───────────┘
         │
    ┌────▼─────┐
    │  SQLite  │
    │ (./db)   │
    └──────────┘

┌────────────────────┐
│ Frontend (localhost│
│ :3000)             │
└────────────────────┘


Production:
┌─────────────────────────────┐
│    Web Server (nginx)       │
│  - Static files             │
│  - Reverse proxy            │
│  - SSL termination          │
└────────────┬────────────────┘
             │
        ┌────▼──────────────┐
        │ Backend Server    │
        │ (Node.js cluster) │
        └────┬──────────────┘
             │
        ┌────▼────────────┐
        │ Database Server │
        │ (PostgreSQL)    │
        └─────────────────┘
```

---

## Real-Time Update Flow (Future)

```
Current (HTTP Polling):
├── Frontend polls API at intervals
├── GET /bookings every 30 seconds
└── Updates on demand

Future (WebSocket):
├── Client subscribes to room changes
├── Server pushes real-time updates
├── Bookings update instantly
└── Analytics refresh in real-time
```

---

**System Architecture Version:** 1.0
**Last Updated:** Today
**Status:** Production Ready ✅
