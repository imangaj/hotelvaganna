# Staff & Housekeeping Implementation Summary

## 1. Staff Management (RBAC)
- **Role Support**: Added support for `ADMIN`, `MANAGER`, `RECEPTION`, `CLEANER`.
- **User Management**: 
  - Admins can now create and delete staff accounts in **Settings > Staff**.
  - New users are created with email/password and assigned a role.
- **Backend**: 
  - `POST /api/users` created to handle user generation with password hashing.
  - `GET /api/users` lists all staff for assignment drop-downs.

## 2. Housekeeping Workflow
- **Task Assignment**: 
  - Reception/Admin can create tasks and assign them to specific `CLEANER` users.
  - Tasks can be linked to specific Rooms or General areas.
- **Cleaner View**:
  - New **Housekeeping** page in the dashboard.
  - Filters allow staff to see "All Tasks" or filter by their own name.
  - Tasks show priority (Low, Normal, High, Urgent) and Status (Pending, In Progress, Completed, Inspected).
- **Backend**:
  - Updated `HousekeepingTask` model to link to `User` (Assignee).
  - APIs updated to handle assignment and status updates.

## 3. Architecture Updates
- **AdminDashboard**: Added Housekeeping to the main navigation sidebar.
- **SettingsPage**: centralized staff management.
- **Types**: Syncronized `HotelProfileData` and `User` interfaces across the app.

## Next Steps
- **Login Enforcement**: Currently, the frontend dashboard is open. Ensure `LoginPage` redirects and stores the JWT token properly for `userAPI` calls.
- **Role-Based UI**: Hide "Settings" or "Financials" from `CLEANER` role users in `AdminDashboard`.
