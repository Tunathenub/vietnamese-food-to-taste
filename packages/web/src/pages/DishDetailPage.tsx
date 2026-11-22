import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useTasteStore } from '../stores/taste-store';
import { useCartStore } from '../stores/cart-store';
import { useTranslation, getLocalizedDish } from '../i18n';
import { api } from '../lib/api-client';
import { CulturalStorySection } from '../components/CulturalStorySection';

interface DishDetailData {
  id: string;
  slug: string;
  name: string;
  shortDescription?: string;
  description?: string;
  imageUrl?: string;
  category: string;
  basePrice: number;
  preparationTimeMinutes: number;
  tasteConfigurations: Array<{
    code: string;
    name: string;
    baseValue: number;
    minValue: number;
    maxValue: number;
    options: Array<{
      value: number;
      customerLabel: string;
      customerDescription?: string;
      priceDelta: number;
    }>;
  }>;
  ingredients: Array<{
    ingredientId: string;
    name: string;
    role: string;
    defaultQuantity: number;
    minQuantity: number;
    maxQuantity: number;
    unit: string;
    priceDeltaPerStep: number;
    isQuantityAdjustable: boolean;
  }>;
  substitutions: Array<{
    id: string;
    originalIngredientName: string;
    substituteIngredientName: string;
    reason?: string;
    priceDelta: number;
  }>;
}

const FALLBACK_DETAILS: Record<string, DishDetailData> = {
  'bun-cha': {
    id: 'bun-cha-uuid',
    slug: 'bun-cha',
    name: 'Bún Chả Hà Nội',
    shortDescription: 'Thịt heo nướng than hoa thơm lừng ăn kèm bún tươi và nước chấm chua ngọt.',
    description: 'Chả viên và chả miếng nướng than hoa vàng ruộm thơm nức mũi, thả vào bát nước chấm chua ngọt có nộm đu đủ xanh cà rốt giòn rụm.',
    imageUrl: 'https://images.unsplash.com/photo-1594041680534-e8c8cdebd659?w=800',
    category: 'NOODLE',
    basePrice: 60000,
    preparationTimeMinutes: 12,
    tasteConfigurations: [
      {
        code: 'sweetness',
        name: 'Độ ngọt nước chấm (Sweetness)',
        baseValue: 3,
        minValue: 1,
        maxValue: 5,
        options: [
          { value: 1, customerLabel: 'Ngọt thanh nhẹ', customerDescription: 'Giảm 50% đường trong nước chấm', priceDelta: 0 },
          { value: 3, customerLabel: 'Chuẩn vị Hà Nội', customerDescription: 'Chua ngọt hài hòa truyền thống', priceDelta: 0 },
          { value: 5, customerLabel: 'Ngọt đậm', customerDescription: 'Thiên ngọt kiểu miền Nam', priceDelta: 0 },
        ],
      },
      {
        code: 'sourness',
        name: 'Độ chua (Sourness)',
        baseValue: 3,
        minValue: 1,
        maxValue: 5,
        options: [
          { value: 1, customerLabel: 'Chua dịu', customerDescription: 'Ít giấm tỏi', priceDelta: 0 },
          { value: 3, customerLabel: 'Chua thanh vừa miệng', customerDescription: 'Cân bằng giấm tỏi và đu đủ ngâm', priceDelta: 0 },
        ],
      },
    ],
    ingredients: [
      {
        ingredientId: 'ing-pork',
        name: 'Thịt chả nướng',
        role: 'REQUIRED',
        defaultQuantity: 1,
        minQuantity: 1,
        maxQuantity: 3,
        unit: 'suất',
        priceDeltaPerStep: 25000,
        isQuantityAdjustable: true,
      },
    ],
    substitutions: [
      {
        id: 'sub-cha-tofu',
        originalIngredientName: 'Thịt chả nướng',
        substituteIngredientName: 'Chả đậu hũ nướng nấm',
        reason: 'Ăn chay lành mạnh',
        priceDelta: -15000,
      },
    ],
  },
  'pho-bo': {
    id: 'pho-bo-uuid',
    slug: 'pho-bo',
    name: 'Phở Bò Hà Nội',
    shortDescription: 'Bánh phở mềm cùng nước dùng hầm xương bò 12 tiếng thơm thảo mộc quế hồi.',
    description: 'Món ăn quốc hồn quốc túy của Việt Nam. Nước dùng được ninh kỹ từ xương ống bò tươi cùng gừng nướng, thảo quả, hoa hồi và quế chi. Thịt bò tái mềm ngọt tự nhiên, bánh phở tươi tráng mềm mướt.',
    imageUrl: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800',
    category: 'NOODLE_SOUP',
    basePrice: 65000,
    preparationTimeMinutes: 15,
    tasteConfigurations: [
      {
        code: 'spice_level',
        name: 'Độ cay (Spiciness)',
        baseValue: 0,
        minValue: 0,
        maxValue: 5,
        options: [
          { value: 0, customerLabel: 'Không cay', customerDescription: 'Không dùng ớt hay sa tế', priceDelta: 0 },
          { value: 1, customerLabel: 'Hơi cay', customerDescription: 'Vài lát ớt tươi nhẹ nhàng', priceDelta: 0 },
        ],
      },
    ],
    ingredients: [
      {
        ingredientId: 'ing-beef',
        name: 'Thịt bò tươi',
        role: 'REQUIRED',
        defaultQuantity: 1,
        minQuantity: 1,
        maxQuantity: 3,
        unit: 'phần',
        priceDeltaPerStep: 20000,
        isQuantityAdjustable: true,
      },
    ],
    substitutions: [],
  },
};

export function DishDetailPage() {
  const { dishSlug } = useParams<{ dishSlug: string }>();
  const navigate = useNavigate();
  const { activeProfile, personalPreferences } = useTasteStore();
  const addItem = useCartStore((state) => state.addItem);
  const { t, language, formatPrice } = useTranslation();

  const [dish, setDish] = useState<DishDetailData | null>(() => {
    return dishSlug ? (FALLBACK_DETAILS[dishSlug] ?? null) : null;
  });
  const [tasteValues, setTasteValues] = useState<Record<string, number>>(() => {
    const fallback = dishSlug ? FALLBACK_DETAILS[dishSlug] : null;
    if (!fallback?.tasteConfigurations) return {};
    const init: Record<string, number> = {};
    for (const config of fallback.tasteConfigurations) {
      let val = config.baseValue;
      if (personalPreferences[config.code] !== undefined) {
        val = personalPreferences[config.code];
      } else if (activeProfile?.defaults?.[config.code] !== undefined) {
        val = activeProfile.defaults[config.code];
      }
      init[config.code] = Math.max(config.minValue ?? 0, Math.min(config.maxValue ?? 5, val));
    }
    return init;
  });
  const [ingredientQuantities, setIngredientQuantities] = useState<Record<string, number>>(() => {
    const fallback = dishSlug ? FALLBACK_DETAILS[dishSlug] : null;
    if (!fallback?.ingredients) return {};
    const init: Record<string, number> = {};
    for (const ing of fallback.ingredients) {
      init[ing.ingredientId] = ing.defaultQuantity;
    }
    return init;
  });
  const [selectedSubstitutions, setSelectedSubstitutions] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [addedToast, setAddedToast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDish() {
      if (!dishSlug) return;
      try {
        const res = await api.get<DishDetailData>(`/dishes/${dishSlug}`);
        if (res.data) {
          initDishData(res.data);
          return;
        }
      } catch (err) {
        console.warn('Using fallback dish data:', err);
      }

      const fallback = FALLBACK_DETAILS[dishSlug] ?? FALLBACK_DETAILS['pho-bo'];
      if (fallback) {
        initDishData(fallback);
      } else {
        setError(t.common.error);
      }
    }

    loadDish();
  }, [dishSlug, activeProfile, personalPreferences]);

  function initDishData(data: DishDetailData) {
    setDish(data);

    const initialTastes: Record<string, number> = {};
    if (data.tasteConfigurations) {
      for (const config of data.tasteConfigurations) {
        let val = config.baseValue;
        if (personalPreferences[config.code] !== undefined) {
          val = personalPreferences[config.code];
        } else if (activeProfile?.defaults?.[config.code] !== undefined) {
          val = activeProfile.defaults[config.code];
        }
        initialTastes[config.code] = Math.max(config.minValue ?? 0, Math.min(config.maxValue ?? 5, val));
      }
    }
    setTasteValues(initialTastes);

    const initialIngs: Record<string, number> = {};
    if (data.ingredients) {
      for (const ing of data.ingredients) {
        initialIngs[ing.ingredientId] = ing.defaultQuantity;
      }
    }
    setIngredientQuantities(initialIngs);
  }

  const handleTasteChange = (code: string, val: number) => {
    setTasteValues((prev) => ({ ...prev, [code]: val }));
  };

  const handleIngredientChange = (id: string, delta: number, min: number, max: number) => {
    setIngredientQuantities((prev) => {
      const current = prev[id] ?? 1;
      const next = Math.max(min, Math.min(max, current + delta));
      return { ...prev, [id]: next };
    });
  };

  const handleToggleSub = (subId: string) => {
    setSelectedSubstitutions((prev) =>
      prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId]
    );
  };

  const handleAddToCart = () => {
    if (!dish) return;
    const loc = getLocalizedDish(dish.slug, dish.name, dish.shortDescription, language);

    addItem({
      dishId: dish.id,
      dishName: loc.name,
      dishSlug: dish.slug,
      quantity,
      basePrice: dish.basePrice,
      currency: 'VND',
      tasteProfileCode: activeProfile?.code,
      tasteValues,
      ingredientQuantities,
      substitutionIds: selectedSubstitutions,
      notes,
    });

    setAddedToast(true);
    setTimeout(() => {
      setAddedToast(false);
      navigate('/cart');
    }, 1200);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <p className="text-red-600 font-bold">{error}</p>
        <Link to="/menu" className="mt-4 text-orange-600 underline">
          {t.common.backToMenu}
        </Link>
      </div>
    );
  }

  if (!dish) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  const locDish = getLocalizedDish(dish.slug, dish.name, dish.shortDescription, language);

  let customizationDelta = 0;
  if (dish.tasteConfigurations) {
    for (const tc of dish.tasteConfigurations) {
      const val = tasteValues[tc.code];
      const opt = tc.options?.find((o) => o.value === val);
      if (opt) customizationDelta += opt.priceDelta;
    }
  }

  if (dish.ingredients) {
    for (const ing of dish.ingredients) {
      const qty = ingredientQuantities[ing.ingredientId] ?? ing.defaultQuantity;
      customizationDelta += (qty - ing.defaultQuantity) * ing.priceDeltaPerStep;
    }
  }

  if (dish.substitutions) {
    for (const subId of selectedSubstitutions) {
      const sub = dish.substitutions.find((s) => s.id === subId);
      if (sub) customizationDelta += sub.priceDelta;
    }
  }

  const totalItemPrice = (dish.basePrice + customizationDelta) * quantity;

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <div className="mb-6 flex items-center gap-2 text-xs text-gray-500">
          <Link to="/" className="hover:text-gray-900">{t.nav.home}</Link>
          <span>/</span>
          <Link to="/menu" className="hover:text-gray-900">{t.nav.menu}</Link>
          <span>/</span>
          <span className="font-semibold text-gray-900">{locDish.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Image and Description */}
          <div className="lg:col-span-5">
            <div className="sticky top-20 rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-xs">
              <div className="relative h-72 sm:h-80 overflow-hidden bg-gray-100">
                <img src={dish.imageUrl} alt={locDish.name} className="h-full w-full object-cover" />
                <span className="absolute top-4 left-4 rounded-full bg-black/60 backdrop-blur-xs px-3 py-1 text-xs font-semibold text-white">
                  ⏱ {dish.preparationTimeMinutes} {t.common.minutes} {t.dish.prepTime.toLowerCase()}
                </span>
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
                    {locDish.name}
                  </h1>
                </div>
                <p className="text-gray-600 leading-relaxed text-xs sm:text-sm mb-6">
                  {locDish.shortDescription || dish.description}
                </p>
                <div className="flex items-end justify-between border-t border-gray-100 pt-5">
                  <div>
                    <div className="text-[11px] text-gray-400 font-medium mb-0.5">{t.common.price}</div>
                    <div className="text-xl sm:text-2xl font-black text-orange-600">
                      {formatPrice(dish.basePrice)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Customizer */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Taste Configurations */}
            {dish.tasteConfigurations && dish.tasteConfigurations.length > 0 && (
              <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-xs">
                <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-100">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      1. {t.dish.customizationTitle}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {t.dish.customizationSubtitle}
                    </p>
                  </div>
                  <span className="text-xl">🌶️</span>
                </div>

                <div className="space-y-6">
                  {dish.tasteConfigurations.map((tc) => {
                    const currentValue = tasteValues[tc.code] ?? tc.baseValue;
                    const options = tc.options || [];
                    const currentOpt = options.find((o) => o.value === currentValue) ?? options[0];

                    // In Vietnamese, preserve the dish-specific taste config name (e.g. Độ ngọt nước chấm)
                    const attrKey = tc.code as keyof typeof t.taste.attributes;
                    const localizedAttr = t.taste.attributes[attrKey];
                    const labelText = language === 'vi' ? tc.name : (localizedAttr ? localizedAttr.name : tc.name);

                    return (
                      <div key={tc.code} className="rounded-xl bg-slate-50 p-4 border border-gray-100">
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-bold text-gray-800">{labelText}</label>
                          <span className="rounded-md bg-orange-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-2xs">
                            {localizedAttr?.levels[currentValue] ?? currentOpt?.customerLabel ?? `Level ${currentValue}`}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={tc.minValue}
                          max={tc.maxValue}
                          step="1"
                          value={currentValue}
                          onChange={(e) => handleTasteChange(tc.code, parseInt(e.target.value, 10))}
                          className="w-full accent-orange-600 cursor-pointer h-2"
                        />
                        <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                          <span>{localizedAttr?.levels[tc.minValue] ?? options[0]?.customerLabel ?? `Min ${tc.minValue}`}</span>
                          <span className="italic text-gray-400">{localizedAttr?.desc || currentOpt?.customerDescription}</span>
                          <span>{localizedAttr?.levels[tc.maxValue] ?? options[options.length - 1]?.customerLabel ?? `Max ${tc.maxValue}`}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Ingredients Customization */}
            {dish.ingredients && dish.ingredients.length > 0 && (
              <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-xs">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      2. {t.dish.ingredientsTitle}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {t.common.quantity} & {t.dish.ingredientsTitle.toLowerCase()}
                    </p>
                  </div>
                  <span className="text-xl">🥩</span>
                </div>

                <div className="space-y-4">
                  {dish.ingredients.map((ing) => {
                    const currentQty = ingredientQuantities[ing.ingredientId] ?? ing.defaultQuantity;
                    return (
                      <div key={ing.ingredientId} className="flex items-center justify-between rounded-xl bg-slate-50 p-3.5 border border-gray-100">
                        <div>
                          <div className="font-semibold text-sm text-gray-900">{ing.name}</div>
                          <div className="text-[11px] text-gray-500">
                            {t.taste.resetDefaults.split(' ')[0]}: {ing.defaultQuantity} {ing.unit}
                            {ing.priceDeltaPerStep > 0 && (
                              <span className="text-orange-600 ml-1">
                                (+{formatPrice(ing.priceDeltaPerStep, false)} / {ing.unit})
                              </span>
                            )}
                          </div>
                        </div>

                        {ing.isQuantityAdjustable ? (
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleIngredientChange(ing.ingredientId, -1, ing.minQuantity, ing.maxQuantity)}
                              disabled={currentQty <= ing.minQuantity}
                              className="h-8 w-8 rounded-lg bg-white border border-gray-200 font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                            >
                              -
                            </button>
                            <span className="font-bold text-sm w-8 text-center text-gray-900">
                              {currentQty} {ing.unit}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleIngredientChange(ing.ingredientId, 1, ing.minQuantity, ing.maxQuantity)}
                              disabled={currentQty >= ing.maxQuantity}
                              className="h-8 w-8 rounded-lg bg-orange-600 font-bold text-white hover:bg-orange-700 disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-gray-400">
                            {t.common.optional}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Substitutions */}
            {dish.substitutions && dish.substitutions.length > 0 && (
              <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-xs">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      3. {t.dish.substitutionsTitle}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {t.dish.substitutionsDesc}
                    </p>
                  </div>
                  <span className="text-xl">🥗</span>
                </div>

                <div className="space-y-3">
                  {dish.substitutions.map((sub) => {
                    const isChecked = selectedSubstitutions.includes(sub.id);
                    return (
                      <label key={sub.id} className={`flex items-start gap-3 rounded-xl p-4 border cursor-pointer transition ${isChecked ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-slate-50'}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSub(sub.id)}
                          className="mt-0.5 accent-orange-600 h-4 w-4"
                        />
                        <div className="flex-1 text-xs">
                          <div className="font-bold text-gray-900 text-sm">
                            {sub.originalIngredientName} → <span className="text-orange-600 font-extrabold">{sub.substituteIngredientName}</span>
                          </div>
                          <div className="text-gray-500 mt-0.5">{sub.reason}</div>
                        </div>
                        {sub.priceDelta !== 0 && (
                          <span className="font-bold text-xs text-gray-600">
                            {sub.priceDelta > 0 ? `+${formatPrice(sub.priceDelta, false)}` : formatPrice(sub.priceDelta, false)}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. Notes & Order Actions */}
            <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-xs space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  {t.dish.specialNotes}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.dish.specialNotesPlaceholder}
                  rows={2}
                  className="w-full rounded-xl border border-gray-300 p-3 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>

              {/* Allergen Warning Box */}
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                <span className="text-base">⚠️</span>
                <div>
                  <span className="font-bold block">{t.dish.allergensWarningTitle}</span>
                  <span className="text-[11px] text-amber-800">{t.dish.allergensNotice}</span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-700">{t.common.quantity}:</span>
                  <div className="flex items-center rounded-xl border border-gray-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="h-8 w-8 rounded-lg bg-white font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-bold text-sm text-gray-900">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="h-8 w-8 rounded-lg bg-white font-bold text-gray-700 hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                  <div className="text-right">
                    <div className="text-[10px] text-gray-400 font-bold uppercase">{t.common.total}</div>
                    <div className="text-xl font-black text-orange-600">
                      {formatPrice(totalItemPrice)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={addedToast}
                    className="flex-1 sm:flex-none rounded-xl bg-orange-600 px-6 py-3 font-bold text-white shadow-md hover:bg-orange-700 transition disabled:opacity-50 text-sm"
                  >
                    {addedToast ? `✓ ${t.common.addedToCart}` : `🛒 ${t.common.addToCart}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Cultural Dish Storyteller & Dining Etiquette */}
        <div className="mt-12">
          <CulturalStorySection dishSlug={dishSlug} />
        </div>
      </main>
    </div>
  );
}
