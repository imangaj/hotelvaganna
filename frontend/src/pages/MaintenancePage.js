import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { maintenanceAPI } from "../api/endpoints";
const MaintenancePage = () => {
    const [tickets, setTickets] = useState([]);
    useEffect(() => {
        loadTickets();
    }, []);
    const loadTickets = async () => {
        try {
            const res = await maintenanceAPI.getAll();
            setTickets(res.data || []);
        }
        catch (err) {
            console.error(err);
        }
    };
    return (_jsxs("div", { className: "p-6", children: [_jsx("h1", { className: "text-2xl font-bold mb-6", children: "Maintenance Tickets" }), _jsxs("div", { className: "bg-white rounded shadow text-center p-10 text-gray-500", children: ["Tracking ", tickets.length, " active maintenance tickets."] })] }));
};
export default MaintenancePage;
