import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { hotelProfileAPI, userAPI } from "../api/endpoints";
import { useLanguage } from "../contexts/LanguageContext";
import RoomsSettings from "../components/RoomsSettings";
import PropertiesPage from "./PropertiesPage";
const SettingsPage = () => {
    const { t, language } = useLanguage();
    const [activeTab, setActiveTab] = useState("general");
    const [loading, setLoading] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState("ADMIN");
    const [contentLanguage, setContentLanguage] = useState(language);
    // Staff Management State
    const [users, setUsers] = useState([]);
    const [loadingStaff, setLoadingStaff] = useState(false);
    const [newStaff, setNewStaff] = useState({ name: "", email: "", password: "", role: "RECEPTION" });
    const [editingUserId, setEditingUserId] = useState(null);
    const [editStaff, setEditStaff] = useState({ name: "", email: "", role: "RECEPTION" });
    const canManageStaff = ["ADMIN", "MANAGER"].includes(currentUserRole);
    const roleLabel = (role) => {
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
        }
        catch (error) {
            console.error("Failed to fetch users", error);
        }
        finally {
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
        }
        catch (error) {
            console.error("Failed to create user", error);
            alert("Failed to create user. Please try again.");
        }
        finally {
            setLoadingStaff(false);
        }
    };
    const handleDeleteUser = async (id) => {
        if (!canManageStaff) {
            alert("Access denied");
            return;
        }
        if (!window.confirm("Are you sure you want to remove this staff member?"))
            return;
        try {
            await userAPI.delete(id);
            setUsers(users.filter(u => u.id !== id));
        }
        catch (error) {
            console.error("Failed to delete user", error);
            alert("Failed to delete user.");
        }
    };
    const handleEditUser = (user) => {
        setEditingUserId(user.id);
        setEditStaff({ name: user.name, email: user.email, role: user.role });
    };
    const handleUpdateUser = async (id) => {
        if (!canManageStaff) {
            alert("Access denied");
            return;
        }
        try {
            await userAPI.update(id, editStaff);
            setEditingUserId(null);
            fetchUsers();
        }
        catch (error) {
            console.error("Failed to update user", error);
            alert("Failed to update user.");
        }
    };
    const handleResetPassword = async (id) => {
        if (!canManageStaff) {
            alert("Access denied");
            return;
        }
        const newPassword = window.prompt("Enter new password for this user:");
        if (!newPassword)
            return;
        try {
            await userAPI.update(id, { password: newPassword });
            alert("Password reset successfully.");
        }
        catch (error) {
            console.error("Failed to reset password", error);
            alert("Failed to reset password.");
        }
    };
    // Hotel Profile State
    const [hotelProfile, setHotelProfile] = useState({
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
    const [notificationSettings, setNotificationSettings] = useState({
        emailNotifications: true, smsNotifications: true, pushNotifications: false,
        bookingConfirmation: true, cancellationAlert: true, guestReview: true,
        staffAssignment: true, maintenanceAlert: true,
    });
    useEffect(() => {
        loadHotelProfile();
    }, []);
    const ensureLocalized = (value) => {
        if (!value)
            return { en: "", it: "", zh: "" };
        if (typeof value === "string")
            return { en: value, it: value, zh: value };
        return {
            en: value.en || "",
            it: value.it || "",
            zh: value.zh || "",
        };
    };
    const loadHotelProfile = async () => {
        try {
            const res = await hotelProfileAPI.get();
            if (res.data) {
                const rawContent = res.data.contentJson || {};
                const rawI18n = rawContent.i18n || {};
                const normalizedI18n = {
                    websiteTitle: ensureLocalized(rawI18n.websiteTitle || res.data.websiteTitle),
                    footerText: ensureLocalized(rawI18n.footerText || res.data.footerText),
                    amenities: ensureLocalized(rawI18n.amenities || res.data.amenities),
                    hero: {
                        title: ensureLocalized(rawI18n.hero?.title || rawContent.hero?.title),
                        subtitle: ensureLocalized(rawI18n.hero?.subtitle || rawContent.hero?.subtitle),
                    },
                    about: {
                        title: ensureLocalized(rawI18n.about?.title || rawContent.about?.title),
                        content: ensureLocalized(rawI18n.about?.content || rawContent.about?.content || res.data.description),
                    },
                    rules: {
                        title: ensureLocalized(rawI18n.rules?.title || rawContent.rules?.title || "Hotel Rules"),
                        content: ensureLocalized(rawI18n.rules?.content || rawContent.rules?.content || res.data.policies),
                    },
                };
                // Ensure contentJson structure exists even if DB has partial data
                const mergedContent = {
                    hero: { show: true, title: "", subtitle: "", image: "", ...rawContent.hero },
                    about: { show: true, title: "", content: "", ...rawContent.about },
                    features: { show: true, showAmenities: true, ...rawContent.features },
                    map: { show: true, embedUrl: "", ...rawContent.map },
                    rules: { show: true, title: "Hotel Rules", content: "", ...rawContent.rules },
                    services: rawContent.services || [],
                    i18n: normalizedI18n,
                };
                setHotelProfile({ ...res.data, contentJson: mergedContent });
            }
        }
        catch (err) {
            console.error("Failed to load profile", err);
        }
    };
    const handleSaveWebsiteConfig = async () => {
        setLoading(true);
        try {
            const i18n = hotelProfile.contentJson?.i18n || {};
            const payload = {
                ...hotelProfile,
                websiteTitle: i18n.websiteTitle?.en || hotelProfile.websiteTitle,
                footerText: i18n.footerText?.en || hotelProfile.footerText,
                amenities: i18n.amenities?.en || hotelProfile.amenities,
                description: i18n.about?.content?.en || hotelProfile.description,
                policies: i18n.rules?.content?.en || hotelProfile.policies,
                contentJson: { ...hotelProfile.contentJson, i18n },
            };
            await hotelProfileAPI.update(payload);
            alert("Website configuration saved successfully!");
        }
        catch (err) {
            console.error(err);
            alert("Failed to save configuration.");
        }
        finally {
            setLoading(false);
        }
    };
    const getLocalizedValue = (value) => value?.[contentLanguage] || "";
    const setLocalizedValue = (path, value) => {
        setHotelProfile((prev) => {
            const contentJson = prev.contentJson || {};
            const i18n = contentJson.i18n || {};
            const updated = { ...i18n };
            let cursor = updated;
            for (let i = 0; i < path.length - 1; i++) {
                const key = path[i];
                cursor[key] = cursor[key] || {};
                cursor = cursor[key];
            }
            const lastKey = path[path.length - 1];
            cursor[lastKey] = { ...(cursor[lastKey] || {}), [contentLanguage]: value };
            return {
                ...prev,
                contentJson: {
                    ...contentJson,
                    i18n: updated,
                },
            };
        });
    };
    return (_jsxs("div", { className: "p-6 max-w-6xl mx-auto", children: [_jsx("h1", { className: "text-2xl font-bold mb-6 text-gray-800", children: t("settings_title") }), _jsxs("div", { className: "flex border-b mb-6 bg-white rounded-t-lg overflow-hidden", children: [_jsx("button", { className: `px-6 py-3 font-medium transition-colors ${activeTab === "general" ? "border-b-2 border-primary-600 text-primary-600 bg-gray-50" : "text-gray-600 hover:bg-gray-50"}`, onClick: () => setActiveTab("general"), children: t("settings_tab_general") }), _jsx("button", { className: `px-6 py-3 font-medium transition-colors ${activeTab === "properties" ? "border-b-2 border-primary-600 text-primary-600 bg-gray-50" : "text-gray-600 hover:bg-gray-50"}`, onClick: () => setActiveTab("properties"), children: t("settings_tab_properties") }), _jsx("button", { className: `px-6 py-3 font-medium transition-colors ${activeTab === "website" ? "border-b-2 border-primary-600 text-primary-600 bg-gray-50" : "text-gray-600 hover:bg-gray-50"}`, onClick: () => setActiveTab("website"), children: t("settings_tab_website") }), _jsx("button", { className: `px-6 py-3 font-medium transition-colors ${activeTab === "notifications" ? "border-b-2 border-primary-600 text-primary-600 bg-gray-50" : "text-gray-600 hover:bg-gray-50"}`, onClick: () => setActiveTab("notifications"), children: t("settings_tab_notifications") }), _jsx("button", { className: `px-6 py-3 font-medium transition-colors ${activeTab === "rooms" ? "border-b-2 border-primary-600 text-primary-600 bg-gray-50" : "text-gray-600 hover:bg-gray-50"}`, onClick: () => setActiveTab("rooms"), children: t("settings_tab_rooms") }), canManageStaff && (_jsx("button", { className: `px-6 py-3 font-medium transition-colors ${activeTab === "staff" ? "border-b-2 border-primary-600 text-primary-600 bg-gray-50" : "text-gray-600 hover:bg-gray-50"}`, onClick: () => setActiveTab("staff"), children: t("settings_tab_staff") }))] }), _jsxs("div", { className: "bg-white rounded-b-lg shadow-sm p-6 border border-gray-200", children: [activeTab === "general" && (_jsxs("div", { className: "space-y-6", children: [_jsx("h3", { className: "text-lg font-bold text-gray-800 border-b pb-2", children: t("settings_property_details") }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: t("settings_property_name") }), _jsx("input", { className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500 outline-none", value: hotelProfile.name || "", onChange: e => setHotelProfile({ ...hotelProfile, name: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: t("settings_address") }), _jsx("input", { className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500 outline-none", value: hotelProfile.address || "", onChange: e => setHotelProfile({ ...hotelProfile, address: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: t("settings_city") }), _jsx("input", { className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500 outline-none", value: hotelProfile.city || "", onChange: e => setHotelProfile({ ...hotelProfile, city: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: t("settings_country") }), _jsx("input", { className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500 outline-none", value: hotelProfile.country || "", onChange: e => setHotelProfile({ ...hotelProfile, country: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: t("settings_phone") }), _jsx("input", { className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500 outline-none", value: hotelProfile.phone || "", onChange: e => setHotelProfile({ ...hotelProfile, phone: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: t("settings_email") }), _jsx("input", { className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500 outline-none", value: hotelProfile.email || "", onChange: e => setHotelProfile({ ...hotelProfile, email: e.target.value }) })] })] }), _jsx("div", { className: "pt-4 border-t", children: _jsx("button", { className: "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded transition-colors shadow-sm", onClick: handleSaveWebsiteConfig, disabled: loading, children: loading ? t("loading") : t("settings_save_general") }) })] })), activeTab === "website" && (_jsxs("div", { className: "space-y-8 animate-fade-in", children: [_jsxs("div", { className: "border border-gray-200 rounded-lg p-6 bg-gray-50", children: [_jsxs("h3", { className: "text-lg font-bold mb-4 text-gray-800 flex items-center gap-2", children: [_jsx("span", { children: "\uD83C\uDFA8" }), " Brand Identity"] }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Content Language" }), _jsxs("select", { className: "border p-2 rounded", value: contentLanguage, onChange: (e) => setContentLanguage(e.target.value), children: [_jsx("option", { value: "en", children: "English" }), _jsx("option", { value: "it", children: "Italiano" }), _jsx("option", { value: "zh", children: "\u4E2D\u6587" })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Website Title" }), _jsx("input", { className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500 outline-none", value: getLocalizedValue(hotelProfile.contentJson?.i18n?.websiteTitle), onChange: e => setLocalizedValue(["websiteTitle"], e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Logo URL" }), _jsx("input", { className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500 outline-none", value: hotelProfile.logoUrl || "", onChange: e => setHotelProfile({ ...hotelProfile, logoUrl: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Primary Color" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "color", className: "h-10 w-10 p-1 border rounded cursor-pointer", value: hotelProfile.primaryColor || "#000000", onChange: e => setHotelProfile({ ...hotelProfile, primaryColor: e.target.value }) }), _jsx("input", { className: "border p-2 w-full rounded font-mono", value: hotelProfile.primaryColor || "", onChange: e => setHotelProfile({ ...hotelProfile, primaryColor: e.target.value }) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Secondary Color" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "color", className: "h-10 w-10 p-1 border rounded cursor-pointer", value: hotelProfile.secondaryColor || "#000000", onChange: e => setHotelProfile({ ...hotelProfile, secondaryColor: e.target.value }) }), _jsx("input", { className: "border p-2 w-full rounded font-mono", value: hotelProfile.secondaryColor || "", onChange: e => setHotelProfile({ ...hotelProfile, secondaryColor: e.target.value }) })] })] })] })] }), _jsxs("div", { className: "border border-gray-200 rounded-lg p-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsxs("h3", { className: "text-lg font-bold text-gray-800 flex items-center gap-2", children: [_jsx("span", { children: "\uD83D\uDDBC\uFE0F" }), " Homepage Hero Section"] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer select-none", children: [_jsx("span", { className: "text-sm font-medium text-gray-600", children: "Visible" }), _jsx("input", { type: "checkbox", className: "form-checkbox h-5 w-5 text-blue-600", checked: hotelProfile.contentJson?.hero?.show, onChange: e => setHotelProfile({ ...hotelProfile, contentJson: { ...hotelProfile.contentJson, hero: { ...hotelProfile.contentJson.hero, show: e.target.checked } } }) })] })] }), hotelProfile.contentJson?.hero?.show && (_jsxs("div", { className: "grid grid-cols-1 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Main Title" }), _jsx("input", { className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500", value: getLocalizedValue(hotelProfile.contentJson?.i18n?.hero?.title), onChange: e => setLocalizedValue(["hero", "title"], e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Subtitle" }), _jsx("input", { className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500", value: getLocalizedValue(hotelProfile.contentJson?.i18n?.hero?.subtitle), onChange: e => setLocalizedValue(["hero", "subtitle"], e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Background Image URL" }), _jsx("input", { className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500", placeholder: "https://...", value: hotelProfile.contentJson.hero?.image, onChange: e => setHotelProfile({ ...hotelProfile, contentJson: { ...hotelProfile.contentJson, hero: { ...hotelProfile.contentJson.hero, image: e.target.value } } }) }), hotelProfile.contentJson.hero?.image && (_jsx("img", { src: hotelProfile.contentJson.hero.image, alt: "Preview", className: "mt-2 h-32 w-full object-cover rounded border" }))] })] }))] }), _jsxs("div", { className: "border border-gray-200 rounded-lg p-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsxs("h3", { className: "text-lg font-bold text-gray-800 flex items-center gap-2", children: [_jsx("span", { children: "\uD83D\uDCDD" }), " About Section"] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer select-none", children: [_jsx("span", { className: "text-sm font-medium text-gray-600", children: "Visible" }), _jsx("input", { type: "checkbox", className: "form-checkbox h-5 w-5 text-blue-600", checked: hotelProfile.contentJson?.about?.show, onChange: e => setHotelProfile({ ...hotelProfile, contentJson: { ...hotelProfile.contentJson, about: { ...hotelProfile.contentJson.about, show: e.target.checked } } }) })] })] }), hotelProfile.contentJson?.about?.show && (_jsxs("div", { className: "grid grid-cols-1 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Section Title" }), _jsx("input", { className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500", value: getLocalizedValue(hotelProfile.contentJson?.i18n?.about?.title), onChange: e => setLocalizedValue(["about", "title"], e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Content Text" }), _jsx("textarea", { rows: 5, className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500", value: getLocalizedValue(hotelProfile.contentJson?.i18n?.about?.content), onChange: e => setLocalizedValue(["about", "content"], e.target.value) })] })] }))] }), _jsxs("div", { className: "border border-gray-200 rounded-lg p-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsxs("h3", { className: "text-lg font-bold text-gray-800 flex items-center gap-2", children: [_jsx("span", { children: "\uD83D\uDCCD" }), " Map Configuration"] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer select-none", children: [_jsx("span", { className: "text-sm font-medium text-gray-600", children: "Visible" }), _jsx("input", { type: "checkbox", className: "form-checkbox h-5 w-5 text-blue-600", checked: hotelProfile.contentJson?.map?.show, onChange: e => setHotelProfile({ ...hotelProfile, contentJson: { ...hotelProfile.contentJson, map: { ...hotelProfile.contentJson.map, show: e.target.checked } } }) })] })] }), hotelProfile.contentJson?.map?.show && (_jsxs("div", { className: "p-4 bg-yellow-50 rounded border border-yellow-100", children: [_jsx("label", { className: "block text-sm font-semibold text-gray-800 mb-1", children: "Google Maps Embed URL" }), _jsx("p", { className: "text-xs text-gray-600 mb-2", children: "Go to Google Maps \u2192 Share \u2192 Embed a map \u2192 Copy HTML. Extract just the URL from `src=\"...\"`." }), _jsx("input", { className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500 font-mono text-sm", placeholder: "https://www.google.com/maps/embed?...", value: hotelProfile.contentJson.map?.embedUrl, onChange: e => setHotelProfile({ ...hotelProfile, contentJson: { ...hotelProfile.contentJson, map: { ...hotelProfile.contentJson.map, embedUrl: e.target.value } } }) })] }))] }), _jsxs("div", { className: "border border-gray-200 rounded-lg p-6", children: [_jsxs("h3", { className: "text-lg font-bold mb-4 text-gray-800 flex items-center gap-2", children: [_jsx("span", { children: "\u2728" }), " Amenities List"] }), _jsx("textarea", { rows: 3, className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500", placeholder: "e.g. Free Wi-Fi, Pool, Spa, Ocean View", value: getLocalizedValue(hotelProfile.contentJson?.i18n?.amenities), onChange: e => setLocalizedValue(["amenities"], e.target.value) })] }), _jsxs("div", { className: "border border-gray-200 rounded-lg p-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsxs("h3", { className: "text-lg font-bold text-gray-800 flex items-center gap-2", children: [_jsx("span", { children: "\uD83D\uDCDC" }), " Booking Rules Popup"] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer select-none", children: [_jsx("span", { className: "text-sm font-medium text-gray-600", children: "Visible" }), _jsx("input", { type: "checkbox", className: "form-checkbox h-5 w-5 text-blue-600", checked: hotelProfile.contentJson?.rules?.show, onChange: e => setHotelProfile({
                                                            ...hotelProfile,
                                                            contentJson: {
                                                                ...hotelProfile.contentJson,
                                                                rules: { ...hotelProfile.contentJson.rules, show: e.target.checked }
                                                            }
                                                        }) })] })] }), hotelProfile.contentJson?.rules?.show && (_jsxs("div", { className: "grid grid-cols-1 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Popup Title" }), _jsx("input", { className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500", value: getLocalizedValue(hotelProfile.contentJson?.i18n?.rules?.title), onChange: e => setLocalizedValue(["rules", "title"], e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Rules Text" }), _jsx("textarea", { rows: 6, className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500", placeholder: "Write the hotel rules shown before payment...", value: getLocalizedValue(hotelProfile.contentJson?.i18n?.rules?.content), onChange: e => setLocalizedValue(["rules", "content"], e.target.value) })] })] }))] }), _jsx("div", { className: "sticky bottom-0 bg-white py-4 border-t flex justify-end", children: _jsx("button", { className: "bg-blue-600 text-white px-8 py-3 rounded-lg font-bold shadow hover:bg-blue-700 transition-all transform active:scale-95", onClick: handleSaveWebsiteConfig, disabled: loading, children: loading ? "Saving Changes..." : "💾 Save Website Configuration" }) })] })), activeTab === "staff" && (_jsxs("div", { className: "space-y-6", children: [!canManageStaff && (_jsx("div", { className: "p-6 text-center text-red-600 font-bold", children: t("access_denied") })), canManageStaff && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "border border-gray-200 rounded-lg p-6 bg-gray-50", children: [_jsx("h3", { className: "text-lg font-bold mb-4", children: t("staff_add_title") }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-4", children: [_jsx("input", { className: "border p-2 rounded", placeholder: t("staff_full_name"), value: newStaff.name, onChange: e => setNewStaff({ ...newStaff, name: e.target.value }) }), _jsx("input", { className: "border p-2 rounded", placeholder: t("staff_email_address"), value: newStaff.email, onChange: e => setNewStaff({ ...newStaff, email: e.target.value }) }), _jsx("input", { className: "border p-2 rounded", type: "password", placeholder: t("staff_password"), value: newStaff.password, onChange: e => setNewStaff({ ...newStaff, password: e.target.value }) }), _jsxs("select", { className: "border p-2 rounded", value: newStaff.role, onChange: e => setNewStaff({ ...newStaff, role: e.target.value }), children: [_jsx("option", { value: "RECEPTION", children: t("role_reception") }), _jsx("option", { value: "CLEANER", children: t("role_cleaner") }), _jsx("option", { value: "MANAGER", children: t("role_manager") }), _jsx("option", { value: "ADMIN", children: t("role_admin") })] })] }), _jsx("button", { className: "bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50", onClick: handleCreateUser, disabled: loadingStaff || !newStaff.name || !newStaff.email || !newStaff.password, children: loadingStaff ? t("staff_creating") : t("staff_create_account") })] }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-bold mb-4", children: t("staff_current_staff") }), _jsx("div", { className: "bg-white border rounded shadow overflow-hidden", children: _jsxs("table", { className: "w-full text-left border-collapse", children: [_jsx("thead", { className: "bg-gray-100", children: _jsxs("tr", { children: [_jsx("th", { className: "p-3 border-b", children: t("staff_name") }), _jsx("th", { className: "p-3 border-b", children: t("settings_email") }), _jsx("th", { className: "p-3 border-b", children: t("staff_role") }), _jsx("th", { className: "p-3 border-b", children: t("staff_status") }), _jsx("th", { className: "p-3 border-b text-right", children: t("staff_actions") })] }) }), _jsxs("tbody", { children: [users.map(u => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { className: "p-3 border-b", children: editingUserId === u.id ? (_jsx("input", { className: "border p-1 rounded text-sm", value: editStaff.name, onChange: e => setEditStaff({ ...editStaff, name: e.target.value }) })) : (u.name) }), _jsx("td", { className: "p-3 border-b", children: editingUserId === u.id ? (_jsx("input", { className: "border p-1 rounded text-sm", value: editStaff.email, onChange: e => setEditStaff({ ...editStaff, email: e.target.value }) })) : (u.email) }), _jsx("td", { className: "p-3 border-b", children: editingUserId === u.id ? (_jsxs("select", { className: "border p-1 rounded text-sm", value: editStaff.role, onChange: e => setEditStaff({ ...editStaff, role: e.target.value }), children: [_jsx("option", { value: "RECEPTION", children: t("role_reception") }), _jsx("option", { value: "CLEANER", children: t("role_cleaner") }), _jsx("option", { value: "MANAGER", children: t("role_manager") }), _jsx("option", { value: "ADMIN", children: t("role_admin") })] })) : (_jsx("span", { className: "px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-bold", children: roleLabel(u.role) })) }), _jsx("td", { className: "p-3 border-b", children: u.isActive ? _jsx("span", { className: "text-green-600 font-bold", children: t("staff_active") }) : _jsx("span", { className: "text-red-600", children: t("staff_inactive") }) }), _jsx("td", { className: "p-3 border-b text-right", children: editingUserId === u.id ? (_jsxs(_Fragment, { children: [_jsx("button", { className: "text-green-600 hover:text-green-800 text-sm font-bold mr-3", onClick: () => handleUpdateUser(u.id), children: "Save" }), _jsx("button", { className: "text-gray-600 hover:text-gray-800 text-sm font-bold mr-3", onClick: () => setEditingUserId(null), children: "Cancel" })] })) : (_jsxs(_Fragment, { children: [_jsx("button", { className: "text-blue-600 hover:text-blue-800 text-sm font-bold mr-3", onClick: () => handleEditUser(u), children: "Edit" }), _jsx("button", { className: "text-purple-600 hover:text-purple-800 text-sm font-bold mr-3", onClick: () => handleResetPassword(u.id), children: "Reset Password" }), _jsx("button", { className: "text-red-600 hover:text-red-800 text-sm font-bold", onClick: () => handleDeleteUser(u.id), children: t("staff_remove") })] })) })] }, u.id))), users.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "p-4 text-center text-gray-500", children: t("staff_none") }) }))] })] }) })] })] }))] })), activeTab === "notifications" && (_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-bold mb-4", children: "Notifications" }), _jsx("p", { className: "text-gray-600", children: "Configure email and SMS alerts." })] })), activeTab === "properties" && (_jsx("div", { className: "-m-6", children: _jsx(PropertiesPage, {}) })), activeTab === "rooms" && _jsx(RoomsSettings, {})] })] }));
};
export default SettingsPage;
