import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { guestAPI, hotelProfileAPI, bookingAPI, publicAPI } from "../api/endpoints";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaCalendarAlt, FaUser, FaPhone, FaEnvelope, FaFacebook, FaInstagram, FaTwitter, FaWifi, FaCoffee, FaCar, FaCreditCard } from "react-icons/fa";
import { MdSingleBed, MdKingBed, MdBed } from "react-icons/md";
import { useLanguage } from "../contexts/LanguageContext";
const PublicSite = () => {
    const { language } = useLanguage();
    const [profile, setProfile] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    // Search State
    const [checkIn, setCheckIn] = useState(new Date().toISOString().split('T')[0]);
    const [checkOut, setCheckOut] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
    const [guests, setGuests] = useState(2);
    const [availableRooms, setAvailableRooms] = useState([]); // Grouped items
    // Booking Modal State
    const [selectedRoomType, setSelectedRoomType] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [guestDetails, setGuestDetails] = useState({ firstName: "", lastName: "", email: "", phone: "" });
    const [bookingStatus, setBookingStatus] = useState("idle");
    const [bookingStep, setBookingStep] = useState(1);
    const [wantsBreakfast, setWantsBreakfast] = useState(false);
    const [wantsParking, setWantsParking] = useState(false);
    useEffect(() => {
        loadInitialData();
    }, []);
    useEffect(() => {
        setProfile((prev) => {
            const i18n = prev?.contentJson?.i18n;
            if (!prev || !i18n)
                return prev;
            const pick = (val, fallback = "") => (val?.[language] || val?.en || fallback || "");
            return {
                ...prev,
                websiteTitle: pick(i18n.websiteTitle, prev.websiteTitle),
                footerText: pick(i18n.footerText, prev.footerText),
                amenities: pick(i18n.amenities, prev.amenities),
                description: pick(i18n.about?.content, prev.description),
                policies: pick(i18n.rules?.content, prev.policies),
                contentJson: {
                    ...prev.contentJson,
                    hero: {
                        ...prev.contentJson?.hero,
                        title: pick(i18n.hero?.title, prev.contentJson?.hero?.title),
                        subtitle: pick(i18n.hero?.subtitle, prev.contentJson?.hero?.subtitle),
                    },
                    about: {
                        ...prev.contentJson?.about,
                        title: pick(i18n.about?.title, prev.contentJson?.about?.title),
                        content: pick(i18n.about?.content, prev.contentJson?.about?.content),
                    },
                    rules: {
                        ...prev.contentJson?.rules,
                        title: pick(i18n.rules?.title, prev.contentJson?.rules?.title),
                        content: pick(i18n.rules?.content, prev.contentJson?.rules?.content),
                    },
                },
            };
        });
    }, [language]);
    const loadInitialData = async () => {
        try {
            const res = await hotelProfileAPI.get();
            // Apply defaults if missing
            const data = res.data || {};
            if (!data.primaryColor)
                data.primaryColor = "#2E5D4B";
            if (!data.secondaryColor)
                data.secondaryColor = "#C5A059";
            setProfile(data);
        }
        catch (err) {
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    const handleSearch = async () => {
        setSearching(true);
        try {
            const res = await publicAPI.search({
                propertyId: 1, // Hardcoded for single property setup
                checkIn,
                checkOut,
                guests
            });
            // Map API response to UI model
            // API returns: { roomTypeId, name, description, maxGuests, isAvailable, totalPrice, breakfastAvailable }
            const mappedResults = (res.data || []).map((r) => ({
                name: r.name,
                description: r.description,
                maxGuests: r.maxGuests,
                basePrice: r.totalPrice, // Total price for stay
                count: r.availableCount,
                breakfastAvailable: r.breakfastAvailable,
                sampleRoom: {
                    id: r.assignableRoomId,
                    propertyId: 1,
                    roomType: { id: r.roomTypeId, name: r.name },
                    description: r.description
                }
            }));
            setAvailableRooms(mappedResults);
            // Scroll to results
            setTimeout(() => {
                document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        }
        catch (err) {
            console.error(err);
            alert("Search failed. Please try different dates.");
        }
        finally {
            setSearching(false);
        }
    };
    const handleBookClick = (roomType) => {
        setSelectedRoomType(roomType);
        setShowModal(true);
        setBookingStatus("idle");
        setBookingStep(1);
        setWantsBreakfast(false);
        setWantsParking(false);
    };
    const goToPayment = () => {
        if (!guestDetails.firstName || !guestDetails.lastName || !guestDetails.email || !guestDetails.phone) {
            alert("Please fill in all guest details.");
            return;
        }
        setBookingStep(2);
    };
    const confirmBooking = async () => {
        if (!selectedRoomType || !guestDetails.firstName || !guestDetails.email || !guestDetails.phone) {
            alert("Please fill in all guest details including phone number.");
            return;
        }
        setBookingStatus("processing");
        // Calculate nights & Fixed Prices
        const PRICE_BREAKFAST = 7;
        const PRICE_PARKING = 20;
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
        // basePrice from API is now Total Price for stay
        const roomPrice = selectedRoomType.basePrice;
        const breakfastCost = wantsBreakfast ? (PRICE_BREAKFAST * guests * nights) : 0;
        const parkingCost = wantsParking ? (PRICE_PARKING * nights) : 0;
        const finalPrice = roomPrice + breakfastCost + parkingCost;
        try {
            // 1. Create Guest
            const guestRes = await guestAPI.create({
                firstName: guestDetails.firstName,
                lastName: guestDetails.lastName,
                email: guestDetails.email,
                phone: guestDetails.phone
            });
            // 2. Create Booking
            // Simulate Payment Delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            await bookingAPI.create({
                guestId: guestRes.data.id,
                propertyId: selectedRoomType.sampleRoom.propertyId,
                roomId: selectedRoomType.sampleRoom.id,
                checkInDate: checkIn,
                checkOutDate: checkOut,
                numberOfGuests: guests,
                breakfastCount: wantsBreakfast ? guests : 0,
                parkingIncluded: wantsParking,
                source: "website",
                totalPrice: finalPrice,
                paidAmount: finalPrice, // Fully Pre-Paid
                status: "confirmed"
            });
            setBookingStatus("success");
            setTimeout(() => {
                setShowModal(false);
                setBookingStatus("idle");
                setGuestDetails({ firstName: "", lastName: "", email: "", phone: "" });
                setWantsBreakfast(false);
                setWantsParking(false);
            }, 2000);
        }
        catch (err) {
            console.error(err);
            setBookingStatus("error");
        }
    };
    if (loading)
        return _jsx("div", { className: "h-screen flex items-center justify-center text-primary-900", children: "Loading experience..." });
    if (!profile)
        return _jsx("div", { children: "Failed to load property profile." });
    // STRICT IMAGE LOGIC: Use local banner if present, else fallback
    let heroImage = "/banner.png"; // Use local file by default
    // Try to use the configured image if it looks valid
    if (profile.contentJson?.hero?.image && profile.contentJson.hero.image.trim().length > 10) {
        heroImage = profile.contentJson.hero.image;
    }
    // FALLBACK TITLES
    const getLocalizedText = (value, fallback = "") => {
        if (!value)
            return fallback;
        if (typeof value === "string")
            return value;
        return value[language] || value.en || fallback;
    };
    const heroTitle = getLocalizedText(profile.contentJson?.i18n?.hero?.title, profile.contentJson?.hero?.title || profile.websiteTitle || profile.name || "Welcome to Ponale");
    const heroSubtitle = getLocalizedText(profile.contentJson?.i18n?.hero?.subtitle, profile.contentJson?.hero?.subtitle || "Experience the charm of Milan");
    const bgStyle = {
        backgroundImage: `url(${heroImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#333' // Fallback color just in case
    };
    // STRICT MAP LOGIC: Prevent recursive iframe if URL is bad
    let mapUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2796.3735846464388!2d9.159223076198147!3d45.50255773087862!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4786c0e350fbccaf%3A0xf2986aaa964cd292!2sHotel%20Valganna%20Srl!5e0!3m2!1sen!2sit!4v1768820423168!5m2!1sen!2sit";
    // Only allow valid Google Maps URLs to override the default
    if (profile.contentJson?.map?.embedUrl &&
        profile.contentJson.map.embedUrl.length > 20 &&
        profile.contentJson.map.embedUrl.includes("http") &&
        (profile.contentJson.map.embedUrl.includes("google.com") || profile.contentJson.map.embedUrl.includes("maps.co")) &&
        !profile.contentJson.map.embedUrl.includes("localhost") &&
        !profile.contentJson.map.embedUrl.includes("127.0.0.1")) {
        mapUrl = profile.contentJson.map.embedUrl;
    }
    const getBedIcons = (roomName) => {
        if (!roomName)
            return null;
        const name = roomName.toLowerCase();
        const color = profile?.secondaryColor || "#C5A059";
        // Icon sizes
        const sizeSingle = "2em";
        const sizeQueen = "2.5em";
        const sizeKing = "3em";
        if (name.includes("single") || name.includes("singola")) {
            return _jsx(MdSingleBed, { size: sizeSingle, color: color, title: "Single Bed" });
        }
        if (name.includes("dopia") || name.includes("doppia") || name.includes("doubl") || name.includes("twin")) {
            return _jsxs("div", { className: "flex gap-1 justify-center", children: [_jsx(MdSingleBed, { size: sizeSingle, color: color, title: "Two Single Beds" }), _jsx(MdSingleBed, { size: sizeSingle, color: color, title: "Two Single Beds" })] });
        }
        if (name.includes("piccola") && name.includes("matrimoniale")) {
            return _jsx(MdBed, { size: sizeQueen, color: color, title: "Queen Size Bed" });
        }
        if (name.includes("matrimoniale") || name.includes("king")) {
            return _jsx(MdKingBed, { size: sizeKing, color: color, title: "King Size Bed" });
        }
        if (name.includes("tripola") || name.includes("triple")) {
            return _jsxs("div", { className: "flex gap-1 justify-center", children: [_jsx(MdSingleBed, { size: sizeSingle, color: color }), _jsx(MdSingleBed, { size: sizeSingle, color: color }), _jsx(MdSingleBed, { size: sizeSingle, color: color })] });
        }
        if (name.includes("familiare") || name.includes("family")) {
            return _jsxs("div", { className: "flex gap-2 items-end justify-center", children: [_jsx(MdSingleBed, { size: sizeSingle, color: color }), _jsx(MdKingBed, { size: sizeKing, color: color })] });
        }
        // Default fallback
        return _jsx(MdBed, { size: sizeQueen, color: color });
    };
    return (_jsxs("div", { className: "font-sans text-gray-800 min-h-screen flex flex-col", children: [_jsx("header", { className: "fixed w-full z-50 transition-all duration-300 bg-white/90 backdrop-blur-md shadow-sm", children: _jsxs("div", { className: "max-w-7xl mx-auto px-6 py-4 flex justify-between items-center", children: [_jsxs("div", { className: "flex items-center gap-2", children: [profile.logoUrl && _jsx("img", { src: profile.logoUrl, alt: "Logo", className: "h-10" }), _jsx("span", { className: "text-xl font-bold tracking-widest uppercase", style: { color: profile.primaryColor }, children: profile.websiteTitle || profile.name })] }), _jsxs("nav", { className: "hidden md:flex gap-8 text-sm font-medium tracking-wide", children: [_jsx("a", { href: "#", className: "hover:text-gold-500 transition-colors", children: "HOME" }), profile.contentJson?.about?.show !== false && _jsx("a", { href: "#about", className: "hover:text-gold-500 transition-colors", children: "ABOUT" }), _jsx("a", { href: "#rooms", className: "hover:text-gold-500 transition-colors", children: "SUITES" }), profile.contentJson?.map?.show !== false && _jsx("a", { href: "#location", className: "hover:text-gold-500 transition-colors", children: "LOCATION" })] }), _jsx("button", { className: "px-6 py-2 text-white text-sm font-bold tracking-wider uppercase transition-transform hover:scale-105", style: { backgroundColor: profile.secondaryColor }, children: "Book Now" })] }) }), profile.contentJson?.hero?.show !== false && (_jsxs("section", { className: "relative h-screen min-h-[600px] flex items-center justify-center bg-cover bg-center text-center px-4", style: bgStyle, children: [_jsx("div", { className: "absolute inset-0 bg-black/40" }), _jsxs("div", { className: "relative z-10 text-white max-w-4xl animate-fade-in-up", children: [_jsx("h2", { className: "text-lg md:text-xl font-light tracking-[0.2em] mb-4 uppercase", children: heroSubtitle }), _jsx("h1", { className: "text-4xl md:text-6xl lg:text-7xl font-playfair mb-8 leading-tight", children: heroTitle })] }), _jsxs("div", { className: "absolute -bottom-16 left-0 right-0 z-20 px-4", children: [_jsx("style", { children: `
                    .react-datepicker-wrapper { width: 100%; }
                    .react-datepicker__input-container input { width: 100%; }
                    .react-datepicker { font-family: sans-serif; border: none; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                    .react-datepicker__header { background: white; border-bottom: 1px solid #eee; padding-top: 15px; }
                    .react-datepicker__day--selected, .react-datepicker__day--in-range { background-color: ${profile.primaryColor} !important; color: white !important; }
                    .react-datepicker__day--keyboard-selected { background-color: ${profile.secondaryColor} !important; }
                    .react-datepicker__day-name { color: #888; text-transform: uppercase; font-size: 0.7em; letter-spacing: 1px; }
                    .react-datepicker__current-month { font-weight: bold; color: ${profile.primaryColor}; margin-bottom: 10px; }
                ` }), _jsxs("div", { className: "max-w-5xl mx-auto bg-white shadow-2xl rounded-lg p-6 flex flex-col md:flex-row gap-4 items-end", children: [_jsxs("div", { className: "flex-[2] w-full", children: [_jsx("label", { className: "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2", children: "Dates of Stay" }), _jsxs("div", { className: "flex items-center border border-gray-200 rounded-md px-4 py-3 bg-gray-50 hover:bg-white hover:border-gray-300 transition-colors", children: [_jsx(FaCalendarAlt, { className: "text-gray-400 mr-3 text-lg" }), _jsx(DatePicker, { selectsRange: true, startDate: checkIn ? new Date(checkIn) : null, endDate: checkOut ? new Date(checkOut) : null, onChange: (update) => {
                                                            const [start, end] = update;
                                                            setCheckIn(start ? start.toLocaleDateString("en-CA") : "");
                                                            setCheckOut(end ? end.toLocaleDateString("en-CA") : "");
                                                        }, className: "bg-transparent w-full outline-none text-gray-800 font-medium font-sans text-base placeholder-gray-400", placeholderText: "Select Check-in and Check-out", dateFormat: "MMM d, yyyy", minDate: new Date(), monthsShown: 2 })] })] }), _jsxs("div", { className: "w-full md:w-32", children: [_jsx("label", { className: "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1", children: "Guests" }), _jsxs("div", { className: "flex items-center border rounded px-3 py-2 bg-gray-50", children: [_jsx(FaUser, { className: "text-gray-400 mr-2" }), _jsx("select", { className: "bg-transparent w-full outline-none text-gray-700", value: guests, onChange: e => setGuests(Number(e.target.value)), children: [1, 2, 3, 4, 5, 6].map(n => _jsx("option", { value: n, children: n }, n)) })] })] }), _jsx("button", { onClick: handleSearch, className: "w-full md:w-auto px-8 py-3 text-white font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2", style: { backgroundColor: profile.primaryColor }, children: searching ? "Searching..." : _jsx(_Fragment, { children: "Check Availability" }) })] })] })] })), _jsxs("div", { id: "about", className: "pt-32 pb-20 bg-gray-50 px-6 text-center", children: [profile.contentJson?.about?.show !== false && (_jsxs("div", { className: "max-w-3xl mx-auto", children: [_jsx("h3", { className: "text-primary-800 text-3xl font-playfair mb-6", style: { color: profile.primaryColor }, children: profile.contentJson?.about?.title || "Welcome" }), _jsx("div", { className: "w-16 h-1 bg-gold-500 mx-auto mb-8", style: { backgroundColor: profile.secondaryColor } }), _jsx("p", { className: "text-gray-600 leading-relaxed text-lg whitespace-pre-line", children: profile.contentJson?.about?.content || profile.description })] })), profile.contentJson?.features?.showAmenities !== false && (_jsx("div", { className: "mt-16 max-w-4xl mx-auto", children: profile.amenities ? (_jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-8", children: profile.amenities.split(',').map((item, idx) => {
                                const text = item.trim();
                                // Simple keyword matching for icons
                                let Icon = FaCoffee;
                                if (text.toLowerCase().includes('wifi'))
                                    Icon = FaWifi;
                                else if (text.toLowerCase().includes('park'))
                                    Icon = FaCar;
                                else if (text.toLowerCase().includes('net'))
                                    Icon = FaWifi;
                                // Skip pool if explicitly listed
                                if (text.toLowerCase().includes('pool'))
                                    return null;
                                return (_jsxs("div", { className: "flex flex-col items-center gap-3 text-gray-500 animate-fade-in", children: [_jsx(Icon, { className: "text-3xl", style: { color: profile.secondaryColor } }), _jsx("span", { className: "text-sm font-medium uppercase tracking-widest", children: text })] }, idx));
                            }) })) : (
                        /* Fallback default amenities if none entered */
                        _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-8 justify-center", children: [_jsxs("div", { className: "flex flex-col items-center gap-3 text-gray-500", children: [_jsx(FaWifi, { className: "text-3xl", style: { color: profile.secondaryColor } }), _jsx("span", { className: "text-sm font-medium uppercase tracking-widest", children: "Free Wifi" })] }), _jsxs("div", { className: "flex flex-col items-center gap-3 text-gray-500", children: [_jsx(FaCar, { className: "text-3xl", style: { color: profile.secondaryColor } }), _jsx("span", { className: "text-sm font-medium uppercase tracking-widest", children: "Parking" })] }), _jsxs("div", { className: "flex flex-col items-center gap-3 text-gray-500", children: [_jsx(FaCoffee, { className: "text-3xl", style: { color: profile.secondaryColor } }), _jsx("span", { className: "text-sm font-medium uppercase tracking-widest", children: "Breakfast" })] })] })) }))] }), _jsx("div", { id: "results", className: "py-20 bg-white px-6", children: _jsx("div", { className: "max-w-7xl mx-auto", children: availableRooms.length > 0 ? (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8", children: availableRooms.map((group, idx) => (_jsxs("div", { className: "group border rounded-lg overflow-hidden hover:shadow-xl transition-shadow bg-white", children: [_jsxs("div", { className: "h-64 bg-gray-50 relative overflow-hidden flex items-center justify-center", children: [_jsxs("div", { className: "flex flex-col items-center gap-2", children: [getBedIcons(group.name), _jsx("span", { className: "text-xs text-gray-400 uppercase tracking-widest mt-2", children: "Room Type" })] }), _jsxs("div", { className: "absolute top-4 right-4 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider rounded shadow flex items-center gap-1", children: [group.maxGuests, " Guests"] }), group.breakfastAvailable && (_jsxs("div", { className: "absolute top-4 left-4 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider rounded shadow flex items-center gap-1 text-orange-600", children: [_jsx(FaCoffee, {}), " Breakfast"] }))] }), _jsxs("div", { className: "p-6", children: [_jsx("h3", { className: "text-xl font-playfair font-bold mb-2 text-gray-900", children: group.name }), _jsx("p", { className: "text-gray-600 text-sm mb-4 line-clamp-2", children: group.description }), _jsxs("div", { className: "flex justify-between items-end border-t pt-4", children: [_jsxs("div", { children: [_jsx("span", { className: "text-xs text-gray-500 block uppercase tracking-wide", children: "Total Price" }), _jsxs("span", { className: "text-2xl font-bold", style: { color: profile.primaryColor }, children: ["$", group.basePrice] })] }), _jsx("button", { onClick: () => handleBookClick(group), className: "px-6 py-2 text-white text-sm font-bold uppercase tracking-widest transition-transform hover:-translate-y-1", style: { backgroundColor: profile.secondaryColor }, children: "Select" })] })] })] }, idx))) })) : (_jsx("div", { className: "text-center py-12 text-gray-400", children: _jsx("p", { children: "Enter dates above to check availability." }) })) }) }), profile.contentJson?.map?.show !== false && (_jsx("section", { id: "location", className: "h-[500px] w-full bg-gray-200 relative", children: _jsx("iframe", { src: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2796.3735846464388!2d9.159223076198147!3d45.50255773087862!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4786c0e350fbccaf%3A0xf2986aaa964cd292!2sHotel%20Valganna%20Srl!5e0!3m2!1sen!2sit!4v1768820423168!5m2!1sen!2sit", width: "100%", height: "100%", style: { border: 0 }, allowFullScreen: true, loading: "lazy", referrerPolicy: "no-referrer-when-downgrade", title: "Property Location" }) })), _jsxs("footer", { className: "text-white py-16 px-6", style: { backgroundColor: profile.primaryColor }, children: [_jsxs("div", { className: "max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12", children: [_jsxs("div", { children: [_jsx("h4", { className: "text-2xl font-playfair mb-6", children: profile.websiteTitle }), _jsxs("p", { className: "opacity-80 leading-relaxed mb-6", children: [profile.address, _jsx("br", {}), profile.city, ", ", profile.country] }), _jsxs("div", { className: "flex gap-4", children: [profile.facebookUrl && _jsx("a", { href: profile.facebookUrl, className: "opacity-70 hover:opacity-100", children: _jsx(FaFacebook, { size: 20 }) }), profile.instagramUrl && _jsx("a", { href: profile.instagramUrl, className: "opacity-70 hover:opacity-100", children: _jsx(FaInstagram, { size: 20 }) }), profile.twitterUrl && _jsx("a", { href: profile.twitterUrl, className: "opacity-70 hover:opacity-100", children: _jsx(FaTwitter, { size: 20 }) })] })] }), _jsxs("div", { children: [_jsx("h5", { className: "font-bold tracking-widest uppercase mb-6 text-sm opacity-90", children: "Contact" }), _jsxs("div", { className: "space-y-4 opacity-80", children: [_jsxs("p", { className: "flex items-center gap-3", children: [_jsx(FaPhone, { size: 14, className: "opacity-60" }), " ", profile.phone] }), _jsxs("p", { className: "flex items-center gap-3", children: [_jsx(FaEnvelope, { size: 14, className: "opacity-60" }), " ", profile.email] })] })] }), _jsxs("div", { children: [_jsx("h5", { className: "font-bold tracking-widest uppercase mb-6 text-sm opacity-90", children: "Newsletter" }), _jsx("p", { className: "opacity-70 text-sm mb-4", children: profile.footerText || "Subscribe for exclusive offers." }), _jsxs("div", { className: "flex", children: [_jsx("input", { type: "email", placeholder: "Your email", className: "bg-white/10 border-none outline-none px-4 py-2 text-white w-full placeholder-white/50" }), _jsx("button", { className: "px-4 py-2 bg-white text-primary-900 font-bold uppercase text-xs", style: { color: profile.primaryColor }, children: "Join" })] })] })] }), _jsx("div", { className: "max-w-7xl mx-auto mt-16 pt-8 border-t border-white/10 text-center opacity-50 text-xs tracking-widest uppercase", children: profile.footerCopyright || `© ${new Date().getFullYear()} ${profile.name}. All rights reserved.` })] }), showModal && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4", children: _jsx("div", { className: "bg-white rounded-lg shadow-2xl max-w-md w-full p-8 animate-fade-in-up", children: bookingStatus === "success" ? (_jsxs("div", { className: "text-center py-8", children: [_jsx("div", { className: "text-5xl mb-4", children: "\u2705" }), _jsx("h3", { className: "text-2xl font-playfair font-bold text-gray-800 mb-2", children: "Booking Confirmed!" }), _jsxs("p", { className: "text-gray-600", children: ["We have sent a confirmation to ", guestDetails.email, "."] })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx("h3", { className: "text-xl font-bold font-playfair", children: bookingStep === 1 ? "Guest Details" : "Secure Payment" }), _jsx("button", { onClick: () => setShowModal(false), className: "text-gray-400 hover:text-gray-600 text-2xl", children: "\u00D7" })] }), _jsxs("div", { className: "flex gap-2 mb-6", children: [_jsx("div", { className: `h-1 flex-1 rounded ${bookingStep >= 1 ? 'bg-primary-600' : 'bg-gray-200'}`, style: { backgroundColor: bookingStep >= 1 ? profile.primaryColor : '#eee' } }), _jsx("div", { className: `h-1 flex-1 rounded ${bookingStep >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`, style: { backgroundColor: bookingStep >= 2 ? profile.primaryColor : '#eee' } })] }), bookingStep === 1 && (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "bg-gray-50 p-4 rounded text-sm", children: [_jsx("p", { className: "font-bold text-gray-800 text-lg mb-2", children: selectedRoomType?.name }), _jsxs("div", { className: "flex justify-between text-gray-600 mb-1", children: [_jsxs("span", { children: [new Date(checkIn).toLocaleDateString(), " \u2014 ", new Date(checkOut).toLocaleDateString()] }), _jsxs("span", { children: [guests, " Guests"] })] }), _jsxs("div", { className: "mt-4 pt-4 border-t border-gray-200 space-y-2", children: [selectedRoomType?.breakfastAvailable && (_jsxs("label", { className: "flex items-center justify-between cursor-pointer hover:bg-gray-100 p-2 rounded -mx-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: wantsBreakfast, onChange: e => setWantsBreakfast(e.target.checked), className: "h-4 w-4 text-primary-600 rounded" }), _jsx("span", { className: "font-medium", children: "Add Breakfast" })] }), _jsx("span", { className: "text-gray-500 text-xs", children: "+$7/person/night" })] })), _jsxs("label", { className: "flex items-center justify-between cursor-pointer hover:bg-gray-100 p-2 rounded -mx-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: wantsParking, onChange: e => setWantsParking(e.target.checked), className: "h-4 w-4 text-primary-600 rounded" }), _jsx("span", { className: "font-medium", children: "Request Parking" })] }), _jsx("span", { className: "text-gray-500 text-xs", children: "+$20/night" })] })] }), _jsxs("div", { className: "mt-4 pt-4 border-t border-gray-200 flex justify-between items-center text-lg font-bold", style: { color: profile.primaryColor }, children: [_jsx("span", { children: "Total Price:" }), _jsxs("span", { children: ["$", (() => {
                                                                const start = new Date(checkIn).getTime();
                                                                const end = new Date(checkOut).getTime();
                                                                const nights = Math.max(1, Math.ceil((end - start) / (86400000)));
                                                                const base = selectedRoomType?.basePrice;
                                                                const breakfast = (wantsBreakfast && selectedRoomType?.breakfastAvailable) ? (7 * guests * nights) : 0;
                                                                const parking = wantsParking ? (20 * nights) : 0;
                                                                return base + breakfast + parking;
                                                            })()] })] })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-gray-500 uppercase mb-1", children: "First Name" }), _jsx("input", { className: "border p-2 w-full rounded outline-none focus:border-primary-500", value: guestDetails.firstName, onChange: e => setGuestDetails({ ...guestDetails, firstName: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-gray-500 uppercase mb-1", children: "Last Name" }), _jsx("input", { className: "border p-2 w-full rounded outline-none focus:border-primary-500", value: guestDetails.lastName, onChange: e => setGuestDetails({ ...guestDetails, lastName: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-gray-500 uppercase mb-1", children: "Email Address" }), _jsx("input", { className: "border p-2 w-full rounded outline-none focus:border-primary-500", value: guestDetails.email, onChange: e => setGuestDetails({ ...guestDetails, email: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-gray-500 uppercase mb-1", children: "Phone Number" }), _jsx("input", { className: "border p-2 w-full rounded outline-none focus:border-primary-500", value: guestDetails.phone, onChange: e => setGuestDetails({ ...guestDetails, phone: e.target.value }) })] })] }), _jsx("button", { onClick: goToPayment, className: "w-full py-3 text-white font-bold uppercase tracking-widest transition-colors rounded shadow hover:shadow-lg", style: { backgroundColor: profile.primaryColor }, children: "Proceed to Payment" })] })), bookingStep === 2 && (_jsxs("div", { className: "space-y-6 animate-fade-in-up", children: [_jsxs("div", { className: "bg-gray-50 p-4 rounded text-center border border-gray-200", children: [_jsx("p", { className: "text-gray-500 text-sm uppercase tracking-wide", children: "Total to Pay" }), _jsxs("p", { className: "text-3xl font-bold", style: { color: profile.primaryColor }, children: ["$", (() => {
                                                        const start = new Date(checkIn).getTime();
                                                        const end = new Date(checkOut).getTime();
                                                        const nights = Math.max(1, Math.ceil((end - start) / (86400000)));
                                                        const base = selectedRoomType?.basePrice;
                                                        const breakfast = (wantsBreakfast && selectedRoomType?.breakfastAvailable) ? (7 * guests * nights) : 0;
                                                        const parking = wantsParking ? (20 * nights) : 0;
                                                        return base + breakfast + parking;
                                                    })()] })] }), _jsxs("div", { className: "p-4 bg-white rounded border border-gray-200 shadow-sm", children: [_jsxs("h4", { className: "font-bold text-sm uppercase mb-4 text-gray-700 flex items-center gap-2", children: [_jsx(FaCreditCard, {}), " Card Details"] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-gray-400 uppercase mb-1", children: "Card Number" }), _jsxs("div", { className: "relative", children: [_jsx("input", { className: "border p-2 pl-10 w-full rounded outline-none focus:border-primary-500 font-mono text-sm", placeholder: "0000 0000 0000 0000" }), _jsx("div", { className: "absolute left-3 top-2.5 text-gray-400", children: "\uD83D\uDCB3" })] })] }), _jsxs("div", { className: "flex gap-4", children: [_jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "block text-xs font-bold text-gray-400 uppercase mb-1", children: "Expiry" }), _jsx("input", { className: "border p-2 w-full rounded outline-none focus:border-primary-500 font-mono text-sm", placeholder: "MM/YY" })] }), _jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "block text-xs font-bold text-gray-400 uppercase mb-1", children: "CVC" }), _jsx("input", { className: "border p-2 w-full rounded outline-none focus:border-primary-500 font-mono text-sm", type: "password", placeholder: "123" })] })] }), _jsxs("p", { className: "text-[10px] text-gray-400 mt-2 text-center flex items-center justify-center gap-1", children: [_jsx("span", { className: "w-2 h-2 rounded-full bg-green-500" }), "Secure Payment Encryption"] })] })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: () => setBookingStep(1), className: "px-4 py-3 text-gray-600 font-bold uppercase tracking-widest border rounded hover:bg-gray-50", children: "Back" }), _jsx("button", { onClick: confirmBooking, disabled: bookingStatus === "processing", className: "flex-1 py-3 text-white font-bold uppercase tracking-widest transition-colors rounded shadow-lg hover:shadow-xl transform hover:-translate-y-0.5", style: { backgroundColor: profile.primaryColor }, children: bookingStatus === "processing" ? "Processing..." : "Pay & Book Now" })] })] }))] })) }) }))] }));
};
export default PublicSite;
