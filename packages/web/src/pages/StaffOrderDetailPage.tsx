import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router';
import { api } from '../lib/api-client';

interface KitchenTasteItem {
  attribute: string;
  chosenValue: number;
  customerLabel?: string;
  kitchenInstruction?: string;
}

interface KitchenIngredientItem {
  ingredient: string;
  action: string;
  selectedQuantity: number;
  unit: string;
  kitchenInstruction?: string;
}

interface KitchenSubstitutionItem {
  original: string;
  substitute: string;
  kitchenInstruction?: string;
}

interface StaffOrderItemDetail {
  dish: string;
  quantity: number;
  finalUnitPrice: number;
  lineTotal: number;
  specialNotes?: string;
  tasteCustomizations: KitchenTasteItem[];
  ingredientCustomizations: KitchenIngredientItem[];
  substitutions: KitchenSubstitutionItem[];
}

interface StaffOrderDetail {
  orderNumber: string;
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  paymentStatus: string;
  fulfillmentType: 'DELIVERY' | 'PICKUP';
  subtotal: number;
  deliveryFee: number;
  total: number;
  currency: string;
  customerName: string;
  customerPhone?: string;
  customerDialCode?: string;
  customerCountryCode?: string;
  preferredContactChannel?: string;
  isWhatsAppAvailable?: boolean;
  hotelOrBuildingName?: string;
  roomOrFloorNumber?: string;
  whatsAppDirectUrl?: string | null;
  customerEmail?: string;
  deliveryAddress?: string;
  customerNotes?: string;
  cancellationReason?: string | null;
  items: StaffOrderItemDetail[];
  statusHistory: Array<{
    fromStatus: string | null;
    toStatus: string;
    actor: string;
    actorType: string;
    reason?: string | null;
    createdAt: string;
  }>;
}

const FALLBACK_DETAIL: StaffOrderDetail = {
  orderNumber: 'VFT-20261117-001',
  status: 'PENDING',
  paymentStatus: 'UNPAID',
  fulfillmentType: 'DELIVERY',
  subtotal: 130000,
  deliveryFee: 15000,
  total: 145000,
  currency: 'VND',
  customerName: 'Min-jun Kim (Hàn Quốc)',
  customerPhone: '1087654321',
  customerDialCode: '+82',
  customerCountryCode: 'KR',
  preferredContactChannel: 'WHATSAPP',
  isWhatsAppAvailable: true,
  hotelOrBuildingName: 'Tòa nhà Lancaster',
  roomOrFloorNumber: 'Phòng 402, Tầng 4',
  whatsAppDirectUrl: 'https://wa.me/821087654321',
  customerEmail: 'minjun.kim@example.kr',
  deliveryAddress: '20 Núi Trúc, Ba Đình, Hà Nội',
  customerNotes: 'Vui lòng gửi lễ tân khách sạn nếu không gọi được, cho nhiều ớt tươi.',
  cancellationReason: null,
  items: [
    {
      dish: 'Phở Bò Hà Nội',
      quantity: 1,
      finalUnitPrice: 85000,
      lineTotal: 85000,
      specialNotes: 'Bánh phở chần kỹ mềm tay',
      tasteCustomizations: [
        {
          attribute: 'Độ cay (Spice level)',
          chosenValue: 4,
          customerLabel: 'Cay nồng (Gu Hàn Quốc)',
          kitchenInstruction: '🌶️ KITCHEN: Cho 1 muỗng ớt sa tế + 5 lát ớt tươi',
        },
        {
          attribute: 'Độ mặn mắm (Fish sauce)',
          chosenValue: 2,
          customerLabel: 'Mắm nhẹ thanh',
          kitchenInstruction: '🐟 KITCHEN: Giảm 30% nước cốt mắm trong tô, chan nước dùng thanh',
        },
        {
          attribute: 'Rau thơm (Herbs)',
          chosenValue: 4,
          customerLabel: 'Đầy đủ rau thơm',
          kitchenInstruction: '🌿 KITCHEN: Full hành hoa, ngò gai, húng quế',
        },
      ],
      ingredientCustomizations: [
        {
          ingredient: 'Thịt bò tươi thái mỏng',
          action: 'INCREASED',
          selectedQuantity: 2,
          unit: 'phần',
          kitchenInstruction: '🥩 KITCHEN: Thêm 1 phần bò tái mềm (+25.000đ)',
        },
      ],
      substitutions: [],
    },
    {
      dish: 'Bánh Mì Kẹp Đặc Biệt',
      quantity: 1,
      finalUnitPrice: 45000,
      lineTotal: 45000,
      specialNotes: 'Nướng thật giòn vỏ bánh',
      tasteCustomizations: [
        {
          attribute: 'Độ cay (Spice level)',
          chosenValue: 3,
          customerLabel: 'Cay vừa',
          kitchenInstruction: '🌶️ KITCHEN: 1 đường tương ớt cay nồng',
        },
      ],
      ingredientCustomizations: [
        {
          ingredient: 'Rau mùi (Ngò rí)',
          action: 'REMOVED',
          selectedQuantity: 0,
          unit: 'phần',
          kitchenInstruction: '🚫 KITCHEN: Không cho rau mùi / ngò rí',
        },
      ],
      substitutions: [
        {
          original: 'Thịt ba chỉ nướng',
          substitute: 'Đậu phụ nấm chiên giòn',
          kitchenInstruction: '🌱 KITCHEN: Thay thịt lợn bằng đậu phụ áp chảo xốt nấm',
        },
      ],
    },
  ],
  statusHistory: [
    {
      fromStatus: null,
      toStatus: 'PENDING',
      actor: 'CUSTOMER',
      actorType: 'CUSTOMER',
      reason: 'Khách hàng hoàn tất gửi đơn online',
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
  ],
};

const ALLOWED_TRANSITIONS: Record<string, Array<{ status: StaffOrderDetail['status']; label: string; color: string }>> = {
  PENDING: [
    { status: 'CONFIRMED', label: '✅ Xác nhận đơn', color: 'bg-blue-600 hover:bg-blue-500' },
    { status: 'CANCELLED', label: '❌ Hủy đơn', color: 'bg-red-600 hover:bg-red-500' },
  ],
  CONFIRMED: [
    { status: 'PREPARING', label: '🍳 Bắt đầu nấu', color: 'bg-orange-600 hover:bg-orange-500' },
    { status: 'CANCELLED', label: '❌ Hủy đơn', color: 'bg-red-600 hover:bg-red-500' },
  ],
  PREPARING: [
    { status: 'READY', label: '📦 Món đã sẵn sàng', color: 'bg-purple-600 hover:bg-purple-500' },
  ],
  READY: [
    { status: 'COMPLETED', label: '🎉 Hoàn tất đơn hàng', color: 'bg-emerald-600 hover:bg-emerald-500' },
  ],
  COMPLETED: [],
  CANCELLED: [],
};

export function StaffOrderDetailPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [order, setOrder] = useState<StaffOrderDetail>(FALLBACK_DETAIL);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const fetchOrderDetail = useCallback(async () => {
    if (!orderNumber) return;
    setLoading(true);
    try {
      const res = await api.get<{ order: StaffOrderDetail }>(`/staff/orders/${orderNumber}`);
      if (res.data?.order) {
        setOrder(res.data.order);
      } else {
        setOrder({
          ...FALLBACK_DETAIL,
          orderNumber,
        });
      }
    } catch (err) {
      console.warn('API error fetching staff order detail, using mock:', err);
      setOrder({
        ...FALLBACK_DETAIL,
        orderNumber,
      });
    } finally {
      setLoading(false);
    }
  }, [orderNumber]);

  useEffect(() => {
    fetchOrderDetail();
  }, [fetchOrderDetail]);

  const handleUpdateStatus = async (targetStatus: StaffOrderDetail['status'], reason?: string) => {
    if (!orderNumber) return;
    setUpdating(true);
    try {
      const res = await api.patch<{ success: boolean; status: StaffOrderDetail['status'] }>(
        `/staff/orders/${orderNumber}/status`,
        {
          status: targetStatus,
          reason: reason || `Nhân viên chuyển trạng thái sang ${targetStatus}`,
        }
      );

      if (res.error) {
        alert(`Lỗi: ${res.error.message || 'Không thể chuyển trạng thái đơn'}`);
      }
    } catch (err) {
      console.warn('Offline mode: updating status locally in UI state:', err);
    }

    // Always update local state for responsive demo/testing
    setOrder((prev) => ({
      ...prev,
      status: targetStatus,
      cancellationReason: targetStatus === 'CANCELLED' ? (reason || 'Hủy bởi nhà hàng') : prev.cancellationReason,
      statusHistory: [
        {
          fromStatus: prev.status,
          toStatus: targetStatus,
          actor: 'STAFF',
          actorType: 'STAFF',
          reason: reason || `Nhân viên chuyển sang ${targetStatus}`,
          createdAt: new Date().toISOString(),
        },
        ...prev.statusHistory,
      ],
    }));

    setUpdating(false);
    setCancelModalOpen(false);
    setCancelReason('');
  };

  const getStatusBadge = (status: StaffOrderDetail['status']) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-900/60 text-amber-300 border border-amber-600">⏳ Chờ duyệt</span>;
      case 'CONFIRMED':
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-900/60 text-blue-300 border border-blue-600">✅ Đã nhận đơn</span>;
      case 'PREPARING':
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-orange-900/60 text-orange-300 border border-orange-600 animate-pulse">🍳 Đang nấu</span>;
      case 'READY':
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-purple-900/60 text-purple-300 border border-purple-600">📦 Đã xong món</span>;
      case 'COMPLETED':
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-600">🎉 Đã hoàn tất</span>;
      case 'CANCELLED':
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-900/60 text-red-300 border border-red-600">❌ Đã hủy đơn</span>;
      default:
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  const transitions = ALLOWED_TRANSITIONS[order.status] || [];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-16">
      {/* Top Bar */}
      <div className="border-b border-slate-800 bg-slate-950/80 backdrop-blur px-4 py-4 sm:px-8">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/staff/orders"
              className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 transition"
            >
              ← Danh sách đơn
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white">
                  Đơn hàng: <span className="text-orange-400 font-mono">{order.orderNumber}</span>
                </h1>
                {getStatusBadge(order.status)}
              </div>
            </div>
          </div>

          {/* Action Transition Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {transitions.length > 0 ? (
              transitions.map((t) => (
                <button
                  key={t.status}
                  disabled={updating}
                  onClick={() => {
                    if (t.status === 'CANCELLED') {
                      setCancelModalOpen(true);
                    } else {
                      handleUpdateStatus(t.status);
                    }
                  }}
                  className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-lg transition disabled:opacity-50 ${t.color}`}
                >
                  {updating ? 'Đang cập nhật...' : t.label}
                </button>
              ))
            ) : (
              <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                🔒 Đơn đã ở trạng thái kết thúc ({order.status})
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column: Kitchen Instructions & Items (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>👨‍🍳</span> CHI TIẾT NẤU NƯỚNG & HƯỚNG DẪN BẾP
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Mỗi món được gia giảm gia vị, thêm bớt nguyên liệu theo đúng khẩu vị khách yêu cầu
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-orange-950 text-orange-400 border border-orange-900">
                  {order.items.length} món cần làm
                </span>
              </div>

              <div className="space-y-6">
                {order.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-white">{item.dish}</span>
                          <span className="rounded bg-orange-600 px-2 py-0.5 text-xs font-bold text-white">
                            x{item.quantity}
                          </span>
                        </div>
                        {item.specialNotes && (
                          <div className="text-xs text-amber-300 mt-1 italic flex items-center gap-1">
                            <span>📝 Ghi chú:</span> {item.specialNotes}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-extrabold text-orange-400">
                          {item.lineTotal.toLocaleString('vi-VN')} {order.currency}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          ({item.finalUnitPrice.toLocaleString('vi-VN')} / món)
                        </div>
                      </div>
                    </div>

                    {/* Kitchen Instructions Section */}
                    <div className="rounded-xl bg-slate-950 p-4 border border-orange-950 space-y-3">
                      <div className="text-[11px] font-bold text-orange-400 tracking-wider uppercase flex items-center gap-1.5">
                        <span>🔥</span> Chỉ dẫn chế biến cho đầu bếp:
                      </div>

                      {/* Taste Customizations */}
                      {item.tasteCustomizations.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-xs font-semibold text-slate-300">Gia giảm vị:</div>
                          <div className="grid grid-cols-1 gap-2">
                            {item.tasteCustomizations.map((tc, tcIdx) => (
                              <div
                                key={tcIdx}
                                className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg bg-slate-900 px-3 py-2 text-xs border border-slate-800"
                              >
                                <div>
                                  <span className="font-medium text-slate-200">{tc.attribute}: </span>
                                  <span className="text-orange-300 font-bold">{tc.customerLabel || `Mức ${tc.chosenValue}`}</span>
                                </div>
                                {tc.kitchenInstruction && (
                                  <div className="text-amber-300 font-bold mt-1 sm:mt-0 font-mono text-[11px] bg-amber-950/80 px-2 py-0.5 rounded border border-amber-900/60">
                                    {tc.kitchenInstruction}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Ingredient Customizations */}
                      {item.ingredientCustomizations.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-slate-900">
                          <div className="text-xs font-semibold text-slate-300">Topping & Nguyên liệu:</div>
                          <div className="grid grid-cols-1 gap-2">
                            {item.ingredientCustomizations.map((ic, icIdx) => (
                              <div
                                key={icIdx}
                                className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg bg-slate-900 px-3 py-2 text-xs border border-slate-800"
                              >
                                <div>
                                  <span className="font-medium text-slate-200">{ic.ingredient}: </span>
                                  <span className="text-orange-300 font-bold">
                                    {ic.action === 'REMOVED' ? 'Bỏ bớt (0)' : `${ic.selectedQuantity} ${ic.unit}`}
                                  </span>
                                </div>
                                {ic.kitchenInstruction && (
                                  <div className="text-emerald-300 font-bold mt-1 sm:mt-0 font-mono text-[11px] bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-900/60">
                                    {ic.kitchenInstruction}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Substitutions */}
                      {item.substitutions.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-slate-900">
                          <div className="text-xs font-semibold text-slate-300">Thay thế nguyên liệu:</div>
                          <div className="grid grid-cols-1 gap-2">
                            {item.substitutions.map((sub, sIdx) => (
                              <div
                                key={sIdx}
                                className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg bg-slate-900 px-3 py-2 text-xs border border-slate-800"
                              >
                                <div>
                                  <span className="text-slate-400 line-through mr-1">{sub.original}</span>
                                  <span className="text-emerald-400 font-bold">➔ {sub.substitute}</span>
                                </div>
                                {sub.kitchenInstruction && (
                                  <div className="text-emerald-300 font-bold mt-1 sm:mt-0 font-mono text-[11px] bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-900/60">
                                    {sub.kitchenInstruction}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status History Timeline */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 shadow-xl">
              <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <span>⏱️</span> Lịch sử tiến độ đơn hàng
              </h2>
              <div className="space-y-3">
                {order.statusHistory.map((h, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs border-l-2 border-orange-600 pl-3 py-1">
                    <div>
                      <div className="font-bold text-slate-200">
                        {h.fromStatus ? `${h.fromStatus} ➔ ` : ''}
                        <span className="text-orange-400">{h.toStatus}</span>
                        <span className="ml-2 text-[10px] text-slate-400 font-normal">
                          bởi [{h.actor}]
                        </span>
                      </div>
                      {h.reason && <p className="text-slate-400 mt-0.5">{h.reason}</p>}
                      <p className="text-[10px] text-slate-500 mt-1">
                        {new Date(h.createdAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Side Column: Customer & Delivery Info (1 Col) */}
          <div className="space-y-6">
            {/* Customer Box */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 shadow-xl space-y-4">
              <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <span>👤</span> Thông tin khách hàng
              </h2>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-slate-400">Họ và tên:</div>
                  <div className="font-bold text-white text-sm mt-0.5">{order.customerName}</div>
                </div>
                {order.customerPhone && (
                  <div>
                    <div className="text-slate-400">Số điện thoại liên hệ:</div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="font-bold text-orange-400 font-mono text-sm">
                        📞 {order.customerDialCode ? `${order.customerDialCode} ` : ''}{order.customerPhone}
                      </span>
                      {order.preferredContactChannel && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          order.preferredContactChannel === 'WHATSAPP'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-900'
                            : order.preferredContactChannel === 'ZALO'
                            ? 'bg-blue-950 text-blue-400 border border-blue-900'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {order.preferredContactChannel === 'WHATSAPP' ? '💬 WhatsApp' : order.preferredContactChannel === 'ZALO' ? '💬 Zalo' : '📞 Cuộc gọi'}
                        </span>
                      )}
                    </div>

                    {/* One-Click WhatsApp Action Button */}
                    {(order.isWhatsAppAvailable || order.preferredContactChannel === 'WHATSAPP' || (order.customerDialCode && order.customerDialCode !== '+84')) && (
                      <a
                        href={
                          order.whatsAppDirectUrl ||
                          `https://wa.me/${(order.customerDialCode || '').replace(/\+/g, '')}${(order.customerPhone || '').replace(/^0/, '')}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2.5 flex items-center justify-center gap-1.5 w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white shadow-md transition"
                      >
                        <span>💬</span> Mở chat WhatsApp với khách →
                      </a>
                    )}
                  </div>
                )}
                {order.customerEmail && (
                  <div>
                    <div className="text-slate-400">Email:</div>
                    <div className="text-slate-300 mt-0.5">{order.customerEmail}</div>
                  </div>
                )}
                <div>
                  <div className="text-slate-400">Hình thức nhận hàng:</div>
                  <div className="font-bold text-white mt-0.5">
                    {order.fulfillmentType === 'DELIVERY' ? '🛵 Giao hàng tận nơi' : '🛍️ Nhận tại nhà hàng'}
                  </div>
                </div>

                {/* Hotel & Room Structured Drop-off Info */}
                {(order.hotelOrBuildingName || order.roomOrFloorNumber) && (
                  <div className="rounded-xl bg-slate-900 p-3 border border-orange-950/80 space-y-1">
                    <div className="text-[11px] font-bold text-orange-400 flex items-center gap-1">
                      <span>🏨</span> ĐỊA ĐIỂM LƯU TRÚ CỦA KHÁCH:
                    </div>
                    {order.hotelOrBuildingName && (
                      <div className="text-white font-semibold text-xs">
                        Tên Khách sạn / Tòa nhà: <strong className="text-orange-300">{order.hotelOrBuildingName}</strong>
                      </div>
                    )}
                    {order.roomOrFloorNumber && (
                      <div className="text-slate-300 text-[11px]">
                        Phòng / Tầng: <strong className="text-emerald-400">{order.roomOrFloorNumber}</strong>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-500 mt-1 italic">
                      💡 Được phép gửi tại quầy lễ tân nếu gọi điện khách không bắt máy.
                    </p>
                  </div>
                )}

                {order.deliveryAddress && (
                  <div>
                    <div className="text-slate-400">Địa chỉ giao:</div>
                    <div className="text-slate-200 mt-0.5 font-medium leading-relaxed bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      📍 {order.deliveryAddress}
                    </div>
                  </div>
                )}
                {order.customerNotes && (
                  <div>
                    <div className="text-slate-400">Ghi chú từ khách:</div>
                    <div className="text-amber-200 mt-0.5 italic bg-amber-950/40 p-2.5 rounded-lg border border-amber-900/60">
                      "{order.customerNotes}"
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Summary Box */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 shadow-xl space-y-3 text-xs">
              <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <span>💳</span> Tổng thanh toán
              </h2>
              <div className="flex justify-between text-slate-300">
                <span>Tiền món:</span>
                <span>{order.subtotal.toLocaleString('vi-VN')} {order.currency}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Phí giao hàng:</span>
                <span>{order.deliveryFee.toLocaleString('vi-VN')} {order.currency}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-3 text-sm font-black text-white">
                <span>Tổng cộng:</span>
                <span className="text-orange-400">{order.total.toLocaleString('vi-VN')} {order.currency}</span>
              </div>
              <div className="pt-2">
                <span className={`inline-block px-2.5 py-1 rounded text-[11px] font-bold ${
                  order.paymentStatus === 'PAID'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-900'
                    : 'bg-amber-950 text-amber-400 border border-amber-900'
                }`}>
                  Trạng thái: {order.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán (COD)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
              <span>⚠️</span> Xác nhận hủy đơn hàng
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Vui lòng nhập lý do hủy đơn để thông báo cho khách hàng và lưu lại biên bản.
            </p>
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Lý do hủy đơn:
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ví dụ: Hết nguyên liệu bò tươi, quán quá tải giờ cao điểm..."
                className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-white focus:border-red-500 focus:outline-hidden"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={!cancelReason.trim()}
                onClick={() => handleUpdateStatus('CANCELLED', cancelReason)}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50"
              >
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
