import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { roomAPI, propertyAPI } from "../api/endpoints";
const ROOM_TYPES = [
    {
        name: "Singola",
        icon: "🛏️",
        beds: "1 Letto Singolo",
        maxGuests: 1,
        description: "Camera con un letto singolo"
    },
    {
        name: "Matrimoniale Piccola",
        icon: "🛏️",
        beds: "1 Letto Matrimoniale Piccolo",
        maxGuests: 2,
        description: "Camera matrimoniale compatta"
    },
    {
        name: "Doppia",
        icon: "🛏️🛏️",
        beds: "2 Letti Singoli",
        maxGuests: 2,
        description: "Camera con due letti singoli"
    },
    {
        name: "Matrimoniale",
        icon: "🛏️",
        beds: "1 Letto Matrimoniale",
        maxGuests: 2,
        description: "Camera con un letto matrimoniale"
    },
    {
        name: "Tripola",
        icon: "🛏️🛏️🛏️",
        beds: "3 Letti",
        maxGuests: 3,
        description: "Camera con tre letti"
    },
    {
        name: "Familiare",
        icon: "👨‍👩‍👧‍👦",
        beds: "1 Letto King Size + 1 Letto Singolo",
        maxGuests: 3,
        description: "Camera con un letto king size e un letto singolo"
    }
];
const getRoomTypeIcon = (roomType) => {
    const type = ROOM_TYPES.find(t => t.name === roomType);
    return type ? type.icon : "🛏️";
};
const getRoomTypeInfo = (roomType) => {
    return ROOM_TYPES.find(t => t.name === roomType);
};
const RoomsSettings = () => {
    const [rooms, setRooms] = useState([]);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editingRoomId, setEditingRoomId] = useState(null);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [formData, setFormData] = useState({
        propertyId: 0,
        roomNumber: "",
        roomType: "Singola",
        maxGuests: 1,
        basePrice: 100,
        status: "AVAILABLE",
        description: "",
        breakfastIncluded: false,
        breakfastPrice: 0,
    });
    useEffect(() => {
        loadProperties();
    }, []);
    useEffect(() => {
        if (selectedProperty) {
            loadRooms(selectedProperty);
        }
    }, [selectedProperty]);
    const loadProperties = async () => {
        try {
            setLoading(true);
            setError("");
            const response = await propertyAPI.getAll();
            const propertiesData = response.data || [];
            setProperties(propertiesData);
            if (propertiesData.length > 0 && !selectedProperty) {
                setSelectedProperty(propertiesData[0].id);
            }
        }
        catch (err) {
            console.error("Failed to load properties:", err);
            setError(err.response?.data?.message || "Failed to load properties");
        }
        finally {
            setLoading(false);
        }
    };
    const loadRooms = async (propertyId) => {
        try {
            setLoading(true);
            setError("");
            const response = await roomAPI.getByProperty(propertyId);
            setRooms(response.data || []);
        }
        catch (err) {
            console.error("Failed to load rooms:", err);
            setError(err.response?.data?.message || "Failed to load rooms");
        }
        finally {
            setLoading(false);
        }
    };
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        let newValue = value;
        if (name === "roomType") {
            const selectedType = ROOM_TYPES.find(t => t.name === value);
            setFormData((prev) => ({
                ...prev,
                roomType: value,
                maxGuests: selectedType?.maxGuests || prev.maxGuests,
            }));
            return;
        }
        if (name === "breakfastIncluded") {
            newValue = e.target.checked;
        }
        if (name === "maxGuests" || name === "basePrice" || name === "propertyId" || name === "breakfastPrice") {
            newValue = Number(value);
        }
        setFormData((prev) => ({
            ...prev,
            [name]: newValue,
        }));
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            if (editingRoomId) {
                await roomAPI.update(editingRoomId, {
                    ...formData,
                    propertyId: selectedProperty,
                });
            }
            else {
                await roomAPI.create({
                    ...formData,
                    propertyId: selectedProperty,
                });
            }
            if (selectedProperty) {
                await loadRooms(selectedProperty);
            }
            resetForm();
        }
        catch (err) {
            setError(err.response?.data?.message || "Failed to save room");
        }
        finally {
            setLoading(false);
        }
    };
    const handleStatusUpdate = async (roomId, status) => {
        try {
            setLoading(true);
            await roomAPI.updateStatus(roomId, status);
            if (selectedProperty) {
                await loadRooms(selectedProperty);
            }
        }
        catch (err) {
            setError(err.response?.data?.message || "Failed to update room status");
        }
        finally {
            setLoading(false);
        }
    };
    const handleMarkCleaned = async (roomId) => {
        await handleStatusUpdate(roomId, "AVAILABLE");
    };
    const resetForm = () => {
        setFormData({
            propertyId: 0,
            roomNumber: "",
            roomType: "Singola",
            maxGuests: 1,
            basePrice: 100,
            status: "AVAILABLE",
            description: "",
            breakfastIncluded: false,
            breakfastPrice: 0,
        });
        setShowForm(false);
        setEditingRoomId(null);
    };
    const getStatusColor = (status) => {
        const colors = {
            AVAILABLE: "#10b981",
            OCCUPIED: "#ef4444",
            MAINTENANCE: "#f59e0b",
            OUT_OF_SERVICE: "#6b7280",
            CLEANING: "#3b82f6",
        };
        return colors[status] || "#6b7280";
    };
    const startEditRoom = (room) => {
        setEditingRoomId(room.id);
        setShowForm(true);
        setFormData({
            propertyId: room.propertyId,
            roomNumber: room.roomNumber,
            roomType: room.roomType,
            maxGuests: room.maxGuests,
            basePrice: room.basePrice,
            status: room.status,
            description: room.description || "",
            breakfastIncluded: !!room.breakfastIncluded,
            breakfastPrice: room.breakfastPrice || 0,
        });
    };
    if (loading && properties.length === 0) {
        return _jsx("div", { className: "loading", children: "Loading rooms..." });
    }
    return (_jsxs("div", { className: "rooms-settings-container", children: [_jsxs("div", { className: "page-header", children: [_jsx("h2", { children: "Rooms Management" }), _jsxs("div", { className: "header-actions", children: [properties.length > 0 && (_jsxs("select", { value: selectedProperty || "", onChange: (e) => setSelectedProperty(Number(e.target.value)), className: "property-select", children: [_jsx("option", { value: "", children: "Select Property" }), properties.map((property) => (_jsx("option", { value: property.id, children: property.name }, property.id)))] })), _jsx("button", { className: "btn btn-primary", onClick: () => setShowForm(!showForm), disabled: !selectedProperty, children: showForm ? "Cancel" : "+ Add Room" })] })] }), error && _jsx("div", { className: "error-message", children: error }), !selectedProperty ? (_jsx("div", { className: "empty-state", children: _jsx("p", { children: "Please select a property to view rooms." }) })) : (_jsxs(_Fragment, { children: [showForm && (_jsxs("div", { className: "form-card", children: [_jsx("h3", { children: editingRoomId ? "Edit Room" : "Add New Room" }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "form-grid", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "roomNumber", children: "Room Number *" }), _jsx("input", { type: "text", id: "roomNumber", name: "roomNumber", value: formData.roomNumber, onChange: handleInputChange, required: true, placeholder: "e.g., 101" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "roomType", children: "Room Type *" }), _jsx("select", { id: "roomType", name: "roomType", value: formData.roomType, onChange: handleInputChange, required: true, children: ROOM_TYPES.map((type) => (_jsxs("option", { value: type.name, children: [type.icon, " ", type.name, " (", type.beds, ")"] }, type.name))) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "maxGuests", children: "Max Guests *" }), _jsx("input", { type: "number", id: "maxGuests", name: "maxGuests", min: "1", max: "10", value: formData.maxGuests, onChange: handleInputChange, required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "basePrice", children: "Base Price ($) *" }), _jsx("input", { type: "number", id: "basePrice", name: "basePrice", min: "0", step: "0.01", value: formData.basePrice, onChange: handleInputChange, required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "breakfastIncluded", children: "Breakfast Included" }), _jsx("input", { type: "checkbox", id: "breakfastIncluded", name: "breakfastIncluded", checked: formData.breakfastIncluded, onChange: handleInputChange })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "breakfastPrice", children: "Breakfast Price ($)" }), _jsx("input", { type: "number", id: "breakfastPrice", name: "breakfastPrice", min: "0", step: "0.01", value: formData.breakfastPrice, onChange: handleInputChange, disabled: !formData.breakfastIncluded })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "status", children: "Status *" }), _jsxs("select", { id: "status", name: "status", value: formData.status, onChange: handleInputChange, required: true, children: [_jsx("option", { value: "AVAILABLE", children: "Available" }), _jsx("option", { value: "OCCUPIED", children: "Occupied" }), _jsx("option", { value: "MAINTENANCE", children: "Maintenance" }), _jsx("option", { value: "CLEANING", children: "Cleaning" }), _jsx("option", { value: "OUT_OF_SERVICE", children: "Out of Service" })] })] }), _jsxs("div", { className: "form-group full-width", children: [_jsx("label", { htmlFor: "description", children: "Description" }), _jsx("textarea", { id: "description", name: "description", value: formData.description, onChange: handleInputChange, rows: 3 })] })] }), _jsxs("div", { className: "form-actions", children: [_jsx("button", { type: "button", className: "btn btn-secondary", onClick: resetForm, children: "Cancel" }), _jsx("button", { type: "submit", className: "btn btn-primary", disabled: loading, children: loading ? "Saving..." : editingRoomId ? "Update Room" : "Create Room" })] })] })] })), _jsxs("div", { className: "room-types-guide", children: [_jsx("h3", { children: "Available Room Types" }), _jsx("div", { className: "room-types-grid", children: ROOM_TYPES.map((type) => (_jsxs("div", { className: "room-type-info", children: [_jsx("div", { className: "type-icon", children: type.icon }), _jsxs("div", { className: "type-details", children: [_jsx("h4", { children: type.name }), _jsx("p", { children: type.beds }), _jsxs("p", { className: "guests", children: ["\uD83D\uDC65 Max ", type.maxGuests, " ", type.maxGuests === 1 ? "guest" : "guests"] })] })] }, type.name))) })] }), _jsx("div", { className: "rooms-grid", children: rooms.length === 0 ? (_jsx("div", { className: "empty-state", children: _jsx("p", { children: "No rooms found for this property. Add rooms to get started!" }) })) : (rooms.map((room) => (_jsxs("div", { className: "room-card", children: [_jsx("div", { className: "room-status-indicator", style: { backgroundColor: getStatusColor(room.status) } }), _jsx("div", { className: "room-header", children: _jsxs("div", { className: "room-number-section", children: [_jsxs("h3", { children: ["Room ", room.roomNumber] }), _jsx("span", { className: "room-type-icon", children: getRoomTypeIcon(room.roomType) })] }) }), _jsx("div", { className: "room-badge", children: room.roomType }), _jsxs("div", { className: "room-details", children: [_jsxs("p", { children: [_jsx("strong", { children: "\uD83D\uDC65 Max Guests:" }), " ", room.maxGuests] }), _jsxs("p", { children: [_jsx("strong", { children: "\uD83D\uDCB0 Base Price:" }), " $", room.basePrice, "/night"] }), _jsxs("p", { children: [_jsx("strong", { children: "\uD83E\uDD50 Breakfast:" }), " ", room.breakfastIncluded ? `Included${room.breakfastPrice && room.breakfastPrice > 0 ? ` (+$${room.breakfastPrice})` : ""}` : "Not included"] }), room.description && (_jsxs("p", { children: [_jsx("strong", { children: "\uD83D\uDCDD Description:" }), " ", room.description] })), _jsxs("p", { className: "bed-info", children: [_jsx("strong", { children: "\uD83D\uDECF\uFE0F Bed Type:" }), " ", getRoomTypeInfo(room.roomType)?.beds] })] }), _jsxs("div", { className: "room-actions", children: [_jsxs("select", { value: room.status, onChange: (e) => handleStatusUpdate(room.id, e.target.value), className: "status-select", children: [_jsx("option", { value: "AVAILABLE", children: "Available" }), _jsx("option", { value: "OCCUPIED", children: "Occupied" }), _jsx("option", { value: "MAINTENANCE", children: "Maintenance" }), _jsx("option", { value: "CLEANING", children: "Cleaning" }), _jsx("option", { value: "OUT_OF_SERVICE", children: "Out of Service" })] }), _jsx("button", { className: "btn btn-sm btn-secondary", onClick: () => startEditRoom(room), type: "button", children: "Edit" }), room.status === "CLEANING" && (_jsx("button", { className: "btn btn-sm btn-success", onClick: () => handleMarkCleaned(room.id), type: "button", children: "Mark Cleaned" }))] })] }, room.id)))) })] }))] }));
};
export default RoomsSettings;
