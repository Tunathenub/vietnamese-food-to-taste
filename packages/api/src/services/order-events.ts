import { EventEmitter } from 'node:events';
import type { OrderStatus, OrderSummary } from '@vft/shared';

export interface OrderCreatedPayload {
  orderNumber: string;
  order: OrderSummary | Record<string, any>;
  [key: string]: any;
}

export interface OrderStatusUpdatedPayload {
  orderNumber: string;
  status: OrderStatus | string;
  previousStatus?: OrderStatus | string;
  updatedAt: string;
  reason?: string | null;
  [key: string]: any;
}

export type OrderEventName = 'order:created' | 'order:status_updated';

export class OrderEventBroker extends EventEmitter {
  constructor() {
    super();
    // Support multiple concurrent SSE subscribers without leak warnings
    this.setMaxListeners(200);
  }

  emitOrderCreated(payload: OrderCreatedPayload): boolean {
    return this.emit('order:created', payload);
  }

  emitOrderStatusUpdated(payload: OrderStatusUpdatedPayload): boolean {
    return this.emit('order:status_updated', payload);
  }
}

export const orderEvents = new OrderEventBroker();
