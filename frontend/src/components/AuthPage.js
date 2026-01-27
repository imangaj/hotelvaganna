import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { authAPI } from "../api/endpoints";
import LanguageSelector from "./LanguageSelector";
import { useLanguage } from "../contexts/LanguageContext";
import "./AuthPage.css";
const AuthPage = ({ onAuthSuccess }) => {
    const { t } = useLanguage();
    const [isLogin] = useState(true);
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
            const response = await authAPI.login({
                email: formData.email,
                password: formData.password,
            });
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
    return (_jsx("div", { className: "auth-container", children: _jsxs("div", { className: "auth-card", children: [_jsx("div", { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }, children: _jsx(LanguageSelector, {}) }), _jsxs("h1", { className: "auth-title", children: ["\uD83C\uDFE8 ", t('auth_title')] }), _jsx("p", { className: "auth-subtitle", children: isLogin ? t('login_title') : "Create a new account" }), error && _jsx("div", { className: "error-message", children: error }), _jsxs("form", { onSubmit: handleSubmit, className: "auth-form", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "email", children: t('login_email') }), _jsx("input", { type: "email", id: "email", name: "email", value: formData.email, onChange: handleChange, required: true, placeholder: "you@example.com" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "password", children: t('login_password') }), _jsx("input", { type: "password", id: "password", name: "password", value: formData.password, onChange: handleChange, required: true, placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" })] }), _jsx("button", { type: "submit", disabled: loading, className: "submit-button", children: loading ? t('login_logging_in') : t('login_button') })] }), _jsx("div", { className: "toggle-auth", children: _jsx("p", { children: t('auth_signup_disabled') }) })] }) }));
};
export default AuthPage;
