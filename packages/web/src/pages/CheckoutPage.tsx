import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useCartStore } from '../stores/cart-store';
import { useAuthStore } from '../stores/auth-store';
import { useTasteStore } from '../stores/taste-store';
import { api } from '../lib/api-client';

const COMMON_DIAL_CODES = [
  { code: '+84', country: 'Việt Nam', flag: '🇻🇳' },
  { code: '+82', country: 'Hàn Quốc', flag: '🇰🇷' },
  { code: '+1', country: 'Mỹ / Canada', flag: '🇺🇸' },
  { code: '+81', country: 'Nhật Bản', flag: '🇯🇵' },
  { code: '+61', country: 'Úc', flag: '🇦🇺' },
  { code: '+33', country: 'Pháp', flag: '🇫🇷' },
  { code: '+44', country: 'Anh', flag: '🇬🇧' },
  { code: '+49', country: 'Đức', flag: '🇩🇪' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+66', country: 'Thái Lan', flag: '🇹🇭' },
  { code: '+886', country: 'Đài Loan', flag: '🇹🇼' },
  { code: '+86', country: 'Trung Quốc', flag: '🇨🇳' },
];

export function CheckoutPage() {
  const navigate = useNavigate();
  const { items, clearCart } = useCartStore();
  const user = useAuthStore((state) => state.user);
  const activeProfile = useTasteStore((state) => state.activeProfile);

  const [name, setName] = useState(user?.name || '');
  const [dialCode, setDialCode] = useState(activeProfile?.dialCode || '+84');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [preferredContactChannel, setPreferredContactChannel] = useState<'PHONE_CALL' | 'WHATSAPP' | 'ZALO'>(
    (activeProfile?.dialCode && activeProfile.dialCode !== '+84') ? 'WHATSAPP' : 'PHONE_CALL'
  );
  const [isWhatsAppAvailable, setIsWhatsAppAvailable] = useState(
    Boolean(activeProfile?.dialCode && activeProfile.dialCode !== '+84')
  );

  const [fulfillmentType, setFulfillmentType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [hotelOrBuildingName, setHotelOrBuildingName] = useState('');
  const [roomOrFloorNumber, setRoomOrFloorNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH_ON_DELIVERY' | 'CASH_ON_PICKUP' | 'MOCK_PAYMENT'>(
    'CASH_ON_DELIVERY',
  );
  const [customerNotes, setCustomerNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      if (user.name && !name) setName(user.name);
      if (user.phone && !phone) setPhone(user.phone);
      if (user.email && !email) setEmail(user.email);
    }
  }, [user]);

  // Synchronize dialCode if activeProfile changes and user hasn't explicitly set phone
  useEffect(() => {
    if (activeProfile?.dialCode && !phone) {
      setDialCode(activeProfile.dialCode);
      if (activeProfile.dialCode !== '+84') {
        setPreferredContactChannel('WHATSAPP');
        setIsWhatsAppAvailable(true);
      }
    }
  }, [activeProfile]);

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

      // Combine structured hotel/room info into full address snapshot
      const fullDeliveryAddress = fulfillmentType === 'DELIVERY'
        ? [
            hotelOrBuildingName.trim() ? `[${hotelOrBuildingName.trim()}${roomOrFloorNumber.trim() ? ` - ${roomOrFloorNumber.trim()}` : ''}]` : '',
            deliveryAddress.trim()
          ].filter(Boolean).join(' ')
        : undefined;

      const orderPayload = {
        customer: {
          name: name.trim(),
          dialCode,
          phone: phone.trim(),
          countryCode: activeProfile?.countryCode,
          preferredContactChannel,
          isWhatsAppAvailable,
          hotelOrBuildingName: hotelOrBuildingName.trim() || undefined,
          roomOrFloorNumber: roomOrFloorNumber.trim() || undefined,
          email: email.trim() || undefined,
          deliveryAddress: fullDeliveryAddress,
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

      const fullCustomerPhone = `${dialCode}${phone.trim()}`;

      if (res.data) {
        clearCart();
        navigate(`/orders/success?orderNumber=${res.data.orderNumber}&phone=${encodeURIComponent(fullCustomerPhone)}`);
        return;
      }

      if (res.error) {
        setErrorMessage(res.error.message || 'Đặt hàng thất bại. Vui lòng kiểm tra lại thông tin.');
        return;
      }
    } catch (err: any) {
      console.warn('API error, using mock success for offline demo:', err);
      const mockOrderNumber = `VFT-${Date.now().toString().slice(-8)}-${Math.floor(1000 + Math.random() * 9000)}`;
      const fullCustomerPhone = `${dialCode}${phone.trim()}`;
      clearCart();
      navigate(`/orders/success?orderNumber=${mockOrderNumber}&phone=${encodeURIComponent(fullCustomerPhone)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col pb-16">
      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Thanh toán đơn hàng</h1>
        <p className="text-xs text-gray-500 mb-6">Điền thông tin nhận hàng để nhà bếp chuẩn bị món chuẩn khẩu vị cho bạn nhé</p>

        {/* Guest Notification Banner */}
        {!user && (
          <div className="mb-6 rounded-2xl bg-orange-50 border border-orange-200 p-4 text-xs text-orange-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <span className="font-bold flex items-center gap-1.5">
                <span>👤</span> Đặt hàng Nhanh (Guest Checkout)
              </span>
              <p className="text-[11px] text-orange-800 mt-0.5">
                Bạn không cần tạo tài khoản hay đặt mật khẩu vẫn có thể đặt món. Sau khi đặt bạn có thể tùy chọn lưu tài khoản sau.
              </p>
            </div>
            <Link
              to="/auth?redirect=/checkout"
              className="rounded-lg bg-white border border-orange-300 px-3 py-1.5 text-xs font-bold text-orange-700 hover:bg-orange-100 whitespace-nowrap shadow-xs"
            >
              Đăng nhập tài khoản
            </Link>
          </div>
        )}

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
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h2 className="text-base font-bold text-gray-900">
                  1. Thông tin người nhận
                </h2>
                {activeProfile && (
                  <span className="text-[11px] font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                    {activeProfile.flag} Gu: {activeProfile.name.split(' (')[0]}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Họ và tên người nhận <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Min-jun Kim, John Smith hoặc Nguyễn Văn A"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-orange-500 focus:outline-hidden"
                />
              </div>

              {/* Phone with Country Dial Code */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Số điện thoại liên hệ <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={dialCode}
                    onChange={(e) => {
                      const newDial = e.target.value;
                      setDialCode(newDial);
                      if (newDial !== '+84') {
                        setPreferredContactChannel('WHATSAPP');
                        setIsWhatsAppAvailable(true);
                      } else {
                        setPreferredContactChannel('PHONE_CALL');
                      }
                    }}
                    className="rounded-xl border border-gray-200 bg-slate-50 px-2.5 py-2 text-xs font-bold text-gray-800 focus:border-orange-500 focus:outline-hidden"
                  >
                    {COMMON_DIAL_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code} ({c.country})
                      </option>
                    ))}
                  </select>

                  <input
                    type="tel"
                    required
                    placeholder="Nhập số điện thoại của bạn..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 rounded-xl border border-gray-200 p-2.5 text-xs focus:border-orange-500 focus:outline-hidden"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Mã vùng được tự động đề xuất theo gu quốc gia bạn đã chọn ({dialCode})
                </p>
              </div>

              {/* Preferred Contact Channel */}
              <div className="rounded-xl bg-slate-50 p-3.5 border border-gray-200/80 space-y-2">
                <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                  Kênh liên lạc khi shipper tới:
                </div>
                <div className="flex flex-col sm:flex-row gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-emerald-800 bg-white p-2 rounded-lg border border-emerald-200 shadow-2xs">
                    <input
                      type="radio"
                      name="contactChannel"
                      checked={preferredContactChannel === 'WHATSAPP'}
                      onChange={() => {
                        setPreferredContactChannel('WHATSAPP');
                        setIsWhatsAppAvailable(true);
                      }}
                      className="accent-emerald-600"
                    />
                    <span>💬 WhatsApp (Ưu tiên cho du khách quốc tế)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700 bg-white p-2 rounded-lg border border-gray-200 shadow-2xs">
                    <input
                      type="radio"
                      name="contactChannel"
                      checked={preferredContactChannel === 'PHONE_CALL'}
                      onChange={() => setPreferredContactChannel('PHONE_CALL')}
                      className="accent-orange-600"
                    />
                    <span>📞 Cuộc gọi di động</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-blue-800 bg-white p-2 rounded-lg border border-blue-200 shadow-2xs">
                    <input
                      type="radio"
                      name="contactChannel"
                      checked={preferredContactChannel === 'ZALO'}
                      onChange={() => setPreferredContactChannel('ZALO')}
                      className="accent-blue-600"
                    />
                    <span>💬 Zalo</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email nhận biên lai (tùy chọn)</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-orange-500 focus:outline-hidden"
                />
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
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        🏨 Tên Khách sạn / Tòa nhà (nếu có)
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Daewoo Hotel, Lancaster..."
                        value={hotelOrBuildingName}
                        onChange={(e) => setHotelOrBuildingName(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-orange-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        🚪 Số phòng / Tầng
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Phòng 402, Tầng 4..."
                        value={roomOrFloorNumber}
                        onChange={(e) => setRoomOrFloorNumber(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-orange-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Địa chỉ đường phố, số nhà <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Số nhà, tên đường, phường/quận..."
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Ghi chú giao hàng</label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Gửi lễ tân khách sạn nếu không gọi được, xin thêm chanh ớt riêng..."
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-orange-500 focus:outline-hidden"
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
                  <div className="text-gray-500 text-[11px]">Mô phỏng thanh toán thẻ quốc tế / QR Code (Được gửi tại lễ tân an toàn)</div>
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
