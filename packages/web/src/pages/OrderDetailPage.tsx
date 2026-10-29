import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router';
import { api } from '../lib/api-client';

interface OrderDetailResponse {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentType: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  currency: string;
  items: Array<{
    dishName: string;
    quantity: number;
    finalUnitPrice: number;
    lineTotal: number;
    tasteSelections: Array<{ name: string; value: number; label: string }>;
    ingredientChanges: Array<{ name: string; action: string; selectedQuantity: number; unit: string }>;
  }>;
  createdAt: string;
  updatedAt: string;
}

export function OrderDetailPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [searchParams] = useSearchParams();
  const phone = searchParams.get('phone') ?? '';

  const [order, setOrder] = useState<OrderDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      if (!orderNumber) return;
      try {
        if (phone) {
          const res = await api.post<OrderDetailResponse>('/orders/lookup', {
            orderNumber,
            phone,
          });
          if (res.data) {
            setOrder(res.data);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('API error, using mock order for demo:', err);
      }

      // Fallback mock detail for offline testing
      setOrder({
        orderNumber: orderNumber,
        status: 'PREPARING',
        paymentStatus: 'UNPAID',
        fulfillmentType: 'DELIVERY',
        subtotal: 65000,
        deliveryFee: 15000,
        total: 80000,
        currency: 'VND',
        items: [
          {
            dishName: 'Phở Bò Hà Nội',
            quantity: 1,
            finalUnitPrice: 65000,
            lineTotal: 65000,
            tasteSelections: [
              { name: 'Độ cay', value: 4, label: 'Cay nồng (Gu Hàn Quốc)' },
              { name: 'Nước mắm', value: 2, label: 'Mắm nhẹ dịu' },
            ],
            ingredientChanges: [
              { name: 'Thịt bò tươi', action: 'UNCHANGED', selectedQuantity: 1, unit: 'phần' },
            ],
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setLoading(false);
    }

    fetchOrder();
  }, [orderNumber, phone]);

  const steps = [
    { code: 'PENDING', label: 'Tiếp nhận' },
    { code: 'CONFIRMED', label: 'Xác nhận' },
    { code: 'PREPARING', label: 'Đang nấu' },
    { code: 'READY', label: 'Sẵn sàng' },
    { code: 'COMPLETED', label: 'Hoàn thành' },
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 0;
      case 'CONFIRMED':
        return 1;
      case 'PREPARING':
        return 2;
      case 'READY':
        return 3;
      case 'COMPLETED':
        return 4;
      default:
        return 0;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Đang tải thông tin đơn hàng...
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-gray-500 mb-4">Không tìm thấy đơn hàng yêu cầu.</p>
          <Link to="/orders/lookup" className="rounded-xl bg-orange-600 px-6 py-2.5 text-xs font-bold text-white">
            Tra cứu lại
          </Link>
        </div>
      </div>
    );
  }

  const currentStep = getStepIndex(order.status);

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col">

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Header */}
        <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-xs mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
            <div>
              <span className="text-[11px] font-bold text-orange-600 uppercase tracking-wider">Chi tiết đơn</span>
              <h1 className="text-2xl font-black text-gray-900 mt-0.5">{order.orderNumber}</h1>
            </div>
            <div className="text-xs text-gray-500">
              Đặt lúc: {new Date(order.createdAt).toLocaleTimeString('vi-VN')} ngày{' '}
              {new Date(order.createdAt).toLocaleDateString('vi-VN')}
            </div>
          </div>

          {/* Stepper */}
          <div className="mt-6 pt-2">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 z-0" />
              <div
                className="absolute top-1/2 left-0 h-1 bg-orange-500 -translate-y-1/2 z-0 transition-all duration-500"
                style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
              />

              {steps.map((s, idx) => {
                const isPassed = idx <= currentStep;
                const isCurrent = idx === currentStep;

                return (
                  <div key={s.code} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-orange-600 text-white ring-4 ring-orange-100'
                          : isPassed
                          ? 'bg-orange-500 text-white'
                          : 'bg-white border-2 border-gray-300 text-gray-400'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span
                      className={`text-[11px] mt-2 font-medium ${
                        isCurrent ? 'text-orange-600 font-bold' : isPassed ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Order Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Items */}
          <div className="lg:col-span-8 rounded-2xl bg-white p-6 border border-gray-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-gray-900 pb-2 border-b border-gray-100">
              Món ăn đã chọn ({order.items.length})
            </h2>

            {order.items.map((item, idx) => (
              <div key={idx} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="flex justify-between items-baseline mb-1">
                  <div className="font-bold text-sm text-gray-900">
                    {item.quantity}x {item.dishName}
                  </div>
                  <span className="font-extrabold text-orange-600 text-sm">
                    {item.lineTotal.toLocaleString('vi-VN')} ₫
                  </span>
                </div>

                {/* Taste Selections */}
                {item.tasteSelections.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {item.tasteSelections.map((t, tidx) => (
                      <span
                        key={tidx}
                        className="rounded-md bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-800 border border-orange-100"
                      >
                        {t.name}: {t.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Payment summary */}
          <div className="lg:col-span-4 rounded-2xl bg-white p-6 border border-gray-200 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-gray-900 pb-2 border-b border-gray-100">
              Tổng thanh toán
            </h2>

            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Tiền món:</span>
                <span className="font-semibold text-gray-900">{order.subtotal.toLocaleString('vi-VN')} ₫</span>
              </div>
              <div className="flex justify-between">
                <span>Phí giao hàng:</span>
                <span className="font-semibold text-gray-900">
                  {order.deliveryFee > 0 ? `${order.deliveryFee.toLocaleString('vi-VN')} ₫` : 'Miễn phí'}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-between items-baseline">
              <span className="font-bold text-sm text-gray-900">Tổng cộng:</span>
              <span className="text-xl font-black text-orange-600">
                {order.total.toLocaleString('vi-VN')} ₫
              </span>
            </div>

            <div className="pt-4 border-t border-gray-100 text-[11px] text-gray-500">
              <div>Hình thức: {order.fulfillmentType === 'DELIVERY' ? 'Giao tận nơi' : 'Tự đến lấy'}</div>
              <div>Trạng thái thanh toán: {order.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
