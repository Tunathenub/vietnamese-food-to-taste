import { z } from 'zod';

// ── Taste Schemas ──

export const tasteValuesSchema = z.record(z.string(), z.number().int().min(0).max(5));

export const ingredientQuantitiesSchema = z.record(z.string(), z.number().int().min(0));

// ── Customization Validation ──

export const validateCustomizationSchema = z.object({
  tasteValues: tasteValuesSchema.optional().default({}),
  ingredientQuantities: ingredientQuantitiesSchema.optional().default({}),
  substitutionIds: z.array(z.string().uuid()).optional().default([]),
  notes: z.string().max(300).optional().default(''),
});

export type ValidateCustomizationInput = z.infer<typeof validateCustomizationSchema>;

// ── Customer Schema ──

export const customerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(254).optional(),
  phone: z.string().min(1).max(30),
  deliveryAddress: z.string().max(500).optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

// ── Order Item Schema ──

export const orderItemSchema = z.object({
  dishId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
  tasteProfileCode: z.string().optional(),
  tasteValues: tasteValuesSchema.optional().default({}),
  ingredientQuantities: ingredientQuantitiesSchema.optional().default({}),
  substitutionIds: z.array(z.string().uuid()).optional().default([]),
  configurationHash: z.string().optional(),
  notes: z.string().max(300).optional().default(''),
});

export type OrderItemInput = z.infer<typeof orderItemSchema>;

// ── Create Order Schema ──

export const createOrderSchema = z.object({
  customer: customerSchema,
  fulfillmentType: z.enum(['DELIVERY', 'PICKUP']),
  paymentMethod: z.enum(['CASH_ON_DELIVERY', 'CASH_ON_PICKUP', 'MOCK_PAYMENT']),
  customerNotes: z.string().max(500).optional().default(''),
  items: z.array(orderItemSchema).min(1),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// ── Order Lookup Schema ──

export const orderLookupSchema = z.object({
  orderNumber: z.string().min(1),
  phone: z.string().min(1).max(30),
});

export type OrderLookupInput = z.infer<typeof orderLookupSchema>;

// ── Staff Status Change Schema ──

export const changeOrderStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED']),
  reason: z.string().max(500).optional(),
});

export type ChangeOrderStatusInput = z.infer<typeof changeOrderStatusSchema>;

// ── Query Params ──

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const menuQuerySchema = paginationSchema.extend({
  category: z.string().optional(),
  search: z.string().optional(),
  tasteProfileCode: z.string().optional(),
});

export type MenuQueryInput = z.infer<typeof menuQuerySchema>;
