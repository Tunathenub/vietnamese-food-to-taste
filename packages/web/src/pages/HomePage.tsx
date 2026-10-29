import { Link } from 'react-router';
import { useTasteStore, PRESET_PROFILES } from '../stores/taste-store';

export function HomePage() {
  const { activeProfile, setActiveProfile } = useTasteStore();

  const featuredDishes = [
    {
      slug: 'pho-bo',
      name: 'Phở Bò Hà Nội',
      desc: 'Nước dùng ninh xương 12h, quế hồi thơm lừng, thịt bò tươi tái mềm.',
      price: '65.000 ₫',
      image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600',
      category: 'Phở & Mì',
    },
    {
      slug: 'bun-cha',
      name: 'Bún Chả Hà Nội',
      desc: 'Chả nướng than hoa xém cạnh thơm nức, nước chấm chua ngọt đu đủ giòn.',
      price: '60.000 ₫',
      image: 'https://images.unsplash.com/photo-1594041680534-e8c8cdebd659?w=600',
      category: 'Bún nướng',
    },
    {
      slug: 'banh-mi',
      name: 'Bánh Mì Kẹp Đặc Biệt',
      desc: 'Vỏ bánh giòn rụm kẹp pate béo ngậy, thịt xá xíu, đồ chua và rau thơm.',
      price: '35.000 ₫',
      image: 'https://images.unsplash.com/photo-1626804475297-41608ea09aeb?w=600',
      category: 'Bánh mì',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-semibold mb-6">
          <span>✨</span> Ý tưởng độc đáo: Món Việt nêm theo gu quốc tế
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-6">
          Hương vị Việt Nam <br />
          <span className="text-orange-600">Chuẩn vị theo khẩu vị của bạn</span>
        </h1>
        <p className="max-w-2xl text-lg text-gray-600 mb-10">
          Bạn sợ cay? Không quen mùi nước mắm quá nồng? Hay muốn ăn dặm vị như ở Seoul? 
          Chúng tôi giữ nguyên linh hồn món ăn nhưng cho phép tùy chỉnh chính xác từng độ mặn, ngọt, cay, mắm!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link to="/menu" className="bg-orange-600 text-white px-8 py-3.5 rounded-xl font-bold text-lg hover:bg-orange-700 transition shadow-lg shadow-orange-600/20">
            Chọn gu vị của bạn (kể Khẩu vị {activeProfile.name.split(' (')[0]})
          </Link>
          <Link to="/menu" className="bg-white text-gray-900 border border-gray-200 px-8 py-3.5 rounded-xl font-bold text-lg hover:bg-gray-50 transition">
            Xem thực đơn đầy đủ →
          </Link>
        </div>
      </section>

      {/* Quick Taste Select */}
      <section className="max-w-4xl mx-auto px-4 w-full mb-20">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold">Chọn nhanh khẩu vị quốc gia</h2>
          <p className="text-gray-500">Món ăn trong thực đơn sẽ tự động điều chỉnh theo cấu hình bạn chọn</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PRESET_PROFILES.map(profile => (
            <button
              key={profile.code}
              onClick={() => setActiveProfile(profile.code)}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                activeProfile.code === profile.code 
                  ? 'border-orange-500 bg-orange-50/50 shadow-md' 
                  : 'border-gray-100 bg-white hover:border-orange-200 hover:bg-orange-50/20'
              }`}
            >
              <span className="text-4xl">{profile.flag}</span>
              <div className="font-semibold text-gray-900">{profile.name.split(' (')[0]}</div>
              {activeProfile.code === profile.code && (
                <div className="text-[10px] font-bold text-white bg-orange-500 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Đang chọn
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Featured Menu */}
      <section className="bg-white py-20 px-4 sm:px-6 lg:px-8 border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-bold mb-2">Món ngon nổi bật</h2>
              <p className="text-gray-500">Những hương vị truyền thống được yêu thích nhất</p>
            </div>
            <Link to="/menu" className="hidden sm:block text-orange-600 font-semibold hover:text-orange-700">
              Xem tất cả →
            </Link>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {featuredDishes.map(dish => (
              <Link key={dish.slug} to={`/menu/${dish.slug}`} className="group flex flex-col bg-slate-50 rounded-2xl overflow-hidden hover:shadow-xl transition-shadow border border-gray-100">
                <div className="aspect-[4/3] overflow-hidden relative">
                  <img src={dish.image} alt={dish.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2.5 py-1 rounded-lg text-xs font-bold text-gray-800">
                    {dish.category}
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-grow">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">{dish.name}</h3>
                  <p className="text-gray-600 text-sm mb-4 flex-grow line-clamp-2">{dish.desc}</p>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-200">
                    <span className="font-extrabold text-lg text-orange-600">{dish.price}</span>
                    <span className="text-sm font-semibold text-gray-900 bg-white px-3 py-1.5 rounded-lg shadow-xs border border-gray-200 group-hover:bg-orange-50 group-hover:border-orange-200 transition-colors">Tùy chỉnh</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
