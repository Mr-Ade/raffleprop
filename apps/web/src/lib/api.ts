/**
 * API client for the Express backend.
 * Used by both Server Components (server-side fetch) and Client Components.
 */

// API_URL (non-public) is used server-side on Vercel — bypasses custom domain DNS propagation.
// NEXT_PUBLIC_API_URL is used client-side in the browser.
const API_BASE = process.env['API_URL'] ?? process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

interface FetchOptions extends RequestInit {
  token?: string;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOpts } = options;
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    ...fetchOpts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(fetchOpts.headers ?? {}),
    },
  });

  const data = await res.json() as { success: boolean; data?: T; error?: string };

  if (!res.ok || !data.success) {
    throw new Error(data.error ?? `API error ${res.status}`);
  }

  return data.data as T;
}

export const api = {
  // ─── Campaigns ─────────────────────────────────────────────────────────────
  getCampaigns: (query?: Record<string, string>) => {
    const params = query ? `?${new URLSearchParams(query).toString()}` : '';
    return apiFetch<{
      data: import('@raffleprop/shared').Campaign[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(`/api/campaigns${params}`, {
      next: { revalidate: 60 }, // ISR: revalidate every 60 seconds
    });
  },

  getCampaign: (slug: string) =>
    apiFetch<import('@raffleprop/shared').Campaign>(`/api/campaigns/${slug}`, {
      next: { revalidate: 30 },
    }),

  getTicketCount: (campaignId: string) =>
    apiFetch<{ ticketsSold: number }>(`/api/campaigns/${campaignId}/tickets/count`, {
      cache: 'no-store',
    }),

  getDrawLive: (campaignId: string) =>
    apiFetch<{
      campaign: {
        id: string;
        title: string;
        propertyAddress: string;
        propertyState: string;
        propertyLga: string;
        marketValue: string;
        totalTickets: number;
        ticketPrice: string;
        drawDate: string | null;
        drawMethod: string;
        featuredImageKey: string | null;
        status: string;
      };
      draw: {
        id: string;
        status: string;
        seedCommitment: string | null;
        drawSeed: string | null;
        drawPreSeed: string | null;
        ticketListHash: string | null;
        ticketCount: number | null;
        publicAnnouncedAt: string | null;
        initiatedAt: string;
        winnerFirstName: string | null;
        winnerTicketNumber: string | null;
      } | null;
      ticketsSold: number;
    }>(`/api/draws/${campaignId}/live`, { cache: 'no-store' }),

  // ─── Auth ───────────────────────────────────────────────────────────────────
  login: (email: string, password: string) =>
    apiFetch<{ accessToken: string; refreshToken: string; expiresIn: number }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    }),

  register: (data: import('@raffleprop/shared').RegisterInput) =>
    apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
      cache: 'no-store',
    }),

  refresh: (refreshToken: string) =>
    apiFetch<{ accessToken: string; refreshToken: string }>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    }),

  // ─── Tickets ────────────────────────────────────────────────────────────────
  initiateTicket: (
    token: string,
    data: import('@raffleprop/shared').InitiateTicketInput,
  ) =>
    apiFetch<import('@raffleprop/shared').InitiateTicketResponse>('/api/tickets/initiate', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
      cache: 'no-store',
    }),

  getMyTickets: (token: string) =>
    apiFetch<{ data: import('@raffleprop/shared').Ticket[] }>('/api/tickets', {
      token,
      cache: 'no-store',
    }),
};
