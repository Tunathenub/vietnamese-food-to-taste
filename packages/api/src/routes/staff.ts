import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { changeOrderStatusSchema } from '@vft/shared/schemas';
import { validate } from '../middleware/validate.js';
import type { OrderStatus } from '@vft/shared';

export const staffRoutes: Router = Router();

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY'],
  READY: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

// GET /api/staff/orders
staffRoutes.get('/orders', async (req, res, next) => {
  try {
    const status = req.query.status as string | undefined;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        items: true,
      },
    });

    const items = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      fulfillmentType: o.fulfillmentType,
      customerName: o.customerName,
      customerPhone: o.customerPhoneHash,
      customerDialCode: o.customerDialCode,
      customerCountryCode: o.customerCountryCode,
      preferredContactChannel: o.preferredContactChannel,
      isWhatsAppAvailable: o.isWhatsAppAvailable,
      hotelOrBuildingName: o.hotelOrBuildingName,
      roomOrFloorNumber: o.roomOrFloorNumber,
      deliveryAddress: o.deliveryAddress,
      total: Number(o.total),
      currency: o.currency,
      itemCount: o.items.reduce((acc, i) => acc + i.quantity, 0),
      createdAt: o.createdAt.toISOString(),
    }));

    res.json({ data: { items }, error: null });
  } catch (err) {
    next(err);
  }
});

// GET /api/staff/orders/:orderNumber
staffRoutes.get('/orders/:orderNumber', async (req, res, next) => {
  try {
    const { orderNumber } = req.params;

    const order = await prisma.order.findUnique({
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
    });

    if (!order) {
      res.status(404).json({ data: null, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' } });
      return;
    }

    const items = order.items.map((i) => ({
      dishName: i.dishNameSnapshot,
      quantity: i.quantity,
      finalUnitPrice: Number(i.finalUnitPrice),
      lineTotal: Number(i.lineTotal),
      specialNotes: i.notes,
      tasteCustomizations: i.tasteCustomizations.map((tc) => ({
        attribute: tc.attributeNameSnapshot,
        chosenValue: tc.selectedValue,
        customerLabel: tc.customerLabelSnapshot,
        kitchenInstruction: tc.kitchenInstructionSnapshot,
      })),
      ingredientCustomizations: i.ingredientCustomizations.map((ic) => ({
        ingredient: ic.ingredientNameSnapshot,
        action: ic.action,
        selectedQuantity: Number(ic.selectedQuantity),
        unit: ic.unit,
        kitchenInstruction: ic.kitchenInstructionSnapshot,
      })),
      substitutions: i.substitutions.map((sub) => ({
        original: sub.originalIngredientNameSnapshot,
        substitute: sub.substituteIngredientNameSnapshot,
        kitchenInstruction: sub.kitchenInstructionSnapshot,
      })),
    }));

    const cleanDial = (order.customerDialCode ?? '').replace(/[^0-9]/g, '');
    const cleanPhone = (order.customerPhoneHash ?? '').replace(/[^0-9]/g, '');
    const fullPhone = cleanDial ? `+${cleanDial}${cleanPhone}` : cleanPhone;
    const whatsAppDirectUrl = (order.isWhatsAppAvailable || order.preferredContactChannel === 'WHATSAPP') && fullPhone
      ? `https://wa.me/${cleanDial}${cleanPhone}`
      : null;

    res.json({
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        fulfillmentType: order.fulfillmentType,
        subtotal: Number(order.subtotal),
        deliveryFee: Number(order.deliveryFee),
        total: Number(order.total),
        currency: order.currency,
        customerName: order.customerName,
        customerPhone: order.customerPhoneHash,
        customerDialCode: order.customerDialCode,
        customerCountryCode: order.customerCountryCode,
        preferredContactChannel: order.preferredContactChannel,
        isWhatsAppAvailable: order.isWhatsAppAvailable,
        hotelOrBuildingName: order.hotelOrBuildingName,
        roomOrFloorNumber: order.roomOrFloorNumber,
        whatsAppDirectUrl,
        deliveryAddress: order.deliveryAddress,
        customerNotes: order.customerNotes,
        cancellationReason: order.statusHistory.find((h) => h.toStatus === 'CANCELLED')?.reason ?? null,
        items,
        statusHistory: order.statusHistory.map((h) => ({
          fromStatus: h.fromStatus,
          toStatus: h.toStatus,
          actor: h.actor,
          actorType: h.actor ?? 'STAFF',
          reason: h.reason,
          createdAt: h.createdAt.toISOString(),
        })),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/staff/orders/:orderNumber/status
staffRoutes.patch('/orders/:orderNumber/status', validate(changeOrderStatusSchema), async (req, res, next) => {
  try {
    const orderNumber = String(req.params.orderNumber);
    const { status: targetStatus, reason } = req.body;

    const order = await prisma.order.findUnique({
      where: { orderNumber },
    });

    if (!order) {
      res.status(404).json({ data: null, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' } });
      return;
    }

    const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(targetStatus)) {
      res.status(409).json({
        data: null,
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: `Cannot transition order from ${order.status} to ${targetStatus}.`,
        },
      });
      return;
    }

    if (targetStatus === 'CANCELLED' && !reason?.trim()) {
      res.status(400).json({
        data: null,
        error: { code: 'MISSING_CANCELLATION_REASON', message: 'Cancellation reason is required when cancelling.' },
      });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status as OrderStatus,
          toStatus: targetStatus as OrderStatus,
          actor: 'STAFF',
          reason: reason ?? `Status changed to ${targetStatus}`,
        },
      });

      return tx.order.update({
        where: { id: order.id },
        data: {
          status: targetStatus,
        },
      });
    });

    res.json({
      data: {
        orderNumber: updated.orderNumber,
        status: updated.status,
        updatedAt: updated.updatedAt.toISOString(),
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});
