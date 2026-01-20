import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { hotelProfileAPI, userAPI } from "../api/endpoints";
import RoomsSettings from "../components/RoomsSettings";
import PropertiesPage from "./PropertiesPage";
const SettingsPage = () => {
    const [activeTab, setActiveTab] = useState("general");
    const [loading, setLoading] = useState(false);
    // Staff Management State
    const [users, setUsers] = useState([]);
    const [loadingStaff, setLoadingStaff] = useState(false);
    const [newStaff, setNewStaff] = useState({ name: "", email: "", password: "", role: "RECEPTION" });
    // Fetch Users when tab changes
    useEffect(() => {
        if (activeTab === "staff") {
            fetchUsers();
        }
    }, [activeTab]);
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
                    services: res.data.contentJson?.services || []
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
            await hotelProfileAPI.update(hotelProfile);
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
    return (_jsxs("div", { className: "p-6 max-w-6xl mx-auto", children: [_jsx("h1", { className: "text-2xl font-bold mb-6 text-gray-800", children: "System Settings" }), _jsxs("div", { className: "flex border-b mb-6 bg-white rounded-t-lg overflow-hidden", children: [_jsx("button", { className: `px-6 py-3 font-medium transition-colors ${activeTab === "general" ? "border-b-2 border-primary-600 text-primary-600 bg-gray-50" : "text-gray-600 hover:bg-gray-50"}`, onClick: () => setActiveTab("general"), children: "General Details" }), _jsx("button", { className: `px-6 py-3 font-medium transition-colors ${activeTab === "properties" ? "border-b-2 border-primary-600 text-primary-600 bg-gray-50" : "text-gray-600 hover:bg-gray-50"}`, onClick: () => setActiveTab("properties"), children: "Properties" }), _jsx("button", { className: `px-6 py-3 font-medium transition-colors ${activeTab === "website" ? "border-b-2 border-primary-600 text-primary-600 bg-gray-50" : "text-gray-600 hover:bg-gray-50"}`, onClick: () => setActiveTab("website"), children: "Website & CMS" }), _jsx("button", { className: `px-6 py-3 font-medium transition-colors ${activeTab === "notifications" ? "border-b-2 border-primary-600 text-primary-600 bg-gray-50" : "text-gray-600 hover:bg-gray-50"}`, onClick: () => setActiveTab("notifications"), children: "Notifications" }), _jsx("button", { className: `px-6 py-3 font-medium transition-colors ${activeTab === "rooms" ? "border-b-2 border-primary-600 text-primary-600 bg-gray-50" : "text-gray-600 hover:bg-gray-50"}`, onClick: () => setActiveTab("rooms"), children: "Rooms Management" }), _jsx("button", { className: `px-6 py-3 font-medium transition-colors ${activeTab === "staff" ? "border-b-2 border-primary-600 text-primary-600 bg-gray-50" : "text-gray-600 hover:bg-gray-50"}`, onClick: () => setActiveTab("staff"), children: "Staff" })] }), _jsxs("div", { className: "bg-white rounded-b-lg shadow-sm p-6 border border-gray-200", children: [activeTab === "general" && (_jsxs("div", { className: "space-y-6", children: [_jsx("h3", { className: "text-lg font-bold text-gray-800 border-b pb-2", children: "Property Details" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Property Name" }), _jsx("input", { className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500 outline-none", value: hotelProfile.name || "", onChange: e => setHotelProfile({ ...hotelProfile, name: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Address" }), _jsx("input", { className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500 outline-none", value: hotelProfile.address || "", onChange: e => setHotelProfile({ ...hotelProfile, address: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "City" }), _jsx("input", { className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500 outline-none", value: hotelProfile.city || "", onChange: e => setHotelProfile({ ...hotelProfile, city: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Country" }), _jsx("input", { className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500 outline-none", value: hotelProfile.country || "", onChange: e => setHotelProfile({ ...hotelProfile, country: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Phone" }), _jsx("input", { className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500 outline-none", value: hotelProfile.phone || "", onChange: e => setHotelProfile({ ...hotelProfile, phone: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Email" }), _jsx("input", { className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500 outline-none", value: hotelProfile.email || "", onChange: e => setHotelProfile({ ...hotelProfile, email: e.target.value }) })] })] }), _jsx("div", { className: "pt-4 border-t", children: _jsx("button", { className: "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded transition-colors shadow-sm", onClick: handleSaveWebsiteConfig, disabled: loading, children: loading ? "Saving..." : "Save General Settings" }) })] })), activeTab === "website" && (_jsxs("div", { className: "space-y-8 animate-fade-in", children: [_jsxs("div", { className: "border border-gray-200 rounded-lg p-6 bg-gray-50", children: [_jsxs("h3", { className: "text-lg font-bold mb-4 text-gray-800 flex items-center gap-2", children: [_jsx("span", { children: "\uD83C\uDFA8" }), " Brand Identity"] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Website Title" }), _jsx("input", { className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500 outline-none", value: hotelProfile.websiteTitle || "", onChange: e => setHotelProfile({ ...hotelProfile, websiteTitle: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Logo URL" }), _jsx("input", { className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500 outline-none", value: hotelProfile.logoUrl || "", onChange: e => setHotelProfile({ ...hotelProfile, logoUrl: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Primary Color" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "color", className: "h-10 w-10 p-1 border rounded cursor-pointer", value: hotelProfile.primaryColor || "#000000", onChange: e => setHotelProfile({ ...hotelProfile, primaryColor: e.target.value }) }), _jsx("input", { className: "border p-2 w-full rounded font-mono", value: hotelProfile.primaryColor || "", onChange: e => setHotelProfile({ ...hotelProfile, primaryColor: e.target.value }) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Secondary Color" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "color", className: "h-10 w-10 p-1 border rounded cursor-pointer", value: hotelProfile.secondaryColor || "#000000", onChange: e => setHotelProfile({ ...hotelProfile, secondaryColor: e.target.value }) }), _jsx("input", { className: "border p-2 w-full rounded font-mono", value: hotelProfile.secondaryColor || "", onChange: e => setHotelProfile({ ...hotelProfile, secondaryColor: e.target.value }) })] })] })] })] }), _jsxs("div", { className: "border border-gray-200 rounded-lg p-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsxs("h3", { className: "text-lg font-bold text-gray-800 flex items-center gap-2", children: [_jsx("span", { children: "\uD83D\uDDBC\uFE0F" }), " Homepage Hero Section"] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer select-none", children: [_jsx("span", { className: "text-sm font-medium text-gray-600", children: "Visible" }), _jsx("input", { type: "checkbox", className: "form-checkbox h-5 w-5 text-blue-600", checked: hotelProfile.contentJson?.hero?.show, onChange: e => setHotelProfile({ ...hotelProfile, contentJson: { ...hotelProfile.contentJson, hero: { ...hotelProfile.contentJson.hero, show: e.target.checked } } }) })] })] }), hotelProfile.contentJson?.hero?.show && (_jsxs("div", { className: "grid grid-cols-1 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Main Title" }), _jsx("input", { className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500", value: hotelProfile.contentJson.hero?.title, onChange: e => setHotelProfile({ ...hotelProfile, contentJson: { ...hotelProfile.contentJson, hero: { ...hotelProfile.contentJson.hero, title: e.target.value } } }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Subtitle" }), _jsx("input", { className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500", value: hotelProfile.contentJson.hero?.subtitle, onChange: e => setHotelProfile({ ...hotelProfile, contentJson: { ...hotelProfile.contentJson, hero: { ...hotelProfile.contentJson.hero, subtitle: e.target.value } } }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Background Image URL" }), _jsx("input", { className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500", placeholder: "https://...", value: hotelProfile.contentJson.hero?.image, onChange: e => setHotelProfile({ ...hotelProfile, contentJson: { ...hotelProfile.contentJson, hero: { ...hotelProfile.contentJson.hero, image: e.target.value } } }) }), hotelProfile.contentJson.hero?.image && (_jsx("img", { src: hotelProfile.contentJson.hero.image, alt: "Preview", className: "mt-2 h-32 w-full object-cover rounded border" }))] })] }))] }), _jsxs("div", { className: "border border-gray-200 rounded-lg p-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsxs("h3", { className: "text-lg font-bold text-gray-800 flex items-center gap-2", children: [_jsx("span", { children: "\uD83D\uDCDD" }), " About Section"] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer select-none", children: [_jsx("span", { className: "text-sm font-medium text-gray-600", children: "Visible" }), _jsx("input", { type: "checkbox", className: "form-checkbox h-5 w-5 text-blue-600", checked: hotelProfile.contentJson?.about?.show, onChange: e => setHotelProfile({ ...hotelProfile, contentJson: { ...hotelProfile.contentJson, about: { ...hotelProfile.contentJson.about, show: e.target.checked } } }) })] })] }), hotelProfile.contentJson?.about?.show && (_jsxs("div", { className: "grid grid-cols-1 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Section Title" }), _jsx("input", { className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500", value: hotelProfile.contentJson.about?.title, onChange: e => setHotelProfile({ ...hotelProfile, contentJson: { ...hotelProfile.contentJson, about: { ...hotelProfile.contentJson.about, title: e.target.value } } }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Content Text" }), _jsx("textarea", { rows: 5, className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500", value: hotelProfile.contentJson.about?.content, onChange: e => setHotelProfile({ ...hotelProfile, contentJson: { ...hotelProfile.contentJson, about: { ...hotelProfile.contentJson.about, content: e.target.value } } }) })] })] }))] }), _jsxs("div", { className: "border border-gray-200 rounded-lg p-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsxs("h3", { className: "text-lg font-bold text-gray-800 flex items-center gap-2", children: [_jsx("span", { children: "\uD83D\uDCCD" }), " Map Configuration"] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer select-none", children: [_jsx("span", { className: "text-sm font-medium text-gray-600", children: "Visible" }), _jsx("input", { type: "checkbox", className: "form-checkbox h-5 w-5 text-blue-600", checked: hotelProfile.contentJson?.map?.show, onChange: e => setHotelProfile({ ...hotelProfile, contentJson: { ...hotelProfile.contentJson, map: { ...hotelProfile.contentJson.map, show: e.target.checked } } }) })] })] }), hotelProfile.contentJson?.map?.show && (_jsxs("div", { className: "p-4 bg-yellow-50 rounded border border-yellow-100", children: [_jsx("label", { className: "block text-sm font-semibold text-gray-800 mb-1", children: "Google Maps Embed URL" }), _jsx("p", { className: "text-xs text-gray-600 mb-2", children: "Go to Google Maps \u2192 Share \u2192 Embed a map \u2192 Copy HTML. Extract just the URL from `src=\"...\"`." }), _jsx("input", { className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500 font-mono text-sm", placeholder: "https://www.google.com/maps/embed?...", value: hotelProfile.contentJson.map?.embedUrl, onChange: e => setHotelProfile({ ...hotelProfile, contentJson: { ...hotelProfile.contentJson, map: { ...hotelProfile.contentJson.map, embedUrl: e.target.value } } }) })] }))] }), _jsxs("div", { className: "border border-gray-200 rounded-lg p-6", children: [_jsxs("h3", { className: "text-lg font-bold mb-4 text-gray-800 flex items-center gap-2", children: [_jsx("span", { children: "\u2728" }), " Amenities List"] }), _jsx("textarea", { rows: 3, className: "border p-2 w-full rounded focus:ring-2 focus:ring-primary-500", placeholder: "e.g. Free Wi-Fi, Pool, Spa, Ocean View", value: hotelProfile.amenities || "", onChange: e => setHotelProfile({ ...hotelProfile, amenities: e.target.value }) })] }), _jsx("div", { className: "sticky bottom-0 bg-white py-4 border-t flex justify-end", children: _jsx("button", { className: "bg-blue-600 text-white px-8 py-3 rounded-lg font-bold shadow hover:bg-blue-700 transition-all transform active:scale-95", onClick: handleSaveWebsiteConfig, disabled: loading, children: loading ? "Saving Changes..." : "💾 Save Website Configuration" }) })] })), activeTab === "staff" && (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "border border-gray-200 rounded-lg p-6 bg-gray-50", children: [_jsx("h3", { className: "text-lg font-bold mb-4", children: "Add New Staff Member" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-4", children: [_jsx("input", { className: "border p-2 rounded", placeholder: "Full Name", value: newStaff.name, onChange: e => setNewStaff({ ...newStaff, name: e.target.value }) }), _jsx("input", { className: "border p-2 rounded", placeholder: "Email Address", value: newStaff.email, onChange: e => setNewStaff({ ...newStaff, email: e.target.value }) }), _jsx("input", { className: "border p-2 rounded", type: "password", placeholder: "Password", value: newStaff.password, onChange: e => setNewStaff({ ...newStaff, password: e.target.value }) }), _jsxs("select", { className: "border p-2 rounded", value: newStaff.role, onChange: e => setNewStaff({ ...newStaff, role: e.target.value }), children: [_jsx("option", { value: "RECEPTION", children: "Reception" }), _jsx("option", { value: "CLEANER", children: "Cleaner" }), _jsx("option", { value: "MANAGER", children: "Manager" }), _jsx("option", { value: "ADMIN", children: "Admin" })] })] }), _jsx("button", { className: "bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50", onClick: handleCreateUser, disabled: loadingStaff || !newStaff.name || !newStaff.email || !newStaff.password, children: loadingStaff ? "Creating..." : "Create Staff Account" })] }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-bold mb-4", children: "Current Staff" }), _jsx("div", { className: "bg-white border rounded shadow overflow-hidden", children: _jsxs("table", { className: "w-full text-left border-collapse", children: [_jsx("thead", { className: "bg-gray-100", children: _jsxs("tr", { children: [_jsx("th", { className: "p-3 border-b", children: "Name" }), _jsx("th", { className: "p-3 border-b", children: "Email" }), _jsx("th", { className: "p-3 border-b", children: "Role" }), _jsx("th", { className: "p-3 border-b", children: "Status" }), _jsx("th", { className: "p-3 border-b text-right", children: "Actions" })] }) }), _jsxs("tbody", { children: [users.map(u => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { className: "p-3 border-b", children: u.name }), _jsx("td", { className: "p-3 border-b", children: u.email }), _jsx("td", { className: "p-3 border-b", children: _jsx("span", { className: "px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-bold", children: u.role }) }), _jsx("td", { className: "p-3 border-b", children: u.isActive ? _jsx("span", { className: "text-green-600 font-bold", children: "Active" }) : _jsx("span", { className: "text-red-600", children: "Inactive" }) }), _jsx("td", { className: "p-3 border-b text-right", children: _jsx("button", { className: "text-red-600 hover:text-red-800 text-sm font-bold", onClick: () => handleDeleteUser(u.id), children: "Remove" }) })] }, u.id))), users.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "p-4 text-center text-gray-500", children: "No staff members found." }) }))] })] }) })] })] })), activeTab === "notifications" && (_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-bold mb-4", children: "Notifications" }), _jsx("p", { className: "text-gray-600", children: "Configure email and SMS alerts." })] })), activeTab === "properties" && (_jsx("div", { className: "-m-6", children: _jsx(PropertiesPage, {}) })), activeTab === "rooms" && _jsx(RoomsSettings, {})] })] }));
};
export default SettingsPage;
