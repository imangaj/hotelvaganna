import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { authAPI } from "../api/endpoints";
import "./AuthPage.css";
const AuthPage = ({ onAuthSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        name: "",
    });
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            let response;
            if (isLogin) {
                response = await authAPI.login({
                    email: formData.email,
                    password: formData.password,
                });
            }
            else {
                response = await authAPI.register(formData);
            }
            localStorage.setItem("token", response.data.token);
            localStorage.setItem("user", JSON.stringify(response.data.user));
            onAuthSuccess();
        }
        catch (err) {
            setError(err.response?.data?.message || "An error occurred. Please try again.");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "auth-container", children: _jsxs("div", { className: "auth-card", children: [_jsx("h1", { className: "auth-title", children: "\uD83C\uDFE8 Property Management System" }), _jsx("p", { className: "auth-subtitle", children: isLogin ? "Sign in to your account" : "Create a new account" }), error && _jsx("div", { className: "error-message", children: error }), _jsxs("form", { onSubmit: handleSubmit, className: "auth-form", children: [!isLogin && (_jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "name", children: "Full Name" }), _jsx("input", { type: "text", id: "name", name: "name", value: formData.name, onChange: handleChange, required: !isLogin, placeholder: "John Doe" })] })), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "email", children: "Email" }), _jsx("input", { type: "email", id: "email", name: "email", value: formData.email, onChange: handleChange, required: true, placeholder: "you@example.com" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "password", children: "Password" }), _jsx("input", { type: "password", id: "password", name: "password", value: formData.password, onChange: handleChange, required: true, placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" })] }), _jsx("button", { type: "submit", disabled: loading, className: "submit-button", children: loading
                                ? "Processing..."
                                : isLogin
                                    ? "Sign In"
                                    : "Create Account" })] }), _jsx("div", { className: "toggle-auth", children: _jsxs("p", { children: [isLogin ? "Don't have an account? " : "Already have an account? ", _jsx("button", { type: "button", onClick: () => {
                                    setIsLogin(!isLogin);
                                    setError("");
                                    setFormData({ email: "", password: "", name: "" });
                                }, className: "toggle-button", children: isLogin ? "Sign Up" : "Sign In" })] }) })] }) }));
};
export default AuthPage;
