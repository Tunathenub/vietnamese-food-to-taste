import { Link } from 'react-router';
import { useTasteStore, PRESET_PROFILES } from '../stores/taste-store';
import { useTranslation, getLocalizedDish } from '../i18n';

export function HomePage() {
  const { activeProfile, setActiveProfile } = useTasteStore();
  const { t, language, formatPrice } = useTranslation();

  const featuredSlugs = [
    { slug: 'pho-bo', basePrice: 65000, image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600', category: t.dish.categories.NOODLE_SOUP },
    { slug: 'bun-cha', basePrice: 60000, image: 'https://images.unsplash.com/photo-1594041680534-e8c8cdebd659?w=600', category: t.dish.categories.NOODLE },
    { slug: 'banh-mi', basePrice: 35000, image: 'https://images.unsplash.com/photo-1626804475297-41608ea09aeb?w=600', category: t.dish.categories.SANDWICH },
  ];

  const localizedActiveName =
    t.taste.presetProfiles[activeProfile?.code as keyof typeof t.taste.presetProfiles]?.name ||
    activeProfile?.name;

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col">
      {/* Hero Section */}
      <section className="relative py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100 text-orange-800 text-xs sm:text-sm font-semibold mb-6 shadow-2xs">
          <span>✨</span> {t.nav.brandTagline}
        </div>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black mb-6 flex flex-col gap-2.5 tracking-tight leading-tight">
          <span>{t.taste.title}</span>
          <span className="text-orange-600">{t.dish.customizedForYou}</span>
        </h1>
        <p className="max-w-2xl text-sm sm:text-base text-gray-600 mb-8 leading-relaxed">
          {t.taste.subtitle}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link
            to="/taste-profiles"
            className="bg-orange-600 text-white px-7 py-3.5 rounded-2xl font-bold text-sm sm:text-base hover:bg-orange-700 transition shadow-lg shadow-orange-600/20"
          >
            🎯 {t.taste.applyProfile} ({localizedActiveName})
          </Link>
          <Link
            to="/menu"
            className="bg-white text-gray-900 border border-gray-200 px-7 py-3.5 rounded-2xl font-bold text-sm sm:text-base hover:bg-gray-50 transition shadow-2xs"
          >
            {t.cart.exploreMenu} →
          </Link>
        </div>
      </section>

      {/* Quick Taste Select */}
      <section className="max-w-4xl mx-auto px-4 w-full mb-16 sm:mb-20">
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-1.5">{t.taste.title}</h2>
          <p className="text-xs sm:text-sm text-gray-500">{t.taste.subtitle}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {PRESET_PROFILES.map((profile) => {
            const isSelected = activeProfile.code === profile.code;
            const locProfile = t.taste.presetProfiles[profile.code as keyof typeof t.taste.presetProfiles];
            const displayName = locProfile?.name || profile.name.split(' (')[0];

            return (
              <button
                key={profile.code}
                onClick={() => setActiveProfile(profile.code)}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2.5 ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50/60 shadow-sm'
                    : 'border-gray-100 bg-white hover:border-orange-200 hover:bg-orange-50/20 shadow-2xs'
                }`}
              >
                <span className="text-3xl sm:text-4xl leading-none">{profile.flag}</span>
                <div className="font-bold text-xs sm:text-sm text-gray-900 text-center leading-tight">
                  {displayName}
                </div>
                {isSelected && (
                  <div className="text-[10px] font-black text-white bg-orange-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {t.taste.activeBadge}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Featured Menu */}
      <section className="bg-white py-16 px-4 sm:px-6 lg:px-8 border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1">{t.nav.menu}</h2>
              <p className="text-xs sm:text-sm text-gray-500">{t.taste.aiCustomTag}</p>
            </div>
            <Link to="/menu" className="hidden sm:inline-flex items-center gap-1 text-sm font-bold text-orange-600 hover:text-orange-700">
              {t.common.all} {t.nav.menu.toLowerCase()} →
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {featuredSlugs.map((item) => {
              const loc = getLocalizedDish(item.slug, item.slug, '', language);
              return (
                <Link
                  key={item.slug}
                  to={`/menu/${item.slug}`}
                  className="group flex flex-col bg-slate-50 rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100"
                >
                  <div className="aspect-4/3 overflow-hidden relative">
                    <img
                      src={item.image}
                      alt={loc.name}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-extrabold text-gray-800 shadow-2xs">
                      {item.category}
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-grow">
                    <h3 className="text-lg font-bold text-gray-900 mb-1.5 group-hover:text-orange-600 transition-colors">
                      {loc.name}
                    </h3>
                    <p className="text-gray-500 text-xs mb-4 flex-grow line-clamp-2 leading-relaxed">
                      {loc.shortDescription}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-200">
                      <span className="font-black text-base text-orange-600">
                        {formatPrice(item.basePrice)}
                      </span>
                      <span className="text-xs font-bold text-gray-800 bg-white px-3 py-1.5 rounded-xl shadow-2xs border border-gray-200 group-hover:bg-orange-50 group-hover:border-orange-200 transition-colors">
                        {t.common.viewDetails.split('&')[0]}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
