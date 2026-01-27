import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';
const LanguageContext = createContext(undefined);
export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState('en');
    // Load saved language on init
    useEffect(() => {
        const saved = localStorage.getItem('language');
        if (saved && (saved === 'en' || saved === 'it' || saved === 'zh')) {
            setLanguage(saved);
        }
    }, []);
    const handleSetLanguage = (lang) => {
        setLanguage(lang);
        localStorage.setItem('language', lang);
    };
    const t = (key) => {
        return translations[language][key] || translations['en'][key] || key;
    };
    return (_jsx(LanguageContext.Provider, { value: { language, setLanguage: handleSetLanguage, t }, children: children }));
};
export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
