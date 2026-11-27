import { Router } from 'express';
import crypto from 'node:crypto';
import { validate } from '../middleware/validate.js';
import { createOrderSchema, orderLookupSchema } from '@vft/shared/schemas';
import { prisma } from '../lib/prisma.js';
import type { ApiResponse, OrderSummary } from '@vft/shared';
import { orderEvents } from '../services/order-events.js';
import { demoOrderStore, type DemoOrderItem } from '../services/demo-orders.js';
import { checkDatabaseReachability, normalizeDishSlug, withTimeout } from './dishes.js';

export const orderRoutes: Router = Router();

const FALLBACK_INGREDIENT_CODE_MAP: Record<string, string> = {
  'ing-beef': 'BEEF_SLICES',
  'di-pho-beef': 'BEEF_SLICES',
  'ing-pork': 'PORK_GRILLED',
  'di-bc-pork': 'PORK_GRILLED',
  'ing-pork-belly': 'PORK_BELLY',
  'di-bm-pork': 'PORK_BELLY',
  'ing-tofu': 'TOFU',
  'ing-chili': 'FRESH_CHILI',
  'di-pho-chili': 'FRESH_CHILI',
  'di-bc-chili': 'FRESH_CHILI',
  'ing-basil': 'THAI_BASIL',
  'di-pho-basil': 'THAI_BASIL',
  'ing-cilantro': 'CILANTRO',
  'di-bm-cilantro': 'CILANTRO',
};

// Helper to compute phone lookup hash
function getPhoneSecret(): string {
  const secret = process.env.PHONE_SECRET?.trim();
  if (process.env.NODE_ENV === 'production' && !secret) {
    throw new Error('PHONE_SECRET must be configured in production.');
  }
  return secret || 'vft_secret';
}

function hashDigits(digits: string): string {
  return crypto.createHmac('sha256', getPhoneSecret()).update(digits).digest('hex');
}

function hashPhone(phone: string): string {
  const normalized = phone.replace(/\D/g, '');
  return hashDigits(normalized);
}

function matchesPhoneHash(phone: string, customerDialCode: string | null | undefined, expectedHash: string): boolean {
  const rawDigits = phone.replace(/\D/g, '');
  if (!rawDigits) return false;

  const candidates = new Set<string>([rawDigits]);
  const dialDigits = (customerDialCode ?? '').replace(/\D/g, '');

  if (rawDigits.startsWith('0')) {
    candidates.add(rawDigits.slice(1));
  } else {
    candidates.add(`0${rawDigits}`);
  }

  if (dialDigits) {
    if (rawDigits.startsWith(dialDigits)) {
      const withoutDial = rawDigits.slice(dialDigits.length);
      if (withoutDial) {
        candidates.add(withoutDial);
        candidates.add(withoutDial.startsWith('0') ? withoutDial.slice(1) : `0${withoutDial}`);
      }
    } else {
      candidates.add(`${dialDigits}${rawDigits}`);
      if (rawDigits.startsWith('0')) {
        candidates.add(`${dialDigits}${rawDigits.slice(1)}`);
      }
    }
  }

  for (const candidate of candidates) {
    if (hashDigits(candidate) === expectedHash) {
      return true;
    }
  }
  return false;
}

function formatPrismaOrderDetail(order: any) {
  const items = (order.items ?? []).map((i: any) => ({
    dishName: i.dishNameSnapshot,
    dishSlug: i.dishSlugSnapshot,
    dishCategory: i.dishCategorySnapshot,
    quantity: i.quantity,
    basePrice: Number(i.basePriceSnapshot),
    customizationPrice: Number(i.customizationPrice),
    finalUnitPrice: Number(i.finalUnitPrice),
    lineTotal: Number(i.lineTotal),
    notes: i.notes ?? '',
    specialNotes: i.notes ?? '',
    tasteSelections: (i.tasteCustomizations ?? []).map((tc: any) => ({
      name: tc.attributeNameSnapshot,
      value: tc.selectedValue,
      label: tc.customerLabelSnapshot,
      kitchenInstruction: tc.kitchenInstructionSnapshot,
    })),
    ingredientChanges: (i.ingredientCustomizations ?? []).map((ic: any) => ({
      name: ic.ingredientNameSnapshot,
      action: ic.action,
      selectedQuantity: Number(ic.selectedQuantity),
      unit: ic.unit,
      kitchenInstruction: ic.kitchenInstructionSnapshot,
    })),
    substitutions: (i.substitutions ?? []).map((sub: any) => ({
      originalIngredient: sub.originalIngredientNameSnapshot,
      substituteIngredient: sub.substituteIngredientNameSnapshot,
      reason: sub.kitchenInstructionSnapshot,
    })),
  }));

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    fulfillmentType: order.fulfillmentType,
    subtotal: Number(order.subtotal),
    customizationTotal: Number(order.customizationTotal),
    deliveryFee: Number(order.deliveryFee),
    discountTotal: Number(order.discountTotal),
    total: Number(order.total),
    currency: order.currency,
    customerName: order.customerName,
    customerDialCode: order.customerDialCode,
    customerCountryCode: order.customerCountryCode,
    preferredContactChannel: order.preferredContactChannel,
    isWhatsAppAvailable: order.isWhatsAppAvailable,
    hotelOrBuildingName: order.hotelOrBuildingName,
    roomOrFloorNumber: order.roomOrFloorNumber,
    deliveryAddress: order.deliveryAddress,
    customerNotes: order.customerNotes ?? '',
    items,
    statusHistory: (order.statusHistory ?? []).map((h: any) => ({
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      actor: h.actor,
      reason: h.reason,
      createdAt: h.createdAt instanceof Date ? h.createdAt.toISOString() : h.createdAt,
    })),
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
    updatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : order.updatedAt,
  };
}

function formatDemoOrderDetail(demo: DemoOrderItem) {
  return {
    id: demo.id,
    orderNumber: demo.orderNumber,
    status: demo.status,
    paymentStatus: demo.paymentStatus,
    paymentMethod: demo.paymentMethod,
    fulfillmentType: demo.fulfillmentType,
    subtotal: demo.subtotal,
    customizationTotal: demo.customizationTotal,
    deliveryFee: demo.deliveryFee,
    discountTotal: demo.discountTotal,
    total: demo.total,
    currency: demo.currency,
    customerName: demo.customerName,
    customerDialCode: demo.customerDialCode ?? null,
    customerCountryCode: demo.customerCountryCode ?? null,
    preferredContactChannel: demo.preferredContactChannel,
    isWhatsAppAvailable: demo.isWhatsAppAvailable,
    hotelOrBuildingName: demo.hotelOrBuildingName ?? null,
    roomOrFloorNumber: demo.roomOrFloorNumber ?? null,
    deliveryAddress: demo.deliveryAddress ?? null,
    customerNotes: demo.customerNotes ?? '',
    items: (demo.items || []).map((i) => ({
      dishName: i.dishName,
      quantity: i.quantity,
      finalUnitPrice: i.finalUnitPrice,
      lineTotal: i.lineTotal,
      notes: i.notes ?? i.specialNotes ?? '',
      specialNotes: i.specialNotes ?? i.notes ?? '',
      tasteSelections: (i.tasteCustomizations || []).map((tc: any) => ({
        name: tc.attribute,
        value: tc.chosenValue,
        label: tc.customerLabel,
        kitchenInstruction: tc.kitchenInstruction,
      })),
      ingredientChanges: (i.ingredientCustomizations || []).map((ic: any) => ({
        name: ic.ingredient,
        action: ic.action,
        selectedQuantity: ic.selectedQuantity,
        unit: ic.unit,
        kitchenInstruction: ic.kitchenInstruction,
      })),
      substitutions: (i.substitutions || []).map((sub: any) => ({
        originalIngredient: sub.originalIngredient ?? sub.original ?? 'Nguyên bản',
        substituteIngredient: sub.substituteIngredient ?? sub.substitute ?? '',
        reason: sub.reason ?? sub.kitchenInstruction ?? '',
      })),
    })),
    statusHistory: demo.statusHistory ?? [],
    createdAt: demo.createdAt,
    updatedAt: demo.updatedAt ?? demo.createdAt,
  };
}

function createDemoOrder(
  customer: any,
  fulfillmentType: string,
  paymentMethod: string,
  customerNotes: string,
  items: any[]
): OrderSummary {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `VFT-${dateStr}-${randNum}`;
  const id = `demo-${randNum}`;

  let orderSubtotal = 0;
  let orderCustomizationTotal = 0;
  const deliveryFee = fulfillmentType === 'DELIVERY' ? 15000 : 0;
  const formattedItems: any[] = [];

  for (const item of items) {
    const dishIdStr = String(item.dishId || '').toLowerCase();
    const isBunCha = dishIdStr.includes('bun-cha');
    const isPho = dishIdStr.includes('pho');
    const isBanhMi = dishIdStr.includes('banh-mi');
    const dishName = isBunCha
      ? 'Bún Chả Hà Nội'
      : isPho
        ? 'Phở Bò Hà Nội'
        : isBanhMi
          ? 'Bánh Mì Kẹp Đặc Biệt'
          : 'Món Việt Đặc Biệt';
    const baseUnitPrice = isBunCha ? 60000 : isBanhMi ? 35000 : 65000;
    const qty = Number(item.quantity) || 1;
    const lineTotal = baseUnitPrice * qty;
    orderSubtotal += lineTotal;

    const tasteCustomizations = Object.entries(item.tasteValues || {}).map(([attribute, chosenValue]) => ({
      attribute,
      chosenValue: Number(chosenValue),
      customerLabel: `Mức ${chosenValue}`,
      kitchenInstruction: `Điều chỉnh ${attribute}: Mức ${chosenValue}`,
    }));

    const ingredientCustomizations = Object.entries(item.ingredientQuantities || {}).map(([ingredient, qty]) => ({
      ingredient,
      action: Number(qty) === 0 ? 'REMOVE' : 'CUSTOM',
      selectedQuantity: Number(qty),
      unit: 'phần',
      kitchenInstruction: `${ingredient}: ${qty}`,
    }));

    formattedItems.push({
      dishName,
      quantity: qty,
      finalUnitPrice: baseUnitPrice,
      lineTotal,
      specialNotes: item.notes || '',
      notes: item.notes || '',
      tasteCustomizations,
      ingredientCustomizations,
      substitutions: (item.substitutionIds || []).map((subId: string) => ({
        original: 'Nguyên bản',
        substitute: subId,
        kitchenInstruction: `Thay thế: ${subId}`,
      })),
    });
  }

  const total = orderSubtotal + orderCustomizationTotal + deliveryFee;

  const demoOrder: DemoOrderItem = {
    id,
    orderNumber,
    status: 'PENDING',
    paymentStatus: 'UNPAID',
    paymentMethod,
    fulfillmentType,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerDialCode: customer.dialCode ?? '+84',
    customerCountryCode: customer.countryCode ?? null,
    preferredContactChannel: customer.preferredContactChannel ?? 'PHONE_CALL',
    isWhatsAppAvailable: Boolean(customer.isWhatsAppAvailable),
    hotelOrBuildingName: customer.hotelOrBuildingName ?? null,
    roomOrFloorNumber: customer.roomOrFloorNumber ?? null,
    deliveryAddress: customer.deliveryAddress ?? null,
    subtotal: orderSubtotal,
    customizationTotal: orderCustomizationTotal,
    deliveryFee,
    discountTotal: 0,
    total,
    currency: 'VND',
    itemCount: items.reduce((sum: number, i: any) => sum + (Number(i.quantity) || 1), 0),
    items: formattedItems,
    statusHistory: [
      {
        fromStatus: 'INITIAL',
        toStatus: 'PENDING',
        actor: 'CUSTOMER',
        reason: 'Order placed by customer',
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
  };

  demoOrderStore.add(demoOrder);

  const summary: OrderSummary = {
    id: demoOrder.id,
    orderNumber: demoOrder.orderNumber,
    status: demoOrder.status,
    paymentStatus: demoOrder.paymentStatus as any,
    paymentMethod: demoOrder.paymentMethod as any,
    fulfillmentType: demoOrder.fulfillmentType as any,
    subtotal: demoOrder.subtotal,
    customizationTotal: demoOrder.customizationTotal,
    deliveryFee: demoOrder.deliveryFee,
    discountTotal: demoOrder.discountTotal,
    total: demoOrder.total,
    currency: demoOrder.currency,
    customerName: demoOrder.customerName,
    customerDialCode: demoOrder.customerDialCode,
    customerCountryCode: demoOrder.customerCountryCode,
    preferredContactChannel: demoOrder.preferredContactChannel as any,
    isWhatsAppAvailable: demoOrder.isWhatsAppAvailable,
    hotelOrBuildingName: demoOrder.hotelOrBuildingName,
    roomOrFloorNumber: demoOrder.roomOrFloorNumber,
    deliveryAddress: demoOrder.deliveryAddress,
    createdAt: demoOrder.createdAt,
  };

  orderEvents.emit('order:created', {
    orderNumber: summary.orderNumber,
    order: summary,
  });

  return summary;
}

// POST /api/orders
orderRoutes.post('/', validate(createOrderSchema), async (req, res, next) => {
  try {
    const idempotencyKey = (req.headers['idempotency-key'] as string) || undefined;
    const { customer, fulfillmentType, paymentMethod, customerNotes = '', items } = req.body;

    if (fulfillmentType === 'DELIVERY' && !customer.deliveryAddress?.trim()) {
      res.status(400).json({
        data: null,
        error: { code: 'INVALID_CUSTOMER_DATA', message: 'Delivery address is required for delivery orders.' },
      });
      return;
    }

    const payloadHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ customer, fulfillmentType, paymentMethod, items }))
      .digest('hex');

    const isDbUp = await checkDatabaseReachability();

    // Check idempotency
    if (idempotencyKey && isDbUp) {
      try {
        const existing = await withTimeout(
          prisma.order.findUnique({
            where: { idempotencyKey },
          }),
          800
        );

        if (existing) {
          if (existing.idempotencyRequestHash !== payloadHash) {
            res.status(409).json({
              data: null,
              error: { code: 'IDEMPOTENCY_KEY_REUSED', message: 'Idempotency key reused with different request payload.' },
            });
            return;
          }

          const summary: OrderSummary = {
            id: existing.id,
            orderNumber: existing.orderNumber,
            status: existing.status as any,
            paymentStatus: existing.paymentStatus as any,
            paymentMethod: existing.paymentMethod as any,
            fulfillmentType: existing.fulfillmentType as any,
            subtotal: Number(existing.subtotal),
            customizationTotal: Number(existing.customizationTotal),
            deliveryFee: Number(existing.deliveryFee),
            discountTotal: Number(existing.discountTotal),
            total: Number(existing.total),
            currency: existing.currency,
            customerName: existing.customerName,
            customerDialCode: existing.customerDialCode,
            customerCountryCode: existing.customerCountryCode,
            preferredContactChannel: existing.preferredContactChannel as any,
            isWhatsAppAvailable: existing.isWhatsAppAvailable,
            hotelOrBuildingName: existing.hotelOrBuildingName,
            roomOrFloorNumber: existing.roomOrFloorNumber,
            deliveryAddress: existing.deliveryAddress,
            createdAt: existing.createdAt.toISOString(),
          };

          res.json({ data: summary, error: null });
          return;
        }
      } catch {
        // Prisma offline - continue to transaction or demo fallback
      }
    }

    // Execute transaction
    let summary: OrderSummary;
    if (!isDbUp) {
      summary = createDemoOrder(customer, fulfillmentType, paymentMethod, customerNotes, items);
    } else {
      try {
        const createdOrder = await prisma.$transaction(async (tx) => {
          // 1. Fetch dishes by ID or normalized slug
          const rawDishIds: string[] = Array.from(new Set<string>(items.map((i: any) => String(i.dishId))));
          const candidateSlugs: string[] = Array.from(
            new Set<string>(rawDishIds.map((id) => normalizeDishSlug(id)).filter(Boolean))
          );

          const dishes = await tx.dish.findMany({
            where: {
              deletedAt: null,
              OR: [
                { id: { in: rawDishIds } },
                { slug: { in: candidateSlugs } },
              ],
            },
            include: {
              tasteConfigurations: {
                include: { attribute: true, options: true },
              },
              ingredients: {
                include: { ingredient: true },
              },
              substitutions: {
                include: { originalIngredient: true, substituteIngredient: true },
              },
            },
          });

          if (dishes.length === 0) {
            const totalDishes = await tx.dish.count({ where: { deletedAt: null } });
            if (totalDishes === 0) {
              throw new Error('Database dishes table is empty; falling back to demo order store.');
            }
          }

          const dishById = new Map(dishes.map((d) => [d.id, d]));
          const dishBySlug = new Map(dishes.map((d) => [d.slug.toLowerCase(), d]));
          const resolveDish = (dishIdOrSlug: string) => {
            const raw = String(dishIdOrSlug).trim();
            return (
              dishById.get(raw) ??
              dishBySlug.get(raw.toLowerCase()) ??
              dishBySlug.get(normalizeDishSlug(raw))
            );
          };

          for (const item of items) {
            const dish = resolveDish(item.dishId);
            if (!dish || !dish.isAvailable) {
              throw { status: 409, code: 'DISH_UNAVAILABLE', message: `Dish ${item.dishId} is currently unavailable.` };
            }
          }

          // 2. Prepare items data and calculate totals
          let orderSubtotal = 0;
          let orderCustomizationTotal = 0;

          const orderItemsToCreate: any[] = [];

          for (const item of items) {
            const dish = resolveDish(item.dishId)!;
            const isAiCustom = item.tasteProfileCode === 'AI_CUSTOM';
            const baseUnitPrice = Number(dish.basePriceMinor);
            let customizationUnitPrice = 0;

            const tasteCustomizationsToCreate: any[] = [];
            const ingredientCustomizationsToCreate: any[] = [];
            const substitutionsToCreate: any[] = [];

            // Taste
            for (const [code, val] of Object.entries(item.tasteValues ?? {})) {
              const numVal = Number(val);
              const config = dish.tasteConfigurations.find((c: any) => c.attribute.code === code);
              if (!config) {
                if (isAiCustom) {
                  if (numVal < 0 || numVal > 5) {
                    throw { status: 422, code: 'INVALID_TASTE_VALUE', message: `${code} out of bounds.` };
                  }
                  tasteCustomizationsToCreate.push({
                    attributeCodeSnapshot: code,
                    attributeNameSnapshot: code,
                    selectedValue: numVal,
                    customerLabelSnapshot: `Mức ${numVal}`,
                    kitchenInstructionSnapshot: `AI Custom ${code}=${numVal}`,
                    priceDeltaSnapshot: BigInt(0),
                  });
                  continue;
                }
                throw { status: 422, code: 'INVALID_TASTE_ATTRIBUTE', message: `Invalid taste attribute ${code}.` };
              }
              if (numVal < config.minValue || numVal > config.maxValue) {
                throw { status: 422, code: 'INVALID_TASTE_VALUE', message: `${config.attribute.name} out of bounds.` };
              }

              const opt = config.options.find((o: any) => o.value === numVal);
              const priceDelta = opt ? Number(opt.priceDelta) : 0;
              customizationUnitPrice += priceDelta;

              tasteCustomizationsToCreate.push({
                attributeCodeSnapshot: config.attribute.code,
                attributeNameSnapshot: config.attribute.name,
                selectedValue: numVal,
                customerLabelSnapshot: opt?.customerLabel ?? `Mức ${numVal}`,
                kitchenInstructionSnapshot: opt?.kitchenInstruction ?? `Set ${code}=${numVal}`,
                priceDeltaSnapshot: BigInt(priceDelta),
              });
            }

            // Ingredients
            for (const [ingId, qty] of Object.entries(item.ingredientQuantities ?? {})) {
              const numQty = Number(qty);
              const mappedCode = FALLBACK_INGREDIENT_CODE_MAP[ingId.toLowerCase()];
              const di = dish.ingredients.find(
                (i: any) =>
                  i.id === ingId ||
                  i.ingredientId === ingId ||
                  i.ingredient.code === ingId ||
                  (mappedCode && i.ingredient.code === mappedCode)
              );
              if (!di) {
                if (isAiCustom) {
                  continue;
                }
                throw { status: 422, code: 'INGREDIENT_NOT_IN_DISH', message: `Ingredient ${ingId} not in dish.` };
              }
              if (!di.isQuantityAdjustable && numQty !== Number(di.defaultQuantity)) {
                throw { status: 422, code: 'INGREDIENT_NOT_ADJUSTABLE', message: `Ingredient not adjustable.` };
              }
              if (numQty < Number(di.minQuantity) || numQty > Number(di.maxQuantity)) {
                throw { status: 422, code: 'INVALID_INGREDIENT_QUANTITY', message: `Invalid quantity for ${di.ingredient.name}.` };
              }

              const stepDiff = numQty - Number(di.defaultQuantity);
              let priceDelta = 0;
              if (stepDiff > 0) {
                priceDelta = stepDiff * Number(di.priceDeltaPerStep);
              }
              customizationUnitPrice += priceDelta;

              let action = 'UNCHANGED';
              if (numQty === 0) action = 'REMOVED';
              else if (numQty > Number(di.defaultQuantity)) action = 'INCREASED';
              else if (numQty < Number(di.defaultQuantity)) action = 'DECREASED';

              ingredientCustomizationsToCreate.push({
                ingredientId: di.ingredientId,
                ingredientNameSnapshot: di.ingredient.name,
                action,
                selectedQuantity: numQty,
                unit: di.unit,
                priceDeltaSnapshot: BigInt(priceDelta),
                kitchenInstructionSnapshot: `${action} ${di.ingredient.name} to ${numQty} ${di.unit}`,
              });
            }

            // Substitutions
            for (const subId of item.substitutionIds ?? []) {
              const lowerSubId = String(subId).toLowerCase();
              const sub = dish.substitutions.find((s: any) => {
                if (s.id === subId) return true;
                if (lowerSubId.includes('tofu') && s.substituteIngredient?.code === 'TOFU') return true;
                if (s.substituteIngredient?.code?.toLowerCase() === lowerSubId) return true;
                return false;
              });
              if (!sub || !sub.isAvailable) {
                throw { status: 422, code: 'INVALID_SUBSTITUTION', message: `Substitution ${subId} unavailable.` };
              }
              const priceDelta = Number(sub.priceDelta);
              customizationUnitPrice += priceDelta;

              substitutionsToCreate.push({
                originalIngredientId: sub.originalIngredientId,
                originalIngredientNameSnapshot: sub.originalIngredient.name,
                substituteIngredientNameSnapshot: sub.substituteIngredient.name,
                priceDeltaSnapshot: sub.priceDelta,
                kitchenInstructionSnapshot: sub.kitchenInstruction,
              });
            }

            const finalUnitPrice = Math.max(0, baseUnitPrice + customizationUnitPrice);
            const lineTotal = finalUnitPrice * item.quantity;

            orderSubtotal += baseUnitPrice * item.quantity;
            orderCustomizationTotal += customizationUnitPrice * item.quantity;

            orderItemsToCreate.push({
              dishId: dish.id,
              dishNameSnapshot: dish.name,
              dishSlugSnapshot: dish.slug,
              dishCategorySnapshot: dish.category,
              quantity: item.quantity,
              basePriceSnapshot: BigInt(baseUnitPrice),
              customizationPrice: BigInt(customizationUnitPrice),
              finalUnitPrice: BigInt(finalUnitPrice),
              lineTotal: BigInt(lineTotal),
              notes: item.notes,
              tasteCustomizations: { create: tasteCustomizationsToCreate },
              ingredientCustomizations: { create: ingredientCustomizationsToCreate },
              substitutions: { create: substitutionsToCreate },
            });
          }

          const deliveryFee = fulfillmentType === 'DELIVERY' ? 15000 : 0;
          const discountTotal = 0;
          const total = orderSubtotal + orderCustomizationTotal + deliveryFee - discountTotal;

          const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const randNum = Math.floor(1000 + Math.random() * 9000);
          const orderNumber = `VFT-${dateStr}-${randNum}`;

          const phoneLookupHmac = hashPhone(customer.phone);

          const order = await tx.order.create({
            data: {
              orderNumber,
              idempotencyKey: idempotencyKey ?? `IDEMP-${orderNumber}`,
              idempotencyRequestHash: payloadHash,
              status: 'PENDING',
              paymentStatus: 'UNPAID',
              paymentMethod,
              fulfillmentType,
              currency: 'VND',
              subtotal: BigInt(orderSubtotal),
              customizationTotal: BigInt(orderCustomizationTotal),
              deliveryFee: BigInt(deliveryFee),
              discountTotal: BigInt(discountTotal),
              total: BigInt(total),
              customerName: customer.name,
              customerEmail: customer.email,
              customerPhoneHash: phoneLookupHmac,
              customerDialCode: customer.dialCode ?? '+84',
              customerCountryCode: customer.countryCode ?? null,
              preferredContactChannel: customer.preferredContactChannel ?? 'PHONE_CALL',
              isWhatsAppAvailable: Boolean(customer.isWhatsAppAvailable),
              hotelOrBuildingName: customer.hotelOrBuildingName ?? null,
              roomOrFloorNumber: customer.roomOrFloorNumber ?? null,
              deliveryAddress: customer.deliveryAddress,
              customerNotes,
              items: {
                create: orderItemsToCreate,
              },
              statusHistory: {
                create: {
                  fromStatus: 'PENDING',
                  toStatus: 'PENDING',
                  actor: 'CUSTOMER',
                  reason: 'Order placed by customer',
                },
              },
            },
          });

          return order;
        });

        summary = {
          id: createdOrder.id,
          orderNumber: createdOrder.orderNumber,
          status: createdOrder.status as any,
          paymentStatus: createdOrder.paymentStatus as any,
          paymentMethod: createdOrder.paymentMethod as any,
          fulfillmentType: createdOrder.fulfillmentType as any,
          subtotal: Number(createdOrder.subtotal),
          customizationTotal: Number(createdOrder.customizationTotal),
          deliveryFee: Number(createdOrder.deliveryFee),
          discountTotal: Number(createdOrder.discountTotal),
          total: Number(createdOrder.total),
          currency: createdOrder.currency,
          customerName: createdOrder.customerName,
          customerDialCode: createdOrder.customerDialCode,
          customerCountryCode: createdOrder.customerCountryCode,
          preferredContactChannel: createdOrder.preferredContactChannel as any,
          isWhatsAppAvailable: createdOrder.isWhatsAppAvailable,
          hotelOrBuildingName: createdOrder.hotelOrBuildingName,
          roomOrFloorNumber: createdOrder.roomOrFloorNumber,
          deliveryAddress: createdOrder.deliveryAddress,
          createdAt: createdOrder.createdAt.toISOString(),
        };

        orderEvents.emit('order:created', {
          orderNumber: createdOrder.orderNumber,
          order: summary,
        });
      } catch (dbErr: any) {
        if (typeof dbErr?.status === 'number' && typeof dbErr?.code === 'string') {
          throw dbErr;
        }
        console.warn('[Orders] DB transaction failed, using in-memory demo order:', dbErr?.message || dbErr);
        summary = createDemoOrder(customer, fulfillmentType, paymentMethod, customerNotes, items);
      }
    }

    res.status(201).json({ data: summary, error: null });
  } catch (err: any) {
    if (err.status && err.code) {
      res.status(err.status).json({ data: null, error: { code: err.code, message: err.message } });
      return;
    }
    next(err);
  }
});

// POST /api/orders/lookup
orderRoutes.post('/lookup', validate(orderLookupSchema), async (req, res, next) => {
  try {
    const { orderNumber, phone } = req.body;

    let order: any = null;
    let dbChecked = false;
    if (await checkDatabaseReachability()) {
      try {
        order = await withTimeout(
          prisma.order.findUnique({
            where: { orderNumber },
            include: {
              items: {
                include: {
                  tasteCustomizations: true,
                  ingredientCustomizations: true,
                  substitutions: true,
                },
              },
              statusHistory: {
                orderBy: { createdAt: 'desc' },
              },
            },
          }),
          800
        );
        dbChecked = true;
      } catch {
        // DB offline or timed out
      }
    }

    if (order) {
      if (!matchesPhoneHash(phone, order.customerDialCode, order.customerPhoneHash)) {
        res.status(404).json({
          data: null,
          error: { code: 'ORDER_NOT_FOUND', message: 'No matching order found with the provided details.' },
        });
        return;
      }

      res.json({
        data: formatPrismaOrderDetail(order),
        error: null,
      });
      return;
    }

    const demo = demoOrderStore.get(orderNumber);
    if (demo) {
      res.json({
        data: formatDemoOrderDetail(demo),
        error: null,
      });
      return;
    }

    res.status(404).json({
      data: null,
      error: {
        code: 'ORDER_NOT_FOUND',
        message: dbChecked
          ? 'No matching order found with the provided details.'
          : 'No matching order found with the provided details.',
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:orderNumber
orderRoutes.get('/:orderNumber', async (req, res, next) => {
  try {
    const orderNumber = String(req.params.orderNumber).trim();

    let order: any = null;
    if (await checkDatabaseReachability()) {
      try {
        order = await withTimeout(
          prisma.order.findUnique({
            where: { orderNumber },
            include: {
              items: {
                include: {
                  tasteCustomizations: true,
                  ingredientCustomizations: true,
                  substitutions: true,
                },
              },
              statusHistory: {
                orderBy: { createdAt: 'desc' },
              },
            },
          }),
          800
        );
      } catch {
        // DB offline or timed out
      }
    }

    if (order) {
      res.json({
        data: formatPrismaOrderDetail(order),
        error: null,
      });
      return;
    }

    const demo = demoOrderStore.get(orderNumber);
    if (demo) {
      res.json({
        data: formatDemoOrderDetail(demo),
        error: null,
      });
      return;
    }

    res.status(404).json({
      data: null,
      error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' },
    });
  } catch (err) {
    next(err);
  }
});
