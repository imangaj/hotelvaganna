import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import apiClient from "../api/apiClient";
const GuestForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            await apiClient.post("/guest-auth/forgot-password", { email });
            setSent(true);
        }
        catch (err) {
            setError(err.response?.data?.message || "Failed to send reset email.");
        }
    };
    return (_jsxs("div", { className: "max-w-md mx-auto mt-20 p-6 bg-white rounded shadow", children: [_jsx("h2", { className: "text-2xl font-bold mb-4", children: "Forgot Password" }), sent ? (_jsx("p", { className: "text-green-700 bg-green-50 border border-green-200 rounded p-3", children: "If the email exists, a reset link has been sent." })) : (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsx("input", { type: "email", className: "border p-2 w-full rounded", placeholder: "Enter your email", value: email, onChange: e => setEmail(e.target.value), required: true }), error && _jsx("div", { className: "text-red-600 text-sm", children: error }), _jsx("button", { type: "submit", className: "w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold", children: "Send Reset Link" })] }))] }));
};
export default GuestForgotPassword;
