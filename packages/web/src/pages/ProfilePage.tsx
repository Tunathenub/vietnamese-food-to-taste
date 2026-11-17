import { Link } from 'react-router';
import { useAuthStore } from '../stores/auth-store';
import { useTasteStore } from '../stores/taste-store';

export function ProfilePage() {
  const { user, logout } = useAuthStore();
  const { activeProfile } = useTasteStore();

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-lg">
          <span className="text-4xl">🔐</span>
          <h2 className="text-xl font-bold text-gray-900 mt-3">Yêu cầu đăng nhập</h2>
          <p className="text-xs text-gray-500 mt-1 mb-6">
            Vui lòng đăng nhập để xem thông tin hồ sơ và khẩu vị cá nhân của bạn.
          </p>
          <Link
            to="/auth"
            className="inline-block rounded-xl bg-orange-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-orange-700 transition"
          >
            Đến trang Đăng nhập / Đăng ký →
          </Link>
        </div>
      </div>
    );
  }

  // Parse taste preferences
  // Parse taste preferences safely
  let tastePrefs: Record<string, number> = {
    spice_level: 2,
    sweetness: 3,
    sourness: 2,
    fish_sauce_intensity: 2,
    herb_intensity: 3,
    oil_richness: 2,
  };

  try {
    if (user.tastePreferences) {
      const parsed = typeof user.tastePreferences === 'string'
        ? JSON.parse(user.tastePreferences)
        : user.tastePreferences;
      if (parsed && typeof parsed === 'object') {
        tastePrefs = { ...tastePrefs, ...parsed };
      }
    }
  } catch {
    // Keep fallback
  }

  // Parse dietary restrictions safely
  let dietaryTags: string[] = [];
  try {
    if (user.dietaryRestrictions) {
      const parsed = typeof user.dietaryRestrictions === 'string'
        ? JSON.parse(user.dietaryRestrictions)
        : user.dietaryRestrictions;
      if (Array.isArray(parsed)) {
        dietaryTags = parsed;
      }
    }
  } catch {
    // Keep fallback
  }

  const tasteLabels: Record<string, { label: string; icon: string }> = {
    spice_level: { label: 'Độ cay', icon: '🌶️' },
    sweetness: { label: 'Độ ngọt', icon: '🍯' },
    sourness: { label: 'Độ chua', icon: '🍋' },
    fish_sauce_intensity: { label: 'Độ đậm nước mắm', icon: '🐟' },
    herb_intensity: { label: 'Rau thơm & rau mùi', icon: '🌿' },
    oil_richness: { label: 'Độ béo / dầu mỡ', icon: '🥑' },
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Profile Header Card */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div className="h-20 w-20 rounded-2xl bg-orange-100 border-2 border-orange-200 flex items-center justify-center text-3xl shadow-inner">
              🥢
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h1 className="text-2xl font-black text-gray-900">{user.name}</h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                  {user.role || 'CUSTOMER'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">📧 {user.email}</p>
              {user.phone && <p className="text-xs text-gray-500 mt-0.5">📞 {user.phone}</p>}
              {user.nationality && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                  <span>🌍 Quốc tịch:</span>
                  <span className="text-orange-600 font-bold">{user.nationality}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
            {user.role === 'STAFF' && (
              <Link
                to="/staff/orders"
                className="flex-1 sm:flex-none text-center rounded-xl bg-slate-800 hover:bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition"
              >
                👨‍🍳 Đến trang Quản trị Bếp →
              </Link>
            )}
            <Link
              to="/taste-profiles"
              className="flex-1 sm:flex-none text-center rounded-xl bg-orange-600 hover:bg-orange-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition"
            >
              Chỉnh sửa gu khẩu vị ⚡
            </Link>
            <button
              onClick={logout}
              className="flex-1 sm:flex-none rounded-xl border border-gray-200 bg-white hover:bg-red-50 hover:text-red-600 px-4 py-2 text-xs font-bold text-gray-600 transition"
            >
              Đăng xuất
            </button>
          </div>
        </div>

        {/* Taste Profile AI Insights Card */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>🤖</span> Khẩu vị cá nhân hóa theo AI
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Các món ăn bạn chọn trên thực đơn sẽ tự động tinh chỉnh theo thang điểm này
              </p>
            </div>
            {activeProfile && (
              <span className="text-xs font-semibold text-orange-700 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                Gu đang kích hoạt: {activeProfile.name}
              </span>
            )}
          </div>

          {/* Taste Sliders Display */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(tastePrefs).map(([key, val]) => {
              const meta = tasteLabels[key] || { label: key, icon: '✨' };
              const percent = Math.min(Math.max((val / 5) * 100, 0), 100);

              return (
                <div key={key} className="rounded-2xl border border-gray-100 bg-slate-50/70 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                      <span>{meta.icon}</span> {meta.label}
                    </span>
                    <span className="font-bold text-orange-600 font-mono text-sm">
                      {val} / 5
                    </span>
                  </div>
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dietary Restrictions */}
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
              Chế độ & Hạn chế ăn kiêng (Dietary Restrictions)
            </h3>
            {dietaryTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {dietaryTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200"
                  >
                    🌱 {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">
                Không ghi nhận hạn chế ăn kiêng đặc biệt (không kiêng thịt bò, thịt heo, hải sản).
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions / Orders Link */}
        <div className="rounded-2xl border border-orange-100 bg-orange-50/80 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-orange-950">Bạn muốn kiểm tra tình trạng đơn hàng?</h3>
            <p className="text-xs text-orange-800 mt-0.5">
              Tra cứu nhanh đơn hàng gần đây với mã đơn hàng và số điện thoại của bạn
            </p>
          </div>
          <Link
            to="/orders/lookup"
            className="rounded-xl bg-orange-600 hover:bg-orange-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition whitespace-nowrap"
          >
            Tra cứu đơn hàng →
          </Link>
        </div>
      </div>
    </div>
  );
}
