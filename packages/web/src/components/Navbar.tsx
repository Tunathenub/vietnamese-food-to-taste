import { Link, useLocation } from 'react-router';
import { useCartStore } from '../stores/cart-store';
import { useTasteStore } from '../stores/taste-store';
import { useAuthStore } from '../stores/auth-store';

export function Navbar() {
  const location = useLocation();
  const totalCartItems = useCartStore((state) => state.totalItems());
  const activeProfile = useTasteStore((state) => state.activeProfile);
  const { user, logout } = useAuthStore();

  const navLinks = [
    { to: '/', label: 'Trang chủ' },
    { to: '/taste-profiles', label: 'Gu khẩu vị' },
    { to: '/menu', label: 'Thực đơn' },
    { to: '/orders/lookup', label: 'Tra cứu đơn' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur shadow-xs border-b border-gray-100">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🍜</span>
          <div>
            <div className="font-extrabold text-xl tracking-tight text-gray-900">
              Vietnamese<span className="text-orange-600">Taste</span>
            </div>
            <div className="text-[10px] text-gray-500 font-medium tracking-wide">ẨM THỰC VIỆT TÙY BIẾN KHẨU VỊ</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-semibold transition-colors ${
                  isActive ? 'text-orange-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2 mr-2">
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                👋 {user.name}
              </span>
              <button
                onClick={logout}
                className="text-xs font-semibold text-gray-500 hover:text-red-600 transition"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="mr-2 text-sm font-semibold text-gray-700 hover:text-orange-600 transition"
            >
              Đăng nhập
            </Link>
          )}

          {/* Active Taste Badge */}
          <Link
            to="/taste-profiles"
            className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 border border-orange-200 transition-colors"
            title="Đổi gu khẩu vị"
          >
            <span>{activeProfile.flag}</span>
            <span className="hidden sm:inline">{activeProfile.name.split(' (')[0]}</span>
            <span className="text-orange-400 font-normal">✎</span>
          </Link>

          {/* Cart Button */}
          <Link
            to="/cart"
            className="relative flex items-center justify-center rounded-xl bg-orange-600 p-2 text-white hover:bg-orange-700 transition shadow-sm"
          >
            <span className="text-base">🛒</span>
            {totalCartItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[11px] font-bold text-white shadow-sm animate-pulse">
                {totalCartItems}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
