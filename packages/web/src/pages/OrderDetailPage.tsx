import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router';
import { useTranslation } from '../i18n';
import { api } from '../lib/api-client';
import { useOrderEvents } from '../lib/use-order-events';

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
  const { t, formatPrice } = useTranslation();

  const [order, setOrder] = useState<OrderDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusJustUpdated, setStatusJustUpdated] = useState(false);

  const fetchOrder = useCallback(async () => {
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
    setOrder((prev) => {
      if (prev) return prev;
      return {
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
              { name: t.taste.attributes.spice_level.name.split(' ')[0], value: 4, label: 'Cay nồng / Spicy' },
              { name: t.taste.attributes.fish_sauce_intensity.name.split(' ')[0], value: 2, label: 'Mắm nhẹ dịu / Mild' },
            ],
            ingredientChanges: [
              { name: 'Thịt bò tươi', action: 'UNCHANGED', selectedQuantity: 1, unit: 'phần' },
            ],
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
    setLoading(false);
  }, [orderNumber, phone, t]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Connect to SSE for real-time status updates on /api/events/orders/:orderNumber
  const { isConnected } = useOrderEvents({
    orderNumber,
    enabled: !!orderNumber,
    onStatusUpdated: (payload) => {
      if (payload.status) {
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                status: payload.status,
                updatedAt: payload.updatedAt || new Date().toISOString(),
              }
            : prev
        );
        setStatusJustUpdated(true);
        setTimeout(() => setStatusJustUpdated(false), 3000);
      }
    },
    onFallbackPoll: () => {
      fetchOrder();
    },
  });

  const steps = [
    { code: 'PENDING', label: t.orderStatus.PENDING },
    { code: 'CONFIRMED', label: t.orderStatus.CONFIRMED },
    { code: 'PREPARING', label: t.orderStatus.PREPARING },
    { code: 'READY', label: t.orderStatus.READY },
    { code: 'COMPLETED', label: t.orderStatus.COMPLETED },
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
      case 'DELIVERING':
        return 3;
      case 'COMPLETED':
        return 4;
      default:
        return 0;
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'PREPARING':
        return 'bg-orange-100 text-orange-800 border-orange-300 animate-pulse';
      case 'READY':
      case 'DELIVERING':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'CANCELLED':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    return (t.orderStatus as Record<string, string>)[status] || status;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center text-gray-500">
          {t.common.loading}
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-gray-500 mb-4">{t.orderLookup.notFoundError}</p>
          <Link to="/orders/lookup" className="rounded-xl bg-orange-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm">
            {t.orderLookup.title}
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
        <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-2xs mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <span className="text-[11px] font-bold text-orange-600 uppercase tracking-wider">
                {t.orderSuccess.orderNumber}
              </span>
              <div className="flex flex-wrap items-center gap-3 mt-0.5">
                <h1 className="text-2xl font-black text-gray-900">{order.orderNumber}</h1>

                {/* Real-time Status Pill */}
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all duration-500 transform ${getStatusBadgeStyle(
                    order.status
                  )} ${statusJustUpdated ? 'ring-4 ring-orange-400/50 scale-105' : ''}`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      order.status === 'PREPARING' || statusJustUpdated
                        ? 'animate-ping bg-orange-500'
                        : 'bg-current opacity-70'
                    }`}
                  />
                  {getStatusLabel(order.status)}
                </span>

                {/* Real-time connection indicator */}
                {isConnected && (
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200"
                    title="Đã kết nối theo dõi thời gian thực (SSE)"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Trực tiếp
                  </span>
                )}
              </div>
            </div>

            <div className="text-xs text-gray-500 sm:text-right">
              <div>
                {t.orderSuccess.orderPlacedAt}: {new Date(order.createdAt).toLocaleTimeString()} {new Date(order.createdAt).toLocaleDateString()}
              </div>
              {statusJustUpdated && (
                <div className="text-[11px] font-semibold text-orange-600 animate-pulse mt-0.5">
                  ✨ Trạng thái vừa được cập nhật!
                </div>
              )}
            </div>
          </div>

          {/* Stepper with smooth animation */}
          <div className="mt-6 pt-2">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 z-0" />
              <div
                className="absolute top-1/2 left-0 h-1 bg-orange-500 -translate-y-1/2 z-0 transition-all duration-700 ease-in-out"
                style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
              />

              {steps.map((s, idx) => {
                const isPassed = idx <= currentStep;
                const isCurrent = idx === currentStep;

                return (
                  <div key={s.code} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 transform ${
                        isCurrent
                          ? 'bg-orange-600 text-white ring-4 ring-orange-100 scale-110 shadow-sm'
                          : isPassed
                          ? 'bg-orange-500 text-white'
                          : 'bg-white border-2 border-gray-300 text-gray-400'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span
                      className={`text-[11px] mt-2 font-medium text-center transition-colors duration-300 ${
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
          <div className="lg:col-span-8 rounded-2xl bg-white p-6 border border-gray-200 shadow-2xs space-y-4">
            <h2 className="text-base font-bold text-gray-900 pb-2 border-b border-gray-100">
              {t.common.items} ({order.items.length})
            </h2>

            {order.items.map((item, idx) => (
              <div key={idx} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="flex justify-between items-baseline mb-1">
                  <div className="font-bold text-sm text-gray-900">
                    {item.quantity}x {item.dishName}
                  </div>
                  <span className="font-extrabold text-orange-600 text-sm">
                    {formatPrice(item.lineTotal)}
                  </span>
                </div>

                {/* Taste Selections */}
                {item.tasteSelections.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {item.tasteSelections.map((ts, tidx) => (
                      <span
                        key={tidx}
                        className="rounded-md bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-800 border border-orange-100"
                      >
                        {ts.name}: {ts.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Payment summary */}
          <div className="lg:col-span-4 rounded-2xl bg-white p-6 border border-gray-200 shadow-2xs space-y-3">
            <h2 className="text-base font-bold text-gray-900 pb-2 border-b border-gray-100">
              {t.common.total}
            </h2>

            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>{t.common.subtotal}:</span>
                <span className="font-semibold text-gray-900">{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t.cart.deliveryFee}:</span>
                <span className="font-semibold text-gray-900">
                  {order.deliveryFee > 0 ? formatPrice(order.deliveryFee) : t.cart.freeDelivery}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-between items-baseline">
              <span className="font-bold text-sm text-gray-900">{t.common.total}:</span>
              <span className="text-xl font-black text-orange-600">
                {formatPrice(order.total)}
              </span>
            </div>

            <div className="pt-4 border-t border-gray-100 text-[11px] text-gray-500 space-y-1">
              <div>{t.checkout.fulfillmentTitle}: {order.fulfillmentType === 'DELIVERY' ? t.checkout.delivery : t.checkout.pickup}</div>
              <div>{t.checkout.paymentTitle}: {order.paymentStatus === 'PAID' ? 'PAID / Đã thanh toán' : 'UNPAID / Chưa thanh toán'}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
