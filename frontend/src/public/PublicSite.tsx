import React, { useEffect, useRef, useState } from "react";
import { propertyAPI, roomAPI, hotelProfileAPI, bookingAPI, publicAPI, guestAuthAPI, paymentsAPI } from "../api/endpoints";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaCalendarAlt, FaUser, FaSearch, FaMapMarkerAlt, FaPhone, FaEnvelope, FaFacebook, FaInstagram, FaTwitter, FaWifi, FaCoffee, FaCar, FaCreditCard, FaSwimmingPool, FaSnowflake, FaDumbbell, FaSpa, FaUtensils, FaShuttleVan, FaTv, FaConciergeBell, FaBaby, FaDog, FaWheelchair, FaKey, FaWind } from "react-icons/fa";
import { MdSingleBed, MdKingBed, MdBed } from "react-icons/md";
import LanguageSelector from "../components/LanguageSelector";
import { useLanguage } from "../contexts/LanguageContext";
import { Language } from "../i18n/translations";

// --- Interfaces (matching SettingsPage) ---
interface HotelProfileData {
  name: string;
  description: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  websiteTitle: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  footerText: string;
  footerCopyright: string;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  amenities?: string;
  contentJson?: {
    hero?: { title: string; subtitle: string; image: string; show: boolean };
    about?: { title: string; content: string; show: boolean };
    features?: { show: boolean; showAmenities?: boolean };
    map?: { show: boolean; embedUrl: string };
        rules?: { show: boolean; title: string; content: string };
    services?: { icon: string; title: string; text: string }[];
        i18n?: {
                websiteTitle?: { en?: string; it?: string; zh?: string };
                footerText?: { en?: string; it?: string; zh?: string };
                amenities?: { en?: string; it?: string; zh?: string };
                hero?: { title?: { en?: string; it?: string; zh?: string }; subtitle?: { en?: string; it?: string; zh?: string } };
                about?: { title?: { en?: string; it?: string; zh?: string }; content?: { en?: string; it?: string; zh?: string } };
                rules?: { title?: { en?: string; it?: string; zh?: string }; content?: { en?: string; it?: string; zh?: string } };
        };
  }
}

interface Room {
    id: number;
    roomNumber: string;
    roomType: {
        id: number;
        name: string;
        description: string;
        basePrice: number;
        maxGuests: number;
    } | any; 
    status: string;
}

const PublicSite: React.FC = () => {
    const { t, language } = useLanguage();
  const [profile, setProfile] = useState<HotelProfileData | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  
  // Search State
  const [checkIn, setCheckIn] = useState(new Date().toISOString().split('T')[0]);
  const [checkOut, setCheckOut] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [guests, setGuests] = useState(2);
  const [roomCount, setRoomCount] = useState(1);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]); // Grouped items

  // Booking Modal State
  const [selectedRoomType, setSelectedRoomType] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
    const [showRulesModal, setShowRulesModal] = useState(false);
    const [rulesAccepted, setRulesAccepted] = useState(false);
    const [guestDetails, setGuestDetails] = useState({ firstName: "", lastName: "", email: "", phone: "" });
        const [checkInName, setCheckInName] = useState("");
        const [additionalGuestNames, setAdditionalGuestNames] = useState("");
        const [guestId, setGuestId] = useState<number | null>(null);
  const [bookingStatus, setBookingStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [bookingStep, setBookingStep] = useState(1);
  const [wantsBreakfast, setWantsBreakfast] = useState(false);
  const [wantsParking, setWantsParking] = useState(false);
    const [guestToken, setGuestToken] = useState<string | null>(localStorage.getItem("guestToken"));
    const [guestEmail, setGuestEmail] = useState<string>("");
    const [guestProfileName, setGuestProfileName] = useState<string>("");
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
    const accountMenuRef = useRef<HTMLDivElement | null>(null);
    const [confirmation, setConfirmation] = useState<null | {
        guest: { firstName: string; lastName: string; email: string; phone: string };
        checkInName?: string;
        additionalGuestNames?: string;
        checkIn: string;
        checkOut: string;
        bookedAt: string;
        roomTypeName: string;
        roomCount: number;
        guests: number;
        wantsBreakfast: boolean;
        wantsParking: boolean;
        totalPrice: number;
        bookingRefs: string[];
    }>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!accountMenuRef.current) return;
            if (!accountMenuRef.current.contains(event.target as Node)) {
                setIsAccountMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const stripeStatus = params.get("stripe");
        const sessionId = params.get("session_id");

        const finalizeAfterPayment = async () => {
            if (!sessionId || stripeStatus !== "success") return;

            const pendingRaw = sessionStorage.getItem("pendingBooking");
            if (!pendingRaw) return;

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

                const createdRefs: string[] = [];
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
                    if (ref) createdRefs.push(ref);
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
            } catch (err) {
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
            if (!guestToken) return;
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
            } catch (err) {
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
      if (!data.primaryColor) data.primaryColor = "#2E5D4B";
      if (!data.secondaryColor) data.secondaryColor = "#C5A059";
      setProfile(data);
    } catch (err) {
      console.error(err);
    } finally {
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
            .filter((r: any) => (r.availableCount || 0) >= roomCount)
            .map((r: any) => ({
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
    } catch (err) {
        console.error(err);
        alert("Search failed. Please try different dates.");
    } finally {
        setSearching(false);
    }
  };

  const handleBookClick = (roomType: any) => {
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
      } catch (err) {
          console.error(err);
          setBookingStatus("error");
      }
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-primary-900">Loading experience...</div>;
  if (!profile) return <div>Failed to load property profile.</div>;

    const getLocalizedText = (value: any, fallback = "") => {
        if (!value) return fallback;
        if (typeof value === "string") return value;
        const lang = language as Language;
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

    const guestFirstName = (guestProfileName || guestDetails.firstName || "Guest").split(" ")[0];

  // STRICT MAP LOGIC: Prevent recursive iframe if URL is bad
  let mapUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2796.3735846464388!2d9.159223076198147!3d45.50255773087862!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4786c0e350fbccaf%3A0xf2986aaa964cd292!2sHotel%20Valganna%20Srl!5e0!3m2!1sen!2sit!4v1768820423168!5m2!1sen!2sit";
  
  // Only allow valid Google Maps URLs to override the default
  if (profile.contentJson?.map?.embedUrl && 
      profile.contentJson.map.embedUrl.length > 20 && 
      profile.contentJson.map.embedUrl.includes("http") && 
      (profile.contentJson.map.embedUrl.includes("google.com") || profile.contentJson.map.embedUrl.includes("maps.co")) &&
      !profile.contentJson.map.embedUrl.includes("localhost") &&
      !profile.contentJson.map.embedUrl.includes("127.0.0.1")
      ) {
      mapUrl = profile.contentJson.map.embedUrl;
  }

  const getBedIcons = (roomName: string) => {
      if (!roomName) return null;
      const name = roomName.toLowerCase();
      const color = profile?.secondaryColor || "#C5A059";
      // Icon sizes
      const sizeSingle = "2em";
      const sizeQueen = "2.5em";
      const sizeKing = "3em";

      if (name.includes("single") || name.includes("singola")) {
          return <MdSingleBed size={sizeSingle} color={color} title="Single Bed" />;
      }
      if (name.includes("dopia") || name.includes("doppia") || name.includes("doubl") || name.includes("twin")) {
          return <div className="flex gap-1 justify-center"><MdSingleBed size={sizeSingle} color={color} title="Two Single Beds" /><MdSingleBed size={sizeSingle} color={color} title="Two Single Beds" /></div>;
      }
      if (name.includes("piccola") && name.includes("matrimoniale")) {
           return <MdBed size={sizeQueen} color={color} title="Queen Size Bed" />;
      }
      if (name.includes("matrimoniale") || name.includes("king")) {
          return <MdKingBed size={sizeKing} color={color} title="King Size Bed" />;
      }
      if (name.includes("tripola") || name.includes("triple")) {
           return <div className="flex gap-1 justify-center"><MdSingleBed size={sizeSingle} color={color} /><MdSingleBed size={sizeSingle} color={color} /><MdSingleBed size={sizeSingle} color={color} /></div>;
      }
      if (name.includes("familiare") || name.includes("family")) {
          return <div className="flex gap-2 items-end justify-center"><MdSingleBed size={sizeSingle} color={color} /><MdKingBed size={sizeKing} color={color} /></div>;
      }
      // Default fallback
      return <MdBed size={sizeQueen} color={color} />;
  };

    const getAmenityIcon = (label: string) => {
            const text = label.toLowerCase();
            if (text.includes("wifi") || text.includes("internet") || text.includes("wi-fi") || text.includes("wi fi")) return FaWifi;
            if (text.includes("breakfast") || text.includes("coffee") || text.includes("colazione")) return FaCoffee;
            if (text.includes("parking") || text.includes("park") || text.includes("garage")) return FaCar;
            if (text.includes("pool") || text.includes("piscina")) return FaSwimmingPool;
            if (text.includes("aria") || text.includes("condizionata")) return FaWind;
            if (text.includes("air") || text.includes("a/c") || text.includes("ac") || text.includes("condition") || text.includes("climat")) return FaSnowflake;
            if (text.includes("gym") || text.includes("fitness") || text.includes("palestra")) return FaDumbbell;
            if (text.includes("spa") || text.includes("sauna") || text.includes("wellness")) return FaSpa;
            if (text.includes("restaurant") || text.includes("ristorante") || text.includes("dining") || text.includes("cena")) return FaUtensils;
            if (text.includes("shuttle") || text.includes("transfer") || text.includes("taxi") || text.includes("airport")) return FaShuttleVan;
            if (text.includes("tv") || text.includes("television")) return FaTv;
            if (text.includes("reception") || text.includes("concierge") || text.includes("front desk") || text.includes("24")) return FaConciergeBell;
            if (text.includes("baby") || text.includes("crib") || text.includes("cot") || text.includes("culla")) return FaBaby;
            if (text.includes("pet") || text.includes("dog") || text.includes("cats") || text.includes("animali")) return FaDog;
            if (text.includes("wheelchair") || text.includes("accessible") || text.includes("accessibile")) return FaWheelchair;
            if (text.includes("key") || text.includes("lock") || text.includes("safe")) return FaKey;
            if (text.includes("card") || text.includes("credit") || text.includes("payment") || text.includes("pagamento")) return FaCreditCard;
            return FaCoffee;
    };

  const getRoomImage = (roomName: string) => {
      if (!roomName) return null;
      const name = roomName.toLowerCase();
      
      if (name.includes("single") || name.includes("singola")) return "/singola.jpg";
      if (name.includes("tripola") || name.includes("triple")) return "/tripola.jpg";
      if (name.includes("familiare") || name.includes("family")) return "/familiare.jpg";
      if (name.includes("piccola") && name.includes("matrimoniale")) return "/matrimoniale piccola.jpg";
      if (name.includes("matrimoniale")) return "/matrimoniale.jpg";
      if (name.includes("dopia") || name.includes("doppia") || name.includes("double")) return "/dopia.jpg";
      
      return null;
  };

  // Email and phone validation helpers
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPhone = (phone: string) => /^[+]?\d{7,16}$/.test(phone.replace(/\s+/g, ""));

  return (
    <div className="font-sans text-gray-800 min-h-screen flex flex-col">
      {showRulesModal && (
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-3">
                      {getLocalizedText(profile?.contentJson?.i18n?.rules?.title, profile?.contentJson?.rules?.title || t("rules_title"))}
                  </h3>
                  <div className="text-sm text-gray-600 whitespace-pre-line max-h-64 overflow-auto border rounded p-3 bg-gray-50">
                      {getLocalizedText(profile?.contentJson?.i18n?.rules?.content, profile?.contentJson?.rules?.content || "")}
                  </div>
                  <label className="flex items-center gap-2 mt-4 text-sm text-gray-700">
                      <input
                          type="checkbox"
                          checked={rulesAccepted}
                          onChange={(e) => setRulesAccepted(e.target.checked)}
                      />
                      {t("rules_accept")}
                  </label>
                  <div className="mt-5 flex justify-end gap-2">
                      <button
                          className="px-4 py-2 rounded border text-gray-600"
                          onClick={() => setShowRulesModal(false)}
                      >
                          {t("rules_cancel")}
                      </button>
                      <button
                          className="px-4 py-2 rounded text-white disabled:opacity-50"
                          style={{ backgroundColor: profile?.primaryColor || "#2E5D4B" }}
                          disabled={!rulesAccepted}
                          onClick={handleAcceptRules}
                      >
                          {t("rules_continue")}
                      </button>
                  </div>
              </div>
          </div>
      )}
      {/* HEADER */}
      <header className="fixed w-full z-50 transition-all duration-300 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <img src={profile.logoUrl || "/logo-192.png"} alt="Logo" className="h-10" />
                <span className="text-xl font-bold tracking-widest uppercase" style={{ color: profile.primaryColor }}>{getLocalizedText(profile.contentJson?.i18n?.websiteTitle, profile.websiteTitle || profile.name)}</span>
            </div>
            <nav className="hidden md:flex gap-8 text-sm font-medium tracking-wide">
                <a href="#" className="hover:text-gold-500 transition-colors">{t('nav_home')}</a>
                {profile.contentJson?.about?.show !== false && <a href="#about" className="hover:text-gold-500 transition-colors">{t('nav_about')}</a>}
                {profile.contentJson?.map?.show !== false && <a href="#location" className="hover:text-gold-500 transition-colors">{t('nav_location')}</a>}
            </nav>
            <div className="flex items-center gap-3 sm:gap-4">
                <div className="relative" ref={accountMenuRef}>
                    <button
                        className="flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-2 py-1 text-sm text-gray-700 hover:bg-white"
                        type="button"
                        onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                    >
                        <span
                            className="flex h-8 w-8 items-center justify-center rounded-full text-white text-sm font-bold"
                            style={{ backgroundColor: profile.primaryColor }}
                        >
                            {guestFirstName.charAt(0).toUpperCase()}
                        </span>
                        <span className="hidden sm:inline">Hi, {guestFirstName}</span>
                    </button>
                    {isAccountMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg">
                            <div className="px-4 pt-3 text-xs font-semibold uppercase text-gray-500">Language</div>
                            <div className="px-4 pb-2">
                                <LanguageSelector />
                            </div>
                            <a href="/guest" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                My Reservation
                            </a>
                            {guestToken ? (
                                <button
                                    type="button"
                                    className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                                    onClick={() => {
                                        localStorage.removeItem("guestToken");
                                        setGuestToken(null);
                                        setIsAccountMenuOpen(false);
                                    }}
                                >
                                    Logout
                                </button>
                            ) : (
                                <a href="/guest" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                    Login
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
      </header>

      {/* HERO SECTION */}
      {profile.contentJson?.hero?.show !== false && (
          <section className="relative h-screen min-h-[600px] flex items-center justify-center bg-cover bg-center text-center px-4 pt-24 md:pt-32" style={bgStyle}>
            <div className="absolute inset-0 bg-black/40"></div>
            <div className="relative z-10 text-white max-w-4xl animate-fade-in-up">
                <h2 className="text-lg md:text-xl font-light tracking-[0.2em] mb-4 uppercase">{heroSubtitle}</h2>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-playfair mb-8 leading-tight">{heroTitle}</h1>
            </div>

            {/* FLOATING SEARCH BAR */}
            <div className="absolute -bottom-16 left-0 right-0 z-20 px-4">
                <style>{`
                    .react-datepicker-wrapper { width: 100%; }
                    .react-datepicker__input-container input { width: 100%; }
                    .react-datepicker { font-family: sans-serif; border: none; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                    .react-datepicker__header { background: white; border-bottom: 1px solid #eee; padding-top: 15px; }
                    .react-datepicker__day--selected, .react-datepicker__day--in-range { background-color: ${profile.primaryColor} !important; color: white !important; }
                    .react-datepicker__day--keyboard-selected { background-color: ${profile.secondaryColor} !important; }
                    .react-datepicker__day-name { color: #888; text-transform: uppercase; font-size: 0.7em; letter-spacing: 1px; }
                    .react-datepicker__current-month { font-weight: bold; color: ${profile.primaryColor}; margin-bottom: 10px; }
                `}</style>
                <div className="max-w-5xl mx-auto bg-white shadow-2xl rounded-lg p-6 flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-[2] w-full">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('hero_dates')}</label>
                        <div className="flex items-center border border-gray-200 rounded-md px-4 py-3 bg-gray-50 hover:bg-white hover:border-gray-300 transition-colors">
                            <FaCalendarAlt className="text-gray-400 mr-3 text-lg" />
                             <DatePicker
                                selectsRange={true}
                                startDate={checkIn ? new Date(checkIn) : null}
                                endDate={checkOut ? new Date(checkOut) : null}
                                onChange={(update: [Date | null, Date | null]) => {
                                    const [start, end] = update;
                                    setCheckIn(start ? start.toLocaleDateString("en-CA") : "");
                                    setCheckOut(end ? end.toLocaleDateString("en-CA") : "");
                                }}
                                className="bg-transparent w-full outline-none text-gray-800 font-medium font-sans text-base placeholder-gray-400 text-left"
                                placeholderText={t('hero_checkin_placeholder')}
                                dateFormat="MMM d, yyyy"
                                minDate={new Date()}
                                monthsShown={2} 
                            />
                        </div>
                    </div>
                    <div className="w-full md:w-32">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('hero_guests')}</label>
                        <div className="flex items-center border border-gray-200 rounded-md px-4 py-3 bg-gray-50 hover:bg-white hover:border-gray-300 transition-colors">
                            <FaUser className="text-gray-400 mr-2" />
                            <select className="bg-transparent w-full outline-none text-gray-700" value={guests} onChange={e => setGuests(Number(e.target.value))}>
                                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="w-full md:w-32">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('hero_rooms')}</label>
                        <div className="flex items-center border border-gray-200 rounded-md px-4 py-3 bg-gray-50 hover:bg-white hover:border-gray-300 transition-colors">
                            <MdBed className="text-gray-400 mr-2 text-lg" />
                            <select className="bg-transparent w-full outline-none text-gray-700" value={roomCount} onChange={e => setRoomCount(Number(e.target.value))}>
                                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                    </div>
                    <button 
                        onClick={handleSearch}
                        className="w-full md:w-auto px-8 py-3 text-white font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2"
                        style={{ backgroundColor: profile.primaryColor }}
                    >
                        {searching ? t('hero_searching') : <>{t('hero_check_avail')}</>}
                    </button>
                    </div>
            </div>
          </section>
      )}

      {/* ABOUT SECTION */}
      <div id="about" className="pt-32 pb-20 bg-gray-50 px-6 text-center">
            {profile.contentJson?.about?.show !== false && (
                <div className="max-w-3xl mx-auto">
                    <h3 className="text-primary-800 text-3xl font-playfair mb-6" style={{ color: profile.primaryColor }}>{getLocalizedText(profile.contentJson?.i18n?.about?.title, profile.contentJson?.about?.title || "Welcome")}</h3>
                    <div className="w-16 h-1 bg-gold-500 mx-auto mb-8" style={{ backgroundColor: profile.secondaryColor }}></div>
                    <p className="text-gray-600 leading-relaxed text-lg whitespace-pre-line">
                        {getLocalizedText(profile.contentJson?.i18n?.about?.content, profile.contentJson?.about?.content || profile.description || "")}
                    </p>
                </div>
            )}
            
            {/* AMENITIES SECTION */}
            {profile.contentJson?.features?.showAmenities !== false && (
                <div className="mt-16 max-w-4xl mx-auto">
                     {getLocalizedText(profile.contentJson?.i18n?.amenities, profile.amenities || "") ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            {getLocalizedText(profile.contentJson?.i18n?.amenities, profile.amenities || "").split(',').map((item, idx) => {
                                const text = item.trim();
                                if (!text) return null;
                                const Icon = getAmenityIcon(text);

                                return (
                                    <div key={idx} className="flex flex-col items-center gap-3 text-gray-500 animate-fade-in">
                                        <Icon className="text-3xl" style={{ color: profile.secondaryColor }} />
                                        <span className="text-sm font-medium uppercase tracking-widest">{text}</span>
                                    </div>
                                );
                            })}
                        </div>
                     ) : (
                         /* Fallback default amenities if none entered */
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 justify-center">
                            <div className="flex flex-col items-center gap-3 text-gray-500">
                                <FaWifi className="text-3xl" style={{ color: profile.secondaryColor }} />
                                <span className="text-sm font-medium uppercase tracking-widest">Free Wifi</span>
                            </div>
                            <div className="flex flex-col items-center gap-3 text-gray-500">
                                <FaCar className="text-3xl" style={{ color: profile.secondaryColor }} />
                                <span className="text-sm font-medium uppercase tracking-widest">Parking</span>
                            </div>
                            <div className="flex flex-col items-center gap-3 text-gray-500">
                                <FaCoffee className="text-3xl" style={{ color: profile.secondaryColor }} />
                                <span className="text-sm font-medium uppercase tracking-widest">Breakfast</span>
                            </div>
                        </div>
                     )}
                </div>
            )}
      </div>

      {/* ROOMS RESULTS */}
      <div id="results" className="py-20 bg-white px-6">
          <div className="max-w-7xl mx-auto">
              {availableRooms.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {availableRooms.map((group: any, idx) => {
                          const roomImage = getRoomImage(group.name);
                          return (
                          <div key={idx} className="group border rounded-lg overflow-hidden hover:shadow-xl transition-shadow bg-white">
                              <div className="h-64 bg-gray-50 relative overflow-hidden flex items-center justify-center">
                                  {roomImage ? (
                                      <img src={roomImage} alt={group.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                  ) : (
                                  <div className="flex flex-col items-center gap-2">
                                      {getBedIcons(group.name)}
                                      <span className="text-xs text-gray-400 uppercase tracking-widest mt-2">{t('room_type')}</span>
                                  </div>
                                  )}
                                  <div className="absolute top-4 right-4 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider rounded shadow flex items-center gap-1">
                                      {group.maxGuests} {t('room_guests')}
                                  </div>
                                  {group.breakfastAvailable && (
                                     <div className="absolute top-4 left-4 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider rounded shadow flex items-center gap-1 text-orange-600">
                                         <FaCoffee /> {t('room_breakfast')}
                                     </div>
                                  )}
                              </div>
                              <div className="p-6">
                                  <h3 className="text-xl font-playfair font-bold mb-2 text-gray-900">{group.name}</h3>
                                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{group.description}</p>
                                  <div className="flex justify-between items-end border-t pt-4">
                                      <div>
                                          <span className="text-xs text-gray-500 block uppercase tracking-wide">{t('room_price_total')}</span>
                                          <span className="text-2xl font-bold" style={{ color: profile.primaryColor }}>€{group.basePrice}</span>
                                          {/* <span className="text-xs text-gray-400">/night</span> Removed per-night label since price is total */}
                                      </div>
                                      <button 
                                        onClick={() => handleBookClick(group)}
                                        className="px-6 py-2 text-white text-sm font-bold uppercase tracking-widest transition-transform hover:-translate-y-1"
                                        style={{ backgroundColor: profile.secondaryColor }}
                                      >
                                          {t('room_select')}
                                      </button>
                                  </div>
                              </div>
                          </div>
                          );
                      })}
                  </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                    <p>Enter dates above to check availability.</p>
                </div>
              )}
          </div>
      </div>

      {/* MAP SECTION */}
      {profile.contentJson?.map?.show !== false && (
          <section id="location" className="h-[500px] w-full bg-gray-200 relative">
               {/* DEBUG: Hardcoded Map to prevent loop */}
               <iframe 
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2796.3735846464388!2d9.159223076198147!3d45.50255773087862!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4786c0e350fbccaf%3A0xf2986aaa964cd292!2sHotel%20Valganna%20Srl!5e0!3m2!1sen!2sit!4v1768820423168!5m2!1sen!2sit"
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }} 
                    allowFullScreen 
                    loading="lazy" 
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Property Location"
                ></iframe>
          </section>
      )}

      {/* FOOTER */}
      <footer className="text-white py-16 px-6" style={{ backgroundColor: profile.primaryColor }}>
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
              <div>
                  <h4 className="text-2xl font-playfair mb-6">{getLocalizedText(profile.contentJson?.i18n?.websiteTitle, profile.websiteTitle || profile.name)}</h4>
                  <p className="opacity-80 leading-relaxed mb-6">{profile.address}<br/>{profile.city}, {profile.country}</p>
                  <div className="flex gap-4">
                      {profile.facebookUrl && <a href={profile.facebookUrl} className="opacity-70 hover:opacity-100"><FaFacebook size={20} /></a>}
                      {profile.instagramUrl && <a href={profile.instagramUrl} className="opacity-70 hover:opacity-100"><FaInstagram size={20} /></a>}
                      {profile.twitterUrl && <a href={profile.twitterUrl} className="opacity-70 hover:opacity-100"><FaTwitter size={20} /></a>}
                  </div>
              </div>
              <div>
                  <h5 className="font-bold tracking-widest uppercase mb-6 text-sm opacity-90">Contact</h5>
                  <div className="space-y-4 opacity-80">
                      <p className="flex items-center gap-3"><FaPhone size={14} className="opacity-60"/> {profile.phone}</p>
                      <p className="flex items-center gap-3"><FaEnvelope size={14} className="opacity-60"/> {profile.email}</p>
                  </div>
              </div>
              <div>
                  <h5 className="font-bold tracking-widest uppercase mb-6 text-sm opacity-90">Newsletter</h5>
                  <p className="opacity-70 text-sm mb-4">{getLocalizedText(profile.contentJson?.i18n?.footerText, profile.footerText || "Subscribe for exclusive offers.")}</p>
                  <div className="flex">
                      <input type="email" placeholder="Your email" className="bg-white/10 border-none outline-none px-4 py-2 text-white w-full placeholder-white/50" />
                      <button className="px-4 py-2 bg-white text-primary-900 font-bold uppercase text-xs" style={{ color: profile.primaryColor }}>Join</button>
                  </div>
              </div>
          </div>
          <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/10 text-center opacity-50 text-xs tracking-widest uppercase">
              {profile.footerCopyright || `© ${new Date().getFullYear()} ${profile.name}. All rights reserved.`}
          </div>
      </footer>

      {/* BOOKING MODAL */}
      {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-8 animate-fade-in-up">
                    {bookingStatus === "success" ? (
                        <div className="space-y-5">
                            <div className="text-center">
                                <div className="text-5xl mb-3">✅</div>
                                <h3 className="text-2xl font-playfair font-bold text-gray-800">Booking Confirmed!</h3>
                                <p className="text-gray-600 mt-1">We sent a confirmation to {confirmation?.guest.email}.</p>
                                <p className="text-xs text-gray-500 mt-2">No account is required to book. You can view or print this reservation anytime at /guest using the same email.</p>
                            </div>

                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 space-y-2">
                                <div className="flex justify-between">
                                    <span className="font-semibold">Reservation</span>
                                    <span>{confirmation ? confirmation.bookingRefs.join(", ") : ""}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-semibold">Guest</span>
                                    <span>{confirmation?.checkInName || (confirmation ? `${confirmation.guest.firstName} ${confirmation.guest.lastName}` : "")}</span>
                                </div>
                                {confirmation?.additionalGuestNames && (
                                    <div className="flex justify-between">
                                        <span className="font-semibold">Additional Guests</span>
                                        <span>{confirmation.additionalGuestNames}</span>
                                    </div>
                                )}
                                {confirmation?.checkInName && (
                                    <div className="flex justify-between">
                                        <span className="font-semibold">Check-in Name</span>
                                        <span>{confirmation.checkInName}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="font-semibold">Dates</span>
                                    <span>{confirmation ? new Date(confirmation.checkIn).toLocaleDateString() : ""} — {confirmation ? new Date(confirmation.checkOut).toLocaleDateString() : ""}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-semibold">Booked On</span>
                                    <span>{confirmation ? new Date(confirmation.bookedAt).toLocaleDateString() : ""}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-semibold">Room</span>
                                    <span>{confirmation ? `${confirmation.roomTypeName} × ${confirmation.roomCount}` : ""}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-semibold">Guests</span>
                                    <span>{confirmation?.guests ?? ""}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-semibold">Extras</span>
                                                                        <span>
                                                                            {confirmation?.wantsBreakfast ? "Breakfast" : "No breakfast"}{confirmation?.wantsParking ? " + Parking" : ""}
                                                                        </span>
                                </div>
                                <div className="flex justify-between text-base font-bold pt-2 border-t">
                                    <span>Total Paid</span>
                                    <span>€{confirmation ? confirmation.totalPrice.toFixed(2) : "0.00"}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setBookingStatus("idle");
                                    setConfirmation(null);
                                    setGuestDetails({ firstName: "", lastName: "", email: "", phone: "" });
                                    setWantsBreakfast(false);
                                    setWantsParking(false);
                                    setBookingStep(1);
                                }}
                                className="w-full py-3 text-white font-bold uppercase tracking-widest transition-colors rounded shadow"
                                style={{ backgroundColor: profile.primaryColor }}
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold font-playfair">
                                    {bookingStep === 1 ? "Guest Details" : "Secure Payment"}
                                </h3>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                            </div>
                            
                            <div className="flex gap-2 mb-6">
                                <div className={`h-1 flex-1 rounded ${bookingStep >= 1 ? 'bg-primary-600' : 'bg-gray-200'}`} style={{backgroundColor: bookingStep >= 1 ? profile.primaryColor : '#eee'}}></div>
                                <div className={`h-1 flex-1 rounded ${bookingStep >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`} style={{backgroundColor: bookingStep >= 2 ? profile.primaryColor : '#eee'}}></div>
                            </div>
                            
                            {/* STEP 1: DETAILS */}
                            {bookingStep === 1 && (
                                <div className="space-y-6">
                                    <div className="bg-gray-50 p-4 rounded text-sm">
                                        <p className="font-bold text-gray-800 text-lg mb-2">{selectedRoomType?.name}</p>
                                        <div className="flex justify-between text-gray-600 mb-1">
                                            <span>{new Date(checkIn).toLocaleDateString()} — {new Date(checkOut).toLocaleDateString()}</span>
                                            <span>{guests} Guests</span>
                                        </div>
                                        
                                        {/* EXTRAS */}
                                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                                            {selectedRoomType?.breakfastAvailable && (
                                                <label className="flex items-center justify-between cursor-pointer hover:bg-gray-100 p-2 rounded -mx-2">
                                                    <div className="flex items-center gap-2">
                                                        <input type="checkbox" checked={wantsBreakfast} onChange={e => setWantsBreakfast(e.target.checked)} className="h-4 w-4 text-primary-600 rounded" />
                                                        <span className="font-medium">Add Breakfast</span>
                                                    </div>
                                                    <span className="text-gray-500 text-xs">+€7/person/night</span>
                                                </label>
                                            )}

                                            <label className="flex items-center justify-between cursor-pointer hover:bg-gray-100 p-2 rounded -mx-2">
                                                <div className="flex items-center gap-2">
                                                    <input type="checkbox" checked={wantsParking} onChange={e => setWantsParking(e.target.checked)} className="h-4 w-4 text-primary-600 rounded" />
                                                    <span className="font-medium">Request Parking</span>
                                                </div>
                                                <span className="text-gray-500 text-xs">+€20/night</span>
                                            </label>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center text-lg font-bold" style={{ color: profile.primaryColor }}>
                                            <span>Total Price:</span>
                                            <span>
                                                €{(() => {
                                                    const start = new Date(checkIn).getTime();
                                                    const end = new Date(checkOut).getTime();
                                                    const nights = Math.max(1, Math.ceil((end - start) / (86400000)));
                                                    const base = (selectedRoomType?.basePrice || 0) * roomCount; 
                                                    const breakfast = (wantsBreakfast && selectedRoomType?.breakfastAvailable) ? (7 * guests * nights) : 0;
                                                    const parking = wantsParking ? (20 * nights) : 0;
                                                    return base + breakfast + parking;
                                                })()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Check-in Name</label>
                                            <input className="border p-2 w-full rounded outline-none focus:border-primary-500" value={checkInName} onChange={e => setCheckInName(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Additional Guest Names</label>
                                            <input className="border p-2 w-full rounded outline-none focus:border-primary-500" placeholder="e.g. John Smith, Maria Rossi" value={additionalGuestNames} onChange={e => setAdditionalGuestNames(e.target.value)} />
                                        </div>
                                        {guestProfileName && (
                                            <p className="text-xs text-gray-500">Default check-in name is your account name: {guestProfileName}</p>
                                        )}
                                    </div>

                                    <button 
                                        onClick={goToPayment}
                                        className="w-full py-3 text-white font-bold uppercase tracking-widest transition-colors rounded shadow hover:shadow-lg"
                                        style={{ backgroundColor: profile.primaryColor }}
                                    >
                                        Proceed to Payment
                                    </button>
                                </div>
                            )}

                            {/* STEP 2: PAYMENT */}
                            {bookingStep === 2 && (
                                <div className="space-y-6 animate-fade-in-up">
                                    <div className="bg-gray-50 p-4 rounded text-center border border-gray-200">
                                        <p className="text-gray-500 text-sm uppercase tracking-wide">Total to Pay</p>
                                        <p className="text-3xl font-bold" style={{ color: profile.primaryColor }}>
                                            €{(() => {
                                                    const start = new Date(checkIn).getTime();
                                                    const end = new Date(checkOut).getTime();
                                                    const nights = Math.max(1, Math.ceil((end - start) / (86400000)));
                                                    const base = (selectedRoomType?.basePrice || 0) * roomCount; 
                                                    const breakfast = (wantsBreakfast && selectedRoomType?.breakfastAvailable) ? (7 * guests * nights) : 0;
                                                    const parking = wantsParking ? (20 * nights) : 0;
                                                    return base + breakfast + parking;
                                                })()}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-white rounded border border-gray-200 shadow-sm relative overflow-hidden">
                                        <h4 className="font-bold text-sm uppercase mb-4 text-gray-700 flex items-center gap-2">
                                            <FaCreditCard /> Secure Card Payment
                                        </h4>
                                        <div className="space-y-2 text-gray-600 text-sm">
                                            <p>Click the button below to pay securely with your card via Stripe.</p>
                                            <p>You will be redirected to a secure payment page.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => setBookingStep(1)}
                                            className="px-4 py-3 text-gray-600 font-bold uppercase tracking-widest border rounded hover:bg-gray-50"
                                        >
                                            Back
                                        </button>
                                        <button 
                                            onClick={confirmBooking}
                                            disabled={bookingStatus === "processing"}
                                            className="flex-1 py-3 text-white font-bold uppercase tracking-widest transition-colors rounded shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                            style={{ backgroundColor: profile.primaryColor }}
                                        >
                                            {bookingStatus === "processing" ? "Processing..." : "Pay & Book Now"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
              </div>
          </div>
      )}
    </div>
  );
};

export default PublicSite;
