# 🎯 New Features Quick Reference Guide

## 1. 📊 Analytics & Reports Dashboard

**Location:** Sidebar → 📈 Analytics

### How to Use:
1. Click "📈 Analytics" in sidebar
2. Select property from dropdown (if multiple properties exist)
3. Choose date range:
   - "From" date: Start of analysis period
   - "To" date: End of analysis period
4. View metrics and reports

### What You'll See:

**Metric Cards (Top):**
- 💰 **Total Revenue** - Sum of all confirmed bookings in period
- 📅 **Confirmed Bookings** - Count of CONFIRMED status bookings
- 🏠 **Occupied Rooms** - Currently checked-in guests
- ✅ **Checked Out** - Completed stays
- 📊 **Avg Booking Value** - Average revenue per booking
- 📈 **Total Bookings** - Count of all bookings

**Reports (Bottom):**
- **Revenue by Source** - Breakdown by booking origin (Direct, OTA, etc.)
- **Bookings by Status** - Count by status (Confirmed, Checked-in, etc.)
- **Recent Bookings Table** - Last 10 bookings with details

### Example Use Cases:
- Check March revenue (Feb 15 - Mar 15)
- Compare weekday vs weekend bookings
- Track occupancy rates
- Identify top booking sources

---

## 2. 👥 Guest Management

**Location:** Sidebar → 👥 Guests

### How to Use:
1. Click "👥 Guests" in sidebar
2. View all guest profiles automatically extracted from bookings
3. Search guests:
   - Type name, last name, or email in search box
   - Results filter in real-time
4. Click "View History" to see guest details
5. Check "Summary Statistics" at bottom

### What You'll See:

**Guest Cards Display:**
- 👤 Guest name
- 📧 Email address
- 📞 Phone (if available)
- 🌍 Country (if available)
- 📅 Last booking date
- 🔢 Number of stays (stays badge)

**Summary Statistics:**
- Total Guests - Unique guest count
- Total Stays - Cumulative stays across all guests
- Avg Stays per Guest - Average bookings per person
- Repeat Guests - Number of guests with 2+ stays

### Example Use Cases:
- Find VIP/repeat guests (2+ stays)
- Look up guest contact info
- Track guest loyalty
- Send targeted offers to repeat guests
- Contact guests for feedback

### Notes:
- Guests auto-created from booking data
- Search updates results in real-time
- Click "View History" for more details (expandable)

---

## 3. 💰 Pricing Management

**Location:** Sidebar → 💰 Pricing

### How to Use:

#### Option A: Daily Pricing
1. Click "📅 Daily Pricing" tab
2. Select Property from dropdown
3. Select Room from dropdown (shows base price)
4. Pick a date (calendar input)
5. Enter new price for that night
6. Click "Save Pricing"

#### Option B: Seasonal Pricing
1. Click "🏖️ Seasonal Pricing" tab
2. Select Property and Room
3. Enter season name (e.g., "Summer", "High Season")
4. Set start and end dates
5. Enter seasonal price per night
6. Click "Save Pricing"

### What Each Field Does:

**Daily Pricing:**
- **Date:** Specific date to override price (e.g., Valentine's Day)
- **Price:** New nightly rate for that date
- Best for: Holidays, special events, peak dates

**Seasonal Pricing:**
- **Season Name:** Human-readable name for the period
- **Start Date:** First day of season
- **End Date:** Last day of season
- **Season Price:** Nightly rate for entire season
- Best for: Summer rates, winter rates, off-season discounts

### Example Use Cases:
- Set peak season rate (June 1 - Aug 31): $150/night
- Override Valentine's Day (Feb 14): $200/night
- Set winter discount (Jan 2 - Mar 15): $80/night
- Holiday markup (Dec 24-26): $250/night

### Pricing Priority:
1. Daily pricing overrides seasonal
2. Seasonal pricing overrides base price
3. Base price is default fallback

### Tips:
- Check room base price before setting seasonal prices
- Use meaningful season names for clarity
- Review pricing monthly to stay competitive
- Consider occupancy rates when setting prices

---

## 4. 🔑 Check-In / Check-Out Management

**Location:** Sidebar → 🔑 Check-In/Out

### How to Use:
1. Click "🔑 Check-In/Out" in sidebar
2. Select property from dropdown
3. View three sections automatically populated with today's data:

### Three Main Sections:

#### 📥 Pending Check-Ins (Today)
**What:** Guests arriving TODAY
**Shows:**
- Room number
- Guest name, email
- Check-in date: ✅ **Today**
- Check-out date: Future date
- Number of guests

**Action:** Click green "✓ Check In" button
- Updates booking status to CHECKED_IN
- Marks guest as occupying room

#### 🏠 Currently Checked In
**What:** Guests currently occupying rooms
**Shows:**
- Room number
- Guest name and contact
- Check-in date: Past date
- Check-out date
- **Days Remaining:** Auto-calculated

**Action:** Click blue "📤 Check Out" button
- Updates booking status to CHECKED_OUT
- Frees up room for next guest
- Only available for guests checked in

#### 📤 Pending Check-Outs (Today)
**What:** Guests leaving TODAY
**Shows:**
- Room number
- Guest details
- Check-out date: ✅ **Today** (⏰ urgent)
- Total stay duration in nights

**Action:** Click red "✓ Check Out" button
- Finalizes guest departure
- Clears room
- Prepares for next booking

### Statistics at Top:
- **📥 Pending Check-Ins (Today):** How many guests arriving
- **🏠 Currently Checked In:** Current occupancy
- **📤 Pending Check-Outs (Today):** How many checkout today

### Daily Workflow Example:
```
Morning:
1. Check "📥 Pending Check-Ins" - 3 guests arriving
2. Prepare rooms, train staff

Afternoon:
1. Click check-in buttons for arriving guests
2. Move them to "🏠 Currently Checked In" section

Evening:
1. Check "📤 Pending Check-Outs (Today)" - 2 leaving tomorrow
2. Prepare for turnover

Tomorrow:
1. Click check-out buttons for departing guests
2. Rooms ready for next guests
```

### Example Use Cases:
- Morning briefing: "Who's arriving today?"
- Check occupancy rate at any time
- Track average stay duration
- Identify long-term guests
- Plan housekeeping schedule

---

## 5. 🏢 Properties (Existing Feature)

**Quick Reference:**

### Create Property:
1. Go to 🏢 Properties
2. Fill form: Name, Address, Description, Contact
3. Click "Add Property"

### View Properties:
- Properties displayed as cards
- Shows name, address, description, contact info

### Edit Property:
- Click "Edit" button on property card
- Update fields
- Click "Save"

### Delete Property:
- Click "Delete" button
- Confirm deletion

---

## 6. 🛏️ Rooms (Existing Feature with New Types)

**Italian Room Types Available:**

| Type | Icon | Beds | Max Guests |
|------|------|------|-----------|
| Singola | 🛏️ | 1 Single | 1 |
| Doppia | 🛏️🛏️ | 2 Single | 2 |
| Matrimoniale | 💑 | 1 King/Queen | 2 |
| Tripola | 🛏️🛏️🛏️ | 3 Single | 3 |
| Familiare | 👨‍👩‍👧‍👦 | 1 King + 1 Single | 3 |

### Create Room:
1. Go to 🛏️ Rooms
2. Select property
3. Enter Room Number
4. Select Room Type (Italian types with icons)
5. Max Guests auto-fills based on type
6. Enter Base Price
7. Add Description
8. Click "Add Room"

### Room Type Guide:
- Displayed in "Room Types Guide" section
- Shows all 5 types with icons
- Displays bed configuration
- Shows max guests for each type

---

## 7. 📅 Bookings (Existing Feature)

**Quick Reference:**

### View Bookings:
1. Go to 📅 Bookings
2. Filter by status:
   - All (no filter)
   - Confirmed (upcoming)
   - Checked-in (current)
   - Checked-out (past)
   - Cancelled

### Update Status:
1. Find booking in list
2. Use action buttons:
   - ✅ **Confirm** - Move to Confirmed
   - 📥 **Check In** - Check in guest
   - 📤 **Check Out** - Complete stay
   - ❌ **Cancel** - Cancel reservation

### View Details:
- Guest name and email
- Room number
- Check-in/Check-out dates
- Number of guests
- Total price
- Booking status
- Booking source (Direct, Booking.com, etc.)

---

## Dashboard Keyboard Shortcuts

### Quick Tips:
- Click sidebar buttons to navigate pages
- Use search inputs to filter data
- Check statistics widgets for quick insights
- All date fields support calendar picker

### Performance Tips:
- Analytics queries faster with narrower date ranges
- Search guests for quick lookup (avoid scanning all)
- Check-in/out system updates in real-time
- Pricing changes apply to new bookings immediately

---

## Troubleshooting

### Issue: Analytics showing no data
- **Solution:** Verify date range includes bookings
- Check property is selected
- Confirm bookings exist in database

### Issue: Guest not appearing in list
- **Solution:** Guests only appear after booking created
- Search might be filtering - try clearing search
- Refresh page to reload data

### Issue: Room type guide not visible
- **Solution:** Navigate to Rooms page and scroll
- Type guide displays in dedicated section
- Shows all 5 Italian types

### Issue: Check-in/out buttons not working
- **Solution:** Verify booking exists for selected date
- Check property selector
- Ensure correct booking status before action

### Issue: Pricing not applying
- **Solution:** Daily pricing overrides seasonal
- Prices only apply to NEW bookings
- Existing bookings retain original price

---

## Data Refresh Notes

- **Analytics:** Refreshes when date range changes
- **Guests:** Refreshes from bookings database
- **Check-in/out:** Real-time updates on status change
- **Pricing:** Applied immediately to future bookings
- **All pages:** Manual refresh supported with F5

---

## Keyboard Shortcuts (Browser Native)

- **F5** - Refresh page
- **Ctrl+F** - Search within page (browser)
- **Tab** - Navigate form fields
- **Enter** - Submit forms
- **Escape** - Close dialogs (if any)

---

**Last Updated:** Today
**Version:** 1.0 - Feature Complete
**Status:** ✅ Ready for Production Testing
