import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { propertyAPI, ratesAPI } from "../api/endpoints";
const PricingPage = () => {
    const [properties, setProperties] = useState([]);
    const [selectedProperty, setSelectedProperty] = useState("");
    const [loading, setLoading] = useState(false);
    // Date selection
    const today = new Date();
    const [startDateStr, setStartDateStr] = useState(today.toISOString().split("T")[0]);
    const [ratesData, setRatesData] = useState([]);
    const [saveStatus, setSaveStatus] = useState("");
    // Bulk Update State
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkForm, setBulkForm] = useState({
        roomTypeId: "all",
        startDate: "",
        endDate: "",
        price: "",
        availableCount: "",
        daysOfWeek: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true },
        isClosed: "no-change",
        enableBreakfast: "no-change"
    });
    useEffect(() => {
        loadProperties();
    }, []);
    useEffect(() => {
        if (selectedProperty) {
            loadRates();
        }
    }, [selectedProperty, startDateStr]);
    const loadProperties = async () => {
        try {
            const res = await propertyAPI.getAll();
            setProperties(res.data || []);
            if (res.data?.length)
                setSelectedProperty(res.data[0].id);
        }
        catch (e) {
            console.error("Failed to load properties", e);
        }
    };
    const getEndDate = () => {
        const start = new Date(startDateStr);
        const end = new Date(start);
        end.setDate(end.getDate() + 19); // Load 20 days
        return end.toISOString().split("T")[0];
    };
    const loadRates = async () => {
        if (!selectedProperty)
            return;
        setLoading(true);
        try {
            const res = await ratesAPI.get(Number(selectedProperty), startDateStr, getEndDate());
            setRatesData(res.data || []);
        }
        catch (e) {
            console.error("Failed to load rates", e);
        }
        finally {
            setLoading(false);
        }
    };
    // Process data for Grid
    // 1. Get Room Types
    const roomTypesMap = new Map();
    ratesData.forEach(r => roomTypesMap.set(r.roomTypeId, r.roomTypeName));
    const roomTypeIds = Array.from(roomTypesMap.keys());
    // 2. Generate Dates Array
    const dates = Array.from({ length: 14 }).map((_, i) => {
        const d = new Date(startDateStr);
        d.setDate(d.getDate() + i);
        return d.toISOString().split("T")[0];
    });
    // 3. Lookup Helper
    const getRate = (roomTypeId, date) => {
        return ratesData.find(r => r.roomTypeId === roomTypeId && r.date === date);
    };
    // 4. Update Handler
    const handlePriceUpdate = async (roomTypeId, date, newPrice) => {
        // If empty, do nothing or reset to 0? Let's assume numeric input only.
        if (newPrice.trim() === "")
            return; // Don't save empty string
        const price = parseFloat(newPrice);
        if (isNaN(price))
            return;
        // Optimistic Update
        setRatesData(prev => prev.map(r => (r.roomTypeId === roomTypeId && r.date === date)
            ? { ...r, price, isOverride: true }
            : r));
        // API Call
        try {
            setSaveStatus("Saving...");
            await ratesAPI.update(Number(selectedProperty), [{ roomTypeId, date, price }]);
            setSaveStatus("Saved");
            setTimeout(() => setSaveStatus(""), 2000);
        }
        catch (e) {
            setSaveStatus("Error saving!");
            console.error(e);
            // Revert (reload)
            loadRates();
        }
    };
    const handleInventoryUpdate = async (roomTypeId, date, newCount) => {
        // If empty string, maybe we want to reset to null? 
        // Backend expects number or null if we supported that. 
        // For now, let's assume they type a number. If they delete it, we might want to reset override.
        // Let's allow empty string to mean "reset to physical capacity" (null).
        let count = null;
        if (newCount !== "") {
            count = parseInt(newCount);
            if (isNaN(count))
                return;
        }
        setRatesData(prev => prev.map(r => (r.roomTypeId === roomTypeId && r.date === date)
            ? {
                ...r,
                totalRooms: count !== null ? count : r.totalPhysical,
                hasInventoryOverride: count !== null
            }
            : r));
        try {
            setSaveStatus("Saving...");
            // If count is null, we send empty string or special value? 
            // Backend expects 'availableCount' in payload.
            await ratesAPI.update(Number(selectedProperty), [{
                    roomTypeId,
                    date,
                    // We only want to update inventory here. But upsert requires price if new.
                    // But we have the current price in state!
                    price: getRate(roomTypeId, date)?.price || 0,
                    availableCount: count !== null ? count : "" // Send empty string for reset? Backend handles it?
                }]);
            setSaveStatus("Saved");
            setTimeout(() => setSaveStatus(""), 2000);
        }
        catch (e) {
            setSaveStatus("Error saving!");
            console.error(e);
            loadRates();
        }
    };
    const handleToggleUpdate = async (roomTypeId, date, field, value) => {
        setRatesData(prev => prev.map(r => (r.roomTypeId === roomTypeId && r.date === date)
            ? { ...r, [field]: value }
            : r));
        try {
            setSaveStatus("Saving...");
            await ratesAPI.update(Number(selectedProperty), [{
                    roomTypeId,
                    date,
                    price: getRate(roomTypeId, date)?.price || 0,
                    [field]: value
                }]);
            setSaveStatus("Saved");
            setTimeout(() => setSaveStatus(""), 2000);
        }
        catch (e) {
            setSaveStatus("Error saving!");
            console.error(e);
            loadRates();
        }
    };
    const handleBulkUpdate = async () => {
        if (!bulkForm.startDate || !bulkForm.endDate)
            return alert("Select dates");
        setLoading(true);
        try {
            const start = new Date(bulkForm.startDate);
            const end = new Date(bulkForm.endDate);
            const updates = [];
            let curr = new Date(start);
            while (curr <= end) {
                if (bulkForm.daysOfWeek[curr.getDay()]) {
                    const dateStr = curr.toISOString().split("T")[0];
                    const typeIds = bulkForm.roomTypeId === "all"
                        ? roomTypeIds
                        : [parseInt(bulkForm.roomTypeId)];
                    typeIds.forEach(tid => {
                        const update = {
                            roomTypeId: tid,
                            date: dateStr
                        };
                        if (bulkForm.price)
                            update.price = parseFloat(bulkForm.price);
                        if (bulkForm.availableCount)
                            update.availableCount = parseInt(bulkForm.availableCount);
                        if (bulkForm.isClosed !== "no-change") {
                            update.isClosed = bulkForm.isClosed === "closed";
                        }
                        if (bulkForm.enableBreakfast !== "no-change") {
                            update.enableBreakfast = bulkForm.enableBreakfast === "enabled";
                        }
                        updates.push(update);
                    });
                }
                curr.setDate(curr.getDate() + 1);
            }
            await ratesAPI.update(Number(selectedProperty), updates);
            setShowBulkModal(false);
            // Reset form
            setBulkForm({
                ...bulkForm,
                price: "",
                availableCount: "",
                isClosed: "no-change",
                enableBreakfast: "no-change"
            });
            await loadRates();
            alert("Bulk update successful!");
        }
        catch (e) {
            console.error(e);
            alert("Bulk update failed");
        }
        finally {
            setLoading(false);
        }
    };
    // 5. Calculate Totals
    const getTotalBooked = (date) => {
        return ratesData
            .filter(r => r.date === date)
            .reduce((sum, r) => sum + r.bookedRooms, 0);
    };
    const getTotalRooms = (date) => {
        return ratesData
            .filter(r => r.date === date)
            .reduce((sum, r) => sum + r.totalRooms, 0);
    };
    const formatDateLabel = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' });
    };
    return (_jsxs("div", { className: "p-6 h-full flex flex-col", children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx("h1", { className: "text-2xl font-bold", children: "Pricing & Availability" }), saveStatus && _jsx("span", { className: `text-sm font-bold ${saveStatus.includes("Error") ? "text-red-500" : "text-green-600"}`, children: saveStatus })] }), _jsxs("div", { className: "flex gap-4 mb-6 items-end bg-white p-4 rounded shadow-sm", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Property" }), _jsx("select", { className: "border border-gray-300 rounded-md p-2 w-64", value: selectedProperty, onChange: (e) => setSelectedProperty(Number(e.target.value)), children: properties.map(p => _jsx("option", { value: p.id, children: p.name }, p.id)) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Start Date" }), _jsx("input", { type: "date", className: "border border-gray-300 rounded-md p-2", value: startDateStr, onChange: (e) => setStartDateStr(e.target.value) })] }), _jsx("div", { children: _jsx("button", { className: "bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 shadow-sm", onClick: loadRates, children: "Refresh" }) }), _jsx("div", { className: "ml-auto", children: _jsx("button", { className: "bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 shadow-sm", onClick: () => setShowBulkModal(true), children: "Bulk Update" }) })] }), showBulkModal && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white p-6 rounded-lg w-[500px] shadow-xl", children: [_jsx("h3", { className: "text-xl font-bold mb-4", children: "Bulk Update" }), _jsxs("div", { className: "grid grid-cols-2 gap-4 mb-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm mb-1", children: "Room Type" }), _jsxs("select", { className: "w-full border p-2 rounded", value: bulkForm.roomTypeId, onChange: (e) => setBulkForm({ ...bulkForm, roomTypeId: e.target.value }), children: [_jsx("option", { value: "all", children: "All Categories" }), roomTypeIds.map(id => (_jsx("option", { value: id, children: roomTypesMap.get(id) }, id)))] })] }), _jsx("div", {}), _jsxs("div", { children: [_jsx("label", { className: "block text-sm mb-1", children: "Start Date" }), _jsx("input", { type: "date", className: "w-full border p-2 rounded", value: bulkForm.startDate, onChange: (e) => setBulkForm({ ...bulkForm, startDate: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm mb-1", children: "End Date" }), _jsx("input", { type: "date", className: "w-full border p-2 rounded", value: bulkForm.endDate, onChange: (e) => setBulkForm({ ...bulkForm, endDate: e.target.value }) })] })] }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "block text-sm mb-1", children: "Days of Week" }), _jsx("div", { className: "flex gap-2", children: ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (_jsx("button", { className: `w-8 h-8 rounded-full text-xs font-bold ${bulkForm.daysOfWeek[i] ? 'bg-blue-600 text-white' : 'bg-gray-200'}`, onClick: () => setBulkForm(prev => ({ ...prev, daysOfWeek: { ...prev.daysOfWeek, [i]: !prev.daysOfWeek[i] } })), children: d }, i))) })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4 mb-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm mb-1", children: "Price" }), _jsx("input", { type: "number", className: "w-full border p-2 rounded", placeholder: "Leave empty to keep", value: bulkForm.price, onChange: (e) => setBulkForm({ ...bulkForm, price: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm mb-1", children: "Rooms to Sell" }), _jsx("input", { type: "number", className: "w-full border p-2 rounded", placeholder: "Leave empty to keep", value: bulkForm.availableCount, onChange: (e) => setBulkForm({ ...bulkForm, availableCount: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm mb-1", children: "Status" }), _jsxs("select", { className: "w-full border p-2 rounded", value: bulkForm.isClosed, onChange: (e) => setBulkForm({ ...bulkForm, isClosed: e.target.value }), children: [_jsx("option", { value: "no-change", children: "No Change" }), _jsx("option", { value: "open", children: "Open (Bookable)" }), _jsx("option", { value: "closed", children: "Closed (Stop Sell)" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm mb-1", children: "Breakfast" }), _jsxs("select", { className: "w-full border p-2 rounded", value: bulkForm.enableBreakfast, onChange: (e) => setBulkForm({ ...bulkForm, enableBreakfast: e.target.value }), children: [_jsx("option", { value: "no-change", children: "No Change" }), _jsx("option", { value: "enabled", children: "Enabled" }), _jsx("option", { value: "disabled", children: "Disabled" })] })] })] }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx("button", { className: "px-4 py-2 border rounded hover:bg-gray-50", onClick: () => setShowBulkModal(false), children: "Cancel" }), _jsx("button", { className: "px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700", onClick: handleBulkUpdate, children: "Apply Changes" })] })] }) })), loading && ratesData.length === 0 ? (_jsx("div", { className: "text-center py-10 text-gray-500", children: "Loading rates..." })) : (_jsx("div", { className: "overflow-x-auto bg-white rounded shadow-lg border border-gray-200", children: _jsxs("table", { className: "min-w-full border-collapse", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "sticky left-0 bg-gray-50 z-10 p-3 border-b border-r min-w-[200px] text-left text-sm font-bold text-gray-700", children: "Room Category" }), dates.map(date => (_jsx("th", { className: "p-3 border-b text-center min-w-[120px] bg-gray-50 border-r last:border-r-0", children: _jsx("div", { className: "font-semibold text-gray-900 text-sm whitespace-nowrap", children: formatDateLabel(date) }) }, date)))] }) }), _jsxs("tbody", { children: [roomTypeIds.map(typeId => (_jsxs("tr", { className: "hover:bg-gray-50 group-row", children: [_jsxs("td", { className: "sticky left-0 bg-white z-10 p-4 border-b border-r font-bold text-gray-800 shadow-sm", children: [roomTypesMap.get(typeId), _jsx("div", { className: "text-xs text-gray-500 mt-1 font-normal", children: "Base Price & Occupancy" })] }), dates.map(date => {
                                            const data = getRate(typeId, date);
                                            if (!data)
                                                return _jsx("td", { className: "p-4 border-b border-r text-center text-gray-400 bg-gray-50", children: "-" }, date);
                                            const percent = data.totalRooms > 0 ? (data.bookedRooms / data.totalRooms) * 100 : 0;
                                            const occupancyColor = percent >= 90 ? "text-red-600" : percent >= 50 ? "text-yellow-600" : "text-green-600";
                                            return (_jsx("td", { className: "p-2 border-b border-r text-center relative hover:bg-white transition-colors", children: _jsxs("div", { className: "flex flex-col items-center gap-2", children: [_jsxs("div", { className: "relative w-full max-w-[90px]", children: [_jsx("span", { className: "absolute left-2 top-1.5 text-gray-500 text-xs", children: "$" }), _jsx("input", { type: "number", className: `w-full text-center border rounded p-1 pl-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none ${data.isOverride ? "bg-amber-50 border-amber-300 text-amber-900" : "border-gray-200"}`, value: data.price, onBlur: (e) => handlePriceUpdate(typeId, date, e.target.value), onChange: (e) => {
                                                                        const val = parseFloat(e.target.value);
                                                                        setRatesData(prev => prev.map(r => r === data ? { ...r, price: isNaN(val) ? 0 : val } : r));
                                                                    } })] }), _jsxs("div", { className: "flex items-center gap-1 text-xs text-gray-500", children: [_jsx("input", { type: "number", className: `w-8 text-center border-b ${data.hasInventoryOverride ? 'font-bold text-blue-600 border-blue-400' : 'border-gray-300'}`, value: data.totalRooms, onBlur: (e) => handleInventoryUpdate(typeId, date, e.target.value), onChange: (e) => {
                                                                        const val = parseInt(e.target.value);
                                                                        if (!isNaN(val)) {
                                                                            setRatesData(prev => prev.map(r => r === data ? { ...r, totalRooms: val, hasInventoryOverride: true } : r));
                                                                        }
                                                                    } }), _jsx("span", { children: "left" })] }), _jsxs("div", { className: "flex gap-2 mt-1", children: [_jsx("button", { className: `text-xs px-1 rounded border ${data.isClosed ? 'bg-red-100 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`, onClick: () => handleToggleUpdate(typeId, date, 'isClosed', !data.isClosed), title: data.isClosed ? "Room Closed (Stop Sell)" : "Room Open", children: data.isClosed ? "Closed" : "Open" }), _jsx("button", { className: `text-xs px-1 rounded border ${data.enableBreakfast ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-100 text-gray-400 border-gray-200'}`, onClick: () => handleToggleUpdate(typeId, date, 'enableBreakfast', !data.enableBreakfast), title: "Toggle Breakfast", children: "\u2615" })] }), _jsxs("div", { className: `text-xs font-medium ${occupancyColor} bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100 mt-1`, children: [data.bookedRooms, " booked"] })] }) }, date));
                                        })] }, typeId))), _jsxs("tr", { className: "bg-gray-100 font-bold border-t-4 border-gray-300", children: [_jsx("td", { className: "sticky left-0 bg-gray-100 z-10 p-4 border-r border-b text-gray-900", children: "Total Occupancy" }), dates.map(date => {
                                            const booked = getTotalBooked(date);
                                            const total = getTotalRooms(date);
                                            const percent = total > 0 ? Math.round((booked / total) * 100) : 0;
                                            const occupancyColor = percent >= 90 ? "text-red-600" : percent >= 50 ? "text-yellow-600" : "text-green-600";
                                            return (_jsxs("td", { className: "p-4 text-center border-r border-b border-gray-200", children: [_jsxs("div", { className: "text-sm text-gray-900", children: [booked, " / ", total] }), _jsxs("div", { className: `text-xs ${occupancyColor}`, children: [percent, "%"] })] }, date));
                                        })] })] })] }) }))] }));
};
export default PricingPage;
