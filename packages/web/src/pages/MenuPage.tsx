import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useTasteStore } from '../stores/taste-store';
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
  },
];

export function MenuPage() {
  const { activeProfile } = useTasteStore();
  const [dishes, setDishes] = useState<DishItem[]>(FALLBACK_DISHES);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');

  useEffect(() => {
    async function loadDishes() {
      setLoading(true);
      const res = await api.get<{ items: DishItem[] }>('/dishes');
      if (res.data?.items && res.data.items.length > 0) {
        setDishes(res.data.items);
      }
      setLoading(false);
    }
    loadDishes();
  }, []);

  const categories = [
    { code: 'ALL', name: 'Tất cả món' },
    { code: 'NOODLE_SOUP', name: 'Phở & Mì nước' },
    { code: 'NOODLE', name: 'Bún nướng' },
    { code: 'SANDWICH', name: 'Bánh mì' },
  ];

  const filteredDishes = dishes.filter((d) => {
    if (activeCategory !== 'ALL' && d.category !== activeCategory) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Thực đơn</h1>
          <p className="text-gray-500">Khám phá các món ăn Việt Nam truyền thống và tùy chỉnh theo khẩu vị của bạn.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sticky top-24">
            <h3 className="font-bold text-gray-900 mb-4">Tìm kiếm</h3>
            <input
              type="text"
              placeholder="Tên món ăn..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-gray-200 rounded-lg px-4 py-2 mb-6 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
            />

            <h3 className="font-bold text-gray-900 mb-4">Danh mục</h3>
            <div className="flex flex-col gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.code}
                  onClick={() => setActiveCategory(cat.code)}
                  className={`text-left px-4 py-2 rounded-lg transition-colors ${
                    activeCategory === cat.code
                      ? 'bg-orange-50 text-orange-700 font-semibold'
                      : 'text-gray-600 hover:bg-slate-50 hover:text-gray-900'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dish Grid */}
        <div className="flex-grow">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-2xl h-80 border border-gray-100"></div>
              ))}
            </div>
          ) : (
            <>
              <div className="mb-6 flex justify-between items-center">
                <div className="text-gray-600 font-medium">Hiển thị {filteredDishes.length} món ăn</div>
                <div className="flex items-center gap-2 text-sm bg-orange-100 text-orange-800 px-3 py-1.5 rounded-lg font-semibold">
                  <span>⚡</span> Đang tối ưu cho: {activeProfile.name.split(' (')[0]}
                </div>
              </div>
              
              {filteredDishes.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
                  <span className="text-4xl mb-4 block">🔍</span>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy món ăn</h3>
                  <p className="text-gray-500">Thử thay đổi từ khóa tìm kiếm hoặc chọn danh mục khác nhé.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredDishes.map((dish) => (
                    <Link
                      key={dish.id}
                      to={`/menu/${dish.slug}`}
                      className="group flex flex-col bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-shadow border border-gray-100"
                    >
                      <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                        {dish.imageUrl ? (
                          <img
                            src={dish.imageUrl}
                            alt={dish.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">🍲</div>
                        )}
                        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-bold shadow-sm">
                          {dish.preparationTimeMinutes} phút
                        </div>
                      </div>
                      <div className="p-5 flex flex-col flex-grow">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                          {dish.name}
                        </h3>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-grow">
                          {dish.shortDescription}
                        </p>
                        <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-auto">
                          <span className="font-extrabold text-lg text-orange-600">
                            {Number(dish.basePrice).toLocaleString('vi-VN')} ₫
                          </span>
                          <span className="text-sm font-semibold text-gray-900 bg-slate-50 px-3 py-1.5 rounded-lg border border-gray-200 group-hover:bg-orange-50 group-hover:border-orange-200 transition-colors">
                            Tùy chỉnh
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
