import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { api } from '../lib/api-client';
import { useOrderEvents, playOrderNotificationChime } from '../lib/use-order-events';

interface StaffOrderItem {
  id: string;
  orderNumber: string;
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  paymentStatus: string;
  fulfillmentType: 'DELIVERY' | 'PICKUP';
  customerName: string;
  customerPhone?: string;
  customerDialCode?: string;
  preferredContactChannel?: string;
  hotelOrBuildingName?: string;
  roomOrFloorNumber?: string;
  deliveryAddress?: string;
  total: number;
  currency: string;
  itemCount: number;
  createdAt: string;
}

const FALLBACK_STAFF_ORDERS: StaffOrderItem[] = [
  {
    id: 'ord-101',
    orderNumber: 'VFT-20261117-001',
    status: 'PENDING',
    paymentStatus: 'UNPAID',
    fulfillmentType: 'DELIVERY',
    customerName: 'Min-jun Kim (Hàn Quốc)',
    customerPhone: '1087654321',
    customerDialCode: '+82',
    preferredContactChannel: 'WHATSAPP',
    hotelOrBuildingName: 'Tòa nhà Lancaster',
    roomOrFloorNumber: 'Phòng 402',
    deliveryAddress: '20 Núi Trúc, Ba Đình, Hà Nội',
    total: 145000,
    currency: 'VND',
    itemCount: 2,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'ord-102',
    orderNumber: 'VFT-20261117-002',
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    fulfillmentType: 'PICKUP',
    customerName: 'Sarah Jenkins (Mỹ)',
    customerPhone: '0912345678',
    deliveryAddress: undefined,
    total: 70000,
    currency: 'VND',
    itemCount: 1,
    createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
  },
  {
    id: 'ord-103',
    orderNumber: 'VFT-20261117-003',
    status: 'PREPARING',
    paymentStatus: 'UNPAID',
    fulfillmentType: 'DELIVERY',
    customerName: 'Kenji Sato (Nhật Bản)',
    customerPhone: '0933221144',
    deliveryAddress: 'Khách sạn Daewoo, 360 Kim Mã, Ba Đình, Hà Nội',
    total: 210000,
    currency: 'VND',
    itemCount: 3,
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: 'ord-104',
    orderNumber: 'VFT-20261117-004',
    status: 'READY',
    paymentStatus: 'PAID',
    fulfillmentType: 'DELIVERY',
    customerName: 'Nguyễn Văn Hùng',
    customerPhone: '0904556677',
    deliveryAddress: '15 Tạ Hiện, Hoàn Kiếm, Hà Nội',
    total: 120000,
    currency: 'VND',
    itemCount: 2,
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'ord-105',
    orderNumber: 'VFT-20261117-005',
    status: 'COMPLETED',
    paymentStatus: 'PAID',
    fulfillmentType: 'PICKUP',
    customerName: 'David Lee (Singapore)',
    customerPhone: '0944112233',
    deliveryAddress: undefined,
    total: 65000,
    currency: 'VND',
    itemCount: 1,
    createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  },
];

const STATUS_FILTERS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING', label: '⏳ Chờ duyệt' },
  { key: 'CONFIRMED', label: '✅ Đã nhận' },
  { key: 'PREPARING', label: '🍳 Đang nấu' },
  { key: 'READY', label: '📦 Sẵn sàng' },
  { key: 'COMPLETED', label: '🎉 Hoàn tất' },
  { key: 'CANCELLED', label: '❌ Đã hủy' },
];

let cachedStaffOrders: StaffOrderItem[] | null = null;

export function StaffOrdersPage() {
  const [orders, setOrders] = useState<StaffOrderItem[]>(() => cachedStaffOrders || FALLBACK_STAFF_ORDERS);
  const [loading, setLoading] = useState(!cachedStaffOrders);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [newOrderNumbers, setNewOrderNumbers] = useState<Set<string>>(new Set());
  const [recentAlertBanner, setRecentAlertBanner] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const query = activeFilter !== 'ALL' ? `?status=${activeFilter}` : '';
      const res = await api.get<{ items: StaffOrderItem[] }>(`/staff/orders${query}`);
      if (res.data?.items && res.data.items.length > 0) {
        setOrders(res.data.items);
        cachedStaffOrders = res.data.items;
      } else if (res.error) {
        console.warn('API staff orders fallback to mock:', res.error);
        if (activeFilter === 'ALL') {
          setOrders(FALLBACK_STAFF_ORDERS);
        } else {
          setOrders(FALLBACK_STAFF_ORDERS.filter((o) => o.status === activeFilter));
        }
      }
    } catch (err) {
      console.warn('Error fetching staff orders, using fallback:', err);
      if (activeFilter === 'ALL') {
        setOrders(FALLBACK_STAFF_ORDERS);
      } else {
        setOrders(FALLBACK_STAFF_ORDERS.filter((o) => o.status === activeFilter));
      }
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Handle incoming new order event
  const handleOrderCreated = useCallback((created: any) => {
    if (!created) return;

    const normalizedOrder: StaffOrderItem = {
      id: created.id || `ord-${Date.now()}`,
      orderNumber: created.orderNumber || `VFT-${Date.now()}`,
      status: (created.status as StaffOrderItem['status']) || 'PENDING',
      paymentStatus: created.paymentStatus || 'UNPAID',
      fulfillmentType: created.fulfillmentType || 'DELIVERY',
      customerName: created.customerName || 'Khách hàng mới',
      customerPhone: created.customerPhone,
      customerDialCode: created.customerDialCode,
      preferredContactChannel: created.preferredContactChannel,
      hotelOrBuildingName: created.hotelOrBuildingName,
      roomOrFloorNumber: created.roomOrFloorNumber,
      deliveryAddress: created.deliveryAddress,
      total: Number(created.total) || 0,
      currency: created.currency || 'VND',
      itemCount: Number(created.itemCount) || (Array.isArray(created.items) ? created.items.length : 1),
      createdAt: created.createdAt || new Date().toISOString(),
    };

    // Prepend order immediately to list (avoid duplicates)
    setOrders((prev) => {
      const next = [
        normalizedOrder,
        ...prev.filter((o) => o.orderNumber !== normalizedOrder.orderNumber),
      ];
      cachedStaffOrders = next;
      return next;
    });

    // Mark as newly arrived for visual highlight badge
    setNewOrderNumbers((prev) => new Set(prev).add(normalizedOrder.orderNumber));

    // Show visual banner notification
    setRecentAlertBanner(`🔔 Đơn hàng mới: ${normalizedOrder.orderNumber} (${normalizedOrder.customerName})`);

    // Play crisp Web Audio API chime (ting ting)
    playOrderNotificationChime();

    // Auto-clear alert banner after 8 seconds
    setTimeout(() => {
      setRecentAlertBanner((curr) =>
        curr?.includes(normalizedOrder.orderNumber) ? null : curr
      );
    }, 8000);
  }, []);

  // Handle incoming status update event
  const handleStatusUpdated = useCallback((update: any) => {
    if (!update || !update.orderNumber || !update.status) return;

    setOrders((prev) => {
      const next = prev.map((o) =>
        o.orderNumber === update.orderNumber
          ? { ...o, status: update.status as StaffOrderItem['status'] }
          : o
      );
      cachedStaffOrders = next;
      return next;
    });
  }, []);

  // Connect to SSE stream for all orders (/api/events/orders)
  const { isConnected, isConnecting } = useOrderEvents({
    url: '/events/orders',
    onOrderCreated: handleOrderCreated,
    onStatusUpdated: handleStatusUpdated,
    onFallbackPoll: () => {
      fetchOrders();
    },
  });

  const getStatusBadge = (status: StaffOrderItem['status']) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">⏳ Chờ duyệt</span>;
      case 'CONFIRMED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200">✅ Đã nhận đơn</span>;
      case 'PREPARING':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-800 border border-orange-200 animate-pulse">🍳 Đang nấu</span>;
      case 'READY':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800 border border-purple-200">📦 Đã xong món</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">🎉 Hoàn tất</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-200">❌ Đã hủy</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const filteredOrders = activeFilter === 'ALL'
    ? orders
    : orders.filter((o) => o.status === activeFilter);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Top Header Bar */}
      <div className="border-b border-slate-800 bg-slate-950/80 backdrop-blur px-4 py-4 sm:px-8">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">👨‍🍳</span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Bếp & Quản trị Đơn Hàng <span className="text-orange-500 text-xs font-semibold px-2 py-0.5 rounded bg-orange-950/80 border border-orange-800/60 ml-2">Kitchen Portal</span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Theo dõi đơn hàng, tiếp nhận chỉ dẫn bếp (Kitchen Instructions) và điều phối trạng thái chế biến
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Switcher Tabs */}
            <div className="flex rounded-xl bg-slate-800/80 p-1 border border-slate-700/60">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-600 text-white shadow-sm">
                <span>📋</span>
                <span>Bếp & KDS</span>
              </span>
              <Link
                to="/staff/analytics"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition"
              >
                <span>📊</span>
                <span>Phân tích</span>
              </Link>
            </div>

            {/* Real-time SSE Connection Status */}
            {isConnected ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                KDS Trực tiếp
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                <span className="h-2 w-2 rounded-full bg-slate-500" />
                {isConnecting ? 'Đang kết nối...' : 'Ngoại tuyến'}
              </span>
            )}

            <span className="text-xs text-slate-400 hidden sm:inline">
              Cập nhật: {lastRefreshed.toLocaleTimeString('vi-VN')}
            </span>

            <button
              onClick={() => {
                playOrderNotificationChime();
                setRecentAlertBanner('🔔 Đã kích hoạt & thử chuông thông báo bếp!');
                setTimeout(() => setRecentAlertBanner(null), 3000);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/90 px-3 py-2 text-xs font-bold text-emerald-300 border border-emerald-700/60 transition shadow-sm"
              title="Bấm để kích hoạt quyền phát âm thanh & thử chuông bếp"
            >
              🔔 Thử chuông
            </button>

            <button
              onClick={() => fetchOrders()}
              className="flex items-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 border border-slate-700 transition"
            >
              🔄 Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Alert Banner */}
      {recentAlertBanner && (
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white px-4 py-3 shadow-lg border-b border-orange-400/30 animate-in slide-in-from-top duration-300">
          <div className="mx-auto max-w-7xl flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm font-bold">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
              </span>
              <span>{recentAlertBanner}</span>
            </div>
            <button
              onClick={() => setRecentAlertBanner(null)}
              className="text-xs bg-white/20 hover:bg-white/30 text-white font-bold px-2.5 py-1 rounded-md transition"
            >
              Đóng ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
        {/* Status Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pb-6 border-b border-slate-800">
          {STATUS_FILTERS.map((f) => {
            const isActive = activeFilter === f.key;
            const count = f.key === 'ALL'
              ? orders.length
              : orders.filter((o) => o.status === f.key).length;

            return (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/40 ring-2 ring-orange-400/30'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
                }`}
              >
                <span>{f.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-orange-800 text-white' : 'bg-slate-900 text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Orders Grid / List */}
        {loading && orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mb-3" />
            <p className="text-sm">Đang tải danh sách đơn...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center text-slate-400 my-8">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-base font-semibold text-slate-200">Không có đơn hàng nào ở trạng thái này</p>
            <p className="text-xs text-slate-500 mt-1">Đơn hàng mới từ khách sẽ tự động hiển thị tại đây.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-6">
            {filteredOrders.map((order) => {
              const isNewlyArrived = newOrderNumbers.has(order.orderNumber);

              return (
                <div
                  key={order.id}
                  className={`rounded-2xl border p-5 shadow-lg transition-all duration-500 flex flex-col justify-between ${
                    isNewlyArrived
                      ? 'border-orange-500 bg-slate-950 ring-2 ring-orange-500/50 shadow-orange-950/50'
                      : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-orange-400 bg-orange-950/60 px-2 py-0.5 rounded border border-orange-900/80">
                          {order.orderNumber}
                        </span>

                        {/* Visual Alert Badge for newly arrived orders */}
                        {isNewlyArrived && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-red-600 text-white animate-pulse shadow">
                            🔔 Mới
                          </span>
                        )}
                      </div>

                      {getStatusBadge(order.status)}
                    </div>

                    <div className="mb-4">
                      <div className="text-base font-bold text-white flex items-center justify-between">
                        <span>{order.customerName}</span>
                        <span className="text-xs font-normal text-slate-400">
                          {order.fulfillmentType === 'DELIVERY' ? '🛵 Giao hàng' : '🛍️ Lấy tại quán'}
                        </span>
                      </div>
                      {order.customerPhone && (
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center justify-between">
                          <span>📞 {order.customerDialCode ? `${order.customerDialCode} ` : ''}{order.customerPhone}</span>
                          {order.preferredContactChannel === 'WHATSAPP' && (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-900">
                              💬 WhatsApp
                            </span>
                          )}
                        </div>
                      )}
                      {(order.hotelOrBuildingName || order.roomOrFloorNumber) && (
                        <div className="text-[11px] text-amber-300 mt-1 font-medium bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40">
                          🏨 {order.hotelOrBuildingName}{order.roomOrFloorNumber ? ` - ${order.roomOrFloorNumber}` : ''}
                        </div>
                      )}
                      {order.deliveryAddress && (
                        <div className="text-xs text-slate-400 mt-1 line-clamp-1">📍 {order.deliveryAddress}</div>
                      )}
                    </div>

                    <div className="flex items-center justify-between py-2 border-t border-slate-800/80 text-xs text-slate-300">
                      <span>Số lượng món: <strong>{order.itemCount} món</strong></span>
                      <span className="font-extrabold text-orange-400 text-sm">
                        {order.total.toLocaleString('vi-VN')} {order.currency}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      {new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <Link
                      to={`/staff/orders/${order.orderNumber}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow transition"
                    >
                      Xem chi tiết bếp →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
