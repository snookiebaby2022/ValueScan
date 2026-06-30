/** Same-origin API in production; override with VITE_API_URL for local dev if needed. */
export const API_BASE = import.meta.env.VITE_API_URL || '';

export function authHeaders(): HeadersInit {
  const headers: HeadersInit = { Accept: 'application/json' };
  const token = localStorage.getItem('token');
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}
