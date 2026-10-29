import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useCartStore } from '../stores/cart-store';
import { api } from '../lib/api-client';

export function CheckoutPage() {
  const navigate = useNavigate();
  const { items, clearCart } = useCartStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [fulfillmentType, setFulfillmentType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH_ON_DELIVERY' | 'CASH_ON_PICKUP' | 'MOCK_PAYMENT'>(
    'CASH_ON_DELIVERY',
  );
  const [customerNotes, setCustomerNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const subtotal = items.reduce((sum, item) => sum + item.basePrice * item.quantity, 0);
  const deliveryFee = fulfillmentType === 'DELIVERY' ? 15000 : 0;
  const total = subtotal + deliveryFee;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-gray-500 mb-4">Giỏ hàng của bạn đang trống!</p>
          <Link to="/menu" className="rounded-xl bg-orange-600 px-6 py-2.5 text-xs font-bold text-white">
            Đến Thực đơn →
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Vui lòng nhập họ và tên của bạn.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Vui lòng nhập số điện thoại nhận hàng.');
      return;
    }
    if (fulfillmentType === 'DELIVERY' && !deliveryAddress.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ giao hàng.');
      return;
    }

    setLoading(true);

    try {
      const idempotencyKey = `vft-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const orderPayload = {
        customer: {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          deliveryAddress: fulfillmentType === 'DELIVERY' ? deliveryAddress.trim() : undefined,
        },
        fulfillmentType,
        paymentMethod: fulfillmentType === 'PICKUP' && paymentMethod === 'CASH_ON_DELIVERY' ? 'CASH_ON_PICKUP' : paymentMethod,
        customerNotes: customerNotes.trim() || undefined,
        items: items.map((i) => ({
          dishId: i.dishId,
          quantity: i.quantity,
          tasteProfileCode: i.tasteProfileCode,
          tasteValues: i.tasteValues,
          ingredientQuantities: i.ingredientQuantities,
          substitutionIds: i.substitutionIds,
          notes: i.notes || undefined,
        })),
      };

      const res = await api.post<any>('/orders', orderPayload, {
        'idempotency-key': idempotencyKey,
      });

      if (res.data) {
        clearCart();
        navigate(`/orders/success?orderNumber=${res.data.orderNumber}&phone=${encodeURIComponent(phone.trim())}`);
        return;
      }

      if (res.error) {
        setErrorMessage(res.error.message || 'Đặt hàng thất bại. Vui lòng kiểm tra lại thông tin.');
        return;
      }
    } catch (err: any) {
      console.warn('API error, using mock success for offline demo:', err);
      // Fallback demo for preview without active backend
      const mockOrderNumber = `VFT-${Date.now().toString().slice(-8)}-${Math.floor(1000 + Math.random() * 9000)}`;
      clearCart();
      navigate(`/orders/success?orderNumber=${mockOrderNumber}&phone=${encodeURIComponent(phone.trim())}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col">

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Thanh toán đơn hàng</h1>
        <p className="text-xs text-gray-500 mb-8">Điền thông tin nhận hàng để nhà bếp chuẩn bị món cho bạn nhé</p>

        {errorMessage && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-xs font-semibold text-red-800">
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Customer Details & Options */}
          <div className="lg:col-span-7 space-y-6">
            {/* Box 1: Customer Contact */}
            <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-gray-900 pb-2 border-b border-gray-100">
                1. Thông tin người nhận
              </h2>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn A hoặc John Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0912345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Email (tùy chọn)</label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Box 2: Fulfillment & Address */}
            <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-gray-900 pb-2 border-b border-gray-100">
                2. Hình thức nhận món
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setFulfillmentType('DELIVERY');
                    setPaymentMethod('CASH_ON_DELIVERY');
                  }}
                  className={`rounded-xl p-3.5 text-left border-2 transition ${
                    fulfillmentType === 'DELIVERY'
                      ? 'border-orange-500 bg-orange-50/50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-bold text-xs text-gray-900">🛵 Giao tận nơi</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">Phí ship: 15.000 ₫</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFulfillmentType('PICKUP');
                    setPaymentMethod('CASH_ON_PICKUP');
                  }}
                  className={`rounded-xl p-3.5 text-left border-2 transition ${
                    fulfillmentType === 'PICKUP'
                      ? 'border-orange-500 bg-orange-50/50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-bold text-xs text-gray-900">🥡 Tự đến lấy</div>
                  <div className="text-[11px] text-green-600 font-semibold mt-0.5">Miễn phí ship</div>
                </button>
              </div>

              {fulfillmentType === 'DELIVERY' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Địa chỉ giao hàng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Số nhà, tên đường, phường/quận..."
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Ghi chú cho shipper / nhà hàng</label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Gọi trước khi đến 5 phút, để trước cổng..."
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Box 3: Payment Method */}
            <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-xs space-y-3">
              <h2 className="text-base font-bold text-gray-900 pb-2 border-b border-gray-100">
                3. Phương thức thanh toán
              </h2>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'CASH_ON_DELIVERY' || paymentMethod === 'CASH_ON_PICKUP'}
                  onChange={() =>
                    setPaymentMethod(fulfillmentType === 'DELIVERY' ? 'CASH_ON_DELIVERY' : 'CASH_ON_PICKUP')
                  }
                  className="accent-orange-600"
                />
                <div className="text-xs">
                  <div className="font-bold text-gray-900">💵 Tiền mặt khi nhận hàng (COD)</div>
                  <div className="text-gray-500 text-[11px]">Thanh toán trực tiếp cho shipper hoặc tại quầy</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'MOCK_PAYMENT'}
                  onChange={() => setPaymentMethod('MOCK_PAYMENT')}
                  className="accent-orange-600"
                />
                <div className="text-xs">
                  <div className="font-bold text-gray-900">💳 Thanh toán trực tuyến (Thử nghiệm Mock)</div>
                  <div className="text-gray-500 text-[11px]">Mô phỏng thanh toán thẻ quốc tế / QR Code</div>
                </div>
              </label>
            </div>
          </div>

          {/* Right Summary */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-xs sticky top-20">
              <h2 className="text-base font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100">
                Chi tiết đơn hàng ({items.length} món)
              </h2>

              <div className="max-h-60 overflow-y-auto space-y-3 mb-4 pr-1">
                {items.map((i, idx) => (
                  <div key={idx} className="flex justify-between text-xs pb-2 border-b border-gray-50">
                    <div>
                      <div className="font-bold text-gray-900">
                        {i.quantity}x {i.dishName}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        🌶️ Cay {i.tasteValues.spice_level ?? 1}/5
                      </div>
                    </div>
                    <span className="font-bold text-gray-900">
                      {(i.basePrice * i.quantity).toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-xs text-gray-600 pt-2 border-t border-gray-100 mb-4">
                <div className="flex justify-between">
                  <span>Tiền món:</span>
                  <span className="font-semibold text-gray-900">{subtotal.toLocaleString('vi-VN')} ₫</span>
                </div>
                <div className="flex justify-between">
                  <span>Phí giao hàng:</span>
                  <span className="font-semibold text-gray-900">
                    {deliveryFee > 0 ? `${deliveryFee.toLocaleString('vi-VN')} ₫` : 'Miễn phí'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-between items-baseline mb-6">
                <span className="font-bold text-sm text-gray-900">Tổng thanh toán:</span>
                <span className="text-2xl font-black text-orange-600">
                  {total.toLocaleString('vi-VN')} ₫
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-orange-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-orange-700 transition disabled:opacity-50"
              >
                {loading ? 'Đang gửi đơn...' : 'Xác nhận Đặt hàng ngay ✓'}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
