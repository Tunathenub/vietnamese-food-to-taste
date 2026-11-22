import { useNavigate } from 'react-router';
import { useTasteStore, PRESET_PROFILES } from '../stores/taste-store';
import { useTranslation, SupportedLanguage } from '../i18n';

export function TasteProfilesPage() {
  const navigate = useNavigate();
  const { activeProfile, setActiveProfile, personalPreferences, setPreference, resetPreferences } = useTasteStore();
  const { t, setLanguage } = useTranslation();

  const attributeLabels: Record<string, { label: string; icon: string }> = {
    spice_level: { label: t.taste.attributes.spice_level.name, icon: '🌶️' },
    sweetness: { label: t.taste.attributes.sweetness.name, icon: '🍯' },
    sourness: { label: t.taste.attributes.sourness.name, icon: '🍋' },
    fish_sauce_intensity: { label: t.taste.attributes.fish_sauce_intensity.name, icon: '🐟' },
    herb_intensity: { label: t.taste.attributes.herb_intensity.name, icon: '🌿' },
    oil_richness: { label: t.taste.attributes.oil_richness.name, icon: '🥑' },
  };

  const handleApply = (profileCode: string) => {
    setActiveProfile(profileCode);
    if (profileCode === 'KR_INSPIRED') setLanguage('ko');
    else if (profileCode === 'JP_DELICATE') setLanguage('ja');
    else if (profileCode === 'WESTERN_MILD') setLanguage('en');
    else if (profileCode === 'AUTHENTIC_VN') setLanguage('vi');

    navigate('/menu');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        <div className="max-w-3xl mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            {t.taste.title}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-gray-600 leading-relaxed">
            {t.taste.subtitle}
          </p>
        </div>

        {/* Profiles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {PRESET_PROFILES.map((p) => {
            const isSelected = activeProfile.code === p.code;
            const locProfile = t.taste.presetProfiles[p.code as keyof typeof t.taste.presetProfiles];
            const displayName = locProfile?.name || p.name;
            const displayDesc = locProfile?.description || p.description;

            return (
              <div
                key={p.code}
                className={`rounded-2xl bg-white p-6 border-2 transition-all flex flex-col ${
                  isSelected
                    ? 'border-orange-500 shadow-md ring-2 ring-orange-200'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{p.flag}</span>
                    <div>
                      <h2 className="font-bold text-lg sm:text-xl text-gray-900">{displayName}</h2>
                      <span className="text-xs text-gray-500 font-medium">({p.dialCode})</span>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="rounded-full bg-orange-100 text-orange-800 text-xs font-semibold px-3 py-1">
                      {t.taste.activeBadge}
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-gray-600 mb-6 leading-relaxed flex-1">
                  {displayDesc}
                </p>

                {/* Attribute Bars */}
                <div className="space-y-3 mb-6 bg-slate-50/80 rounded-xl p-4 border border-gray-100">
                  {Object.entries(p.defaults).map(([attrKey, val]) => {
                    const meta = attributeLabels[attrKey] ?? { label: attrKey, icon: '•' };
                    return (
                      <div key={attrKey} className="text-xs">
                        <div className="flex justify-between font-medium text-gray-700 mb-1">
                          <span>
                            {meta.icon} {meta.label}
                          </span>
                          <span className="font-bold text-orange-700">{val}/5</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(val / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => handleApply(p.code)}
                  className={`w-full py-3 rounded-xl font-semibold text-xs sm:text-sm transition ${
                    isSelected
                      ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-sm'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {isSelected ? `✓ ${t.taste.applyProfile}` : `${t.common.confirm}: ${displayName}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Fine-tune Personal Preferences */}
        <div className="rounded-2xl bg-white p-6 sm:p-8 border border-gray-200 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                {t.dish.customizationTitle}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                {t.dish.customizationSubtitle}
              </p>
            </div>
            {Object.keys(personalPreferences).length > 0 && (
              <button
                type="button"
                onClick={resetPreferences}
                className="mt-3 sm:mt-0 text-xs font-semibold text-red-600 hover:text-red-700"
              >
                {t.taste.resetDefaults} ↺
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(attributeLabels).map(([attrKey, meta]) => {
              const currentValue =
                personalPreferences[attrKey] !== undefined
                  ? personalPreferences[attrKey]
                  : activeProfile.defaults[attrKey] ?? 2;

              return (
                <div key={attrKey} className="rounded-xl bg-slate-50 p-4 border border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs sm:text-sm font-semibold text-gray-800">
                      {meta.icon} {meta.label}
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-orange-600 bg-orange-100/70 px-2 py-0.5 rounded-sm">
                      {currentValue} / 5
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="1"
                    value={currentValue}
                    onChange={(e) => setPreference(attrKey, parseInt(e.target.value, 10))}
                    className="w-full accent-orange-600 cursor-pointer"
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/menu')}
              className="rounded-xl bg-orange-600 px-8 py-3.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-orange-700 transition"
            >
              {t.common.confirm} & {t.nav.menu} →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
