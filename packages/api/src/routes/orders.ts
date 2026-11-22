import { Router } from 'express';
import crypto from 'node:crypto';
import { validate } from '../middleware/validate.js';
import { createOrderSchema, orderLookupSchema } from '@vft/shared/schemas';
import { prisma } from '../lib/prisma.js';
import type { ApiResponse, OrderSummary } from '@vft/shared';
import { orderEvents } from '../services/order-events.js';
import { demoOrderStore, type DemoOrderItem } from '../services/demo-orders.js';

export const orderRoutes: Router = Router();

// Helper to compute phone lookup hash
function hashPhone(phone: string): string {
  const normalized = phone.replace(/\D/g, '');
  return crypto.createHmac('sha256', process.env.PHONE_SECRET ?? 'vft_secret').update(normalized).digest('hex');
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
    const dishName = dishIdStr.includes('bun-cha') ? 'Bún Chả Hà Nội' : (dishIdStr.includes('pho') ? 'Phở Bò Hà Nội' : 'Món Việt Đặc Biệt');
    const baseUnitPrice = 65000;
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

    // Check idempotency
    if (idempotencyKey) {
      try {
        const existing = await prisma.order.findUnique({
          where: { idempotencyKey },
        });

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
    try {
      const createdOrder = await prisma.$transaction(async (tx) => {
      // 1. Fetch dishes
      const dishIds: string[] = Array.from(new Set<string>(items.map((i: any) => String(i.dishId))));
      const dishes = await tx.dish.findMany({
        where: { id: { in: dishIds }, deletedAt: null },
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

      const dishMap = new Map(dishes.map((d) => [d.id, d]));

      for (const item of items) {
        const dish = dishMap.get(item.dishId);
        if (!dish || !dish.isAvailable) {
          throw { status: 409, code: 'DISH_UNAVAILABLE', message: `Dish ${item.dishId} is currently unavailable.` };
        }
      }

      // 2. Prepare items data and calculate totals
      let orderSubtotal = 0;
      let orderCustomizationTotal = 0;

      const orderItemsToCreate: any[] = [];

      for (const item of items) {
        const dish = dishMap.get(item.dishId)!;
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
          const di = dish.ingredients.find((i: any) => i.ingredientId === ingId || i.ingredient.code === ingId);
          if (!di) {
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
          const sub = dish.substitutions.find((s: any) => s.id === subId);
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
      console.warn('[Orders] DB transaction failed, using in-memory demo order:', dbErr?.message || dbErr);
      summary = createDemoOrder(customer, fulfillmentType, paymentMethod, customerNotes, items);
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
    const phoneLookupHmac = hashPhone(phone);

    let order: any = null;
    try {
      order = await prisma.order.findFirst({
        where: {
          orderNumber,
          customerPhoneHash: phoneLookupHmac,
        },
        include: {
          items: {
            include: {
              tasteCustomizations: true,
              ingredientCustomizations: true,
              substitutions: true,
            },
          },
        },
      });
    } catch {
      // DB offline
    }

    if (!order) {
      const demo = demoOrderStore.get(orderNumber);
      if (demo) {
        res.json({
          data: {
            orderNumber: demo.orderNumber,
            status: demo.status,
            paymentStatus: demo.paymentStatus,
            fulfillmentType: demo.fulfillmentType,
            subtotal: demo.subtotal,
            deliveryFee: demo.deliveryFee,
            total: demo.total,
            currency: demo.currency,
            items: (demo.items || []).map((i) => ({
              dishName: i.dishName,
              quantity: i.quantity,
              finalUnitPrice: i.finalUnitPrice,
              lineTotal: i.lineTotal,
              tasteSelections: (i.tasteCustomizations || []).map((tc: any) => ({
                name: tc.attribute,
                value: tc.chosenValue,
                label: tc.customerLabel,
              })),
              ingredientChanges: (i.ingredientCustomizations || []).map((ic: any) => ({
                name: ic.ingredient,
                action: ic.action,
                selectedQuantity: ic.selectedQuantity,
                unit: ic.unit,
              })),
              substitutions: [],
            })),
            createdAt: demo.createdAt,
            updatedAt: demo.createdAt,
          },
          error: null,
        });
        return;
      }

      res.status(404).json({
        data: null,
        error: { code: 'ORDER_NOT_FOUND', message: 'No matching order found with the provided details.' },
      });
      return;
    }

    const items = order.items.map((i: any) => ({
      dishName: i.dishNameSnapshot,
      quantity: i.quantity,
      finalUnitPrice: Number(i.finalUnitPrice),
      lineTotal: Number(i.lineTotal),
      tasteSelections: i.tasteCustomizations.map((tc: any) => ({
        name: tc.attributeNameSnapshot,
        value: tc.selectedValue,
        label: tc.customerLabelSnapshot,
      })),
      ingredientChanges: i.ingredientCustomizations.map((ic: any) => ({
        name: ic.ingredientNameSnapshot,
        action: ic.action,
        selectedQuantity: Number(ic.selectedQuantity),
        unit: ic.unit,
      })),
      substitutions: i.substitutions.map((sub: any) => ({
        originalIngredient: sub.originalIngredientNameSnapshot,
        substituteIngredient: sub.substituteIngredientNameSnapshot,
        reason: sub.kitchenInstructionSnapshot,
      })),
    }));

    res.json({
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        fulfillmentType: order.fulfillmentType,
        subtotal: Number(order.subtotal),
        deliveryFee: Number(order.deliveryFee),
        total: Number(order.total),
        currency: order.currency,
        items,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});
