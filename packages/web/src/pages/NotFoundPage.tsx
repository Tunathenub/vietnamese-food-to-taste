import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-orange-100 text-5xl shadow-inner">
          🍜
        </div>
        <div className="space-y-2">
          <p className="text-sm font-extrabold text-orange-600 tracking-widest uppercase">404 - Lỗi đường dẫn</p>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight sm:text-4xl">
            Không tìm thấy trang
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Món ăn hoặc trang bạn đang tìm kiếm không tồn tại hoặc đã được chuyển sang địa chỉ khác.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-orange-600 text-white font-bold text-sm hover:bg-orange-700 shadow-sm transition"
          >
            ← Về Trang chủ
          </Link>
          <Link
            to="/menu"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-50 shadow-2xs transition"
          >
            Xem Thực đơn món 🍲
          </Link>
        </div>
      </div>
    </div>
  );
}
