import { useNavigate } from 'react-router';
import { useTasteStore, PRESET_PROFILES } from '../stores/taste-store';

export function TasteProfilesPage() {
  const navigate = useNavigate();
  const { activeProfile, setActiveProfile, personalPreferences, setPreference, resetPreferences } = useTasteStore();

  const attributeLabels: Record<string, { label: string; icon: string }> = {
    spice_level: { label: 'Độ cay (Spiciness)', icon: '🌶️' },
    sweetness: { label: 'Độ ngọt (Sweetness)', icon: '🍯' },
    sourness: { label: 'Độ chua (Sourness)', icon: '🍋' },
    fish_sauce_intensity: { label: 'Vị nước mắm (Fish Sauce)', icon: '🐟' },
    herb_intensity: { label: 'Rau thơm (Herbs)', icon: '🌿' },
    oil_richness: { label: 'Độ béo (Richness)', icon: '🥑' },
  };

  const handleApply = (profileCode: string) => {
    setActiveProfile(profileCode);
    navigate('/menu');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col">

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        <div className="max-w-3xl mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Khám phá Hồ sơ Khẩu vị Quốc gia
          </h1>
          <p className="mt-2 text-base text-gray-600 leading-relaxed">
            Mỗi quốc gia có thói quen ẩm thực khác nhau. Hãy chọn hồ sơ gần gũi với bạn nhất, toàn bộ thực đơn sẽ tự động gợi ý mức gia vị phù hợp với bạn mà vẫn giữ trọn nét tinh hoa ẩm thực Việt!
          </p>
        </div>

        {/* Profiles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {PRESET_PROFILES.map((p) => {
            const isSelected = activeProfile.code === p.code;
            return (
              <div
                key={p.code}
                className={`rounded-2xl bg-white p-6 border-2 transition-all flex flex-col ${
                  isSelected
                    ? 'border-orange-500 shadow-md ring-2 ring-orange-200'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{p.flag}</span>
                    <div>
                      <h2 className="font-bold text-xl text-gray-900">{p.name}</h2>
                      <span className="text-xs text-gray-500 font-medium">Mã: {p.code}</span>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="rounded-full bg-orange-100 text-orange-800 text-xs font-semibold px-3 py-1">
                      Đang chọn
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-6 leading-relaxed flex-1">{p.description}</p>

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
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition ${
                    isSelected
                      ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-sm'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {isSelected ? '✓ Tiếp tục với hồ sơ này' : `Chọn hồ sơ ${p.flag}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Fine-tune Personal Preferences */}
        <div className="rounded-2xl bg-white p-6 sm:p-8 border border-gray-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Tinh chỉnh nhanh sở thích cá nhân</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Ghi đè thủ công các chỉ số nếu bạn có yêu cầu đặc biệt (ví dụ: ăn cực kỳ cay hoặc hoàn toàn không mắm)
              </p>
            </div>
            {Object.keys(personalPreferences).length > 0 && (
              <button
                type="button"
                onClick={resetPreferences}
                className="mt-3 sm:mt-0 text-xs font-semibold text-red-600 hover:text-red-700"
              >
                Đặt lại về mặc định của hồ sơ
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
                    <span className="text-sm font-semibold text-gray-800">
                      {meta.icon} {meta.label}
                    </span>
                    <span className="text-sm font-extrabold text-orange-600 bg-orange-100/70 px-2 py-0.5 rounded">
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
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>0: Không</span>
                    <span>3: Vừa</span>
                    <span>5: Cực nhiều</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/menu')}
              className="rounded-xl bg-orange-600 px-8 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-orange-700 transition"
            >
              Áp dụng sở thích & Đến Thực Đơn →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
