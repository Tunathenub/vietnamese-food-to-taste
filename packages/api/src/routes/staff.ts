import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { changeOrderStatusSchema } from '@vft/shared/schemas';
import { validate } from '../middleware/validate.js';
import type { OrderStatus } from '@vft/shared';
import { orderEvents } from '../services/order-events.js';
import { demoOrderStore } from '../services/demo-orders.js';

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

    let items: any[] = [];
    try {
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

      items = orders.map((o) => ({
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
    } catch {
      // Prisma offline, fallback to demo store
    }

    // Merge or fallback to demoOrderStore
    const demoOrders = demoOrderStore.getAll();
    const demoItems = demoOrders
      .filter((o) => !status || o.status === status)
      .map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        fulfillmentType: o.fulfillmentType,
        customerName: o.customerName,
        customerPhone: o.customerPhone ?? '',
        customerDialCode: o.customerDialCode ?? '+84',
        customerCountryCode: o.customerCountryCode ?? 'VN',
        preferredContactChannel: o.preferredContactChannel ?? 'PHONE_CALL',
        isWhatsAppAvailable: o.isWhatsAppAvailable ?? false,
        hotelOrBuildingName: o.hotelOrBuildingName ?? '',
        roomOrFloorNumber: o.roomOrFloorNumber ?? '',
        deliveryAddress: o.deliveryAddress ?? '',
        total: o.total,
        currency: o.currency,
        itemCount: o.itemCount,
        createdAt: o.createdAt,
      }));

    // Combine distinct by orderNumber
    const existingOrderNums = new Set(items.map((i) => i.orderNumber));
    for (const d of demoItems) {
      if (!existingOrderNums.has(d.orderNumber)) {
        items.push(d);
      }
    }

    res.json({ data: { items }, error: null });
  } catch (err) {
    next(err);
  }
});

// GET /api/staff/orders/:orderNumber
staffRoutes.get('/orders/:orderNumber', async (req, res, next) => {
  try {
    const { orderNumber } = req.params;

    let order: any = null;
    try {
      order = await prisma.order.findUnique({
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
    } catch {
      // Prisma offline
    }

    if (!order) {
      const demo = demoOrderStore.get(orderNumber);
      if (demo) {
        const cleanDial = (demo.customerDialCode ?? '').replace(/[^0-9]/g, '');
        const cleanPhone = (demo.customerPhone ?? '').replace(/[^0-9]/g, '');
        const fullPhone = cleanDial ? `+${cleanDial}${cleanPhone}` : cleanPhone;
        const whatsAppDirectUrl = (demo.isWhatsAppAvailable || demo.preferredContactChannel === 'WHATSAPP') && fullPhone
          ? `https://wa.me/${cleanDial}${cleanPhone}`
          : null;

        res.json({
          data: {
            id: demo.id,
            orderNumber: demo.orderNumber,
            status: demo.status,
            paymentStatus: demo.paymentStatus,
            paymentMethod: demo.paymentMethod,
            fulfillmentType: demo.fulfillmentType,
            subtotal: demo.subtotal,
            deliveryFee: demo.deliveryFee,
            total: demo.total,
            currency: demo.currency,
            customerName: demo.customerName,
            customerPhone: demo.customerPhone,
            customerDialCode: demo.customerDialCode,
            customerCountryCode: demo.customerCountryCode,
            preferredContactChannel: demo.preferredContactChannel,
            isWhatsAppAvailable: demo.isWhatsAppAvailable,
            hotelOrBuildingName: demo.hotelOrBuildingName,
            roomOrFloorNumber: demo.roomOrFloorNumber,
            whatsAppDirectUrl,
            deliveryAddress: demo.deliveryAddress,
            customerNotes: '',
            cancellationReason: demo.statusHistory?.find((h) => h.toStatus === 'CANCELLED')?.reason ?? null,
            items: demo.items || [],
            statusHistory: (demo.statusHistory || []).map((h) => ({
              fromStatus: h.fromStatus,
              toStatus: h.toStatus,
              actor: h.actor,
              actorType: h.actor ?? 'STAFF',
              reason: h.reason,
              createdAt: h.createdAt,
            })),
            createdAt: demo.createdAt,
            updatedAt: demo.createdAt,
          },
          error: null,
        });
        return;
      }

      res.status(404).json({ data: null, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' } });
      return;
    }

    const items = order.items.map((i: any) => ({
      dishName: i.dishNameSnapshot,
      quantity: i.quantity,
      finalUnitPrice: Number(i.finalUnitPrice),
      lineTotal: Number(i.lineTotal),
      specialNotes: i.notes,
      tasteCustomizations: i.tasteCustomizations.map((tc: any) => ({
        attribute: tc.attributeNameSnapshot,
        chosenValue: tc.selectedValue,
        customerLabel: tc.customerLabelSnapshot,
        kitchenInstruction: tc.kitchenInstructionSnapshot,
      })),
      ingredientCustomizations: i.ingredientCustomizations.map((ic: any) => ({
        ingredient: ic.ingredientNameSnapshot,
        action: ic.action,
        selectedQuantity: Number(ic.selectedQuantity),
        unit: ic.unit,
        kitchenInstruction: ic.kitchenInstructionSnapshot,
      })),
      substitutions: i.substitutions.map((sub: any) => ({
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
        cancellationReason: order.statusHistory.find((h: any) => h.toStatus === 'CANCELLED')?.reason ?? null,
        items,
        statusHistory: order.statusHistory.map((h: any) => ({
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

    let order: any = null;
    try {
      order = await prisma.order.findUnique({
        where: { orderNumber },
      });
    } catch {
      // DB offline
    }

    if (!order) {
      const demo = demoOrderStore.get(orderNumber);
      if (!demo) {
        res.status(404).json({ data: null, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' } });
        return;
      }

      const allowed = ALLOWED_TRANSITIONS[demo.status] ?? [];
      if (!allowed.includes(targetStatus)) {
        res.status(409).json({
          data: null,
          error: {
            code: 'INVALID_STATUS_TRANSITION',
            message: `Cannot transition order from ${demo.status} to ${targetStatus}.`,
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

      const prevStatus = demo.status;
      demoOrderStore.updateStatus(orderNumber, targetStatus as OrderStatus, reason);

      const statusPayload = {
        orderNumber,
        status: targetStatus,
        previousStatus: prevStatus,
        updatedAt: new Date().toISOString(),
        reason: reason ?? null,
      };

      orderEvents.emit('order:status_updated', statusPayload);

      res.json({
        data: {
          orderNumber,
          status: targetStatus,
          updatedAt: statusPayload.updatedAt,
        },
        error: null,
      });
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

    const statusPayload = {
      orderNumber: updated.orderNumber,
      status: updated.status,
      previousStatus: order.status,
      updatedAt: updated.updatedAt.toISOString(),
      reason: reason ?? null,
    };

    orderEvents.emit('order:status_updated', statusPayload);

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
