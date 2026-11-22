import { useState, useRef, useEffect } from 'react';
import { useTranslation, AVAILABLE_LANGUAGES, SupportedLanguage } from '../i18n';

interface LanguageSelectorProps {
  compact?: boolean;
}

export function LanguageSelector({ compact = false }: LanguageSelectorProps) {
  const { language, setLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeOption = AVAILABLE_LANGUAGES.find((opt) => opt.code === language) || AVAILABLE_LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code: SupportedLanguage) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 focus:outline-hidden transition"
        title="Change Language / Đổi ngôn ngữ"
        aria-expanded={isOpen}
      >
        <span className="text-base leading-none">{activeOption.flag}</span>
        {!compact && (
          <span className="hidden sm:inline font-bold tracking-tight">
            {activeOption.code.toUpperCase()}
          </span>
        )}
        <svg
          className={`h-3.5 w-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-xl bg-white shadow-xl ring-1 ring-black/5 border border-gray-100 z-50 py-1.5 animate-in fade-in-50 zoom-in-95">
          <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 mb-1">
            Language / Ngôn ngữ
          </div>
          {AVAILABLE_LANGUAGES.map((option) => {
            const isSelected = option.code === language;
            return (
              <button
                key={option.code}
                onClick={() => handleSelect(option.code)}
                className={`flex w-full items-center justify-between px-3 py-2 text-xs font-medium transition ${
                  isSelected
                    ? 'bg-orange-50 text-orange-700 font-bold'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{option.flag}</span>
                  <div className="text-left">
                    <div className="leading-tight">{option.nativeName}</div>
                    <div className="text-[10px] text-gray-400 font-normal">
                      {option.name} ({option.currencySymbol})
                    </div>
                  </div>
                </div>
                {isSelected && (
                  <span className="text-orange-600 text-xs">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
