import { Router } from 'express';
import crypto from 'node:crypto';
import { validate } from '../middleware/validate.js';
import { createOrderSchema, orderLookupSchema } from '@vft/shared/schemas';
import { prisma } from '../lib/prisma.js';
import type { ApiResponse, OrderSummary } from '@vft/shared';

export const orderRoutes = Router();

// Helper to compute phone lookup hash
function hashPhone(phone: string): string {
  const normalized = phone.replace(/\D/g, '');
  return crypto.createHmac('sha256', process.env.PHONE_SECRET ?? 'vft_secret').update(normalized).digest('hex');
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
    }

    // Execute transaction
    const createdOrder = await prisma.$transaction(async (tx) => {
      // 1. Fetch dishes
      const dishIds = [...new Set(items.map((i: any) => i.dishId))];
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
        const baseUnitPrice = Number(dish.basePrice);
        let customizationUnitPrice = 0;

        const tasteCustomizationsToCreate: any[] = [];
        const ingredientCustomizationsToCreate: any[] = [];
        const substitutionsToCreate: any[] = [];

        // Taste
        for (const [code, val] of Object.entries(item.tasteValues ?? {})) {
          const numVal = Number(val);
          const config = dish.tasteConfigurations.find((c) => c.attribute.code === code);
          if (!config) {
            throw { status: 422, code: 'INVALID_TASTE_ATTRIBUTE', message: `Invalid taste attribute ${code}.` };
          }
          if (numVal < config.minValue || numVal > config.maxValue) {
            throw { status: 422, code: 'INVALID_TASTE_VALUE', message: `${config.attribute.name} out of bounds.` };
          }

          const opt = config.options.find((o) => o.value === numVal);
          const priceDelta = opt ? Number(opt.priceDelta) : 0;
          customizationUnitPrice += priceDelta;

          tasteCustomizationsToCreate.push({
            tasteAttributeId: config.attributeId,
            attributeCodeSnapshot: config.attribute.code,
            attributeNameSnapshot: config.attribute.name,
            recommendationSource: item.tasteProfileCode ? 'TASTE_PROFILE' : 'MANUAL',
            sourceValue: numVal,
            baseValue: config.baseValue,
            minValue: config.minValue,
            maxValue: config.maxValue,
            chosenValue: numVal,
            customerLabelSnapshot: opt?.customerLabel ?? `Mức ${numVal}`,
            kitchenInstructionSnapshot: opt?.kitchenInstruction ?? `Set ${code}=${numVal}`,
            priceDelta: BigInt(priceDelta),
          });
        }

        // Ingredients
        for (const [ingId, qty] of Object.entries(item.ingredientQuantities ?? {})) {
          const numQty = Number(qty);
          const di = dish.ingredients.find((i) => i.ingredientId === ingId || i.ingredient.code === ingId);
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
            originalQuantity: di.defaultQuantity,
            selectedQuantity: numQty,
            unitSnapshot: di.unit,
            unitPriceDelta: di.priceDeltaPerStep,
            totalPriceDelta: BigInt(priceDelta),
            kitchenInstructionSnapshot: `${action} ${di.ingredient.name} to ${numQty} ${di.unit}`,
          });
        }

        // Substitutions
        for (const subId of item.substitutionIds ?? []) {
          const sub = dish.substitutions.find((s) => s.id === subId);
          if (!sub || !sub.isAvailable) {
            throw { status: 422, code: 'INVALID_SUBSTITUTION', message: `Substitution ${subId} unavailable.` };
          }
          const priceDelta = Number(sub.priceDelta);
          customizationUnitPrice += priceDelta;

          substitutionsToCreate.push({
            substitutionRuleId: sub.id,
            originalIngredientId: sub.originalIngredientId,
            substituteIngredientId: sub.substituteIngredientId,
            originalIngredientSnapshot: sub.originalIngredient.name,
            substituteIngredientSnapshot: sub.substituteIngredient.name,
            reasonSnapshot: sub.reason,
            priceDelta: sub.priceDelta,
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
          dishImageSnapshot: dish.imageUrl,
          quantity: item.quantity,
          baseUnitPrice: BigInt(baseUnitPrice),
          customizationUnitPrice: BigInt(customizationUnitPrice),
          finalUnitPrice: BigInt(finalUnitPrice),
          lineTotal: BigInt(lineTotal),
          specialNotes: item.notes,
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
          idempotencyKey,
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
          customerPhone: customer.phone,
          customerPhoneLookupHmac: phoneLookupHmac,
          deliveryAddress: customer.deliveryAddress,
          customerNotes,
          items: {
            create: orderItemsToCreate,
          },
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: 'PENDING',
              actorType: 'CUSTOMER',
              reason: 'Order placed by customer',
            },
          },
        },
      });

      return order;
    });

    const summary: OrderSummary = {
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
      createdAt: createdOrder.createdAt.toISOString(),
    };

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

    const order = await prisma.order.findFirst({
      where: {
        orderNumber,
        customerPhoneLookupHmac: phoneLookupHmac,
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

    if (!order) {
      res.status(404).json({
        data: null,
        error: { code: 'ORDER_NOT_FOUND', message: 'No matching order found with the provided details.' },
      });
      return;
    }

    const items = order.items.map((i) => ({
      dishName: i.dishNameSnapshot,
      quantity: i.quantity,
      finalUnitPrice: Number(i.finalUnitPrice),
      lineTotal: Number(i.lineTotal),
      tasteSelections: i.tasteCustomizations.map((tc) => ({
        name: tc.attributeNameSnapshot,
        value: tc.chosenValue,
        label: tc.customerLabelSnapshot,
      })),
      ingredientChanges: i.ingredientCustomizations.map((ic) => ({
        name: ic.ingredientNameSnapshot,
        action: ic.action,
        selectedQuantity: Number(ic.selectedQuantity),
        unit: ic.unitSnapshot,
      })),
      substitutions: i.substitutions.map((sub) => ({
        originalIngredient: sub.originalIngredientSnapshot,
        substituteIngredient: sub.substituteIngredientSnapshot,
        reason: sub.reasonSnapshot,
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
