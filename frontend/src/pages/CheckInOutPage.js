import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const CheckInOutPage = () => {
    return (_jsxs("div", { className: "p-6", children: [_jsx("h1", { className: "text-2xl font-bold mb-4", children: "Check In & Check Out Operations" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { className: "bg-green-50 p-6 rounded border border-green-200", children: [_jsx("h2", { className: "text-xl font-bold text-green-900 mb-4", children: "Expected Arrivals (Today)" }), _jsx("p", { className: "text-gray-600", children: "No arrivals scheduled for today." })] }), _jsxs("div", { className: "bg-red-50 p-6 rounded border border-red-200", children: [_jsx("h2", { className: "text-xl font-bold text-red-900 mb-4", children: "Expected Departures (Today)" }), _jsx("p", { className: "text-gray-600", children: "No departures scheduled for today." })] })] })] }));
};
export default CheckInOutPage;
