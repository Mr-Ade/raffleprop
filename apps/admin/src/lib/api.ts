const API_BASE = process.env['API_URL'] ?? process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

interface FetchOptions extends RequestInit {
  token?: string;
}

export async function adminFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOpts } = options;
  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOpts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(fetchOpts.headers ?? {}),
    },
  });
  const data = await res.json() as { success: boolean; data?: T; error?: string };
  if (!res.ok || !data.success) throw new Error(data.error ?? `API error ${res.status}`);
  return data.data as T;
}
