import React, { useEffect, useState } from "react";
import { propertyAPI, roomAPI, guestAPI, hotelProfileAPI, bookingAPI, publicAPI } from "../api/endpoints";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaCalendarAlt, FaUser, FaSearch, FaMapMarkerAlt, FaPhone, FaEnvelope, FaFacebook, FaInstagram, FaTwitter, FaWifi, FaCoffee, FaCar, FaCreditCard, FaSwimmingPool, FaSnowflake, FaDumbbell, FaSpa, FaUtensils, FaShuttleVan, FaTv, FaConciergeBell, FaBaby, FaDog, FaWheelchair, FaKey } from "react-icons/fa";
import { MdSingleBed, MdKingBed, MdBed } from "react-icons/md";
import LanguageSelector from "../components/LanguageSelector";
import { useLanguage } from "../contexts/LanguageContext";

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
  const { t } = useLanguage();
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
  const [bookingStatus, setBookingStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [bookingStep, setBookingStep] = useState(1);
  const [wantsBreakfast, setWantsBreakfast] = useState(false);
  const [wantsParking, setWantsParking] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

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
            guests,
            rooms: roomCount
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
      setSelectedRoomType(roomType);
      setBookingStatus("idle");
      setBookingStep(1);
      setWantsBreakfast(false);
      setWantsParking(false);
      setRulesAccepted(false);

      const rulesText = profile?.contentJson?.rules?.content || profile?.policies || "";
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
      
      // basePrice from API is now Total Price for stay (Per Room)
      const roomPrice = selectedRoomType.basePrice; 

      try {
          // 1. Create Guest
          const guestRes = await guestAPI.create({ 
              firstName: guestDetails.firstName, 
              lastName: guestDetails.lastName, 
              email: guestDetails.email, 
              phone: guestDetails.phone
          });
          
          // 2. Create Booking(s)
          // Simulate Payment Delay
          await new Promise(resolve => setTimeout(resolve, 1500)); 

          const roomIds = selectedRoomType.sampleRoom.ids && selectedRoomType.sampleRoom.ids.length >= roomCount 
              ? selectedRoomType.sampleRoom.ids 
              : [selectedRoomType.sampleRoom.id];

          for (let i = 0; i < roomCount; i++) {
              // Distribute guests across rooms
              const guestsForThisRoom = Math.floor(guests / roomCount) + (i === 0 ? guests % roomCount : 0);
              
              const thisBreakfastCost = wantsBreakfast ? (PRICE_BREAKFAST * guestsForThisRoom * nights) : 0;
              const thisParkingCost = (wantsParking && i === 0) ? (PRICE_PARKING * nights) : 0;
              const thisBookingTotal = roomPrice + thisBreakfastCost + thisParkingCost;
              
              const roomIdToUse = roomIds[i] || roomIds[0];

              await bookingAPI.create({
                  guestId: guestRes.data.id,
                  propertyId: selectedRoomType.sampleRoom.propertyId,
                  roomId: roomIdToUse, 
                  checkInDate: checkIn,
                  checkOutDate: checkOut,
                  numberOfGuests: guestsForThisRoom,
                  breakfastCount: wantsBreakfast ? guestsForThisRoom : 0,
                  parkingIncluded: (wantsParking && i === 0),
                  source: "website",
                  totalPrice: thisBookingTotal,
                  paidAmount: thisBookingTotal, // Fully Pre-Paid
                  status: "confirmed"
              });
          }
          
          setBookingStatus("success");
          setTimeout(() => {
              setShowModal(false);
              setBookingStatus("idle");
              setGuestDetails({ firstName: "", lastName: "", email: "", phone: "" });
              setWantsBreakfast(false);
              setWantsParking(false);
          }, 2000);

      } catch (err) {
          console.error(err);
          setBookingStatus("error");
      }
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-primary-900">Loading experience...</div>;
  if (!profile) return <div>Failed to load property profile.</div>;

  // STRICT IMAGE LOGIC: Use local banner if present, else fallback
  let heroImage = "/banner.png"; // Use local file by default
  
  // Try to use the configured image if it looks valid
  if (profile.contentJson?.hero?.image && profile.contentJson.hero.image.trim().length > 10) {
      heroImage = profile.contentJson.hero.image;
  } 

  // FALLBACK TITLES
  const heroTitle = profile.contentJson?.hero?.title || profile.websiteTitle || profile.name || "Welcome to Ponale";
  const heroSubtitle = profile.contentJson?.hero?.subtitle || "Experience the charm of Milan";

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

  return (
    <div className="font-sans text-gray-800 min-h-screen flex flex-col">
      {showRulesModal && (
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-3">
                      {profile?.contentJson?.rules?.title || t("rules_title")}
                  </h3>
                  <div className="text-sm text-gray-600 whitespace-pre-line max-h-64 overflow-auto border rounded p-3 bg-gray-50">
                      {profile?.contentJson?.rules?.content || profile?.policies || ""}
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
                {profile.logoUrl && <img src={profile.logoUrl} alt="Logo" className="h-10" />}
                <span className="text-xl font-bold tracking-widest uppercase" style={{ color: profile.primaryColor }}>{profile.websiteTitle || profile.name}</span>
            </div>
            <nav className="hidden md:flex gap-8 text-sm font-medium tracking-wide">
                <a href="#" className="hover:text-gold-500 transition-colors">{t('nav_home')}</a>
                {profile.contentJson?.about?.show !== false && <a href="#about" className="hover:text-gold-500 transition-colors">{t('nav_about')}</a>}
                <a href="#rooms" className="hover:text-gold-500 transition-colors">{t('nav_suites')}</a>
                {profile.contentJson?.map?.show !== false && <a href="#location" className="hover:text-gold-500 transition-colors">{t('nav_location')}</a>}
            </nav>
            <div className="flex items-center gap-4">
                <LanguageSelector />
                <button className="px-6 py-2 text-white text-sm font-bold tracking-wider uppercase transition-transform hover:scale-105" style={{ backgroundColor: profile.secondaryColor }}>
                    {t('nav_book_now')}
                </button>
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
                    <h3 className="text-primary-800 text-3xl font-playfair mb-6" style={{ color: profile.primaryColor }}>{profile.contentJson?.about?.title || "Welcome"}</h3>
                    <div className="w-16 h-1 bg-gold-500 mx-auto mb-8" style={{ backgroundColor: profile.secondaryColor }}></div>
                    <p className="text-gray-600 leading-relaxed text-lg whitespace-pre-line">
                        {profile.contentJson?.about?.content || profile.description}
                    </p>
                </div>
            )}
            
            {/* AMENITIES SECTION */}
            {profile.contentJson?.features?.showAmenities !== false && (
                <div className="mt-16 max-w-4xl mx-auto">
                     {profile.amenities ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            {profile.amenities.split(',').map((item, idx) => {
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
                                          <span className="text-2xl font-bold" style={{ color: profile.primaryColor }}>${group.basePrice}</span>
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
                  <h4 className="text-2xl font-playfair mb-6">{profile.websiteTitle}</h4>
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
                  <p className="opacity-70 text-sm mb-4">{profile.footerText || "Subscribe for exclusive offers."}</p>
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
                        <div className="text-center py-8">
                            <div className="text-5xl mb-4">✅</div>
                            <h3 className="text-2xl font-playfair font-bold text-gray-800 mb-2">Booking Confirmed!</h3>
                            <p className="text-gray-600">We have sent a confirmation to {guestDetails.email}.</p>
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
                                                    <span className="text-gray-500 text-xs">+$7/person/night</span>
                                                </label>
                                            )}

                                            <label className="flex items-center justify-between cursor-pointer hover:bg-gray-100 p-2 rounded -mx-2">
                                                <div className="flex items-center gap-2">
                                                    <input type="checkbox" checked={wantsParking} onChange={e => setWantsParking(e.target.checked)} className="h-4 w-4 text-primary-600 rounded" />
                                                    <span className="font-medium">Request Parking</span>
                                                </div>
                                                <span className="text-gray-500 text-xs">+$20/night</span>
                                            </label>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center text-lg font-bold" style={{ color: profile.primaryColor }}>
                                            <span>Total Price:</span>
                                            <span>
                                                ${(() => {
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
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">First Name</label>
                                            <input className="border p-2 w-full rounded outline-none focus:border-primary-500" value={guestDetails.firstName} onChange={e => setGuestDetails({...guestDetails, firstName: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Last Name</label>
                                            <input className="border p-2 w-full rounded outline-none focus:border-primary-500" value={guestDetails.lastName} onChange={e => setGuestDetails({...guestDetails, lastName: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                                            <input className="border p-2 w-full rounded outline-none focus:border-primary-500" value={guestDetails.email} onChange={e => setGuestDetails({...guestDetails, email: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                                            <input className="border p-2 w-full rounded outline-none focus:border-primary-500" value={guestDetails.phone} onChange={e => setGuestDetails({...guestDetails, phone: e.target.value})} />
                                        </div>
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
                                             ${(() => {
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

                                    {/* Payment Section (Mock) */}
                                    <div className="p-4 bg-white rounded border border-gray-200 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 z-10">
                                            SIMULATION MODE
                                        </div>
                                        <h4 className="font-bold text-sm uppercase mb-4 text-gray-700 flex items-center gap-2">
                                        <FaCreditCard /> Card Details (No Live Charge)
                                        </h4>
                                        <div className="space-y-4 opacity-75">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Card Number (Any Mock Number)</label>
                                                <div className="relative">
                                                    <input className="border p-2 pl-10 w-full rounded outline-none focus:border-primary-500 font-mono text-sm" placeholder="0000 0000 0000 0000" />
                                                    <div className="absolute left-3 top-2.5 text-gray-400">💳</div>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Expiry</label>
                                                    <input className="border p-2 w-full rounded outline-none focus:border-primary-500 font-mono text-sm" placeholder="MM/YY" />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">CVC</label>
                                                    <input className="border p-2 w-full rounded outline-none focus:border-primary-500 font-mono text-sm" type="password" placeholder="123" />
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-2 text-center flex items-center justify-center gap-1">
                                                <span className="w-2 h-2 rounded-full bg-green-500"></span> 
                                                Secure Payment Encryption
                                            </p>
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
