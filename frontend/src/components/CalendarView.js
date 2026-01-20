import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from "react";
import { roomAPI, bookingAPI, guestAPI, maintenanceAPI } from "../api/endpoints";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./CalendarView.css";
import { FaCalendarAlt } from "react-icons/fa";
const CalendarView = () => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [rooms, setRooms] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [maintenanceRequests, setMaintenanceRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedRoomId, setSelectedRoomId] = useState(null);
    const [selectedBooking, setSelectedBooking] = useState(null); // For Managing existing booking
    const [showManageModal, setShowManageModal] = useState(false);
    const [selectedMaintenance, setSelectedMaintenance] = useState(null);
    const [showMaintenanceManageModal, setShowMaintenanceManageModal] = useState(false);
    // Manual Booking Modal Form State
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        checkIn: "",
        checkOut: "",
        guests: 1,
        breakfasts: 0,
        parking: false,
        source: "WALK_IN",
        price: 0,
        paidAmount: 0
    });
    // Maintenance Form Data
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [maintenanceData, setMaintenanceData] = useState({
        title: "",
        description: "",
        type: "REPAIR",
        startDate: "",
        endDate: ""
    });
    useEffect(() => {
        loadData();
    }, []);
    const loadData = async () => {
        setLoading(true);
        try {
            // Find first property for context (Assuming 1 for now)
            const ROOMS_PROPERTY_ID = 1;
            const [roomsRes, bookingsRes, maintenanceRes] = await Promise.all([
                roomAPI.getByProperty(ROOMS_PROPERTY_ID),
                bookingAPI.getAll(),
                maintenanceAPI.getAll(ROOMS_PROPERTY_ID)
            ]);
            setRooms(roomsRes.data);
            setBookings(bookingsRes.data);
            setMaintenanceRequests(maintenanceRes.data);
        }
        catch (error) {
            console.error("Failed to load calendar data", error);
        }
        finally {
            setLoading(false);
        }
    };
    // Derived Logic
    const getMaintenanceForRoomAndDate = (roomId, date) => {
        const target = new Date(date).getTime();
        return maintenanceRequests.find(m => {
            if (m.roomId !== roomId)
                return false;
            // Only consider requests with dates
            if (!m.startDate || !m.endDate)
                return false;
            if (['COMPLETED', 'CLOSED', 'CANCELLED'].includes(m.status))
                return false;
            // Treat dates as local YYYY-MM-DD comparisons to avoid timezone drift issues slightly
            // But strict timestamps are fine if generated consistently.
            const start = new Date(m.startDate).setHours(0, 0, 0, 0);
            const end = new Date(m.endDate).setHours(0, 0, 0, 0);
            const check = new Date(date).setHours(0, 0, 0, 0);
            return check >= start && check <= end;
        });
    };
    const getBookingForRoomAndDate = (roomId, date) => {
        const target = new Date(date).getTime();
        return bookings.find(b => {
            // Filter cancelled
            if (b.bookingStatus === 'CANCELLED')
                return false;
            if (b.roomId !== roomId)
                return false;
            const start = new Date(b.checkInDate).getTime();
            const end = new Date(b.checkOutDate).getTime();
            // Check if target date is within range [start, end)
            // Usually checkout day is "free" for new booking, so < end
            return target >= start && target < end;
        });
    };
    const stats = useMemo(() => {
        let breakfastTotal = 0;
        let parkingTotal = 0;
        rooms.forEach(room => {
            const booking = getBookingForRoomAndDate(room.id, selectedDate);
            if (booking) {
                breakfastTotal += (booking.breakfastCount || 0);
                if (booking.parkingIncluded)
                    parkingTotal++;
            }
        });
        return { breakfastTotal, parkingTotal };
    }, [rooms, bookings, selectedDate]);
    const floors = useMemo(() => {
        const floorMap = {};
        rooms.forEach(room => {
            // Assuming room number "101" -> Floor 1. "G01" -> Floor 0?
            // Simple heuristic: First digit.
            const floor = room.roomNumber.charAt(0);
            if (!floorMap[floor])
                floorMap[floor] = [];
            floorMap[floor].push(room);
        });
        // Sort floors
        return Object.keys(floorMap).sort().map(f => ({
            level: f,
            rooms: floorMap[f].sort((a, b) => a.roomNumber.localeCompare(b.roomNumber))
        }));
    }, [rooms]);
    const handleRoomClick = (room, booking, maintenance) => {
        if (maintenance) {
            setSelectedMaintenance(maintenance);
            setShowMaintenanceManageModal(true);
            return;
        }
        if (booking) {
            setSelectedBooking(booking);
            setShowManageModal(true);
            return;
        }
        // Open Manual Booking
        setSelectedRoomId(room.id);
        const tomorrow = new Date(selectedDate);
        tomorrow.setDate(tomorrow.getDate() + 1);
        setFormData({
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            checkIn: selectedDate,
            checkOut: tomorrow.toISOString().split('T')[0],
            guests: 1,
            breakfasts: 0,
            parking: false,
            source: "WALK_IN",
            price: room.basePrice, // Initial guess
            paidAmount: 0
        });
        // Initialize Maintenance Form
        setMaintenanceMode(false);
        setMaintenanceData({
            title: "Maintenance Block",
            description: "",
            type: "REPAIR",
            startDate: selectedDate,
            endDate: tomorrow.toISOString().split('T')[0]
        });
        setShowModal(true);
    };
    const handleUpdateStatus = async (status) => {
        if (!selectedBooking)
            return;
        try {
            await bookingAPI.updateStatus(selectedBooking.id, status, undefined);
            setShowManageModal(false);
            loadData();
        }
        catch (e) {
            alert("Failed to update status");
        }
    };
    const handleRoomStatusUpdate = async (roomId, status) => {
        try {
            await roomAPI.updateStatus(roomId, status);
            setShowManageModal(false);
            loadData();
        }
        catch (e) {
            alert("Failed to update room status");
        }
    };
    const handleMaintenanceUpdate = async (status) => {
        if (!selectedMaintenance)
            return;
        try {
            await maintenanceAPI.update(selectedMaintenance.id, { status });
            setShowMaintenanceManageModal(false);
            loadData();
        }
        catch (e) {
            alert("Failed to update maintenance status");
        }
    };
    // Auto-clean: Mark clean = Make room Available (no booking status change, but room status ideally)
    // Simplify: If CHECKED_OUT, "Mark Clean" removes it from "Dirty" view. 
    // In this basic system, creating a new booking is what matters. 
    // But let's just assume marking "Clean" sets status to a specific archived state or just alerts.
    // For now, let's implement the Check In / Check Out flow.
    const handleBookingSubmit = async (e) => {
        e.preventDefault();
        if (!selectedRoomId)
            return;
        if (maintenanceMode) {
            try {
                await maintenanceAPI.create({
                    propertyId: 1,
                    roomId: selectedRoomId,
                    title: maintenanceData.title,
                    description: maintenanceData.description,
                    type: maintenanceData.type,
                    startDate: maintenanceData.startDate,
                    endDate: maintenanceData.endDate,
                    status: 'OPEN',
                    priority: 'HIGH'
                });
                setShowModal(false);
                loadData();
            }
            catch (error) {
                console.error(error);
                alert("Failed to create maintenance block");
            }
            return;
        }
        try {
            // 1. Create Guest
            const guestRes = await guestAPI.create({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone
            });
            const guestId = guestRes.data.id;
            // 2. Create Booking
            await bookingAPI.create({
                propertyId: 1, // Hardcoded for now
                roomId: selectedRoomId,
                guestId: guestId,
                checkInDate: formData.checkIn,
                checkOutDate: formData.checkOut,
                numberOfGuests: formData.guests,
                totalPrice: Number(formData.price),
                paidAmount: Number(formData.paidAmount),
                source: formData.source,
                breakfastCount: Number(formData.breakfasts),
                parkingIncluded: formData.parking
            });
            setShowModal(false);
            loadData(); // Refresh
        }
        catch (error) {
            console.error("Booking Failed", error);
            alert("Failed to create booking");
        }
    };
    if (loading)
        return _jsx("div", { className: "p-8 text-center text-gray-500", children: "Loading Calendar..." });
    return (_jsxs("div", { className: "calendar-view-container", children: [_jsxs("div", { className: "calendar-header", children: [_jsxs("div", { className: "date-selector flex items-center gap-4", children: [_jsxs("label", { className: "text-gray-700 font-bold flex items-center gap-2", children: [_jsx(FaCalendarAlt, {}), " View Date:"] }), _jsx(DatePicker, { selected: new Date(selectedDate), onChange: (date) => setSelectedDate(date.toISOString().split('T')[0]), className: "p-2 border rounded shadow-sm", dateFormat: "MMMM d, yyyy" })] }), _jsxs("div", { className: "daily-stats", children: [_jsxs("div", { className: "stat-box", children: [_jsx("span", { className: "stat-number", children: stats.breakfastTotal }), _jsx("span", { className: "stat-label", children: "Breakfasts" })] }), _jsxs("div", { className: "stat-box", children: [_jsxs("span", { className: "stat-number", style: { color: stats.parkingTotal > 5 ? 'red' : 'inherit' }, children: [stats.parkingTotal, " / 5"] }), _jsx("span", { className: "stat-label", children: "Parking Used" })] })] })] }), floors.map(floor => (_jsxs("div", { className: "floor-section", children: [_jsxs("h3", { className: "floor-title", children: ["Floor ", floor.level] }), _jsx("div", { className: "rooms-grid", children: floor.rooms.map(room => {
                            const booking = getBookingForRoomAndDate(room.id, selectedDate);
                            const maintenance = getMaintenanceForRoomAndDate(room.id, selectedDate);
                            // Determine Status & Style
                            let statusClass = 'available';
                            let displayStatus = 'Available';
                            const todayStr = new Date().toISOString().split('T')[0];
                            if (maintenance) {
                                statusClass = 'maintenance'; // Ensure CSS exists for this usually Gray/Orange
                                displayStatus = 'Maintenance';
                            }
                            else if (booking) {
                                const checkInStr = new Date(booking.checkInDate).toISOString().split('T')[0];
                                const checkOutStr = new Date(booking.checkOutDate).toISOString().split('T')[0];
                                if (booking.bookingStatus === 'CHECKED_OUT') {
                                    // If room is actually marked AVAILABLE in DB, show as such (or lighter gray)
                                    // But we need to know if the ROOM STATUS is available.
                                    if (room.status === 'AVAILABLE') {
                                        statusClass = 'available-checked-out'; // New class
                                        displayStatus = 'Checked Out (Clean)';
                                    }
                                    else {
                                        statusClass = 'dirty';
                                        displayStatus = 'Dirty (Checked Out)';
                                    }
                                }
                                else if (booking.bookingStatus === 'CHECKED_IN') {
                                    statusClass = 'occupied';
                                    displayStatus = 'Occupied';
                                    if (todayStr === checkOutStr) {
                                        statusClass = 'due-out'; // Custom class for check-out day
                                        displayStatus = 'Due Out';
                                    }
                                }
                                else if (['CONFIRMED', 'PENDING'].includes(booking.bookingStatus)) {
                                    statusClass = 'reserved';
                                    displayStatus = 'Reserved';
                                    if (todayStr >= checkInStr) {
                                        statusClass = 'due-in'; // Ready to check in
                                        displayStatus = 'Arrival';
                                    }
                                }
                            }
                            return (_jsxs("div", { className: `room-card-admin ${statusClass}`, onClick: () => handleRoomClick(room, booking, maintenance), children: [_jsxs("div", { className: "room-header", children: [_jsxs("div", { className: "room-title", children: [_jsx("span", { className: "room-number", children: room.roomNumber }), _jsx("span", { className: "room-type-icon text-xs text-black/50", children: room.roomType })] }), booking && booking.paymentStatus === 'PARTIAL' && (_jsx("div", { title: "Partial Payment", style: { width: 10, height: 10, borderRadius: '50%', background: 'orange', border: '1px solid white' } })), booking && booking.paymentStatus === 'PENDING' && (_jsx("div", { title: "Unpaid", style: { width: 10, height: 10, borderRadius: '50%', background: 'red', border: '1px solid white' } }))] }), maintenance ? (_jsxs("div", { className: "maintenance-info p-2 text-xs", children: [_jsx("div", { className: "font-bold", children: maintenance.title }), _jsx("div", { children: maintenance.type }), _jsx("div", { className: "text-[10px]", children: maintenance.description })] })) : booking ? (_jsxs("div", { className: "booking-info", children: [_jsx("span", { className: `room-status status-${statusClass}`, children: displayStatus }), _jsx("span", { className: "guest-name", children: booking.guest ? `${booking.guest.firstName} ${booking.guest.lastName}` : 'Unknown Guest' }), _jsxs("div", { className: "booking-details-row", children: [_jsx("span", { className: `source-badge source-${booking.source.toLowerCase().replace('.', '')}`, children: booking.source }), _jsxs("span", { className: "text-xs", children: [new Date(booking.checkInDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), "-", new Date(booking.checkOutDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })] })] })] })) : (_jsxs("div", { className: "booking-info", children: [_jsx("span", { className: "room-status status-available", children: "Available" }), _jsx("span", { style: { fontSize: '0.8rem', color: '#aaa' }, children: "Click to Reserve" })] }))] }, room.id));
                        }) })] }, floor.level))), showModal && (_jsx("div", { className: "booking-modal-overlay", children: _jsxs("div", { className: "booking-modal", children: [_jsx("button", { className: "close-modal", onClick: () => setShowModal(false), children: "\u00D7" }), _jsx("h2", { style: { marginTop: 0, color: '#2c3e50' }, children: "Manual Reservation" }), _jsxs("form", { onSubmit: handleBookingSubmit, className: "booking-form", children: [_jsxs("div", { style: { display: 'flex', gap: '10px', marginBottom: '20px' }, children: [_jsx("button", { type: "button", onClick: () => setMaintenanceMode(false), style: { flex: 1, padding: '10px', background: !maintenanceMode ? '#3498db' : '#ecf0f1', color: !maintenanceMode ? 'white' : 'black', border: 'none', cursor: 'pointer', borderRadius: '4px' }, children: "New Booking" }), _jsx("button", { type: "button", onClick: () => setMaintenanceMode(true), style: { flex: 1, padding: '10px', background: maintenanceMode ? '#e67e22' : '#ecf0f1', color: maintenanceMode ? 'white' : 'black', border: 'none', cursor: 'pointer', borderRadius: '4px' }, children: "Block for Maintenance" })] }), maintenanceMode ? (_jsxs("div", { className: "maintenance-fields", children: [_jsxs("div", { className: "input-group", children: [_jsx("label", { children: "Title" }), _jsx("input", { required: true, value: maintenanceData.title, onChange: e => setMaintenanceData({ ...maintenanceData, title: e.target.value }), placeholder: "e.g. AC Repair" })] }), _jsxs("div", { className: "input-group", children: [_jsx("label", { children: "Type" }), _jsxs("select", { value: maintenanceData.type, onChange: e => setMaintenanceData({ ...maintenanceData, type: e.target.value }), style: { width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }, children: [_jsx("option", { value: "REPAIR", children: "Repair" }), _jsx("option", { value: "CLEANING", children: "Cleaning" }), _jsx("option", { value: "INSPECTION", children: "Inspection" }), _jsx("option", { value: "UPGRADE", children: "Upgrade" })] })] }), _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "input-group", children: [_jsx("label", { children: "Start Date" }), _jsx("input", { type: "date", required: true, value: maintenanceData.startDate, onChange: e => setMaintenanceData({ ...maintenanceData, startDate: e.target.value }) })] }), _jsxs("div", { className: "input-group", children: [_jsx("label", { children: "End Date" }), _jsx("input", { type: "date", required: true, value: maintenanceData.endDate, onChange: e => setMaintenanceData({ ...maintenanceData, endDate: e.target.value }) })] })] }), _jsxs("div", { className: "input-group", children: [_jsx("label", { children: "Description" }), _jsx("textarea", { value: maintenanceData.description, onChange: e => setMaintenanceData({ ...maintenanceData, description: e.target.value }), rows: 4, style: { width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' } })] }), _jsx("button", { className: "submit-booking-btn", style: { background: '#e67e22', marginTop: '15px' }, children: "Block Room" })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "input-group", children: [_jsx("label", { children: "First Name" }), _jsx("input", { required: true, value: formData.firstName, onChange: e => setFormData({ ...formData, firstName: e.target.value }) })] }), _jsxs("div", { className: "input-group", children: [_jsx("label", { children: "Last Name" }), _jsx("input", { required: true, value: formData.lastName, onChange: e => setFormData({ ...formData, lastName: e.target.value }) })] })] }), _jsxs("div", { className: "input-group", children: [_jsx("label", { children: "Email" }), _jsx("input", { type: "email", required: true, value: formData.email, onChange: e => setFormData({ ...formData, email: e.target.value }) })] }), _jsxs("div", { className: "input-group", children: [_jsx("label", { children: "Phone" }), _jsx("input", { type: "tel", value: formData.phone, onChange: e => setFormData({ ...formData, phone: e.target.value }), placeholder: "+1 ..." })] }), _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "input-group", children: [_jsx("label", { children: "Check In" }), _jsx("input", { type: "date", required: true, value: formData.checkIn, onChange: e => setFormData({ ...formData, checkIn: e.target.value }) })] }), _jsxs("div", { className: "input-group", children: [_jsx("label", { children: "Check Out" }), _jsx("input", { type: "date", required: true, value: formData.checkOut, onChange: e => setFormData({ ...formData, checkOut: e.target.value }) })] })] }), _jsx("hr", { style: { margin: '15px 0', border: 'none', borderTop: '1px solid #eee' } }), _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "input-group", children: [_jsx("label", { children: "Source" }), _jsxs("select", { style: { width: '100%', padding: '10px' }, value: formData.source, onChange: e => setFormData({ ...formData, source: e.target.value }), children: [_jsx("option", { value: "WALK_IN", children: "Walk In" }), _jsx("option", { value: "PHONE", children: "Phone" }), _jsx("option", { value: "EMAIL", children: "Email" }), _jsx("option", { value: "BOOKING_COM", children: "Booking.com" }), _jsx("option", { value: "EXPEDIA", children: "Expedia" }), _jsx("option", { value: "OTHER", children: "Other" })] })] }), _jsxs("div", { className: "input-group", children: [_jsx("label", { children: "Total Price Cost (\u20AC)" }), _jsx("input", { type: "number", required: true, value: formData.price, onChange: e => setFormData({ ...formData, price: Number(e.target.value) }) })] })] }), _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "input-group", children: [_jsx("label", { children: "Paid Amount / Advance (\u20AC)" }), _jsx("input", { type: "number", value: formData.paidAmount, onChange: e => setFormData({ ...formData, paidAmount: Number(e.target.value) }) })] }), _jsxs("div", { className: "input-group", children: [_jsx("label", { children: "Remaining" }), _jsx("input", { disabled: true, value: Math.max(0, formData.price - formData.paidAmount), style: { background: '#eee' } })] })] }), _jsxs("div", { style: { background: '#f8f9fa', padding: '15px', borderRadius: '4px', marginBottom: '15px' }, children: [_jsxs("div", { className: "input-group", children: [_jsx("label", { children: "Daily Breakfasts Count" }), _jsx("input", { type: "number", min: "0", value: formData.breakfasts, onChange: e => setFormData({ ...formData, breakfasts: Number(e.target.value) }) })] }), _jsxs("div", { className: "input-group", style: { flexDirection: 'row', alignItems: 'center' }, children: [_jsx("input", { type: "checkbox", style: { width: 'auto', marginRight: '10px' }, checked: formData.parking, onChange: e => setFormData({ ...formData, parking: e.target.checked }) }), _jsx("label", { style: { marginBottom: 0 }, children: "Include Parking Slot?" })] })] }), _jsx("button", { className: "submit-booking-btn", children: "Confirm Reservation" })] }))] })] }) })), showManageModal && selectedBooking && (_jsx("div", { className: "booking-modal-overlay", children: _jsxs("div", { className: "booking-modal", style: { maxWidth: '400px' }, children: [_jsx("button", { className: "close-modal", onClick: () => setShowManageModal(false), children: "\u00D7" }), _jsx("h2", { style: { marginTop: 0, color: '#2c3e50' }, children: "Manage Booking" }), _jsxs("div", { style: { marginBottom: '20px' }, children: [_jsxs("p", { children: [_jsx("strong", { children: "Guest:" }), " ", selectedBooking.guest?.firstName, " ", selectedBooking.guest?.lastName] }), _jsxs("p", { children: [_jsx("strong", { children: "Status:" }), " ", selectedBooking.bookingStatus] }), _jsxs("p", { children: [_jsx("strong", { children: "Source:" }), " ", selectedBooking.source] }), _jsxs("p", { children: [_jsx("strong", { children: "Dates:" }), " ", new Date(selectedBooking.checkInDate).toLocaleDateString(), " - ", new Date(selectedBooking.checkOutDate).toLocaleDateString()] }), _jsxs("p", { children: [_jsx("strong", { children: "Payment:" }), " ", _jsx("span", { style: { color: selectedBooking.paymentStatus === 'PENDING' ? 'red' : 'green' }, children: selectedBooking.paymentStatus || 'PENDING' })] })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '10px' }, children: [selectedBooking.bookingStatus === 'PENDING' && (_jsx("button", { className: "submit-booking-btn", style: { background: '#2ecc71' }, onClick: () => handleUpdateStatus('CONFIRMED'), children: "Confirm Reservation" })), (selectedBooking.bookingStatus === 'CONFIRMED' || selectedBooking.bookingStatus === 'PENDING') && (_jsx("button", { className: "submit-booking-btn", style: { background: '#3498db' }, onClick: () => handleUpdateStatus('CHECKED_IN'), children: "Check In Guest" })), selectedBooking.bookingStatus === 'CHECKED_IN' && (_jsx("button", { className: "submit-booking-btn", style: { background: '#e74c3c' }, onClick: () => handleUpdateStatus('CHECKED_OUT'), children: "Check Out Guest" })), selectedBooking.bookingStatus === 'CHECKED_OUT' && (_jsxs("div", { style: { textAlign: 'center' }, children: [_jsxs("p", { style: { color: '#f39c12', marginBottom: '10px' }, children: ["Room status: ", rooms.find(r => r.id === selectedBooking.roomId)?.status] }), rooms.find(r => r.id === selectedBooking.roomId)?.status !== 'AVAILABLE' && (_jsx("button", { className: "submit-booking-btn", style: { background: '#2ecc71' }, onClick: () => handleRoomStatusUpdate(selectedBooking.roomId, 'AVAILABLE'), children: "Mark Room Clean (Available)" }))] })), _jsx("button", { className: "submit-booking-btn", style: { background: '#95a5a6' }, onClick: () => setShowManageModal(false), children: "Close" })] })] }) })), showMaintenanceManageModal && selectedMaintenance && (_jsx("div", { className: "booking-modal-overlay", children: _jsxs("div", { className: "booking-modal", style: { maxWidth: '400px' }, children: [_jsx("button", { className: "close-modal", onClick: () => setShowMaintenanceManageModal(false), children: "\u00D7" }), _jsx("h2", { style: { marginTop: 0, color: '#e67e22' }, children: "Manage Maintenance" }), _jsxs("div", { style: { marginBottom: '20px' }, children: [_jsxs("p", { children: [_jsx("strong", { children: "Title:" }), " ", selectedMaintenance.title] }), _jsxs("p", { children: [_jsx("strong", { children: "Type:" }), " ", selectedMaintenance.type] }), _jsxs("p", { children: [_jsx("strong", { children: "Status:" }), " ", selectedMaintenance.status] }), _jsxs("p", { children: [_jsx("strong", { children: "Dates:" }), " ", selectedMaintenance.startDate ? new Date(selectedMaintenance.startDate).toLocaleDateString() : 'N/A', " - ", selectedMaintenance.endDate ? new Date(selectedMaintenance.endDate).toLocaleDateString() : 'N/A'] }), _jsxs("p", { children: [_jsx("strong", { children: "Description:" }), " ", selectedMaintenance.description] })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '10px' }, children: [selectedMaintenance.status !== 'COMPLETED' && (_jsxs(_Fragment, { children: [_jsx("button", { className: "submit-booking-btn", style: { background: '#2ecc71' }, onClick: () => handleMaintenanceUpdate('COMPLETED'), children: "Mark as Completed (Available)" }), _jsx("button", { className: "submit-booking-btn", style: { background: '#e74c3c' }, onClick: () => handleMaintenanceUpdate('CANCELLED'), children: "Cancel Request" })] })), _jsx("button", { className: "submit-booking-btn", style: { background: '#95a5a6' }, onClick: () => setShowMaintenanceManageModal(false), children: "Close" })] })] }) }))] }));
};
export default CalendarView;
