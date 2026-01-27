import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import apiClient from "../api/apiClient";
const GuestResetPassword = () => {
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    // Get token from URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") || "";
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (!password || password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        if (password !== confirm) {
            setError("Passwords do not match.");
            return;
        }
        setLoading(true);
        try {
            await apiClient.post("/guest-auth/reset-password", { token, password });
            setSuccess(true);
        }
        catch (err) {
            setError(err.response?.data?.message || "Failed to reset password.");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "max-w-md mx-auto mt-20 p-6 bg-white rounded shadow", children: [_jsx("h2", { className: "text-2xl font-bold mb-4", children: "Reset Password" }), success ? (_jsx("p", { className: "text-green-600", children: "Password has been reset. You can now log in." })) : (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsx("input", { type: "password", className: "border p-2 w-full rounded", placeholder: "New password", value: password, onChange: e => setPassword(e.target.value), required: true }), _jsx("input", { type: "password", className: "border p-2 w-full rounded", placeholder: "Confirm new password", value: confirm, onChange: e => setConfirm(e.target.value), required: true }), error && _jsx("div", { className: "text-red-600 text-sm", children: error }), _jsx("button", { type: "submit", className: "w-full py-2 bg-primary-600 text-white rounded font-bold", disabled: loading, children: loading ? "Resetting..." : "Reset Password" })] }))] }));
};
export default GuestResetPassword;
