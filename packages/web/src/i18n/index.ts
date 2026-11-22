import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SupportedLanguage, LanguageOption, TranslationDictionary } from './types';
import { vi } from './translations/vi';
import { en } from './translations/en';
import { ko } from './translations/ko';
import { ja } from './translations/ja';
import { zh } from './translations/zh';

export * from './types';
export * from './dish-translations';

export const AVAILABLE_LANGUAGES: LanguageOption[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English (US/UK)',
    flag: '🇬🇧',
    currencySymbol: '$',
    currencyCode: 'USD',
    exchangeRateFromVND: 1 / 25400,
  },
  {
    code: 'vi',
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    flag: '🇻🇳',
    currencySymbol: '₫',
    currencyCode: 'VND',
    exchangeRateFromVND: 1,
  },
  {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    flag: '🇰🇷',
    currencySymbol: '₩',
    currencyCode: 'KRW',
    exchangeRateFromVND: 1 / 18.5,
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    currencySymbol: '¥',
    currencyCode: 'JPY',
    exchangeRateFromVND: 1 / 165,
  },
  {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    flag: '🇨🇳',
    currencySymbol: '¥',
    currencyCode: 'CNY',
    exchangeRateFromVND: 1 / 3500,
  },
];

const TRANSLATION_MAP: Record<SupportedLanguage, TranslationDictionary> = {
  vi,
  en,
  ko,
  ja,
  zh,
};

function detectDefaultLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'vi';
  try {
    const navLang = (navigator.language || '').toLowerCase();
    if (navLang.startsWith('vi')) return 'vi';
    if (navLang.startsWith('ko')) return 'ko';
    if (navLang.startsWith('ja')) return 'ja';
    if (navLang.startsWith('zh')) return 'zh';
    return 'en';
  } catch {
    return 'vi';
  }
}

interface LanguageState {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      // Default to Vietnamese in test environment / fallback, or detected browser language
      language: 'vi',
      setLanguage: (lang) => {
        set({ language: lang });
        if (typeof document !== 'undefined') {
          document.documentElement.lang = lang;
        }
      },
    }),
    {
      name: 'vft-language-storage',
    }
  )
);

/**
 * Format price in VND with optional secondary estimate for foreign tourists
 * E.g.: "65.000₫" in VI, "65,000 VND (~$2.56 USD)" in EN, "65,000 VND (~3,510원)" in KO
 */
export function formatPrice(amountVND: number, language: SupportedLanguage, includeEstimate = true): string {
  const localeMap: Record<SupportedLanguage, string> = {
    vi: 'vi-VN',
    en: 'en-US',
    ko: 'ko-KR',
    ja: 'ja-JP',
    zh: 'zh-CN',
  };
  const vndFormatted = new Intl.NumberFormat(localeMap[language] || 'vi-VN').format(amountVND);

  if (language === 'vi') {
    return `${vndFormatted}₫`;
  }

  const option = AVAILABLE_LANGUAGES.find((opt) => opt.code === language);
  if (!option || !includeEstimate || option.code === 'vi') {
    return `${vndFormatted} VND`;
  }

  const converted = amountVND * option.exchangeRateFromVND;
  let convertedFormatted = '';

  if (option.code === 'en') {
    convertedFormatted = `~$${converted.toFixed(2)} USD`;
  } else if (option.code === 'ko') {
    convertedFormatted = `~${Math.round(converted).toLocaleString('ko-KR')}원`;
  } else if (option.code === 'ja') {
    convertedFormatted = `~${Math.round(converted).toLocaleString('ja-JP')}円`;
  } else if (option.code === 'zh') {
    convertedFormatted = `~¥${converted.toFixed(1)}`;
  }

  return `${vndFormatted} VND (${convertedFormatted})`;
}

/**
 * Main translation hook
 */
export function useTranslation() {
  const { language, setLanguage } = useLanguageStore();
  const t = TRANSLATION_MAP[language] || TRANSLATION_MAP.vi;

  const formatPriceCur = (amount: number, showEstimate = true) =>
    formatPrice(amount, language, showEstimate);

  return {
    t,
    language,
    setLanguage,
    formatPrice: formatPriceCur,
  };
}
