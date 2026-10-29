// ── Enums ──

export const TasteProfileType = {
  COUNTRY: 'COUNTRY',
  REGION: 'REGION',
  CUSTOM: 'CUSTOM',
} as const;
export type TasteProfileType = (typeof TasteProfileType)[keyof typeof TasteProfileType];

export const IngredientRole = {
  REQUIRED: 'REQUIRED',
  REMOVABLE: 'REMOVABLE',
  OPTIONAL: 'OPTIONAL',
} as const;
export type IngredientRole = (typeof IngredientRole)[keyof typeof IngredientRole];

export const OrderStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentStatus = {
  UNPAID: 'UNPAID',
  PAID: 'PAID',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const FulfillmentType = {
  DELIVERY: 'DELIVERY',
  PICKUP: 'PICKUP',
} as const;
export type FulfillmentType = (typeof FulfillmentType)[keyof typeof FulfillmentType];

export const PaymentMethod = {
  CASH_ON_DELIVERY: 'CASH_ON_DELIVERY',
  CASH_ON_PICKUP: 'CASH_ON_PICKUP',
  MOCK_PAYMENT: 'MOCK_PAYMENT',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const UserRole = {
  CUSTOMER: 'CUSTOMER',
  STAFF: 'STAFF',
  ADMIN: 'ADMIN',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// ── API Response Types ──

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ── Taste Types ──

export interface TasteAttribute {
  id: string;
  code: string;
  name: string;
  minValue: number;
  maxValue: number;
}

export interface TasteProfileSummary {
  id: string;
  code: string;
  name: string;
  type: TasteProfileType;
  countryCode: string | null;
  description: string | null;
}

export interface TasteProfileDetail extends TasteProfileSummary {
  attributes: Record<string, number>;
}

// ── Dish Types ──

export interface DishSummary {
  id: string;
  slug: string;
  name: string;
  category: string;
  basePrice: number;
  currency: string;
  isAvailable: boolean;
}

export interface DishDetail extends DishSummary {
  tasteConfigurations: DishTasteConfig[];
  ingredients: DishIngredient[];
  substitutions: DishSubstitution[];
}

export interface DishTasteConfig {
  attributeCode: string;
  attributeName: string;
  baseValue: number;
  minValue: number;
  maxValue: number;
  isAdjustable: boolean;
  options: DishTasteOption[];
}

export interface DishTasteOption {
  value: number;
  customerLabel: string;
  priceDelta: number;
}

export interface DishIngredient {
  ingredientId: string;
  name: string;
  role: IngredientRole;
  defaultQuantity: number;
  minQuantity: number;
  maxQuantity: number;
  unit: string;
  priceDeltaPerStep: number;
  isQuantityAdjustable: boolean;
  isAvailable: boolean;
}

export interface DishSubstitution {
  id: string;
  originalIngredientId: string;
  originalIngredientName: string;
  substituteIngredientId: string;
  substituteIngredientName: string;
  reason: string | null;
  priceDelta: number;
  isAvailable: boolean;
}

// ── Order Types ──

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  fulfillmentType: FulfillmentType;
  subtotal: number;
  customizationTotal: number;
  deliveryFee: number;
  discountTotal: number;
  total: number;
  currency: string;
  createdAt: string;
}

// ── Cart Types (client-side) ──

export interface CartItem {
  dishId: string;
  dishName: string;
  dishSlug: string;
  quantity: number;
  basePrice: number;
  currency: string;
  tasteProfileCode?: string;
  tasteValues: Record<string, number>;
  ingredientQuantities: Record<string, number>;
  substitutionIds: string[];
  notes: string;
}
