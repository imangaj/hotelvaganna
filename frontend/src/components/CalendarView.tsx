import React, { useState, useEffect, useMemo } from "react";
import { roomAPI, bookingAPI, guestAPI, maintenanceAPI, hotelProfileAPI, ratesAPI } from "../api/endpoints";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./CalendarView.css";
import { FaCalendarAlt } from "react-icons/fa";
import { registerLocale } from "react-datepicker";
import it from "date-fns/locale/it";

registerLocale("it", it);

interface Room {
    id: number;
    roomNumber: string;
    propertyId?: number;
    roomTypeId?: number;
    roomType: string;
    status: string;
    basePrice: number;
    maxGuests: number;
    breakfastPrice?: number;
}

interface MaintenanceRequest {
    id: number;
    roomId: number;
    title: string;
    description: string;
    startDate?: string;
    endDate?: string;
    status: string;
    type: string;
}

interface Booking {
    id: number;
    roomId: number;
    checkInDate: string;
    checkOutDate: string;
    guest: { firstName: string; lastName: string; email: string };
    source: string;
    breakfastCount: number;
    parkingIncluded: boolean;
    bookingStatus: string;
    paymentStatus?: string;
    totalPrice?: number;
    paidAmount?: number;
}

const CalendarView: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [hotelProfile, setHotelProfile] = useState<any>(null);
    const [breakfastUnitPrice, setBreakfastUnitPrice] = useState(7);
    const [parkingUnitPrice, setParkingUnitPrice] = useState(20);
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null); // For Managing existing booking
    const [showManageModal, setShowManageModal] = useState(false);
    const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceRequest | null>(null);
    const [showMaintenanceManageModal, setShowMaintenanceManageModal] = useState(false);

    const formatDateEU = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString("it-IT", { timeZone: "Europe/Rome" });

    const formatShortDateEU = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString("it-IT", { timeZone: "Europe/Rome", month: "short", day: "numeric" });

    const getNights = (checkIn?: string, checkOut?: string) => {
        if (!checkIn || !checkOut) return 1;
        const start = new Date(checkIn).getTime();
        const end = new Date(checkOut).getTime();
        if (!start || !end) return 1;
        return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    };

    const computeExtras = () => {
        const selectedRoom = rooms.find(r => r.id === selectedRoomId);
        const nights = getNights(formData.checkIn, formData.checkOut);
        const breakfastUnit = selectedRoom?.breakfastPrice ?? breakfastUnitPrice;
        const breakfasts = Math.max(0, Number(formData.breakfasts || 0));
        const breakfastTotal = breakfasts * breakfastUnit * nights;
        const parkingTotal = formData.parking ? parkingUnitPrice * nights : 0;
        const basePrice = Number(formData.price) || 0;
        const total = basePrice + breakfastTotal + parkingTotal;
        return { nights, breakfastUnit, breakfastTotal, parkingTotal, total, basePrice };
    };

    const getDateRange = (startStr: string, endStr: string) => {
        const start = new Date(startStr);
        const end = new Date(endStr);
        const dates: string[] = [];
        const current = new Date(start);
        while (current < end) {
            dates.push(current.toISOString().split("T")[0]);
            current.setDate(current.getDate() + 1);
        }
        return dates;
    };

    const checkAvailability = async () => {
        const selectedRoom = rooms.find(r => r.id === selectedRoomId);
        if (!selectedRoom?.propertyId || !selectedRoom?.roomTypeId) {
            return { ok: false, reason: "Missing room type info" };
        }

        const start = formData.checkIn;
        const end = formData.checkOut;
        if (!start || !end) return { ok: false, reason: "Invalid dates" };

        const res = await ratesAPI.get(selectedRoom.propertyId, start, end);
        const rates = res.data || [];
        const dates = getDateRange(start, end);

        for (const date of dates) {
            const rate = rates.find((r: any) => r.roomTypeId === selectedRoom.roomTypeId && r.date === date);
            if (!rate) return { ok: false, reason: `No rate found for ${date}` };
            if (rate.isClosed) return { ok: false, reason: `Closed on ${date}` };
            if (rate.availableRooms <= 0) return { ok: false, reason: `No availability on ${date}` };
            if (Number(formData.breakfasts || 0) > 0 && !rate.enableBreakfast) {
                return { ok: false, reason: `Breakfast not available on ${date}` };
            }
        }

        return { ok: true };
    };

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
        loadHotelProfile();
    }, []);

    const loadHotelProfile = async () => {
        try {
            const res = await hotelProfileAPI.get();
            const receipt = res.data?.contentJson?.receipt || {};
            setHotelProfile(res.data || null);
            if (typeof receipt.breakfastUnitPrice === "number") {
                setBreakfastUnitPrice(receipt.breakfastUnitPrice);
            }
            if (typeof receipt.parkingUnitPrice === "number") {
                setParkingUnitPrice(receipt.parkingUnitPrice);
            }
        } catch (error) {
            console.error("Failed to load hotel profile", error);
        }
    };

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
        } catch (error) {
            console.error("Failed to load calendar data", error);
        } finally {
            setLoading(false);
        }
    };

    // Derived Logic
    const toDateKey = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });

    const getMaintenanceForRoomAndDate = (roomId: number, date: string) => {
        const target = new Date(date).getTime();
        return maintenanceRequests.find(m => {
            if (m.roomId !== roomId) return false;
            // Only consider requests with dates
            if (!m.startDate || !m.endDate) return false;
            if (['COMPLETED', 'CLOSED', 'CANCELLED'].includes(m.status)) return false;

            // Treat dates as local YYYY-MM-DD comparisons to avoid timezone drift issues slightly
            // But strict timestamps are fine if generated consistently.
            const start = new Date(m.startDate).setHours(0,0,0,0);
            const end = new Date(m.endDate).setHours(0,0,0,0);
            const check = new Date(date).setHours(0,0,0,0);
            
            return check >= start && check <= end; 
        });
    };

    const getBookingForRoomAndDate = (roomId: number, date: string) => {
        const targetKey = toDateKey(date);
        return bookings.find(b => {
             // Filter cancelled
            if (b.bookingStatus === 'CANCELLED') return false;
            
            if (b.roomId !== roomId) return false;
            const startKey = toDateKey(b.checkInDate);
            const endKey = toDateKey(b.checkOutDate);
            // Check if target date is within range [start, end) (checkout day excluded)
            return targetKey >= startKey && targetKey < endKey;
        });
    };

    const stats = useMemo(() => {
        let breakfastTotal = 0;
        let parkingTotal = 0;
        
        rooms.forEach(room => {
            const booking = getBookingForRoomAndDate(room.id, selectedDate);
            if (booking) {
                breakfastTotal += (booking.breakfastCount || 0);
                if (booking.parkingIncluded) parkingTotal++;
            }
        });

        return { breakfastTotal, parkingTotal };
    }, [rooms, bookings, selectedDate]);

    const floors = useMemo(() => {
        const floorMap: {[key: string]: Room[]} = {};
        rooms.forEach(room => {
            // Assuming room number "101" -> Floor 1. "G01" -> Floor 0?
            // Simple heuristic: First digit.
            const floor = room.roomNumber.charAt(0);
            if (!floorMap[floor]) floorMap[floor] = [];
            floorMap[floor].push(room);
        });
        // Sort floors
        return Object.keys(floorMap).sort().map(f => ({
            level: f,
            rooms: floorMap[f].sort((a,b) => a.roomNumber.localeCompare(b.roomNumber))
        }));
    }, [rooms]);

    const handleRoomClick = (room: Room, booking?: Booking, maintenance?: MaintenanceRequest) => {
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
            guests: Math.min(Math.max(1, room.maxGuests || 1), 2),
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

    const handleUpdateStatus = async (status: string) => {
        if (!selectedBooking) return;
        try {
            await bookingAPI.updateStatus(selectedBooking.id, status, undefined);
            setShowManageModal(false);
            loadData();
        } catch (e) {
            alert("Failed to update status");
        }
    };

    const handleRoomStatusUpdate = async (roomId: number, status: string) => {
        try {
            await roomAPI.updateStatus(roomId, status);
            setShowManageModal(false);
            loadData();
        } catch (e) {
            alert("Failed to update room status");
        }
    };

    const handleMaintenanceUpdate = async (status: string) => {
        if (!selectedMaintenance) return;
        try {
            await maintenanceAPI.update(selectedMaintenance.id, { status });
            setShowMaintenanceManageModal(false);
            loadData();
        } catch (e) {
            alert("Failed to update maintenance status");
        }
    };
    
    // Auto-clean: Mark clean = Make room Available (no booking status change, but room status ideally)
    // Simplify: If CHECKED_OUT, "Mark Clean" removes it from "Dirty" view. 
    // In this basic system, creating a new booking is what matters. 
    // But let's just assume marking "Clean" sets status to a specific archived state or just alerts.
    // For now, let's implement the Check In / Check Out flow.

    const handleBookingSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRoomId) return;

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
            } catch (error) {
                console.error(error);
                alert("Failed to create maintenance block");
            }
            return;
        }

        try {
            const availability = await checkAvailability();
            if (!availability.ok) {
                alert(`Reservation not allowed: ${availability.reason}`);
                return;
            }

            const { total: computedTotal } = computeExtras();

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
                totalPrice: computedTotal,
                paidAmount: Number(formData.paidAmount),
                source: formData.source,
                breakfastCount: Number(formData.breakfasts),
                parkingIncluded: formData.parking
            });
            
            setShowModal(false);
            loadData(); // Refresh
        } catch (error) {
            console.error("Booking Failed", error);
            alert("Failed to create booking");
        }
    }

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Calendar...</div>;

    return (
        <div className="calendar-view-container">
            <div className="calendar-header">
                <div className="date-selector flex items-center gap-4">
                    <label className="text-gray-700 font-bold flex items-center gap-2">
                        <FaCalendarAlt /> View Date:
                    </label>
                    <DatePicker 
                        selected={new Date(selectedDate)} 
                        onChange={(date: Date | null) => date && setSelectedDate(date.toISOString().split('T')[0])}
                        className="p-2 border rounded shadow-sm"
                        dateFormat="dd MMMM yyyy"
                        locale="it"
                    />
                </div>

                <div className="daily-stats">
                    <div className="stat-box">
                        <span className="stat-number">{stats.breakfastTotal}</span>
                        <span className="stat-label">Breakfasts</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-number" style={{color: stats.parkingTotal > 5 ? 'red' : 'inherit'}}>
                            {stats.parkingTotal} / 5
                        </span>
                        <span className="stat-label">Parking Used</span>
                    </div>
                </div>
            </div>

            {floors.map(floor => (
                <div key={floor.level} className="floor-section">
                    <h3 className="floor-title">Floor {floor.level}</h3>
                    <div className="rooms-grid">
                        {floor.rooms.map(room => {
                            const booking = getBookingForRoomAndDate(room.id, selectedDate);
                            const maintenance = getMaintenanceForRoomAndDate(room.id, selectedDate);
                            
                            // Determine Status & Style
                            let statusClass = 'available';
                            let displayStatus = 'Available';
                            const todayStr = toDateKey(new Date().toISOString());
                            
                            if (maintenance) {
                                statusClass = 'maintenance'; // Ensure CSS exists for this usually Gray/Orange
                                displayStatus = 'Maintenance';
                            } else if (booking) {
                                const checkInStr = toDateKey(booking.checkInDate);
                                const checkOutStr = toDateKey(booking.checkOutDate);

                                if (booking.bookingStatus === 'CHECKED_OUT') {
                                    // If room is actually marked AVAILABLE in DB, show as such (or lighter gray)
                                    // But we need to know if the ROOM STATUS is available.
                                    if (room.status === 'AVAILABLE') {
                                        statusClass = 'available-checked-out'; // New class
                                        displayStatus = 'Checked Out (Clean)';
                                    } else {
                                        statusClass = 'dirty';
                                        displayStatus = 'Dirty (Checked Out)';
                                    }
                                } else if (booking.bookingStatus === 'CHECKED_IN') {
                                    statusClass = 'occupied';
                                    displayStatus = 'Occupied';
                                    if (todayStr === checkOutStr) {
                                        statusClass = 'due-out'; // Custom class for check-out day
                                        displayStatus = 'Due Out';
                                    }
                                } else if (['CONFIRMED', 'PENDING'].includes(booking.bookingStatus)) {
                                    statusClass = 'reserved';
                                    displayStatus = 'Reserved';
                                    if (todayStr >= checkInStr) {
                                        statusClass = 'due-in'; // Ready to check in
                                        displayStatus = 'Arrival';
                                    }
                                }
                            }

                            return (
                                <div 
                                    key={room.id} 
                                    className={`room-card-admin ${statusClass}`}
                                    onClick={() => handleRoomClick(room, booking, maintenance)}
                                >
                                    <div className="room-header">
                                        <div className="room-title">
                                            <span className="room-number">{room.roomNumber}</span>
                                            <span className="room-type-icon text-xs text-black/50">
                                                {room.roomType}
                                            </span>
                                        </div>
                                        {/* Partial Payment Indicator */}
                                        {booking && booking.paymentStatus === 'PARTIAL' && (
                                            <div title="Partial Payment" style={{width: 10, height: 10, borderRadius: '50%', background: 'orange', border: '1px solid white'}}></div>
                                        )}
                                        {booking && booking.paymentStatus === 'PENDING' && (
                                            <div title="Unpaid" style={{width: 10, height: 10, borderRadius: '50%', background: 'red', border: '1px solid white'}}></div>
                                        )}
                                    </div>
                                    
                                    {maintenance ? (
                                        <div className="maintenance-info p-2 text-xs">
                                             <div className="font-bold">{maintenance.title}</div>
                                             <div>{maintenance.type}</div>
                                             <div className="text-[10px]">{maintenance.description}</div>
                                        </div>
                                    ) : booking ? (
                                        <div className="booking-info">
                                            <span className={`room-status status-${statusClass}`}>{displayStatus}</span>
                                            <span className="guest-name">
                                                {booking.guest ? `${booking.guest.firstName} ${booking.guest.lastName}` : 'Unknown Guest'}
                                            </span>
                                            {(booking.breakfastCount > 0 || booking.parkingIncluded) && (
                                                <div className="booking-extras">
                                                    {booking.breakfastCount > 0 && (
                                                        <span className="extra-badge extra-breakfast">
                                                            Breakfast x{booking.breakfastCount}
                                                        </span>
                                                    )}
                                                    {booking.parkingIncluded && (
                                                        <span className="extra-badge extra-parking">Parking</span>
                                                    )}
                                                </div>
                                            )}
                                            <div className="booking-details-row">
                                                <span className={`source-badge source-${booking.source.toLowerCase().replace('.', '')}`}>
                                                    {booking.source}
                                                </span>
                                                <span className="text-xs">{formatShortDateEU(booking.checkInDate)}-{formatShortDateEU(booking.checkOutDate)}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="booking-info">
                                            <span className="room-status status-available">Available</span>
                                            <span style={{fontSize: '0.8rem', color: '#aaa'}}>Click to Reserve</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {showModal && (
                 <div className="booking-modal-overlay">
                    <div className="booking-modal">
                         <button className="close-modal" onClick={() => setShowModal(false)}>×</button>
                         <h2 style={{marginTop: 0, color: '#2c3e50'}}>Manual Reservation</h2>
                         <form onSubmit={handleBookingSubmit} className="booking-form">
                            <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
                                <button type="button" onClick={() => setMaintenanceMode(false)} style={{flex: 1, padding: '10px', background: !maintenanceMode ? '#3498db' : '#ecf0f1', color: !maintenanceMode ? 'white' : 'black', border: 'none', cursor: 'pointer', borderRadius: '4px'}}>New Booking</button>
                                <button type="button" onClick={() => setMaintenanceMode(true)} style={{flex: 1, padding: '10px', background: maintenanceMode ? '#e67e22' : '#ecf0f1', color: maintenanceMode ? 'white' : 'black', border: 'none', cursor: 'pointer', borderRadius: '4px'}}>Block for Maintenance</button>
                            </div>

                            {maintenanceMode ? (
                                <div className="maintenance-fields">
                                    <div className="input-group">
                                        <label>Title</label>
                                        <input required value={maintenanceData.title} onChange={e => setMaintenanceData({...maintenanceData, title: e.target.value})} placeholder="e.g. AC Repair" />
                                    </div>
                                    <div className="input-group">
                                        <label>Type</label>
                                        <select value={maintenanceData.type} onChange={e => setMaintenanceData({...maintenanceData, type: e.target.value})} style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd'}}>
                                            <option value="REPAIR">Repair</option>
                                            <option value="CLEANING">Cleaning</option>
                                            <option value="INSPECTION">Inspection</option>
                                            <option value="UPGRADE">Upgrade</option>
                                        </select>
                                    </div>
                                    <div className="form-row">
                                        <div className="input-group">
                                            <label>Start Date</label>
                                            <input type="date" required value={maintenanceData.startDate} onChange={e => setMaintenanceData({...maintenanceData, startDate: e.target.value})} />
                                        </div>
                                        <div className="input-group">
                                            <label>End Date</label>
                                            <input type="date" required value={maintenanceData.endDate} onChange={e => setMaintenanceData({...maintenanceData, endDate: e.target.value})} />
                                        </div>
                                    </div>
                                     <div className="input-group">
                                        <label>Description</label>
                                        <textarea value={maintenanceData.description} onChange={e => setMaintenanceData({...maintenanceData, description: e.target.value})} rows={4} style={{width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd'}} />
                                    </div>
                                    <button className="submit-booking-btn" style={{background: '#e67e22', marginTop: '15px'}}>Block Room</button>
                                </div>
                            ) : (
                                <>
                                    <div className="form-row">
                                        <div className="input-group">
                                            <label>First Name</label>
                                            <input required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                                        </div>
                                        <div className="input-group">
                                            <label>Last Name</label>
                                            <input required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label>Email</label>
                                        <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                    </div>
                                    <div className="input-group">
                                        <label>Phone</label>
                                        <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+1 ..." />
                                    </div>
                                    <div className="form-row">
                                        <div className="input-group">
                                            <label>Check In</label>
                                            <input type="date" required value={formData.checkIn} onChange={e => setFormData({...formData, checkIn: e.target.value})} />
                                        </div>
                                        <div className="input-group">
                                            <label>Check Out</label>
                                            <input type="date" required value={formData.checkOut} onChange={e => setFormData({...formData, checkOut: e.target.value})} />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="input-group">
                                            <label>Guests</label>
                                            <select
                                                value={formData.guests}
                                                onChange={(e) => {
                                                    const selectedRoom = rooms.find(r => r.id === selectedRoomId);
                                                    const maxGuests = selectedRoom?.maxGuests || 1;
                                                    const value = Math.min(Math.max(1, Number(e.target.value)), maxGuests);
                                                    setFormData({ ...formData, guests: value });
                                                }}
                                            >
                                                {Array.from({ length: rooms.find(r => r.id === selectedRoomId)?.maxGuests || 1 }).map((_, i) => (
                                                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                                                ))}
                                            </select>
                                            <small style={{color: '#6b7280'}}>Max guests: {rooms.find(r => r.id === selectedRoomId)?.maxGuests || 1}</small>
                                        </div>
                                    </div>
                                    
                                    <hr style={{margin: '15px 0', border: 'none', borderTop: '1px solid #eee'}} />

                                    <div className="form-row">
                                        <div className="input-group">
                                            <label>Source</label>
                                            <select style={{width:'100%', padding:'10px'}} value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})}>
                                                <option value="WALK_IN">Walk In</option>
                                                <option value="PHONE">Phone</option>
                                                <option value="EMAIL">Email</option>
                                                <option value="BOOKING_COM">Booking.com</option>
                                                <option value="EXPEDIA">Expedia</option>
                                                <option value="OTHER">Other</option>
                                            </select>
                                        </div>
                                        <div className="input-group">
                                            <label>Total Price Cost (€)</label>
                                            <input type="number" required value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="input-group">
                                             <label>Paid Amount / Advance (€)</label>
                                             <input type="number" value={formData.paidAmount} onChange={e => setFormData({...formData, paidAmount: Number(e.target.value)})} />
                                        </div>
                                        <div className="input-group">
                                            <label>Remaining</label>
                                            {(() => {
                                                const { total } = computeExtras();
                                                return (
                                                    <input disabled value={Math.max(0, total - formData.paidAmount)} style={{background: '#eee'}} />
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '4px', marginBottom: '15px'}}>
                                        <div className="input-group">
                                            <label>Daily Breakfasts Count</label>
                                            <input type="number" min="0" value={formData.breakfasts} onChange={e => setFormData({...formData, breakfasts: Number(e.target.value)})} />
                                            <small style={{color: '#6b7280'}}>Price: €{computeExtras().breakfastUnit.toFixed(2)} per person/night</small>
                                        </div>
                                        <div className="input-group" style={{flexDirection: 'row', alignItems: 'center'}}>
                                            <input type="checkbox" style={{width: 'auto', marginRight: '10px'}} checked={formData.parking} onChange={e => setFormData({...formData, parking: e.target.checked})} />
                                            <label style={{marginBottom: 0}}>Include Parking Slot?</label>
                                        </div>
                                        <small style={{color: '#6b7280'}}>Parking price: €{parkingUnitPrice.toFixed(2)} per night</small>
                                        <div className="input-group">
                                            {(() => {
                                                const { breakfastTotal, parkingTotal, total } = computeExtras();
                                                return (
                                                    <small style={{color: '#6b7280'}}>
                                                        Breakfast total: €{breakfastTotal.toFixed(2)} · Parking total: €{parkingTotal.toFixed(2)} · Total with extras: €{total.toFixed(2)}
                                                    </small>
                                                );
                                            })()}
                                        </div>
                                        <div className="input-group">
                                            <small style={{color: '#111827', fontWeight: 600}}>
                                                Total charged for this booking: €{computeExtras().total.toFixed(2)}
                                            </small>
                                        </div>
                                    </div>

                                    <button className="submit-booking-btn">Confirm Reservation</button>
                                </>
                            )}
                         </form>
                    </div>
                 </div>
            )}

            {showManageModal && selectedBooking && (
                 <div className="booking-modal-overlay">
                    <div className="booking-modal" style={{maxWidth: '400px'}}>
                         <button className="close-modal" onClick={() => setShowManageModal(false)}>×</button>
                         <h2 style={{marginTop: 0, color: '#2c3e50'}}>Manage Booking</h2>
                         
                         <div style={{marginBottom: '20px'}}>
                             <p><strong>Guest:</strong> {selectedBooking.guest?.firstName} {selectedBooking.guest?.lastName}</p>
                             <p><strong>Status:</strong> {selectedBooking.bookingStatus}</p>
                             <p><strong>Source:</strong> {selectedBooking.source}</p>
                             <p><strong>Dates:</strong> {formatDateEU(selectedBooking.checkInDate)} - {formatDateEU(selectedBooking.checkOutDate)}</p>
                             <p><strong>Payment:</strong> <span style={{color: selectedBooking.paymentStatus === 'PENDING' ? 'red' : 'green'}}>{selectedBooking.paymentStatus || 'PENDING'}</span></p>
                         </div>

                         <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                             {selectedBooking.bookingStatus === 'PENDING' && (
                                 <button className="submit-booking-btn" style={{background: '#2ecc71'}} onClick={() => handleUpdateStatus('CONFIRMED')}>Confirm Reservation</button>
                             )}
                             {(selectedBooking.bookingStatus === 'CONFIRMED' || selectedBooking.bookingStatus === 'PENDING') && (
                                 <button className="submit-booking-btn" style={{background: '#3498db'}} onClick={() => handleUpdateStatus('CHECKED_IN')}>Check In Guest</button>
                             )}
                             {selectedBooking.bookingStatus === 'CHECKED_IN' && (
                                 <button className="submit-booking-btn" style={{background: '#e74c3c'}} onClick={() => handleUpdateStatus('CHECKED_OUT')}>Check Out Guest</button>
                             )}
                             {selectedBooking.bookingStatus === 'CHECKED_OUT' && (
                                 <div style={{textAlign: 'center'}}>
                                     <p style={{color: '#f39c12', marginBottom: '10px'}}>Room status: {rooms.find(r => r.id === selectedBooking.roomId)?.status}</p>
                                     {rooms.find(r => r.id === selectedBooking.roomId)?.status !== 'AVAILABLE' && (
                                         <button className="submit-booking-btn" style={{background: '#2ecc71'}} onClick={() => handleRoomStatusUpdate(selectedBooking.roomId, 'AVAILABLE')}>Mark Room Clean (Available)</button>
                                     )}
                                 </div>
                             )}
                             
                             <button className="submit-booking-btn" style={{background: '#95a5a6'}} onClick={() => setShowManageModal(false)}>Close</button>
                         </div>
                    </div>
                 </div>
            )}

            {showMaintenanceManageModal && selectedMaintenance && (
                 <div className="booking-modal-overlay">
                    <div className="booking-modal" style={{maxWidth: '400px'}}>
                         <button className="close-modal" onClick={() => setShowMaintenanceManageModal(false)}>×</button>
                         <h2 style={{marginTop: 0, color: '#e67e22'}}>Manage Maintenance</h2>
                         
                         <div style={{marginBottom: '20px'}}>
                             <p><strong>Title:</strong> {selectedMaintenance.title}</p>
                             <p><strong>Type:</strong> {selectedMaintenance.type}</p>
                             <p><strong>Status:</strong> {selectedMaintenance.status}</p>
                             <p><strong>Dates:</strong> {selectedMaintenance.startDate ? formatDateEU(selectedMaintenance.startDate) : 'N/A'} - {selectedMaintenance.endDate ? formatDateEU(selectedMaintenance.endDate) : 'N/A'}</p>
                             <p><strong>Description:</strong> {selectedMaintenance.description}</p>
                         </div>

                         <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                             {selectedMaintenance.status !== 'COMPLETED' && (
                                <>
                                 <button className="submit-booking-btn" style={{background: '#2ecc71'}} onClick={() => handleMaintenanceUpdate('COMPLETED')}>Mark as Completed (Available)</button>
                                 <button className="submit-booking-btn" style={{background: '#e74c3c'}} onClick={() => handleMaintenanceUpdate('CANCELLED')}>Cancel Request</button>
                                </>
                             )}
                             
                             <button className="submit-booking-btn" style={{background: '#95a5a6'}} onClick={() => setShowMaintenanceManageModal(false)}>Close</button>
                         </div>
                    </div>
                 </div>
            )}
        </div>
    );
};

export default CalendarView;
