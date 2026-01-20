# Feature Implementation: Maintenance Blocking

## Overview
Implemented the ability to block rooms for maintenance directly from the Calendar View. This ensures rooms undergoing repairs or inspections are not bookable and are clearly visible to staff.

## Changes

### Database
- **Schema**: Updated `MaintenanceRequest` to include `startDate` and `endDate` (DateTime, optional).

### Backend
- **API**: Updated `POST /api/maintenance` and `PUT /api/maintenance/:id` to accept and store `startDate` and `endDate`.
- **Logic**: Added automated logic to potentially update room status based on maintenance dates (optional future enhancement included in comments).

### Frontend
- **Calendar View**:
    - **Visualization**: Added logic to check if a room has an active Maintenance Request for the selected date.
    - **Rendering**: Rooms under maintenance appear with an Orange/Grey style (distinct from Bookings) labeled "Maintenance".
    - **Interaction**: Clicking an empty room opens the Modal, which now features two tabs: "New Booking" and "Block for Maintenance".
    - **Creation**: Users can specify Title, Type, Start/End Dates, and Description to instantly block the room.

## Verification
1. **Navigate to Calendar**: View the daily grid.
2. **Click Empty Room**: Select a room currently "Available".
3. **Select Maintenance Tab**: Switch from "New Booking" to "Block for Maintenance".
4. **Submit**: Enter details (e.g., "AC Repair", dates) and submit.
5. **Observe**: The room block refreshes and displays as "Maintenance" in Orange.
