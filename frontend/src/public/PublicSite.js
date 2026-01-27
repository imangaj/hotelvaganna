import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { hotelProfileAPI, bookingAPI, publicAPI, guestAuthAPI, paymentsAPI } from "../api/endpoints";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaCalendarAlt, FaUser, FaPhone, FaEnvelope, FaFacebook, FaInstagram, FaTwitter, FaWifi, FaCoffee, FaCar, FaCreditCard, FaSwimmingPool, FaSnowflake, FaDumbbell, FaSpa, FaUtensils, FaShuttleVan, FaTv, FaConciergeBell, FaBaby, FaDog, FaWheelchair, FaKey, FaWind } from "react-icons/fa";
import { MdSingleBed, MdKingBed, MdBed } from "react-icons/md";
import LanguageSelector from "../components/LanguageSelector";
import { useLanguage } from "../contexts/LanguageContext";
const PublicSite = () => {
    const { t, language } = useLanguage();
    const [profile, setProfile] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    // Search State
    const [checkIn, setCheckIn] = useState(new Date().toISOString().split('T')[0]);
    const [checkOut, setCheckOut] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
    const [guests, setGuests] = useState(2);
    const [roomCount, setRoomCount] = useState(1);
    const [availableRooms, setAvailableRooms] = useState([]); // Grouped items
    // Booking Modal State
    const [selectedRoomType, setSelectedRoomType] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showRulesModal, setShowRulesModal] = useState(false);
    const [rulesAccepted, setRulesAccepted] = useState(false);
    const [guestDetails, setGuestDetails] = useState({ firstName: "", lastName: "", email: "", phone: "" });
    const [checkInName, setCheckInName] = useState("");
    const [additionalGuestNames, setAdditionalGuestNames] = useState("");
    const [guestId, setGuestId] = useState(null);
    const [bookingStatus, setBookingStatus] = useState("idle");
    const [bookingStep, setBookingStep] = useState(1);
    const [wantsBreakfast, setWantsBreakfast] = useState(false);
    const [wantsParking, setWantsParking] = useState(false);
    const [guestToken, setGuestToken] = useState(localStorage.getItem("guestToken"));
    const [guestEmail, setGuestEmail] = useState("");
    const [guestProfileName, setGuestProfileName] = useState("");
    const [confirmation, setConfirmation] = useState(null);
    useEffect(() => {
        loadInitialData();
    }, []);
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const stripeStatus = params.get("stripe");
        const sessionId = params.get("session_id");
        const finalizeAfterPayment = async () => {
            if (!sessionId || stripeStatus !== "success")
                return;
            const pendingRaw = sessionStorage.getItem("pendingBooking");
            if (!pendingRaw)
                return;
            try {
                setBookingStatus("processing");
                const verifyRes = await paymentsAPI.verifySession(sessionId);
                if (verifyRes.data?.status !== "paid") {
                    setBookingStatus("error");
                    return;
                }
                const pending = JSON.parse(pendingRaw);
                const guestIdToUse = pending.guestId;
                if (!guestIdToUse) {
                    setBookingStatus("error");
                    return;
                }
                const createdRefs = [];
                let totalForAllRooms = 0;
                for (let i = 0; i < pending.roomCount; i++) {
                    const guestsForThisRoom = Math.floor(pending.guests / pending.roomCount) + (i === 0 ? pending.guests % pending.roomCount : 0);
                    const thisBreakfastCost = pending.wantsBreakfast ? (pending.PRICE_BREAKFAST * guestsForThisRoom * pending.nights) : 0;
                    const thisParkingCost = (pending.wantsParking && i === 0) ? (pending.PRICE_PARKING * pending.nights) : 0;
                    const thisBookingTotal = pending.roomPrice + thisBreakfastCost + thisParkingCost;
                    totalForAllRooms += thisBookingTotal;
                    const roomIdToUse = pending.roomIds[i] || pending.roomIds[0];
                    const bookingRes = await bookingAPI.create({
                        guestId: guestIdToUse,
                        propertyId: pending.propertyId,
                        roomId: roomIdToUse,
                        checkInDate: pending.checkIn,
                        checkOutDate: pending.checkOut,
                        numberOfGuests: guestsForThisRoom,
                        breakfastCount: pending.wantsBreakfast ? guestsForThisRoom : 0,
                        parkingIncluded: (pending.wantsParking && i === 0),
                        source: "website",
                        totalPrice: thisBookingTotal,
                        paidAmount: thisBookingTotal,
                        notes: [
                            pending.checkInName ? `Check-in guest: ${pending.checkInName}` : null,
                            pending.additionalGuestNames ? `Additional guests: ${pending.additionalGuestNames}` : null,
                        ].filter(Boolean).join(" | ") || undefined,
                        status: "confirmed",
                    });
                    const ref = bookingRes.data?.bookingNumber || (bookingRes.data?.id ? `#${bookingRes.data.id}` : "");
                    if (ref)
                        createdRefs.push(ref);
                }
                setConfirmation({
                    guest: { ...pending.guestDetails },
                    checkInName: pending.checkInName,
                    additionalGuestNames: pending.additionalGuestNames,
                    checkIn: pending.checkIn,
                    checkOut: pending.checkOut,
                    bookedAt: new Date().toISOString(),
                    roomTypeName: pending.roomTypeName,
                    roomCount: pending.roomCount,
                    guests: pending.guests,
                    wantsBreakfast: pending.wantsBreakfast,
                    wantsParking: pending.wantsParking,
                    totalPrice: totalForAllRooms,
                    bookingRefs: createdRefs.length ? createdRefs : ["Confirmed"],
                });
                setBookingStatus("success");
                sessionStorage.removeItem("pendingBooking");
                window.history.replaceState({}, document.title, window.location.pathname);
            }
            catch (err) {
                console.error(err);
                setBookingStatus("error");
            }
        };
        if (stripeStatus === "cancel") {
            sessionStorage.removeItem("pendingBooking");
            window.history.replaceState({}, document.title, window.location.pathname);
            setBookingStatus("idle");
        }
        finalizeAfterPayment();
    }, []);
    useEffect(() => {
        const loadGuestProfile = async () => {
            if (!guestToken)
                return;
            try {
                const res = await guestAuthAPI.me(guestToken);
                const email = res.data?.email || "";
                const firstName = res.data?.firstName || "";
                const lastName = res.data?.lastName || "";
                const phone = res.data?.phone || "";
                const id = res.data?.guestId ?? null;
                setGuestEmail(email);
                setGuestProfileName(`${firstName} ${lastName}`.trim());
                setGuestId(id);
                setGuestDetails((prev) => ({
                    ...prev,
                    email,
                    firstName: prev.firstName || firstName,
                    lastName: prev.lastName || lastName,
                    phone: prev.phone || phone,
                }));
                setCheckInName((prev) => prev || `${firstName} ${lastName}`.trim());
            }
            catch (err) {
                console.error(err);
            }
        };
        loadGuestProfile();
    }, [guestToken]);
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
            const mappedResults = (res.data || [])
                .filter((r) => (r.availableCount || 0) >= roomCount)
                .map((r) => ({
                name: r.name,
                description: r.description,
                maxGuests: r.maxGuests,
                basePrice: r.totalPrice, // Total price for stay
                count: r.availableCount,
                breakfastAvailable: r.breakfastAvailable,
                sampleRoom: {
                    id: r.assignableRoomIds?.[0], // Pick first for primary booking ref
                    ids: r.assignableRoomIds, // All available IDs for multi-room booking
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
        const token = localStorage.getItem("guestToken");
        if (!token) {
            alert("Please log in or create a guest account before booking.");
            window.location.href = "/guest";
            return;
        }
        setGuestToken(token);
        setSelectedRoomType(roomType);
        setBookingStatus("idle");
        setBookingStep(1);
        setWantsBreakfast(false);
        setWantsParking(false);
        setRulesAccepted(false);
        const rulesText = getLocalizedText(profile?.contentJson?.i18n?.rules?.content, profile?.contentJson?.rules?.content || "");
        const shouldShowRules = profile?.contentJson?.rules?.show !== false && rulesText.trim().length > 0;
        if (shouldShowRules) {
            setShowRulesModal(true);
            return;
        }
        setShowModal(true);
    };
    const handleAcceptRules = () => {
        setShowRulesModal(false);
        setRulesAccepted(true);
        setShowModal(true);
    };
    const goToPayment = () => {
        if (!checkInName) {
            alert("Please enter the check-in name.");
            return;
        }
        setBookingStep(2);
    };
    const confirmBooking = async () => {
        const token = localStorage.getItem("guestToken");
        if (!token) {
            alert("Please log in or create a guest account before booking.");
            window.location.href = "/guest";
            return;
        }
        if (!selectedRoomType || !checkInName) {
            alert("Please enter the check-in name.");
            return;
        }
        if (!guestId) {
            alert("Please log in again to refresh your guest profile.");
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
        // basePrice from API is now Total Price for stay (Per Room)
        const roomPrice = selectedRoomType.basePrice;
        try {
            const roomIds = selectedRoomType.sampleRoom.ids && selectedRoomType.sampleRoom.ids.length >= roomCount
                ? selectedRoomType.sampleRoom.ids
                : [selectedRoomType.sampleRoom.id];
            let totalForAllRooms = 0;
            for (let i = 0; i < roomCount; i++) {
                const guestsForThisRoom = Math.floor(guests / roomCount) + (i === 0 ? guests % roomCount : 0);
                const thisBreakfastCost = wantsBreakfast ? (PRICE_BREAKFAST * guestsForThisRoom * nights) : 0;
                const thisParkingCost = (wantsParking && i === 0) ? (PRICE_PARKING * nights) : 0;
                totalForAllRooms += roomPrice + thisBreakfastCost + thisParkingCost;
            }
            const pending = {
                guestDetails,
                guestId,
                checkInName,
                additionalGuestNames,
                checkIn,
                checkOut,
                roomTypeName: selectedRoomType?.name || "",
                roomCount,
                guests,
                wantsBreakfast,
                wantsParking,
                roomIds,
                propertyId: selectedRoomType.sampleRoom.propertyId,
                roomPrice,
                PRICE_BREAKFAST,
                PRICE_PARKING,
                nights,
            };
            sessionStorage.setItem("pendingBooking", JSON.stringify(pending));
            const sessionRes = await paymentsAPI.createCheckoutSession({
                amount: totalForAllRooms,
                currency: "eur",
                description: `${pending.roomTypeName} x${roomCount} (${checkIn} - ${checkOut})`,
                customerEmail: guestEmail || guestDetails.email,
            });
            const checkoutUrl = sessionRes.data?.url;
            if (!checkoutUrl) {
                setBookingStatus("error");
                return;
            }
            window.location.href = checkoutUrl;
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
    const getLocalizedText = (value, fallback = "") => {
        if (!value)
            return fallback;
        if (typeof value === "string")
            return value;
        const lang = language;
        return value[lang] || value.en || fallback;
    };
    // STRICT IMAGE LOGIC: Use local banner if present, else fallback
    let heroImage = "/banner.png"; // Use local file by default
    // Try to use the configured image if it looks valid
    if (profile.contentJson?.hero?.image && profile.contentJson.hero.image.trim().length > 10) {
        heroImage = profile.contentJson.hero.image;
    }
    // FALLBACK TITLES
    const heroTitle = getLocalizedText(profile.contentJson?.i18n?.hero?.title, profile.contentJson?.hero?.title || profile.websiteTitle || profile.name || "Welcome to Ponale");
    const heroSubtitle = getLocalizedText(profile.contentJson?.i18n?.hero?.subtitle, profile.contentJson?.hero?.subtitle || "Experience the charm of Milan");
    const bgStyle = {
        backgroundImage: `url(${heroImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
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
    const getAmenityIcon = (label) => {
        const text = label.toLowerCase();
        if (text.includes("wifi") || text.includes("internet") || text.includes("wi-fi") || text.includes("wi fi"))
            return FaWifi;
        if (text.includes("breakfast") || text.includes("coffee") || text.includes("colazione"))
            return FaCoffee;
        if (text.includes("parking") || text.includes("park") || text.includes("garage"))
            return FaCar;
        if (text.includes("pool") || text.includes("piscina"))
            return FaSwimmingPool;
        if (text.includes("aria") || text.includes("condizionata"))
            return FaWind;
        if (text.includes("air") || text.includes("a/c") || text.includes("ac") || text.includes("condition") || text.includes("climat"))
            return FaSnowflake;
        if (text.includes("gym") || text.includes("fitness") || text.includes("palestra"))
            return FaDumbbell;
        if (text.includes("spa") || text.includes("sauna") || text.includes("wellness"))
            return FaSpa;
        if (text.includes("restaurant") || text.includes("ristorante") || text.includes("dining") || text.includes("cena"))
            return FaUtensils;
        if (text.includes("shuttle") || text.includes("transfer") || text.includes("taxi") || text.includes("airport"))
            return FaShuttleVan;
        if (text.includes("tv") || text.includes("television"))
            return FaTv;
        if (text.includes("reception") || text.includes("concierge") || text.includes("front desk") || text.includes("24"))
            return FaConciergeBell;
        if (text.includes("baby") || text.includes("crib") || text.includes("cot") || text.includes("culla"))
            return FaBaby;
        if (text.includes("pet") || text.includes("dog") || text.includes("cats") || text.includes("animali"))
            return FaDog;
        if (text.includes("wheelchair") || text.includes("accessible") || text.includes("accessibile"))
            return FaWheelchair;
        if (text.includes("key") || text.includes("lock") || text.includes("safe"))
            return FaKey;
        if (text.includes("card") || text.includes("credit") || text.includes("payment") || text.includes("pagamento"))
            return FaCreditCard;
        return FaCoffee;
    };
    const getRoomImage = (roomName) => {
        if (!roomName)
            return null;
        const name = roomName.toLowerCase();
        if (name.includes("single") || name.includes("singola"))
            return "/singola.jpg";
        if (name.includes("tripola") || name.includes("triple"))
            return "/tripola.jpg";
        if (name.includes("familiare") || name.includes("family"))
            return "/familiare.jpg";
        if (name.includes("piccola") && name.includes("matrimoniale"))
            return "/matrimoniale piccola.jpg";
        if (name.includes("matrimoniale"))
            return "/matrimoniale.jpg";
        if (name.includes("dopia") || name.includes("doppia") || name.includes("double"))
            return "/dopia.jpg";
        return null;
    };
    // Email and phone validation helpers
    const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isValidPhone = (phone) => /^[+]?\d{7,16}$/.test(phone.replace(/\s+/g, ""));
    return (_jsxs("div", { className: "font-sans text-gray-800 min-h-screen flex flex-col", children: [showRulesModal && (_jsx("div", { className: "fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-xl shadow-xl w-full max-w-lg p-6", children: [_jsx("h3", { className: "text-xl font-bold text-gray-800 mb-3", children: getLocalizedText(profile?.contentJson?.i18n?.rules?.title, profile?.contentJson?.rules?.title || t("rules_title")) }), _jsx("div", { className: "text-sm text-gray-600 whitespace-pre-line max-h-64 overflow-auto border rounded p-3 bg-gray-50", children: getLocalizedText(profile?.contentJson?.i18n?.rules?.content, profile?.contentJson?.rules?.content || "") }), _jsxs("label", { className: "flex items-center gap-2 mt-4 text-sm text-gray-700", children: [_jsx("input", { type: "checkbox", checked: rulesAccepted, onChange: (e) => setRulesAccepted(e.target.checked) }), t("rules_accept")] }), _jsxs("div", { className: "mt-5 flex justify-end gap-2", children: [_jsx("button", { className: "px-4 py-2 rounded border text-gray-600", onClick: () => setShowRulesModal(false), children: t("rules_cancel") }), _jsx("button", { className: "px-4 py-2 rounded text-white disabled:opacity-50", style: { backgroundColor: profile?.primaryColor || "#2E5D4B" }, disabled: !rulesAccepted, onClick: handleAcceptRules, children: t("rules_continue") })] })] }) })), _jsx("header", { className: "fixed w-full z-50 transition-all duration-300 bg-white/90 backdrop-blur-md shadow-sm", children: _jsxs("div", { className: "max-w-7xl mx-auto px-6 py-4 flex justify-between items-center", children: [_jsxs("div", { className: "flex items-center gap-2", children: [profile.logoUrl && _jsx("img", { src: profile.logoUrl, alt: "Logo", className: "h-10" }), _jsx("span", { className: "text-xl font-bold tracking-widest uppercase", style: { color: profile.primaryColor }, children: getLocalizedText(profile.contentJson?.i18n?.websiteTitle, profile.websiteTitle || profile.name) })] }), _jsxs("nav", { className: "hidden md:flex gap-8 text-sm font-medium tracking-wide", children: [_jsx("a", { href: "#", className: "hover:text-gold-500 transition-colors", children: t('nav_home') }), profile.contentJson?.about?.show !== false && _jsx("a", { href: "#about", className: "hover:text-gold-500 transition-colors", children: t('nav_about') }), _jsx("a", { href: "#rooms", className: "hover:text-gold-500 transition-colors", children: t('nav_suites') }), profile.contentJson?.map?.show !== false && _jsx("a", { href: "#location", className: "hover:text-gold-500 transition-colors", children: t('nav_location') }), _jsx("a", { href: "/guest", className: "hover:text-gold-500 transition-colors", children: "My Reservation" })] }), _jsxs("div", { className: "flex items-center gap-3 sm:gap-4", children: [guestProfileName && (_jsxs("span", { className: "hidden sm:inline text-sm text-gray-600", children: ["Hi, ", guestProfileName] })), _jsx("a", { href: "/guest", className: "md:hidden text-xs sm:text-sm font-semibold text-gray-700 hover:text-gray-900", children: "My Reservation" }), _jsx(LanguageSelector, {}), _jsx("button", { className: "px-6 py-2 text-white text-sm font-bold tracking-wider uppercase transition-transform hover:scale-105", style: { backgroundColor: profile.secondaryColor }, children: t('nav_book_now') })] })] }) }), profile.contentJson?.hero?.show !== false && (_jsxs("section", { className: "relative h-screen min-h-[600px] flex items-center justify-center bg-cover bg-center text-center px-4 pt-24 md:pt-32", style: bgStyle, children: [_jsx("div", { className: "absolute inset-0 bg-black/40" }), _jsxs("div", { className: "relative z-10 text-white max-w-4xl animate-fade-in-up", children: [_jsx("h2", { className: "text-lg md:text-xl font-light tracking-[0.2em] mb-4 uppercase", children: heroSubtitle }), _jsx("h1", { className: "text-4xl md:text-6xl lg:text-7xl font-playfair mb-8 leading-tight", children: heroTitle })] }), _jsxs("div", { className: "absolute -bottom-16 left-0 right-0 z-20 px-4", children: [_jsx("style", { children: `
                    .react-datepicker-wrapper { width: 100%; }
                    .react-datepicker__input-container input { width: 100%; }
                    .react-datepicker { font-family: sans-serif; border: none; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                    .react-datepicker__header { background: white; border-bottom: 1px solid #eee; padding-top: 15px; }
                    .react-datepicker__day--selected, .react-datepicker__day--in-range { background-color: ${profile.primaryColor} !important; color: white !important; }
                    .react-datepicker__day--keyboard-selected { background-color: ${profile.secondaryColor} !important; }
                    .react-datepicker__day-name { color: #888; text-transform: uppercase; font-size: 0.7em; letter-spacing: 1px; }
                    .react-datepicker__current-month { font-weight: bold; color: ${profile.primaryColor}; margin-bottom: 10px; }
                ` }), _jsxs("div", { className: "max-w-5xl mx-auto bg-white shadow-2xl rounded-lg p-6 flex flex-col md:flex-row gap-4 items-end", children: [_jsxs("div", { className: "flex-[2] w-full", children: [_jsx("label", { className: "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2", children: t('hero_dates') }), _jsxs("div", { className: "flex items-center border border-gray-200 rounded-md px-4 py-3 bg-gray-50 hover:bg-white hover:border-gray-300 transition-colors", children: [_jsx(FaCalendarAlt, { className: "text-gray-400 mr-3 text-lg" }), _jsx(DatePicker, { selectsRange: true, startDate: checkIn ? new Date(checkIn) : null, endDate: checkOut ? new Date(checkOut) : null, onChange: (update) => {
                                                            const [start, end] = update;
                                                            setCheckIn(start ? start.toLocaleDateString("en-CA") : "");
                                                            setCheckOut(end ? end.toLocaleDateString("en-CA") : "");
                                                        }, className: "bg-transparent w-full outline-none text-gray-800 font-medium font-sans text-base placeholder-gray-400 text-left", placeholderText: t('hero_checkin_placeholder'), dateFormat: "MMM d, yyyy", minDate: new Date(), monthsShown: 2 })] })] }), _jsxs("div", { className: "w-full md:w-32", children: [_jsx("label", { className: "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2", children: t('hero_guests') }), _jsxs("div", { className: "flex items-center border border-gray-200 rounded-md px-4 py-3 bg-gray-50 hover:bg-white hover:border-gray-300 transition-colors", children: [_jsx(FaUser, { className: "text-gray-400 mr-2" }), _jsx("select", { className: "bg-transparent w-full outline-none text-gray-700", value: guests, onChange: e => setGuests(Number(e.target.value)), children: [1, 2, 3, 4, 5, 6].map(n => _jsx("option", { value: n, children: n }, n)) })] })] }), _jsxs("div", { className: "w-full md:w-32", children: [_jsx("label", { className: "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2", children: t('hero_rooms') }), _jsxs("div", { className: "flex items-center border border-gray-200 rounded-md px-4 py-3 bg-gray-50 hover:bg-white hover:border-gray-300 transition-colors", children: [_jsx(MdBed, { className: "text-gray-400 mr-2 text-lg" }), _jsx("select", { className: "bg-transparent w-full outline-none text-gray-700", value: roomCount, onChange: e => setRoomCount(Number(e.target.value)), children: [1, 2, 3, 4, 5].map(n => _jsx("option", { value: n, children: n }, n)) })] })] }), _jsx("button", { onClick: handleSearch, className: "w-full md:w-auto px-8 py-3 text-white font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2", style: { backgroundColor: profile.primaryColor }, children: searching ? t('hero_searching') : _jsx(_Fragment, { children: t('hero_check_avail') }) })] })] })] })), _jsxs("div", { id: "about", className: "pt-32 pb-20 bg-gray-50 px-6 text-center", children: [profile.contentJson?.about?.show !== false && (_jsxs("div", { className: "max-w-3xl mx-auto", children: [_jsx("h3", { className: "text-primary-800 text-3xl font-playfair mb-6", style: { color: profile.primaryColor }, children: getLocalizedText(profile.contentJson?.i18n?.about?.title, profile.contentJson?.about?.title || "Welcome") }), _jsx("div", { className: "w-16 h-1 bg-gold-500 mx-auto mb-8", style: { backgroundColor: profile.secondaryColor } }), _jsx("p", { className: "text-gray-600 leading-relaxed text-lg whitespace-pre-line", children: getLocalizedText(profile.contentJson?.i18n?.about?.content, profile.contentJson?.about?.content || profile.description || "") })] })), profile.contentJson?.features?.showAmenities !== false && (_jsx("div", { className: "mt-16 max-w-4xl mx-auto", children: getLocalizedText(profile.contentJson?.i18n?.amenities, profile.amenities || "") ? (_jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-8", children: getLocalizedText(profile.contentJson?.i18n?.amenities, profile.amenities || "").split(',').map((item, idx) => {
                                const text = item.trim();
                                if (!text)
                                    return null;
                                const Icon = getAmenityIcon(text);
                                return (_jsxs("div", { className: "flex flex-col items-center gap-3 text-gray-500 animate-fade-in", children: [_jsx(Icon, { className: "text-3xl", style: { color: profile.secondaryColor } }), _jsx("span", { className: "text-sm font-medium uppercase tracking-widest", children: text })] }, idx));
                            }) })) : (
                        /* Fallback default amenities if none entered */
                        _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-8 justify-center", children: [_jsxs("div", { className: "flex flex-col items-center gap-3 text-gray-500", children: [_jsx(FaWifi, { className: "text-3xl", style: { color: profile.secondaryColor } }), _jsx("span", { className: "text-sm font-medium uppercase tracking-widest", children: "Free Wifi" })] }), _jsxs("div", { className: "flex flex-col items-center gap-3 text-gray-500", children: [_jsx(FaCar, { className: "text-3xl", style: { color: profile.secondaryColor } }), _jsx("span", { className: "text-sm font-medium uppercase tracking-widest", children: "Parking" })] }), _jsxs("div", { className: "flex flex-col items-center gap-3 text-gray-500", children: [_jsx(FaCoffee, { className: "text-3xl", style: { color: profile.secondaryColor } }), _jsx("span", { className: "text-sm font-medium uppercase tracking-widest", children: "Breakfast" })] })] })) }))] }), _jsx("div", { id: "results", className: "py-20 bg-white px-6", children: _jsx("div", { className: "max-w-7xl mx-auto", children: availableRooms.length > 0 ? (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8", children: availableRooms.map((group, idx) => {
                            const roomImage = getRoomImage(group.name);
                            return (_jsxs("div", { className: "group border rounded-lg overflow-hidden hover:shadow-xl transition-shadow bg-white", children: [_jsxs("div", { className: "h-64 bg-gray-50 relative overflow-hidden flex items-center justify-center", children: [roomImage ? (_jsx("img", { src: roomImage, alt: group.name, className: "w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" })) : (_jsxs("div", { className: "flex flex-col items-center gap-2", children: [getBedIcons(group.name), _jsx("span", { className: "text-xs text-gray-400 uppercase tracking-widest mt-2", children: t('room_type') })] })), _jsxs("div", { className: "absolute top-4 right-4 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider rounded shadow flex items-center gap-1", children: [group.maxGuests, " ", t('room_guests')] }), group.breakfastAvailable && (_jsxs("div", { className: "absolute top-4 left-4 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider rounded shadow flex items-center gap-1 text-orange-600", children: [_jsx(FaCoffee, {}), " ", t('room_breakfast')] }))] }), _jsxs("div", { className: "p-6", children: [_jsx("h3", { className: "text-xl font-playfair font-bold mb-2 text-gray-900", children: group.name }), _jsx("p", { className: "text-gray-600 text-sm mb-4 line-clamp-2", children: group.description }), _jsxs("div", { className: "flex justify-between items-end border-t pt-4", children: [_jsxs("div", { children: [_jsx("span", { className: "text-xs text-gray-500 block uppercase tracking-wide", children: t('room_price_total') }), _jsxs("span", { className: "text-2xl font-bold", style: { color: profile.primaryColor }, children: ["\u20AC", group.basePrice] })] }), _jsx("button", { onClick: () => handleBookClick(group), className: "px-6 py-2 text-white text-sm font-bold uppercase tracking-widest transition-transform hover:-translate-y-1", style: { backgroundColor: profile.secondaryColor }, children: t('room_select') })] })] })] }, idx));
                        }) })) : (_jsx("div", { className: "text-center py-12 text-gray-400", children: _jsx("p", { children: "Enter dates above to check availability." }) })) }) }), profile.contentJson?.map?.show !== false && (_jsx("section", { id: "location", className: "h-[500px] w-full bg-gray-200 relative", children: _jsx("iframe", { src: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2796.3735846464388!2d9.159223076198147!3d45.50255773087862!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4786c0e350fbccaf%3A0xf2986aaa964cd292!2sHotel%20Valganna%20Srl!5e0!3m2!1sen!2sit!4v1768820423168!5m2!1sen!2sit", width: "100%", height: "100%", style: { border: 0 }, allowFullScreen: true, loading: "lazy", referrerPolicy: "no-referrer-when-downgrade", title: "Property Location" }) })), _jsxs("footer", { className: "text-white py-16 px-6", style: { backgroundColor: profile.primaryColor }, children: [_jsxs("div", { className: "max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12", children: [_jsxs("div", { children: [_jsx("h4", { className: "text-2xl font-playfair mb-6", children: getLocalizedText(profile.contentJson?.i18n?.websiteTitle, profile.websiteTitle || profile.name) }), _jsxs("p", { className: "opacity-80 leading-relaxed mb-6", children: [profile.address, _jsx("br", {}), profile.city, ", ", profile.country] }), _jsxs("div", { className: "flex gap-4", children: [profile.facebookUrl && _jsx("a", { href: profile.facebookUrl, className: "opacity-70 hover:opacity-100", children: _jsx(FaFacebook, { size: 20 }) }), profile.instagramUrl && _jsx("a", { href: profile.instagramUrl, className: "opacity-70 hover:opacity-100", children: _jsx(FaInstagram, { size: 20 }) }), profile.twitterUrl && _jsx("a", { href: profile.twitterUrl, className: "opacity-70 hover:opacity-100", children: _jsx(FaTwitter, { size: 20 }) })] })] }), _jsxs("div", { children: [_jsx("h5", { className: "font-bold tracking-widest uppercase mb-6 text-sm opacity-90", children: "Contact" }), _jsxs("div", { className: "space-y-4 opacity-80", children: [_jsxs("p", { className: "flex items-center gap-3", children: [_jsx(FaPhone, { size: 14, className: "opacity-60" }), " ", profile.phone] }), _jsxs("p", { className: "flex items-center gap-3", children: [_jsx(FaEnvelope, { size: 14, className: "opacity-60" }), " ", profile.email] })] })] }), _jsxs("div", { children: [_jsx("h5", { className: "font-bold tracking-widest uppercase mb-6 text-sm opacity-90", children: "Newsletter" }), _jsx("p", { className: "opacity-70 text-sm mb-4", children: getLocalizedText(profile.contentJson?.i18n?.footerText, profile.footerText || "Subscribe for exclusive offers.") }), _jsxs("div", { className: "flex", children: [_jsx("input", { type: "email", placeholder: "Your email", className: "bg-white/10 border-none outline-none px-4 py-2 text-white w-full placeholder-white/50" }), _jsx("button", { className: "px-4 py-2 bg-white text-primary-900 font-bold uppercase text-xs", style: { color: profile.primaryColor }, children: "Join" })] })] })] }), _jsx("div", { className: "max-w-7xl mx-auto mt-16 pt-8 border-t border-white/10 text-center opacity-50 text-xs tracking-widest uppercase", children: profile.footerCopyright || `© ${new Date().getFullYear()} ${profile.name}. All rights reserved.` })] }), showModal && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4", children: _jsx("div", { className: "bg-white rounded-lg shadow-2xl max-w-md w-full p-8 animate-fade-in-up", children: bookingStatus === "success" ? (_jsxs("div", { className: "space-y-5", children: [_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-5xl mb-3", children: "\u2705" }), _jsx("h3", { className: "text-2xl font-playfair font-bold text-gray-800", children: "Booking Confirmed!" }), _jsxs("p", { className: "text-gray-600 mt-1", children: ["We sent a confirmation to ", confirmation?.guest.email, "."] }), _jsx("p", { className: "text-xs text-gray-500 mt-2", children: "No account is required to book. You can view or print this reservation anytime at /guest using the same email." })] }), _jsxs("div", { className: "bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 space-y-2", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "font-semibold", children: "Reservation" }), _jsx("span", { children: confirmation ? confirmation.bookingRefs.join(", ") : "" })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "font-semibold", children: "Guest" }), _jsx("span", { children: confirmation?.checkInName || (confirmation ? `${confirmation.guest.firstName} ${confirmation.guest.lastName}` : "") })] }), confirmation?.additionalGuestNames && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "font-semibold", children: "Additional Guests" }), _jsx("span", { children: confirmation.additionalGuestNames })] })), confirmation?.checkInName && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "font-semibold", children: "Check-in Name" }), _jsx("span", { children: confirmation.checkInName })] })), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "font-semibold", children: "Dates" }), _jsxs("span", { children: [confirmation ? new Date(confirmation.checkIn).toLocaleDateString() : "", " \u2014 ", confirmation ? new Date(confirmation.checkOut).toLocaleDateString() : ""] })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "font-semibold", children: "Booked On" }), _jsx("span", { children: confirmation ? new Date(confirmation.bookedAt).toLocaleDateString() : "" })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "font-semibold", children: "Room" }), _jsx("span", { children: confirmation ? `${confirmation.roomTypeName} × ${confirmation.roomCount}` : "" })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "font-semibold", children: "Guests" }), _jsx("span", { children: confirmation?.guests ?? "" })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "font-semibold", children: "Extras" }), _jsxs("span", { children: [confirmation?.wantsBreakfast ? "Breakfast" : "No breakfast", confirmation?.wantsParking ? " + Parking" : ""] })] }), _jsxs("div", { className: "flex justify-between text-base font-bold pt-2 border-t", children: [_jsx("span", { children: "Total Paid" }), _jsxs("span", { children: ["\u20AC", confirmation ? confirmation.totalPrice.toFixed(2) : "0.00"] })] })] }), _jsx("button", { onClick: () => {
                                    setShowModal(false);
                                    setBookingStatus("idle");
                                    setConfirmation(null);
                                    setGuestDetails({ firstName: "", lastName: "", email: "", phone: "" });
                                    setWantsBreakfast(false);
                                    setWantsParking(false);
                                    setBookingStep(1);
                                }, className: "w-full py-3 text-white font-bold uppercase tracking-widest transition-colors rounded shadow", style: { backgroundColor: profile.primaryColor }, children: "Close" })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx("h3", { className: "text-xl font-bold font-playfair", children: bookingStep === 1 ? "Guest Details" : "Secure Payment" }), _jsx("button", { onClick: () => setShowModal(false), className: "text-gray-400 hover:text-gray-600 text-2xl", children: "\u00D7" })] }), _jsxs("div", { className: "flex gap-2 mb-6", children: [_jsx("div", { className: `h-1 flex-1 rounded ${bookingStep >= 1 ? 'bg-primary-600' : 'bg-gray-200'}`, style: { backgroundColor: bookingStep >= 1 ? profile.primaryColor : '#eee' } }), _jsx("div", { className: `h-1 flex-1 rounded ${bookingStep >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`, style: { backgroundColor: bookingStep >= 2 ? profile.primaryColor : '#eee' } })] }), bookingStep === 1 && (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "bg-gray-50 p-4 rounded text-sm", children: [_jsx("p", { className: "font-bold text-gray-800 text-lg mb-2", children: selectedRoomType?.name }), _jsxs("div", { className: "flex justify-between text-gray-600 mb-1", children: [_jsxs("span", { children: [new Date(checkIn).toLocaleDateString(), " \u2014 ", new Date(checkOut).toLocaleDateString()] }), _jsxs("span", { children: [guests, " Guests"] })] }), _jsxs("div", { className: "mt-4 pt-4 border-t border-gray-200 space-y-2", children: [selectedRoomType?.breakfastAvailable && (_jsxs("label", { className: "flex items-center justify-between cursor-pointer hover:bg-gray-100 p-2 rounded -mx-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: wantsBreakfast, onChange: e => setWantsBreakfast(e.target.checked), className: "h-4 w-4 text-primary-600 rounded" }), _jsx("span", { className: "font-medium", children: "Add Breakfast" })] }), _jsx("span", { className: "text-gray-500 text-xs", children: "+\u20AC7/person/night" })] })), _jsxs("label", { className: "flex items-center justify-between cursor-pointer hover:bg-gray-100 p-2 rounded -mx-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: wantsParking, onChange: e => setWantsParking(e.target.checked), className: "h-4 w-4 text-primary-600 rounded" }), _jsx("span", { className: "font-medium", children: "Request Parking" })] }), _jsx("span", { className: "text-gray-500 text-xs", children: "+\u20AC20/night" })] })] }), _jsxs("div", { className: "mt-4 pt-4 border-t border-gray-200 flex justify-between items-center text-lg font-bold", style: { color: profile.primaryColor }, children: [_jsx("span", { children: "Total Price:" }), _jsxs("span", { children: ["\u20AC", (() => {
                                                                const start = new Date(checkIn).getTime();
                                                                const end = new Date(checkOut).getTime();
                                                                const nights = Math.max(1, Math.ceil((end - start) / (86400000)));
                                                                const base = (selectedRoomType?.basePrice || 0) * roomCount;
                                                                const breakfast = (wantsBreakfast && selectedRoomType?.breakfastAvailable) ? (7 * guests * nights) : 0;
                                                                const parking = wantsParking ? (20 * nights) : 0;
                                                                return base + breakfast + parking;
                                                            })()] })] })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-gray-500 uppercase mb-1", children: "Check-in Name" }), _jsx("input", { className: "border p-2 w-full rounded outline-none focus:border-primary-500", value: checkInName, onChange: e => setCheckInName(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-gray-500 uppercase mb-1", children: "Additional Guest Names" }), _jsx("input", { className: "border p-2 w-full rounded outline-none focus:border-primary-500", placeholder: "e.g. John Smith, Maria Rossi", value: additionalGuestNames, onChange: e => setAdditionalGuestNames(e.target.value) })] }), guestProfileName && (_jsxs("p", { className: "text-xs text-gray-500", children: ["Default check-in name is your account name: ", guestProfileName] }))] }), _jsx("button", { onClick: goToPayment, className: "w-full py-3 text-white font-bold uppercase tracking-widest transition-colors rounded shadow hover:shadow-lg", style: { backgroundColor: profile.primaryColor }, children: "Proceed to Payment" })] })), bookingStep === 2 && (_jsxs("div", { className: "space-y-6 animate-fade-in-up", children: [_jsxs("div", { className: "bg-gray-50 p-4 rounded text-center border border-gray-200", children: [_jsx("p", { className: "text-gray-500 text-sm uppercase tracking-wide", children: "Total to Pay" }), _jsxs("p", { className: "text-3xl font-bold", style: { color: profile.primaryColor }, children: ["\u20AC", (() => {
                                                        const start = new Date(checkIn).getTime();
                                                        const end = new Date(checkOut).getTime();
                                                        const nights = Math.max(1, Math.ceil((end - start) / (86400000)));
                                                        const base = (selectedRoomType?.basePrice || 0) * roomCount;
                                                        const breakfast = (wantsBreakfast && selectedRoomType?.breakfastAvailable) ? (7 * guests * nights) : 0;
                                                        const parking = wantsParking ? (20 * nights) : 0;
                                                        return base + breakfast + parking;
                                                    })()] })] }), _jsxs("div", { className: "p-4 bg-white rounded border border-gray-200 shadow-sm relative overflow-hidden", children: [_jsxs("h4", { className: "font-bold text-sm uppercase mb-4 text-gray-700 flex items-center gap-2", children: [_jsx(FaCreditCard, {}), " Secure Card Payment"] }), _jsxs("div", { className: "space-y-2 text-gray-600 text-sm", children: [_jsx("p", { children: "Click the button below to pay securely with your card via Stripe." }), _jsx("p", { children: "You will be redirected to a secure payment page." })] })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: () => setBookingStep(1), className: "px-4 py-3 text-gray-600 font-bold uppercase tracking-widest border rounded hover:bg-gray-50", children: "Back" }), _jsx("button", { onClick: confirmBooking, disabled: bookingStatus === "processing", className: "flex-1 py-3 text-white font-bold uppercase tracking-widest transition-colors rounded shadow-lg hover:shadow-xl transform hover:-translate-y-0.5", style: { backgroundColor: profile.primaryColor }, children: bookingStatus === "processing" ? "Processing..." : "Pay & Book Now" })] })] }))] })) }) }))] }));
};
export default PublicSite;
