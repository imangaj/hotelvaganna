import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { propertyAPI } from "../api/endpoints";
const PropertiesPage = () => {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentProperty, setCurrentProperty] = useState({});
    useEffect(() => {
        fetchProperties();
    }, []);
    const fetchProperties = async () => {
        try {
            const res = await propertyAPI.getAll();
            setProperties(res.data);
        }
        catch (error) {
            console.error("Error fetching properties", error);
        }
        finally {
            setLoading(false);
        }
    };
    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this property?"))
            return;
        try {
            await propertyAPI.delete(id);
            fetchProperties();
        }
        catch (err) {
            console.error("Failed to delete", err);
        }
    };
    const handleSave = async () => {
        try {
            if (currentProperty.id) {
                await propertyAPI.update(currentProperty.id, currentProperty);
            }
            else {
                await propertyAPI.create(currentProperty);
            }
            setShowModal(false);
            fetchProperties();
            setCurrentProperty({});
        }
        catch (err) {
            console.error("Failed to save", err);
        }
    };
    return (_jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-800", children: "Properties" }), _jsx("button", { className: "bg-primary-600 text-white px-4 py-2 rounded shadow hover:bg-primary-700", onClick: () => { setCurrentProperty({}); setShowModal(true); }, children: "+ Add Property" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: [properties.map(p => (_jsxs("div", { className: "bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow", children: [_jsx("h3", { className: "text-xl font-bold mb-2 text-primary-900", children: p.name }), _jsxs("p", { className: "text-gray-600 mb-4 text-sm", children: [p.address, ", ", p.city] }), _jsxs("div", { className: "flex gap-2 justify-end", children: [_jsx("button", { className: "text-blue-600 hover:underline text-sm", onClick: () => { setCurrentProperty(p); setShowModal(true); }, children: "Edit" }), _jsx("button", { className: "text-red-600 hover:underline text-sm", onClick: () => handleDelete(p.id), children: "Delete" })] })] }, p.id))), properties.length === 0 && !loading && (_jsx("div", { className: "col-span-full text-center py-10 text-gray-500", children: "No properties found. Add one to get started." }))] }), showModal && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-white rounded-lg p-6 w-full max-w-md", children: [_jsx("h2", { className: "text-xl font-bold mb-4", children: currentProperty.id ? "Edit Property" : "Add Property" }), _jsxs("div", { className: "space-y-4", children: [_jsx("input", { className: "border p-2 w-full rounded", placeholder: "Property Name", value: currentProperty.name || "", onChange: e => setCurrentProperty({ ...currentProperty, name: e.target.value }) }), _jsx("input", { className: "border p-2 w-full rounded", placeholder: "Address", value: currentProperty.address || "", onChange: e => setCurrentProperty({ ...currentProperty, address: e.target.value }) }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsx("input", { className: "border p-2 w-full rounded", placeholder: "City", value: currentProperty.city || "", onChange: e => setCurrentProperty({ ...currentProperty, city: e.target.value }) }), _jsx("input", { className: "border p-2 w-full rounded", placeholder: "Country", value: currentProperty.country || "", onChange: e => setCurrentProperty({ ...currentProperty, country: e.target.value }) })] }), _jsx("input", { className: "border p-2 w-full rounded", placeholder: "Phone", value: currentProperty.phone || "", onChange: e => setCurrentProperty({ ...currentProperty, phone: e.target.value }) }), _jsx("input", { className: "border p-2 w-full rounded", placeholder: "Email", value: currentProperty.email || "", onChange: e => setCurrentProperty({ ...currentProperty, email: e.target.value }) })] }), _jsxs("div", { className: "flex justify-end gap-2 mt-6", children: [_jsx("button", { className: "px-4 py-2 text-gray-600", onClick: () => setShowModal(false), children: "Cancel" }), _jsx("button", { className: "px-4 py-2 bg-primary-600 text-white rounded", onClick: handleSave, children: "Save" })] })] }) }))] }));
};
export default PropertiesPage;
