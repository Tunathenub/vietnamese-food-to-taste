import { useEffect, useRef, useState, useCallback } from 'react';
import { buildUrl } from './api-client';

export interface OrderCreatedPayload {
  orderNumber?: string;
  id?: string;
  status?: string;
  customerName?: string;
  total?: number;
  currency?: string;
  itemCount?: number;
  fulfillmentType?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface OrderStatusUpdatedPayload {
  orderNumber: string;
  status: string;
  previousStatus?: string;
  timestamp?: string;
  updatedAt?: string;
  reason?: string;
  order?: any;
  [key: string]: any;
}

export interface UseOrderEventsOptions {
  /** SSE endpoint URL (e.g. '/api/events/orders' or '/api/events/orders/:orderNumber') */
  url?: string;
  /** Order number for specific order tracking */
  orderNumber?: string;
  /** Whether the SSE connection is enabled (default: true) */
  enabled?: boolean;
  /** Callback fired when a new order is created */
  onOrderCreated?: (data: OrderCreatedPayload) => void;
  /** Callback fired when an order status is updated */
  onStatusUpdated?: (data: OrderStatusUpdatedPayload) => void;
  /** Callback fired for any received message or custom event */
  onEvent?: (eventType: string, data: any) => void;
  /** Optional fallback callback when SSE is not available or repeatedly fails */
  onFallbackPoll?: () => void | Promise<void>;
  /** Interval in ms for fallback polling if SSE fails repeatedly (default: 15000ms, 0 to disable) */
  fallbackPollingInterval?: number;
  /** Initial reconnect delay in ms (default: 2000ms) */
  initialReconnectDelay?: number;
  /** Maximum reconnect delay in ms (default: 30000ms) */
  maxReconnectDelay?: number;
}

export interface UseOrderEventsReturn {
  isConnected: boolean;
  isConnecting: boolean;
  isFallback: boolean;
  error: Error | null;
  reconnectCount: number;
  reconnect: () => void;
  close: () => void;
}

let sharedAudioCtx: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new AudioContextClass();
    } catch {
      return null;
    }
  }
  return sharedAudioCtx;
}

// Global unlock listener on first user interaction anywhere on page
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  const unlockAudio = () => {
    try {
      const ctx = getSharedAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {
      // ignore
    }
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}

function emitChimeTones(ctx: AudioContext) {
  const playTone = (freq: number, startTime: number, duration: number, peakGain: number = 0.3) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  };

  const now = ctx.currentTime;
  // Note 1: Ting (C6 - ~1046.5 Hz)
  playTone(1046.5, now, 0.45, 0.3);
  // Note 2: Ting (G6 - ~1567.98 Hz)
  playTone(1567.98, now + 0.16, 0.6, 0.25);
}

/**
 * Web Audio API chime helper that plays a crisp "ting ting" kitchen bell sound.
 * Gracefully handles AudioContext autoplay restrictions and missing audio support.
 */
export function playOrderNotificationChime() {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        emitChimeTones(ctx);
      }).catch((err) => {
        console.warn('[useOrderEvents] Autoplay policy blocked sound until interaction:', err);
      });
    } else {
      emitChimeTones(ctx);
    }
  } catch (err) {
    console.warn('[useOrderEvents] Audio chime could not be played:', err);
  }
}

/**
 * Hook to connect to Server-Sent Events (SSE) for order updates with auto-reconnect
 * and graceful fallback polling.
 */
export function useOrderEvents(
  urlOrOptions?: string | UseOrderEventsOptions,
  maybeOptions?: UseOrderEventsOptions
): UseOrderEventsReturn {
  const options: UseOrderEventsOptions =
    typeof urlOrOptions === 'string'
      ? { url: urlOrOptions, ...maybeOptions }
      : urlOrOptions || {};

  const {
    url,
    orderNumber,
    enabled = true,
    onOrderCreated,
    onStatusUpdated,
    onEvent,
    onFallbackPoll,
    fallbackPollingInterval = 15000,
    initialReconnectDelay = 2000,
    maxReconnectDelay = 30000,
  } = options;

  // Resolve target SSE endpoint
  const targetPath = url || (orderNumber ? `/events/orders/${orderNumber}` : '/events/orders');
  const sseUrl = buildUrl(targetPath);

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);

  // Keep references to latest callbacks to avoid restarting SSE connection on callback changes
  const callbacksRef = useRef({
    onOrderCreated,
    onStatusUpdated,
    onEvent,
    onFallbackPoll,
  });
  useEffect(() => {
    callbacksRef.current = {
      onOrderCreated,
      onStatusUpdated,
      onEvent,
      onFallbackPoll,
    };
  }, [onOrderCreated, onStatusUpdated, onEvent, onFallbackPoll]);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const consecutiveErrorsRef = useRef(0);
  const isManuallyClosedRef = useRef(false);

  const cleanupConnection = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled) return;
    if (typeof window === 'undefined' || !('EventSource' in window)) {
      console.warn('[useOrderEvents] EventSource not supported in this environment, activating fallback mode.');
      setIsFallback(true);
      return;
    }

    cleanupConnection();
    isManuallyClosedRef.current = false;
    setIsConnecting(true);
    setError(null);

    try {
      const es = new EventSource(sseUrl, { withCredentials: true });
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        setIsFallback(false);
        setError(null);
        consecutiveErrorsRef.current = 0;
      };

      const handleParsedEvent = (eventType: string, parsedData: any) => {
        callbacksRef.current.onEvent?.(eventType, parsedData);

        // Normalize event data (unwrap { data: ... } or { order: ... } if nested)
        const unwrapped = parsedData?.data ?? parsedData;

        if (eventType === 'order:created' || eventType === 'order_created') {
          callbacksRef.current.onOrderCreated?.(unwrapped?.order || unwrapped);
        } else if (eventType === 'order:status_updated' || eventType === 'order_status_updated') {
          callbacksRef.current.onStatusUpdated?.(unwrapped);
        } else if (parsedData?.type === 'order:created' || parsedData?.event === 'order:created') {
          callbacksRef.current.onOrderCreated?.(parsedData.data?.order || parsedData.data || parsedData);
        } else if (parsedData?.type === 'order:status_updated' || parsedData?.event === 'order:status_updated') {
          callbacksRef.current.onStatusUpdated?.(parsedData.data || parsedData);
        } else if (parsedData?.status && parsedData?.orderNumber) {
          callbacksRef.current.onStatusUpdated?.(parsedData);
        }
      };

      // Listen for specific named events
      const registerNamedListener = (name: string) => {
        es.addEventListener(name, (e: MessageEvent) => {
          try {
            const parsed = JSON.parse(e.data);
            handleParsedEvent(name, parsed);
          } catch {
            handleParsedEvent(name, e.data);
          }
        });
      };

      registerNamedListener('order:created');
      registerNamedListener('order:status_updated');
      registerNamedListener('order_created');
      registerNamedListener('order_status_updated');
      registerNamedListener('heartbeat');

      // Generic message listener (for servers emitting default "message" event)
      es.onmessage = (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data);
          handleParsedEvent('message', parsed);
        } catch {
          handleParsedEvent('message', e.data);
        }
      };

      es.onerror = () => {
        setIsConnected(false);
        setIsConnecting(false);
        consecutiveErrorsRef.current += 1;

        const err = new Error(`EventSource disconnected from ${sseUrl}`);
        setError(err);

        // After multiple consecutive failures, mark fallback mode to allow polling
        if (consecutiveErrorsRef.current >= 3) {
          setIsFallback(true);
        }

        // Auto-reconnect with exponential backoff if not manually closed
        if (!isManuallyClosedRef.current && enabled) {
          cleanupConnection();
          const delay = Math.min(
            initialReconnectDelay * Math.pow(1.5, Math.min(consecutiveErrorsRef.current, 6)),
            maxReconnectDelay
          );
          setReconnectCount((c) => c + 1);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch (err: any) {
      console.warn('[useOrderEvents] Failed to instantiate EventSource:', err);
      setIsConnected(false);
      setIsConnecting(false);
      setIsFallback(true);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [enabled, sseUrl, cleanupConnection, initialReconnectDelay, maxReconnectDelay]);

  // Establish SSE connection
  useEffect(() => {
    connect();
    return () => {
      isManuallyClosedRef.current = true;
      cleanupConnection();
    };
  }, [connect, cleanupConnection]);

  // Graceful fallback polling if SSE is unavailable or in fallback mode
  useEffect(() => {
    if (!isFallback || fallbackPollingInterval <= 0) {
      if (fallbackPollIntervalRef.current) {
        clearInterval(fallbackPollIntervalRef.current);
        fallbackPollIntervalRef.current = null;
      }
      return;
    }

    // Trigger initial poll immediately on entering fallback mode
    callbacksRef.current.onFallbackPoll?.();

    fallbackPollIntervalRef.current = setInterval(() => {
      callbacksRef.current.onFallbackPoll?.();
    }, fallbackPollingInterval);

    return () => {
      if (fallbackPollIntervalRef.current) {
        clearInterval(fallbackPollIntervalRef.current);
        fallbackPollIntervalRef.current = null;
      }
    };
  }, [isFallback, fallbackPollingInterval]);

  const manualReconnect = useCallback(() => {
    consecutiveErrorsRef.current = 0;
    connect();
  }, [connect]);

  const close = useCallback(() => {
    isManuallyClosedRef.current = true;
    cleanupConnection();
    setIsConnected(false);
    setIsConnecting(false);
  }, [cleanupConnection]);

  return {
    isConnected,
    isConnecting,
    isFallback,
    error,
    reconnectCount,
    reconnect: manualReconnect,
    close,
  };
}
