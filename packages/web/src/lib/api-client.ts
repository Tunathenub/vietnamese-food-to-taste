import type { ApiResponse } from '@vft/shared';

/**
 * Determine API Base URL:
 * - Development: Defaults to '/api', proxied by Vite dev server to http://localhost:3000
 * - Production: Can be configured with VITE_API_URL (e.g. 'https://api.yourdomain.com' or 'https://api.yourdomain.com/api')
 *   If left empty, defaults to '/api' (ideal for reverse proxies / same-domain routing).
 */
const rawUrl = ((import.meta as any).env?.VITE_API_URL as string | undefined)?.trim() || '';
const cleanUrl = rawUrl.replace(/\/+$/, '');

export const API_BASE = cleanUrl
  ? cleanUrl.endsWith('/api')
    ? cleanUrl
    : `${cleanUrl}/api`
  : '/api';

/**
 * Build a normalized endpoint URL.
 * Automatically handles leading slashes and prevents duplicate `/api/api/...` paths.
 */
export function buildUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (cleanPath.startsWith('/api/')) {
    if (cleanUrl) return `${cleanUrl}${cleanPath}`;
    if (typeof window === 'undefined') {
      const nodeHost = (globalThis as any).process?.env?.API_URL || 'http://127.0.0.1:3000';
      return `${nodeHost}${cleanPath}`;
    }
    return cleanPath;
  }
  if (typeof window === 'undefined' && !cleanUrl) {
    const nodeHost = (globalThis as any).process?.env?.API_URL || 'http://127.0.0.1:3000';
    return `${nodeHost}${API_BASE}${cleanPath}`;
  }
  return `${API_BASE}${cleanPath}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const url = buildUrl(path);

  try {
    let bearerToken: string | null = null;
    try {
      const stored = localStorage.getItem('vft-auth-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        bearerToken = parsed?.state?.token || null;
      }
    } catch {
      // ignore parsing error
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (bearerToken) {
      headers['Authorization'] = `Bearer ${bearerToken}`;
    }
    if (options?.headers) {
      const optHeaders = options.headers;
      if (optHeaders instanceof Headers) {
        optHeaders.forEach((val, key) => {
          headers[key] = val;
        });
      } else if (Array.isArray(optHeaders)) {
        optHeaders.forEach(([key, val]) => {
          headers[key] = val;
        });
      } else {
        Object.assign(headers, optHeaders);
      }
    }

    const { headers: _ignored, ...restOptions } = options || {};

    const res = await fetch(url, {
      credentials: 'include',
      ...restOptions,
      headers,
    });

    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const body = (await res.json()) as ApiResponse<T>;
      return body;
    }

    const text = await res.text();
    if (!res.ok) {
      return {
        data: null as any,
        error: {
          code: `HTTP_${res.status}`,
          message: text || `Máy chủ phản hồi với mã lỗi ${res.status}`,
        },
      };
    }

    return {
      data: null as any,
      error: null,
    };
  } catch (err: any) {
    return {
      data: null as any,
      error: {
        code: 'NETWORK_ERROR',
        message: err?.message || 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng.',
      },
    };
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown, headers?: Record<string, string>) =>
    request<T>(path, {
      method: 'POST',
      body: data !== undefined ? JSON.stringify(data) : undefined,
      ...(headers ? { headers } : {}),
    }),
  patch: <T>(path: string, data?: unknown, headers?: Record<string, string>) =>
    request<T>(path, {
      method: 'PATCH',
      body: data !== undefined ? JSON.stringify(data) : undefined,
      ...(headers ? { headers } : {}),
    }),
};
