import { useState } from 'react';
import { useAuthStore } from '../stores/auth-store';
import { useTasteStore } from '../stores/taste-store';
import { useTranslation, SupportedLanguage } from '../i18n';
import { api } from '../lib/api-client';

export function OnboardingModal() {
  const { user, updateOnboarding, token } = useAuthStore();
  const setCustomProfile = useTasteStore((state) => state.setCustomProfile);
  const { t, setLanguage } = useTranslation();
  const [nationality, setNationality] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If user is not logged in or already has a nationality, don't show the modal
  if (!user || user.nationality) return null;

  const guessLanguageAndDial = (nat: string): { lang?: SupportedLanguage; dialCode: string } => {
    const lower = nat.toLowerCase();
    if (lower.includes('hàn') || lower.includes('korea')) return { lang: 'ko', dialCode: '+82' };
    if (lower.includes('mỹ') || lower.includes('usa') || lower.includes('america') || lower.includes('united states')) return { lang: 'en', dialCode: '+1' };
    if (lower.includes('nhật') || lower.includes('japan')) return { lang: 'ja', dialCode: '+81' };
    if (lower.includes('trung') || lower.includes('china')) return { lang: 'zh', dialCode: '+86' };
    if (lower.includes('úc') || lower.includes('australia')) return { lang: 'en', dialCode: '+61' };
    if (lower.includes('anh') || lower.includes('uk') || lower.includes('england')) return { lang: 'en', dialCode: '+44' };
    if (lower.includes('pháp') || lower.includes('france')) return { lang: 'en', dialCode: '+33' };
    if (lower.includes('đức') || lower.includes('germany')) return { lang: 'en', dialCode: '+49' };
    if (lower.includes('singapore')) return { lang: 'en', dialCode: '+65' };
    return { dialCode: '+84' };
  };

  const handleQuickPick = (countryName: string) => {
    setNationality(countryName);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nationality.trim()) return;

    setLoading(true);
    setError('');

    try {
      interface OnboardResponse {
        tastePreferences: Record<string, number>;
        dietaryRestrictions: string[];
      }

      const res = await api.post<OnboardResponse>('/auth/onboard', { nationality }, {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      });

      if (res.error || !res.data) {
        throw new Error(res.error?.message || t.common.error);
      }

      const { tastePreferences, dietaryRestrictions } = res.data;

      updateOnboarding(nationality, tastePreferences, dietaryRestrictions);

      const { lang, dialCode } = guessLanguageAndDial(nationality);
      if (lang) {
        setLanguage(lang);
      }

      // Update the taste store to match the AI preferences
      setCustomProfile({
        code: 'CUSTOM_AI',
        name: `Khẩu vị ${nationality} (AI)`,
        countryCode: 'AI',
        dialCode,
        flag: '✨',
        description: 'Được hệ thống AI phân tích và tự động tối ưu dựa trên thói quen ẩm thực của quốc gia bạn.',
        defaults: tastePreferences,
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickPicks = [
    { label: '🇰🇷 한국 (Korea)', value: 'Korea' },
    { label: '🇺🇸 USA', value: 'United States' },
    { label: '🇯🇵 日本 (Japan)', value: 'Japan' },
    { label: '🇨🇳 中国 (China)', value: 'China' },
    { label: '🇦🇺 Australia', value: 'Australia' },
    { label: '🇻🇳 Việt Nam', value: 'Việt Nam' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in border border-gray-100">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl">✈️</span>
            <h2 className="text-xl font-extrabold text-gray-900">{t.onboarding.welcomeTitle}</h2>
          </div>
          <p className="text-gray-600 mb-5 text-xs sm:text-sm leading-relaxed">
            {t.onboarding.welcomeSubtitle}
          </p>

          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              {t.onboarding.quickPicks}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {quickPicks.map((pick) => (
                <button
                  key={pick.value}
                  type="button"
                  onClick={() => handleQuickPick(pick.value)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition font-medium ${
                    nationality === pick.value
                      ? 'bg-orange-600 text-white border-orange-600'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {pick.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                {t.onboarding.nationalityLabel}
              </label>
              <input
                type="text"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                placeholder={t.onboarding.nationalityPlaceholder}
                required
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition shadow-2xs"
              />
            </div>

            {error && (
              <div className="mb-4 text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !nationality.trim()}
              className="w-full bg-orange-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-orange-700 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm text-sm"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⌛</span> {t.onboarding.analyzing}
                </>
              ) : (
                t.onboarding.analyzeButton
              )}
            </button>
          </form>
        </div>
        <div className="bg-slate-50 px-6 py-3 border-t border-gray-100 text-[11px] text-gray-500 text-center">
          💡 You can fine-tune spice, sweetness, and fish sauce anytime on each dish.
        </div>
      </div>
    </div>
  );
}
