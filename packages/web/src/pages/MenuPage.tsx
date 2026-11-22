import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTasteStore } from '../stores/taste-store';
import { useCartStore } from '../stores/cart-store';
import { useTranslation, getLocalizedDish } from '../i18n';
import { api } from '../lib/api-client';

interface DishItem {
  id: string;
  slug: string;
  name: string;
  shortDescription?: string;
  imageUrl?: string;
  category: string;
  basePrice: number;
  preparationTimeMinutes: number;
  isVegetarianFriendly?: boolean;
}

const FALLBACK_DISHES: DishItem[] = [
  {
    id: 'pho-bo-id',
    slug: 'pho-bo',
    name: 'Phở Bò Hà Nội',
    shortDescription: 'Bánh phở mềm cùng nước dùng hầm xương bò 12 tiếng thơm thảo mộc quế hồi.',
    imageUrl: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600',
    category: 'NOODLE_SOUP',
    basePrice: 65000,
    preparationTimeMinutes: 15,
    isVegetarianFriendly: true,
  },
  {
    id: 'bun-cha-id',
    slug: 'bun-cha',
    name: 'Bún Chả Hà Nội',
    shortDescription: 'Thịt heo nướng than hoa thơm lừng ăn kèm bún tươi và nước chấm chua ngọt.',
    imageUrl: 'https://images.unsplash.com/photo-1594041680534-e8c8cdebd659?w=600',
    category: 'NOODLE',
    basePrice: 60000,
    preparationTimeMinutes: 12,
    isVegetarianFriendly: true,
  },
  {
    id: 'banh-mi-id',
    slug: 'banh-mi',
    name: 'Bánh Mì Kẹp Đặc Biệt',
    shortDescription: 'Vỏ bánh giòn rụm kẹp pate béo ngậy, thịt xá xíu, đồ chua giòn và sốt ớt thơm.',
    imageUrl: 'https://images.unsplash.com/photo-1626804475297-41608ea09aeb?w=600',
    category: 'SANDWICH',
    basePrice: 35000,
    preparationTimeMinutes: 5,
    isVegetarianFriendly: true,
  },
];

export function MenuPage() {
  const navigate = useNavigate();
  const { activeProfile } = useTasteStore();
  const addItem = useCartStore((state) => state.addItem);
  const { t, language, formatPrice } = useTranslation();
  const [quickToast, setQuickToast] = useState<string | null>(null);

  const [dishes, setDishes] = useState<DishItem[]>(FALLBACK_DISHES);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [vegetarianOnly, setVegetarianOnly] = useState(false);
  const [priceRange, setPriceRange] = useState<'ALL' | 'UNDER_50K' | '50K_70K' | 'OVER_70K'>('ALL');

  const handleQuickAdd = (dish: DishItem) => {
    const loc = getLocalizedDish(dish.slug, dish.name, dish.shortDescription, language);
    addItem({
      dishId: dish.id,
      dishName: loc.name,
      dishSlug: dish.slug,
      quantity: 1,
      basePrice: dish.basePrice,
      currency: 'VND',
      tasteProfileCode: activeProfile?.code,
      tasteValues: activeProfile?.defaults || {},
      ingredientQuantities: {},
      substitutionIds: [],
      notes: '',
    });
    setQuickToast(loc.name);
    setTimeout(() => setQuickToast(null), 3500);
  };

  useEffect(() => {
    async function loadDishes() {
      setLoading(true);
      try {
        const res = await api.get<{ items: DishItem[] }>('/dishes');
        if (res.data?.items && res.data.items.length > 0) {
          setDishes(res.data.items);
        }
      } catch {
        // Resilient fallback: keep FALLBACK_DISHES
      } finally {
        setLoading(false);
      }
    }
    loadDishes();
  }, []);

  const categories = [
    { code: 'ALL', name: t.dish.categories.ALL },
    { code: 'NOODLE_SOUP', name: t.dish.categories.NOODLE_SOUP },
    { code: 'NOODLE', name: t.dish.categories.NOODLE },
    { code: 'SANDWICH', name: t.dish.categories.SANDWICH },
    { code: 'RICE', name: t.dish.categories.RICE },
    { code: 'APPETIZER', name: t.dish.categories.APPETIZER },
  ];

  const priceFilters = [
    { key: 'ALL', label: t.dish.filters.priceAll },
    { key: 'UNDER_50K', label: t.dish.filters.priceUnder50k },
    { key: '50K_70K', label: t.dish.filters.price50kTo70k },
    { key: 'OVER_70K', label: t.dish.filters.priceOver70k },
  ];

  const filteredDishes = dishes.filter((d) => {
    if (activeCategory !== 'ALL' && d.category !== activeCategory) return false;
    const loc = getLocalizedDish(d.slug, d.name, d.shortDescription, language);
    if (
      search &&
      !d.name.toLowerCase().includes(search.toLowerCase()) &&
      !loc.name.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    if (vegetarianOnly && !d.isVegetarianFriendly) return false;

    if (priceRange === 'UNDER_50K' && d.basePrice >= 50000) return false;
    if (priceRange === '50K_70K' && (d.basePrice < 50000 || d.basePrice > 70000)) return false;
    if (priceRange === 'OVER_70K' && d.basePrice <= 70000) return false;

    return true;
  });

  const localizedProfileName =
    t.taste.presetProfiles[activeProfile?.code as keyof typeof t.taste.presetProfiles]?.name ||
    activeProfile?.name;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Banner */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
                {t.nav.menu}
              </h1>
              <p className="text-sm text-gray-500">
                {t.taste.subtitle}
              </p>
            </div>

            {/* Active Taste Profile Tag */}
            {activeProfile && (
              <div className="inline-flex items-center gap-2 rounded-2xl bg-orange-50 border border-orange-200 px-4 py-2 text-xs text-orange-950 shadow-2xs">
                <span>🎯 {t.dish.matchedProfile}:</span>
                <span className="font-bold text-orange-600">
                  {activeProfile.flag} {localizedProfileName}
                </span>
                <Link to="/taste-profiles" className="text-[11px] underline text-gray-500 hover:text-orange-600 ml-1">
                  {t.nav.changeTaste}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-2xl shadow-2xs border border-gray-100 p-5 sticky top-24 space-y-6">
            {/* Search */}
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-2">
                {t.common.search}
              </h3>
              <input
                type="text"
                placeholder={t.common.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              />
            </div>

            {/* Category Filter */}
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-2">
                {t.common.filter}
              </h3>
              <div className="flex flex-col gap-1.5 text-xs">
                {categories.map((cat) => (
                  <button
                    key={cat.code}
                    onClick={() => setActiveCategory(cat.code)}
                    className={`text-left px-3.5 py-2 rounded-xl font-medium transition-colors ${
                      activeCategory === cat.code
                        ? 'bg-orange-50 text-orange-700 font-bold'
                        : 'text-gray-600 hover:bg-slate-50 hover:text-gray-900'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Vegetarian Filter */}
            <div className="pt-4 border-t border-gray-100">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-700 hover:text-gray-900">
                <input
                  type="checkbox"
                  checked={vegetarianOnly}
                  onChange={(e) => setVegetarianOnly(e.target.checked)}
                  className="rounded-sm text-orange-600 focus:ring-orange-500 h-4 w-4"
                />
                <span>🌱 {t.dish.filters.vegetarianOnly}</span>
              </label>
            </div>

            {/* Price Filter */}
            <div className="pt-4 border-t border-gray-100">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-2">
                {t.common.price}
              </h3>
              <div className="flex flex-col gap-1.5 text-xs">
                {priceFilters.map((pr) => (
                  <button
                    key={pr.key}
                    onClick={() => setPriceRange(pr.key as any)}
                    className={`text-left px-3.5 py-2 rounded-xl transition ${
                      priceRange === pr.key
                        ? 'bg-orange-50 text-orange-700 font-bold'
                        : 'text-gray-600 hover:bg-slate-50'
                    }`}
                  >
                    {pr.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset Filters */}
            {(activeCategory !== 'ALL' || search || vegetarianOnly || priceRange !== 'ALL') && (
              <button
                onClick={() => {
                  setActiveCategory('ALL');
                  setSearch('');
                  setVegetarianOnly(false);
                  setPriceRange('ALL');
                }}
                className="w-full text-center text-xs font-bold text-red-600 hover:text-red-700 py-1"
              >
                {t.taste.resetDefaults} ↺
              </button>
            )}
          </div>
        </div>

        {/* Dish Grid */}
        <div className="flex-grow">
          {loading && dishes.length === 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-3xl h-80 border border-gray-100" />
              ))}
            </div>
          ) : filteredDishes.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center text-gray-500 my-4 shadow-2xs">
              <span className="text-4xl mb-3 block">🍜</span>
              <p className="text-base font-bold text-gray-800">
                {t.cart.emptyTitle}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {t.common.searchPlaceholder}
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDishes.map((dish) => {
                const loc = getLocalizedDish(dish.slug, dish.name, dish.shortDescription, language);
                return (
                  <div
                    key={dish.id}
                    className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group"
                  >
                    <div>
                      <div className="relative h-48 overflow-hidden bg-gray-100">
                        <img
                          src={dish.imageUrl}
                          alt={loc.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                          <span className="bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            ⏱️ {dish.preparationTimeMinutes} {t.common.minutes}
                          </span>
                          {dish.isVegetarianFriendly && (
                            <span className="bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                              🌱 {t.dish.filters.vegetarianOnly.split('/')[0]}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="flex justify-between items-baseline mb-1">
                          <h2 className="text-lg font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                            {loc.name}
                          </h2>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                          {loc.shortDescription}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 pt-0 border-t border-gray-50 mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] text-gray-400 block font-medium">
                          {t.common.price}
                        </span>
                        <span className="text-sm font-black text-orange-600">
                          {formatPrice(dish.basePrice)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          to={`/menu/${dish.slug}`}
                          className="rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 px-3 py-1.5 text-xs font-bold transition"
                        >
                          {t.common.viewDetails.split('&')[0]}
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleQuickAdd(dish)}
                          className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 text-xs font-bold shadow-2xs transition"
                        >
                          + {t.dish.quickAdd.split(' ')[0]}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating Quick Add Notification Toast */}
      {quickToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 max-w-sm flex items-center justify-between gap-4 animate-fade-in">
          <div>
            <div className="text-xs font-bold text-orange-400 flex items-center gap-1.5">
              <span>✓</span> {t.common.addedToCart}
            </div>
            <div className="text-xs text-slate-200 mt-0.5 line-clamp-1">{quickToast}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/checkout')}
              className="rounded-xl bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 text-xs font-bold whitespace-nowrap shadow-2xs transition"
            >
              {t.common.checkout} →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
