import { useSearchParams, Link } from 'react-router';

export function OrderSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('orderNumber') ?? 'VFT-SAMPLE-001';
  const phone = searchParams.get('phone') ?? '';

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col">

      <main className="mx-auto max-w-xl px-4 py-16 flex-1 flex flex-col justify-center items-center text-center">
        <div className="rounded-3xl bg-white p-8 sm:p-10 border border-gray-200/90 shadow-sm w-full">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl mb-4">
            🎉
          </div>

          <h1 className="text-2xl font-black text-gray-900">Đặt hàng thành công!</h1>
          <p className="mt-2 text-xs text-gray-600 leading-relaxed">
            Nhà hàng đã nhận được đơn hàng và đang chuẩn bị những nguyên liệu tươi ngon nhất theo đúng khẩu vị bạn yêu cầu.
          </p>

          <div className="my-6 rounded-2xl bg-orange-50/70 border border-orange-200 p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-orange-800">Mã đơn hàng của bạn</div>
            <div className="text-xl font-extrabold text-orange-600 mt-1 tracking-tight select-all">
              {orderNumber}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              (Lưu lại mã này để kiểm tra tiến trình giao món)
            </div>
          </div>

          <div className="space-y-3">
            <Link
              to={`/orders/${orderNumber}${phone ? `?phone=${encodeURIComponent(phone)}` : ''}`}
              className="block w-full rounded-xl bg-orange-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-orange-700 transition"
            >
              Xem tiến độ đơn hàng →
            </Link>

            <Link
              to="/"
              className="block w-full rounded-xl border border-gray-200 bg-white py-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Về Trang chủ
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
