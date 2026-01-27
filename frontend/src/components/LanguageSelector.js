import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLanguage } from '../contexts/LanguageContext';
const LanguageSelector = ({ className = "", variant = 'light' }) => {
    const { language, setLanguage } = useLanguage();
    const getButtonClass = (lang) => {
        const isActive = language === lang;
        // Force visible colors with inline-style-like utility classes
        if (isActive) {
            return "px-3 py-1 rounded text-sm font-bold bg-blue-600 text-white shadow-md border border-blue-700";
        }
        // Inactive buttons: Gray background, dark text
        return "px-3 py-1 rounded text-sm font-medium bg-gray-200 text-gray-900 border border-gray-300 hover:bg-gray-300";
    };
    return (_jsxs("div", { className: `flex items-center gap-2 ${className}`, style: { display: 'flex', gap: '10px' }, children: [_jsx("button", { type: "button", onClick: () => setLanguage('en'), className: getButtonClass('en'), title: "English", children: "\uD83C\uDDEC\uD83C\uDDE7 EN" }), _jsx("button", { type: "button", onClick: () => setLanguage('it'), className: getButtonClass('it'), title: "Italiano", children: "\uD83C\uDDEE\uD83C\uDDF9 IT" }), _jsx("button", { type: "button", onClick: () => setLanguage('zh'), className: getButtonClass('zh'), title: "Chinese", children: "\uD83C\uDDE8\uD83C\uDDF3 \u4E2D\u6587" })] }));
};
export default LanguageSelector;
