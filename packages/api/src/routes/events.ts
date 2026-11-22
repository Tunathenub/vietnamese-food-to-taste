import { Router, type Request, type Response } from 'express';
import {
  orderEvents,
  type OrderCreatedPayload,
  type OrderStatusUpdatedPayload,
} from '../services/order-events.js';

export const eventsRoutes: Router = Router();

/**
 * Configure proper SSE headers
 */
function initSseResponse(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

/**
 * Helper to write a formatted SSE event
 */
function sendSseMessage(res: Response, event: string, data: unknown): void {
  try {
    if (!res.writableEnded) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  } catch (err) {
    console.error(`[SSE] Error writing event "${event}":`, err);
  }
}

/**
 * GET /api/events/orders
 * Stream all order events for Staff KDS
 */
eventsRoutes.get('/orders', (req: Request, res: Response) => {
  initSseResponse(res);

  // Send initial connection comment
  res.write(': connected\n\n');

  // 30s heartbeat to keep connection alive
  const heartbeatTimer = setInterval(() => {
    try {
      if (!res.writableEnded) {
        res.write(': heartbeat\n\n');
      }
    } catch {
      clearInterval(heartbeatTimer);
    }
  }, 30000);
  heartbeatTimer.unref();

  const handleOrderCreated = (payload: OrderCreatedPayload) => {
    sendSseMessage(res, 'order:created', payload);
  };

  const handleStatusUpdated = (payload: OrderStatusUpdatedPayload) => {
    sendSseMessage(res, 'order:status_updated', payload);
  };

  orderEvents.on('order:created', handleOrderCreated);
  orderEvents.on('order:status_updated', handleStatusUpdated);

  const cleanup = () => {
    clearInterval(heartbeatTimer);
    orderEvents.off('order:created', handleOrderCreated);
    orderEvents.off('order:status_updated', handleStatusUpdated);
  };

  req.on('close', cleanup);
  res.on('error', cleanup);
});

/**
 * GET /api/events/orders/:orderNumber
 * Stream updates for a specific order for customer tracking
 */
eventsRoutes.get('/orders/:orderNumber', (req: Request, res: Response) => {
  const { orderNumber } = req.params;
  const targetNumber = String(orderNumber).trim().toLowerCase();

  initSseResponse(res);

  // Send initial connection comment
  res.write(': connected\n\n');

  // 30s heartbeat to keep connection alive
  const heartbeatTimer = setInterval(() => {
    try {
      if (!res.writableEnded) {
        res.write(': heartbeat\n\n');
      }
    } catch {
      clearInterval(heartbeatTimer);
    }
  }, 30000);
  heartbeatTimer.unref();

  const matchesOrderNumber = (num?: string): boolean => {
    return Boolean(num && num.trim().toLowerCase() === targetNumber);
  };

  const handleOrderCreated = (payload: OrderCreatedPayload) => {
    if (matchesOrderNumber(payload.orderNumber) || matchesOrderNumber(payload.order?.orderNumber)) {
      sendSseMessage(res, 'order:created', payload);
    }
  };

  const handleStatusUpdated = (payload: OrderStatusUpdatedPayload) => {
    if (matchesOrderNumber(payload.orderNumber)) {
      sendSseMessage(res, 'order:status_updated', payload);
    }
  };

  orderEvents.on('order:created', handleOrderCreated);
  orderEvents.on('order:status_updated', handleStatusUpdated);

  const cleanup = () => {
    clearInterval(heartbeatTimer);
    orderEvents.off('order:created', handleOrderCreated);
    orderEvents.off('order:status_updated', handleStatusUpdated);
  };

  req.on('close', cleanup);
  res.on('error', cleanup);
});
