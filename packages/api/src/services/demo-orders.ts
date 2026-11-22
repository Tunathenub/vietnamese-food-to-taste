import type { OrderStatus } from '@vft/shared';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_FILE = path.join(__dirname, '..', '..', '.demo-orders-cache.json');

export interface DemoOrderItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: string;
  paymentMethod: string;
  fulfillmentType: string;
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
  subtotal: number;
  customizationTotal: number;
  deliveryFee: number;
  discountTotal: number;
  total: number;
  currency: string;
  itemCount: number;
  items?: Array<{
    dishName: string;
    quantity: number;
    finalUnitPrice: number;
    lineTotal: number;
    notes?: string;
    specialNotes?: string;
    tasteCustomizations?: any[];
    ingredientCustomizations?: any[];
    substitutions?: any[];
  }>;
  statusHistory?: Array<{
    fromStatus: string | null;
    toStatus: string;
    actor: string;
    actorType?: string;
    reason?: string | null;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt?: string;
}

const DEFAULT_SEED_ORDERS: DemoOrderItem[] = [
  {
    id: 'ord-101',
    orderNumber: 'VFT-20261117-001',
    status: 'PENDING',
    paymentStatus: 'UNPAID',
    paymentMethod: 'CASH_ON_DELIVERY',
    fulfillmentType: 'DELIVERY',
    customerName: 'Min-jun Kim (Hàn Quốc)',
    customerPhone: '1087654321',
    customerDialCode: '+82',
    customerCountryCode: 'KR',
    preferredContactChannel: 'WHATSAPP',
    isWhatsAppAvailable: true,
    hotelOrBuildingName: 'Tòa nhà Lancaster',
    roomOrFloorNumber: 'Phòng 402',
    deliveryAddress: '20 Núi Trúc, Ba Đình, Hà Nội',
    customerNotes: 'Vui lòng gửi lễ tân khách sạn nếu không gọi được, cho nhiều ớt tươi.',
    subtotal: 130000,
    customizationTotal: 0,
    deliveryFee: 15000,
    discountTotal: 0,
    total: 145000,
    currency: 'VND',
    itemCount: 2,
    items: [
      {
        dishName: 'Bún Chả Hà Nội',
        quantity: 2,
        finalUnitPrice: 65000,
        lineTotal: 130000,
        specialNotes: 'Ăn kèm bún lá chần nóng',
        tasteCustomizations: [
          { attribute: 'Độ ngọt nước chấm', chosenValue: 2, customerLabel: 'Ngọt vừa', kitchenInstruction: 'Nước chấm ngọt vừa chuẩn vị' },
          { attribute: 'Độ cay', chosenValue: 4, customerLabel: 'Cay nồng (Gu Hàn Quốc)', kitchenInstruction: 'Thêm ớt tươi cắt lát & sa tế' },
        ],
        ingredientCustomizations: [],
        substitutions: [],
      },
    ],
    statusHistory: [
      { fromStatus: null, toStatus: 'PENDING', actor: 'CUSTOMER', reason: 'Khách hàng hoàn tất gửi đơn online', createdAt: new Date(Date.now() - 5 * 60000).toISOString() },
    ],
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: 'ord-102',
    orderNumber: 'VFT-20261117-002',
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    paymentMethod: 'CREDIT_CARD',
    fulfillmentType: 'PICKUP',
    customerName: 'Sarah Jenkins (Mỹ)',
    customerPhone: '0912345678',
    customerDialCode: '+1',
    customerCountryCode: 'US',
    preferredContactChannel: 'PHONE_CALL',
    isWhatsAppAvailable: false,
    deliveryAddress: undefined,
    customerNotes: 'Không cho ớt, hành tây trần chín tái',
    subtotal: 70000,
    customizationTotal: 0,
    deliveryFee: 0,
    discountTotal: 0,
    total: 70000,
    currency: 'VND',
    itemCount: 1,
    items: [
      {
        dishName: 'Phở Bò Hà Nội',
        quantity: 1,
        finalUnitPrice: 70000,
        lineTotal: 70000,
        specialNotes: 'Không cay, hành tây trần kỹ',
        tasteCustomizations: [
          { attribute: 'Độ mặn nước dùng', chosenValue: 1, customerLabel: 'Nhạt thanh (Tây Âu)', kitchenInstruction: 'Nước dùng nhạt bớt muối' },
          { attribute: 'Độ cay', chosenValue: 0, customerLabel: 'Không cay', kitchenInstruction: 'Tuyệt đối không cho ớt' },
        ],
        ingredientCustomizations: [],
        substitutions: [],
      },
    ],
    statusHistory: [
      { fromStatus: null, toStatus: 'PENDING', actor: 'CUSTOMER', reason: 'Tạo đơn mang về', createdAt: new Date(Date.now() - 18 * 60000).toISOString() },
      { fromStatus: 'PENDING', toStatus: 'CONFIRMED', actor: 'STAFF', reason: 'Bếp đã nhận đơn', createdAt: new Date(Date.now() - 15 * 60000).toISOString() },
    ],
    createdAt: new Date(Date.now() - 18 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: 'ord-103',
    orderNumber: 'VFT-20261117-003',
    status: 'PREPARING',
    paymentStatus: 'UNPAID',
    paymentMethod: 'CASH_ON_DELIVERY',
    fulfillmentType: 'DELIVERY',
    customerName: 'Kenji Sato (Nhật Bản)',
    customerPhone: '0933221144',
    customerDialCode: '+81',
    customerCountryCode: 'JP',
    preferredContactChannel: 'WHATSAPP',
    isWhatsAppAvailable: true,
    hotelOrBuildingName: 'Khách sạn Daewoo',
    roomOrFloorNumber: 'Phòng 812',
    deliveryAddress: '360 Kim Mã, Ba Đình, Hà Nội',
    subtotal: 195000,
    customizationTotal: 0,
    deliveryFee: 15000,
    discountTotal: 0,
    total: 210000,
    currency: 'VND',
    itemCount: 3,
    items: [
      {
        dishName: 'Bún Chả Hà Nội',
        quantity: 3,
        finalUnitPrice: 65000,
        lineTotal: 195000,
        specialNotes: 'Nước chấm thanh nhẹ chuẩn vị Nhật',
        tasteCustomizations: [
          { attribute: 'Độ chua', chosenValue: 1, customerLabel: 'Chua thanh nhẹ', kitchenInstruction: 'Giảm giấm tỏi' },
        ],
        ingredientCustomizations: [],
        substitutions: [],
      },
    ],
    statusHistory: [
      { fromStatus: null, toStatus: 'PENDING', actor: 'CUSTOMER', createdAt: new Date(Date.now() - 25 * 60000).toISOString() },
      { fromStatus: 'PENDING', toStatus: 'CONFIRMED', actor: 'STAFF', createdAt: new Date(Date.now() - 22 * 60000).toISOString() },
      { fromStatus: 'CONFIRMED', toStatus: 'PREPARING', actor: 'STAFF', reason: 'Đang nướng chả than hoa', createdAt: new Date(Date.now() - 10 * 60000).toISOString() },
    ],
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 60000).toISOString(),
  },
  {
    id: 'ord-104',
    orderNumber: 'VFT-20261117-004',
    status: 'READY',
    paymentStatus: 'PAID',
    paymentMethod: 'CREDIT_CARD',
    fulfillmentType: 'DELIVERY',
    customerName: 'Nguyễn Văn Hùng',
    customerPhone: '0904556677',
    customerDialCode: '+84',
    customerCountryCode: 'VN',
    deliveryAddress: '15 Tạ Hiện, Hoàn Kiếm, Hà Nội',
    subtotal: 105000,
    customizationTotal: 0,
    deliveryFee: 15000,
    discountTotal: 0,
    total: 120000,
    currency: 'VND',
    itemCount: 2,
    items: [
      {
        dishName: 'Bún Chả Hà Nội',
        quantity: 1,
        finalUnitPrice: 65000,
        lineTotal: 65000,
        tasteCustomizations: [],
        ingredientCustomizations: [],
        substitutions: [],
      },
      {
        dishName: 'Nem Rán Hà Nội (3 chiếc)',
        quantity: 1,
        finalUnitPrice: 40000,
        lineTotal: 40000,
        tasteCustomizations: [],
        ingredientCustomizations: [],
        substitutions: [],
      },
    ],
    statusHistory: [
      { fromStatus: null, toStatus: 'PENDING', actor: 'CUSTOMER', createdAt: new Date(Date.now() - 45 * 60000).toISOString() },
      { fromStatus: 'PENDING', toStatus: 'CONFIRMED', actor: 'STAFF', createdAt: new Date(Date.now() - 40 * 60000).toISOString() },
      { fromStatus: 'CONFIRMED', toStatus: 'PREPARING', actor: 'STAFF', createdAt: new Date(Date.now() - 30 * 60000).toISOString() },
      { fromStatus: 'PREPARING', toStatus: 'READY', actor: 'STAFF', reason: 'Đóng hộp xong sẵn sàng giao', createdAt: new Date(Date.now() - 5 * 60000).toISOString() },
    ],
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: 'ord-105',
    orderNumber: 'VFT-20261117-005',
    status: 'COMPLETED',
    paymentStatus: 'PAID',
    paymentMethod: 'CASH_ON_DELIVERY',
    fulfillmentType: 'PICKUP',
    customerName: 'David Lee (Singapore)',
    customerPhone: '0944112233',
    customerDialCode: '+65',
    customerCountryCode: 'SG',
    deliveryAddress: undefined,
    subtotal: 65000,
    customizationTotal: 0,
    deliveryFee: 0,
    discountTotal: 0,
    total: 65000,
    currency: 'VND',
    itemCount: 1,
    items: [
      {
        dishName: 'Bún Chả Hà Nội',
        quantity: 1,
        finalUnitPrice: 65000,
        lineTotal: 65000,
        tasteCustomizations: [],
        ingredientCustomizations: [],
        substitutions: [],
      },
    ],
    statusHistory: [
      { fromStatus: null, toStatus: 'PENDING', actor: 'CUSTOMER', createdAt: new Date(Date.now() - 90 * 60000).toISOString() },
      { fromStatus: 'PENDING', toStatus: 'COMPLETED', actor: 'STAFF', reason: 'Khách đã nhận món tại quầy', createdAt: new Date(Date.now() - 60 * 60000).toISOString() },
    ],
    createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 60 * 60000).toISOString(),
  },
];

// In-Memory store backed by persistent cache file
const memoryOrders: Map<string, DemoOrderItem> = new Map();

function saveToDisk(): void {
  try {
    const list = Array.from(memoryOrders.values());
    fs.writeFileSync(CACHE_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[demo-orders] Could not save orders to disk:', err);
  }
}

function loadFromDisk(): void {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf-8');
      const list = JSON.parse(data) as DemoOrderItem[];
      if (Array.isArray(list) && list.length > 0) {
        for (const item of list) {
          memoryOrders.set(item.orderNumber, item);
        }
        // Ensure default seed orders are present if missing
        for (const seed of DEFAULT_SEED_ORDERS) {
          if (!memoryOrders.has(seed.orderNumber)) {
            memoryOrders.set(seed.orderNumber, seed);
          }
        }
        return;
      }
    }
  } catch (err) {
    console.warn('[demo-orders] Could not load orders from disk:', err);
  }

  // Populate defaults
  for (const seed of DEFAULT_SEED_ORDERS) {
    memoryOrders.set(seed.orderNumber, seed);
  }
}

// Initial load
loadFromDisk();

export const demoOrderStore = {
  getAll(): DemoOrderItem[] {
    return Array.from(memoryOrders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  get(orderNumber: string): DemoOrderItem | undefined {
    return memoryOrders.get(orderNumber);
  },

  add(order: DemoOrderItem): void {
    memoryOrders.set(order.orderNumber, order);
    saveToDisk();
  },

  updateStatus(orderNumber: string, status: OrderStatus, reason?: string): DemoOrderItem | null {
    const existing = memoryOrders.get(orderNumber);
    if (!existing) return null;

    const fromStatus = existing.status;
    existing.status = status;
    existing.updatedAt = new Date().toISOString();
    if (!existing.statusHistory) existing.statusHistory = [];
    existing.statusHistory.push({
      fromStatus,
      toStatus: status,
      actor: 'STAFF',
      actorType: 'STAFF',
      reason,
      createdAt: new Date().toISOString(),
    });

    memoryOrders.set(orderNumber, existing);
    saveToDisk();
    return existing;
  },
};
