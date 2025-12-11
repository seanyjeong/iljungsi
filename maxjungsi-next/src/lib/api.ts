import { useAuth } from '@/hooks/use-auth';

/**
 * 인증 토큰이 포함된 fetch 래퍼
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = useAuth.getState().token;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * GET 요청
 */
export async function apiGet<T>(url: string): Promise<T> {
  const res = await apiFetch(url);
  return res.json();
}

/**
 * POST 요청
 */
export async function apiPost<T>(url: string, data?: unknown): Promise<T> {
  const res = await apiFetch(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
  return res.json();
}

/**
 * PUT 요청
 */
export async function apiPut<T>(url: string, data?: unknown): Promise<T> {
  const res = await apiFetch(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
  return res.json();
}

/**
 * DELETE 요청
 */
export async function apiDelete<T>(url: string): Promise<T> {
  const res = await apiFetch(url, {
    method: 'DELETE',
  });
  return res.json();
}
