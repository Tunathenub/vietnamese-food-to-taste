import { useState } from 'react';
import { useNavigate } from 'react-router';

export function OrderLookupPage() {
  const navigate = useNavigate();
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim()) {
      setError('Vui lòng nhập mã đơn hàng.');
      return;
    }
    if (!phone.trim()) {
      setError('Vui lòng nhập số điện thoại đặt hàng.');
      return;
    }

    navigate(`/orders/${orderNumber.trim()}?phone=${encodeURIComponent(phone.trim())}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col">

      <main className="mx-auto max-w-lg px-4 py-16 flex-1 flex flex-col justify-center w-full">
        <div className="rounded-3xl bg-white p-8 border border-gray-200/90 shadow-xs">
          <div className="text-center mb-6">
            <span className="text-4xl block mb-2">🔍</span>
            <h1 className="text-2xl font-black text-gray-900">Tra cứu đơn hàng</h1>
            <p className="text-xs text-gray-500 mt-1">
              Nhập mã đơn hàng và số điện thoại để kiểm tra tình trạng chuẩn bị món
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-800 font-semibold">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Mã đơn hàng</label>
              <input
                type="text"
                required
                placeholder="Ví dụ: VFT-20261005-4819"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Số điện thoại đặt món</label>
              <input
                type="tel"
                required
                placeholder="0912345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-orange-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-orange-700 transition"
            >
              Tra cứu trạng thái ngay →
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
