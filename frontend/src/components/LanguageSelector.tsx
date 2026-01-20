import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface LanguageSelectorProps {
    className?: string;
    variant?: 'light' | 'dark'; // 'light' for light backgrounds (dark text), 'dark' for dark backgrounds (light text)
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = "", variant = 'light' }) => {
  const { language, setLanguage } = useLanguage();

  const getButtonClass = (lang: string) => {
      const isActive = language === lang;
      
      // Force visible colors with inline-style-like utility classes
      if (isActive) {
          return "px-3 py-1 rounded text-sm font-bold bg-blue-600 text-white shadow-md border border-blue-700";
      }
      
      // Inactive buttons: Gray background, dark text
      return "px-3 py-1 rounded text-sm font-medium bg-gray-200 text-gray-900 border border-gray-300 hover:bg-gray-300";
  };

  return (
    <div className={`flex items-center gap-2 ${className}`} style={{ display: 'flex', gap: '10px' }}>
      <button 
        type="button"
        onClick={() => setLanguage('en')}
        className={getButtonClass('en')}
        title="English"
      >
        🇬🇧 EN
      </button>
      <button 
        type="button"
        onClick={() => setLanguage('it')}
        className={getButtonClass('it')}
        title="Italiano"
      >
        🇮🇹 IT
      </button>
      <button 
        type="button"
        onClick={() => setLanguage('zh')}
        className={getButtonClass('zh')}
        title="Chinese"
      >
        🇨🇳 中文
      </button>
    </div>
  );
};

export default LanguageSelector;
