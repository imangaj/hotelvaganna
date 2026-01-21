import React, { useState, useEffect } from "react";
import { propertyAPI, hotelProfileAPI, userAPI } from "../api/endpoints";
import { useLanguage } from "../contexts/LanguageContext";
import RoomsSettings from "../components/RoomsSettings";
import PropertiesPage from "./PropertiesPage";

// --- Interfaces ---

interface User {
  id: number;
  email: string;
  name: string;
  role: "ADMIN" | "MANAGER" | "RECEPTION" | "CLEANER";
  isActive: boolean;
}

interface HotelProfileData {
  name: string;
  description: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  amenities?: string;
  checkInTime?: string;
  checkOutTime?: string;
  policies?: string;
  heroImageUrl?: string;
  
  // Website Customization
  websiteTitle: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  footerText: string;
  footerCopyright: string;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  
  // Pro Content
  contentJson?: {
    hero?: { title: string; subtitle: string; image: string; show: boolean };
    about?: { title: string; content: string; show: boolean };
    features?: { show: boolean; showAmenities?: boolean };
    map?: { show: boolean; embedUrl: string };
        rules?: { show: boolean; title: string; content: string };
    services?: { icon: string; title: string; text: string }[];
  }
}

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  bookingConfirmation: boolean;
  cancellationAlert: boolean;
  guestReview: boolean;
  staffAssignment: boolean;
  maintenanceAlert: boolean;
}

const SettingsPage: React.FC = () => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<"general" | "website" | "notifications" | "staff" | "rooms" | "properties">("general");
    const [loading, setLoading] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState<string>("ADMIN");

    // Staff Management State
    const [users, setUsers] = useState<User[]>([]);
    const [loadingStaff, setLoadingStaff] = useState(false);
    const [newStaff, setNewStaff] = useState({ name: "", email: "", password: "", role: "RECEPTION" });

    const canManageStaff = ["ADMIN", "MANAGER"].includes(currentUserRole);
    const roleLabel = (role: string) => {
        switch (role) {
            case "ADMIN": return t("role_admin");
            case "MANAGER": return t("role_manager");
            case "RECEPTION": return t("role_reception");
            case "CLEANER": return t("role_cleaner");
            default: return role;
        }
    };

    // Fetch Users when tab changes
    useEffect(() => {
        const userStr = localStorage.getItem("user");
        if (userStr) {
            const u = JSON.parse(userStr);
            setCurrentUserRole((u.role || "").toUpperCase());
        }

        if (activeTab === "staff") {
            if (canManageStaff) {
                fetchUsers();
            }
        }
    }, [activeTab, canManageStaff]);

    const fetchUsers = async () => {
        setLoadingStaff(true);
        try {
            const res = await userAPI.getAll();
            setUsers(res.data);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoadingStaff(false);
        }
    };

    const handleCreateUser = async () => {
        if (!canManageStaff) {
            alert("Access denied");
            return;
        }
        setLoadingStaff(true);
        try {
            await userAPI.create(newStaff);
            setNewStaff({ name: "", email: "", password: "", role: "RECEPTION" });
            fetchUsers();
            alert("Staff member created successfully!");
        } catch (error) {
            console.error("Failed to create user", error);
            alert("Failed to create user. Please try again.");
        } finally {
            setLoadingStaff(false);
        }
    };

    const handleDeleteUser = async (id: number) => {
        if (!canManageStaff) {
            alert("Access denied");
            return;
        }
        if (!window.confirm("Are you sure you want to remove this staff member?")) return;
        try {
            await userAPI.delete(id);
            setUsers(users.filter(u => u.id !== id));
        } catch (error) {
            console.error("Failed to delete user", error);
            alert("Failed to delete user.");
        }
    };

    
    // Hotel Profile State
    const [hotelProfile, setHotelProfile] = useState<HotelProfileData>({
        name: "", description: "", address: "", city: "", country: "", phone: "", email: "",
        websiteTitle: "", logoUrl: "", primaryColor: "#2E5D4B", secondaryColor: "#C5A059",
        footerText: "", footerCopyright: "",
        contentJson: {
            hero: { show: true, title: "", subtitle: "", image: "" },
            about: { show: true, title: "", content: "" },
            features: { show: true, showAmenities: true },
            map: { show: true, embedUrl: "" },
            rules: { show: true, title: "Hotel Rules", content: "" },
            services: []
        }
    });

    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
        emailNotifications: true, smsNotifications: true, pushNotifications: false,
        bookingConfirmation: true, cancellationAlert: true, guestReview: true,
        staffAssignment: true, maintenanceAlert: true,
    });



    useEffect(() => {
        loadHotelProfile();
    }, []);

    const loadHotelProfile = async () => {
        try {
            const res = await hotelProfileAPI.get();
            if (res.data) {
                // Ensure contentJson structure exists even if DB has partial data
                const mergedContent = {
                    hero: { show: true, title: "", subtitle: "", image: "", ...res.data.contentJson?.hero },
                    about: { show: true, title: "", content: "", ...res.data.contentJson?.about },
                    features: { show: true, showAmenities: true, ...res.data.contentJson?.features },
                    map: { show: true, embedUrl: "", ...res.data.contentJson?.map },
                    rules: { show: true, title: "Hotel Rules", content: "", ...res.data.contentJson?.rules },
                    services: res.data.contentJson?.services || []
                };
                setHotelProfile({ ...res.data, contentJson: mergedContent });
            }
        } catch (err) {
            console.error("Failed to load profile", err);
        }
    };

    const handleSaveWebsiteConfig = async () => {
        setLoading(true);
        try {
            await hotelProfileAPI.update(hotelProfile);
            alert("Website configuration saved successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to save configuration.");
        } finally {
            setLoading(false);
        }
    };

  return (
    <div className="p-6 max-w-6xl mx-auto">
    <h1 className="text-2xl font-bold mb-6 text-gray-800">{t("settings_title")}</h1>

      {/* Tabs */}
      <div className="flex border-b mb-6 bg-white rounded-t-lg overflow-hidden">
        <button 
            className={`px-6 py-3 font-medium transition-colors ${activeTab === "general" ? "border-b-2 border-primary-600 text-primary-600 bg-gray-50" : "text-gray-600 hover:bg-gray-50"}`} 
            onClick={() => setActiveTab("general")}
        >
            {t("settings_tab_general")}
        </button>
        <button 
            className={`px-6 py-3 font-medium transition-colors ${activeTab === "properties" ? "border-b-2 border-primary-600 text-primary-600 bg-gray-50" : "text-gray-600 hover:bg-gray-50"}`} 
            onClick={() => setActiveTab("properties")}
        >
            {t("settings_tab_properties")}
        </button>
        <button 
            className={`px-6 py-3 font-medium transition-colors ${activeTab === "website" ? "border-b-2 border-primary-600 text-primary-600 bg-gray-50" : "text-gray-600 hover:bg-gray-50"}`} 
            onClick={() => setActiveTab("website")}
        >
            {t("settings_tab_website")}
        </button>
        <button 
            className={`px-6 py-3 font-medium transition-colors ${activeTab === "notifications" ? "border-b-2 border-primary-600 text-primary-600 bg-gray-50" : "text-gray-600 hover:bg-gray-50"}`} 
            onClick={() => setActiveTab("notifications")}
        >
            {t("settings_tab_notifications")}
        </button>
        <button 
            className={`px-6 py-3 font-medium transition-colors ${activeTab === "rooms" ? "border-b-2 border-primary-600 text-primary-600 bg-gray-50" : "text-gray-600 hover:bg-gray-50"}`} 
            onClick={() => setActiveTab("rooms")}
        >
            {t("settings_tab_rooms")}
        </button>
        {canManageStaff && (
            <button 
                className={`px-6 py-3 font-medium transition-colors ${activeTab === "staff" ? "border-b-2 border-primary-600 text-primary-600 bg-gray-50" : "text-gray-600 hover:bg-gray-50"}`} 
                onClick={() => setActiveTab("staff")}
            >
                {t("settings_tab_staff")}
            </button>
        )}
      </div>

      <div className="bg-white rounded-b-lg shadow-sm p-6 border border-gray-200">
        
        {/* GENERAL TAB */}
        {activeTab === "general" && (
            <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-800 border-b pb-2">{t("settings_property_details")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t("settings_property_name")}</label>
                        <input className="border p-2 w-full rounded focus:ring-2 focus:ring-primary-500 outline-none" value={hotelProfile.name || ""} onChange={e => setHotelProfile({...hotelProfile, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t("settings_address")}</label>
                        <input className="border p-2 w-full rounded focus:ring-2 focus:ring-primary-500 outline-none" value={hotelProfile.address || ""} onChange={e => setHotelProfile({...hotelProfile, address: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t("settings_city")}</label>
                        <input className="border p-2 w-full rounded focus:ring-2 focus:ring-primary-500 outline-none" value={hotelProfile.city || ""} onChange={e => setHotelProfile({...hotelProfile, city: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t("settings_country")}</label>
                        <input className="border p-2 w-full rounded focus:ring-2 focus:ring-primary-500 outline-none" value={hotelProfile.country || ""} onChange={e => setHotelProfile({...hotelProfile, country: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t("settings_phone")}</label>
                        <input className="border p-2 w-full rounded focus:ring-2 focus:ring-primary-500 outline-none" value={hotelProfile.phone || ""} onChange={e => setHotelProfile({...hotelProfile, phone: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t("settings_email")}</label>
                        <input className="border p-2 w-full rounded focus:ring-2 focus:ring-primary-500 outline-none" value={hotelProfile.email || ""} onChange={e => setHotelProfile({...hotelProfile, email: e.target.value})} />
                    </div>
                </div>
                
                <div className="pt-4 border-t">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded transition-colors shadow-sm" onClick={handleSaveWebsiteConfig} disabled={loading}>
                        {loading ? t("loading") : t("settings_save_general")}
                    </button>
                </div>
            </div>
        )}

        {/* WEBSITE TAB (Full Editor) */}
        {activeTab === "website" && (
            <div className="space-y-8 animate-fade-in">
                 
                 {/* Brand Identity */}
                 <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                    <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
                        <span>🎨</span> Brand Identity
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Website Title</label>
                            <input className="border p-2 w-full rounded focus:ring-2 focus:ring-primary-500 outline-none" value={hotelProfile.websiteTitle || ""} onChange={e => setHotelProfile({...hotelProfile, websiteTitle: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                            <input className="border p-2 w-full rounded focus:ring-2 focus:ring-primary-500 outline-none" value={hotelProfile.logoUrl || ""} onChange={e => setHotelProfile({...hotelProfile, logoUrl: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                            <div className="flex gap-2">
                                <input type="color" className="h-10 w-10 p-1 border rounded cursor-pointer" value={hotelProfile.primaryColor || "#000000"} onChange={e => setHotelProfile({...hotelProfile, primaryColor: e.target.value})} />
                                <input className="border p-2 w-full rounded font-mono" value={hotelProfile.primaryColor || ""} onChange={e => setHotelProfile({...hotelProfile, primaryColor: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
                            <div className="flex gap-2">
                                <input type="color" className="h-10 w-10 p-1 border rounded cursor-pointer" value={hotelProfile.secondaryColor || "#000000"} onChange={e => setHotelProfile({...hotelProfile, secondaryColor: e.target.value})} />
                                <input className="border p-2 w-full rounded font-mono" value={hotelProfile.secondaryColor || ""} onChange={e => setHotelProfile({...hotelProfile, secondaryColor: e.target.value})} />
                            </div>
                        </div>
                    </div>
                 </div>

                 {/* Hero Section */}
                 <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <span>🖼️</span> Homepage Hero Section
                        </h3>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <span className="text-sm font-medium text-gray-600">Visible</span>
                            <input type="checkbox" className="form-checkbox h-5 w-5 text-blue-600" checked={hotelProfile.contentJson?.hero?.show} onChange={e => setHotelProfile({...hotelProfile, contentJson: {...hotelProfile.contentJson!, hero: {...hotelProfile.contentJson!.hero!, show: e.target.checked}}})} />
                        </label>
                    </div>
                    
                    {hotelProfile.contentJson?.hero?.show && (
                        <div className="grid grid-cols-1 gap-4">
                             <div>
                                 <label className="block text-sm font-medium text-gray-700 mb-1">Main Title</label>
                                 <input className="border p-2 w-full rounded focus:ring-2 focus:ring-primary-500" value={hotelProfile.contentJson.hero?.title} onChange={e => setHotelProfile({...hotelProfile, contentJson: {...hotelProfile.contentJson!, hero: {...hotelProfile.contentJson!.hero!, title: e.target.value}}})} />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                                 <input className="border p-2 w-full rounded focus:ring-2 focus:ring-primary-500" value={hotelProfile.contentJson.hero?.subtitle} onChange={e => setHotelProfile({...hotelProfile, contentJson: {...hotelProfile.contentJson!, hero: {...hotelProfile.contentJson!.hero!, subtitle: e.target.value}}})} />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-gray-700 mb-1">Background Image URL</label>
                                 <input className="border p-2 w-full rounded focus:ring-2 focus:ring-primary-500" placeholder="https://..." value={hotelProfile.contentJson.hero?.image} onChange={e => setHotelProfile({...hotelProfile, contentJson: {...hotelProfile.contentJson!, hero: {...hotelProfile.contentJson!.hero!, image: e.target.value}}})} />
                                 {hotelProfile.contentJson.hero?.image && (
                                     <img src={hotelProfile.contentJson.hero.image} alt="Preview" className="mt-2 h-32 w-full object-cover rounded border" />
                                 )}
                             </div>
                        </div>
                    )}
                 </div>

                 {/* About Section */}
                 <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <span>📝</span> About Section
                        </h3>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <span className="text-sm font-medium text-gray-600">Visible</span>
                            <input type="checkbox" className="form-checkbox h-5 w-5 text-blue-600" checked={hotelProfile.contentJson?.about?.show} onChange={e => setHotelProfile({...hotelProfile, contentJson: {...hotelProfile.contentJson!, about: {...hotelProfile.contentJson!.about!, show: e.target.checked}}})} /> 
                        </label>
                    </div>

                    {hotelProfile.contentJson?.about?.show && (
                        <div className="grid grid-cols-1 gap-4">
                             <div>
                                 <label className="block text-sm font-medium text-gray-700 mb-1">Section Title</label>
                                 <input className="border p-2 w-full rounded focus:ring-2 focus:ring-primary-500" value={hotelProfile.contentJson.about?.title} onChange={e => setHotelProfile({...hotelProfile, contentJson: {...hotelProfile.contentJson!, about: {...hotelProfile.contentJson!.about!, title: e.target.value}}})} />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-gray-700 mb-1">Content Text</label>
                                 <textarea rows={5} className="border p-2 w-full rounded focus:ring-2 focus:ring-primary-500" value={hotelProfile.contentJson.about?.content} onChange={e => setHotelProfile({...hotelProfile, contentJson: {...hotelProfile.contentJson!, about: {...hotelProfile.contentJson!.about!, content: e.target.value}}})} />
                             </div>
                        </div>
                    )}
                 </div>

                 {/* Map Section */}
                 <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <span>📍</span> Map Configuration
                        </h3>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                             <span className="text-sm font-medium text-gray-600">Visible</span>
                             <input type="checkbox" className="form-checkbox h-5 w-5 text-blue-600" checked={hotelProfile.contentJson?.map?.show} onChange={e => setHotelProfile({...hotelProfile, contentJson: {...hotelProfile.contentJson!, map: {...hotelProfile.contentJson!.map!, show: e.target.checked}}})} />
                        </label>
                    </div>

                     {hotelProfile.contentJson?.map?.show && (
                        <div className="p-4 bg-yellow-50 rounded border border-yellow-100">
                            <label className="block text-sm font-semibold text-gray-800 mb-1">Google Maps Embed URL</label>
                            <p className="text-xs text-gray-600 mb-2">Go to Google Maps → Share → Embed a map → Copy HTML. Extract just the URL from `src="..."`.</p>
                            <input className="border p-2 w-full rounded focus:ring-2 focus:ring-primary-500 font-mono text-sm" placeholder="https://www.google.com/maps/embed?..." value={hotelProfile.contentJson.map?.embedUrl} onChange={e => setHotelProfile({...hotelProfile, contentJson: {...hotelProfile.contentJson!, map: {...hotelProfile.contentJson!.map!, embedUrl: e.target.value}}})} />
                        </div>
                     )}
                 </div>

                 {/* Amenities */}
                 <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
                        <span>✨</span> Amenities List
                    </h3>
                    <textarea rows={3} className="border p-2 w-full rounded focus:ring-2 focus:ring-primary-500" placeholder="e.g. Free Wi-Fi, Pool, Spa, Ocean View" value={hotelProfile.amenities || ""} onChange={e => setHotelProfile({...hotelProfile, amenities: e.target.value})} />
                 </div>

                 {/* Rules Popup */}
                 <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <span>📜</span> Booking Rules Popup
                        </h3>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <span className="text-sm font-medium text-gray-600">Visible</span>
                            <input
                                type="checkbox"
                                className="form-checkbox h-5 w-5 text-blue-600"
                                checked={hotelProfile.contentJson?.rules?.show}
                                onChange={e => setHotelProfile({
                                    ...hotelProfile,
                                    contentJson: {
                                        ...hotelProfile.contentJson!,
                                        rules: { ...hotelProfile.contentJson!.rules!, show: e.target.checked }
                                    }
                                })}
                            />
                        </label>
                    </div>
                    {hotelProfile.contentJson?.rules?.show && (
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Popup Title</label>
                                <input
                                    className="border p-2 w-full rounded focus:ring-2 focus:ring-primary-500"
                                    value={hotelProfile.contentJson.rules?.title}
                                    onChange={e => setHotelProfile({
                                        ...hotelProfile,
                                        contentJson: {
                                            ...hotelProfile.contentJson!,
                                            rules: { ...hotelProfile.contentJson!.rules!, title: e.target.value }
                                        }
                                    })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rules Text</label>
                                <textarea
                                    rows={6}
                                    className="border p-2 w-full rounded focus:ring-2 focus:ring-primary-500"
                                    placeholder="Write the hotel rules shown before payment..."
                                    value={hotelProfile.contentJson.rules?.content}
                                    onChange={e => setHotelProfile({
                                        ...hotelProfile,
                                        contentJson: {
                                            ...hotelProfile.contentJson!,
                                            rules: { ...hotelProfile.contentJson!.rules!, content: e.target.value }
                                        }
                                    })}
                                />
                            </div>
                        </div>
                    )}
                 </div>

                 <div className="sticky bottom-0 bg-white py-4 border-t flex justify-end">
                    <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold shadow hover:bg-blue-700 transition-all transform active:scale-95" onClick={handleSaveWebsiteConfig} disabled={loading}>
                        {loading ? "Saving Changes..." : "💾 Save Website Configuration"}
                    </button>
                 </div>
            </div>
        )}

        {/* STAFF TAB */}
          {activeTab === "staff" && (
            <div className="space-y-6">
                      {!canManageStaff && (
                          <div className="p-6 text-center text-red-600 font-bold">{t("access_denied")}</div>
                      )}
                      {canManageStaff && (
                      <>
                 {/* New Staff Form */}
                 <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                    <h3 className="text-lg font-bold mb-4">{t("staff_add_title")}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <input className="border p-2 rounded" placeholder={t("staff_full_name")} value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} />
                        <input className="border p-2 rounded" placeholder={t("staff_email_address")} value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} />
                        <input className="border p-2 rounded" type="password" placeholder={t("staff_password")} value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} />
                        <select className="border p-2 rounded" value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})}>
                            <option value="RECEPTION">{t("role_reception")}</option>
                            <option value="CLEANER">{t("role_cleaner")}</option>
                            <option value="MANAGER">{t("role_manager")}</option>
                            <option value="ADMIN">{t("role_admin")}</option>
                        </select>
                    </div>
                    <button className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50" onClick={handleCreateUser} disabled={loadingStaff || !newStaff.name || !newStaff.email || !newStaff.password}>
                        {loadingStaff ? t("staff_creating") : t("staff_create_account")}
                    </button>
                 </div>

                 {/* Staff List */}
                 <div>
                    <h3 className="text-lg font-bold mb-4">{t("staff_current_staff")}</h3>
                    <div className="bg-white border rounded shadow overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-3 border-b">{t("staff_name")}</th>
                                    <th className="p-3 border-b">{t("settings_email")}</th>
                                    <th className="p-3 border-b">{t("staff_role")}</th>
                                    <th className="p-3 border-b">{t("staff_status")}</th>
                                    <th className="p-3 border-b text-right">{t("staff_actions")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-gray-50">
                                        <td className="p-3 border-b">{u.name}</td>
                                        <td className="p-3 border-b">{u.email}</td>
                                        <td className="p-3 border-b"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-bold">{roleLabel(u.role)}</span></td>
                                        <td className="p-3 border-b">
                                            {u.isActive ? <span className="text-green-600 font-bold">{t("staff_active")}</span> : <span className="text-red-600">{t("staff_inactive")}</span>}
                                        </td>
                                        <td className="p-3 border-b text-right">
                                            <button className="text-red-600 hover:text-red-800 text-sm font-bold" onClick={() => handleDeleteUser(u.id)}>{t("staff_remove")}</button>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr><td colSpan={5} className="p-4 text-center text-gray-500">{t("staff_none")}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                 </div>
                 </>
                 )}
            </div>
        )}

         {/* NOTIFICATIONS TAB */}
         {activeTab === "notifications" && (
            <div>
                <h3 className="text-lg font-bold mb-4">Notifications</h3>
                <p className="text-gray-600">Configure email and SMS alerts.</p>
            </div>
        )}

         {/* PROPERTIES TAB */}
         {activeTab === "properties" && (
            <div className="-m-6">
                <PropertiesPage />
            </div>
         )}

         {/* ROOMS TAB */}
         {activeTab === "rooms" && <RoomsSettings />}

      </div>
    </div>
  );
};

export default SettingsPage;
