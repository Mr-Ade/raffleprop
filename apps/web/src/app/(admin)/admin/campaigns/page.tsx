import type { Metadata } from 'next';
import Link from 'next/link';
import { getAccessToken } from '@/lib/session';

export const metadata: Metadata = { title: 'Campaign Manager — Admin' };

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

type Campaign = {
  id: string;
  slug: string;
  title: string;
  propertyState: string;
  propertyLga: string;
  status: string;
  totalTickets: number;
  ticketPrice: string | number;
  drawDate: string | null;
  ticketsSold?: number;
};

type ListResponse = { data: Campaign[]; total: number; page: number; totalPages: number };

async function getCampaigns(token: string, status: string, search: string, page: number): Promise<ListResponse | null> {
  try {
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (status !== 'all') params.set('status', status);
    if (search) params.set('search', search);
    const res = await fetch(`${API}/api/admin/campaigns?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json() as { success: boolean; data: ListResponse };
    return json.data ?? null;
  } catch { return null; }
}

async function getAllCampaigns(token: string): Promise<Campaign[]> {
  // Fetch a wider set to compute stats
  try {
    const res = await fetch(`${API}/api/admin/campaigns?pageSize=100`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json() as { success: boolean; data: ListResponse };
    return json.data?.data ?? [];
  } catch { return []; }
}

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'badge-gray', REVIEW: 'badge-gold', UPCOMING: 'badge-info',
  LIVE: 'badge-green', PAUSED: 'badge-gold', CLOSED: 'badge-gray',
  DRAWN: 'badge-green', FILED: 'badge-green', CANCELLED: 'badge-red',
};

export default async function AdminCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const token = (await getAccessToken())!;
  const status = sp.status ?? 'all';
  const search = sp.search ?? '';
  const page = parseInt(sp.page ?? '1', 10);

  const [result, allCampaigns] = await Promise.all([
    getCampaigns(token, status, search, page),
    getAllCampaigns(token),
  ]);

  const campaigns = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;

  // Stats from allCampaigns
  const liveCampaigns = allCampaigns.filter(c => c.status === 'LIVE');
  const reviewCampaigns = allCampaigns.filter(c => c.status === 'REVIEW');
  const drawnCampaigns = allCampaigns.filter(c => c.status === 'DRAWN' || c.status === 'CLOSED');
  const totalTicketsSold = allCampaigns.reduce((s, c) => s + (c.ticketsSold ?? 0), 0);

  const STATS = [
    { label: 'Live', value: liveCampaigns.length, color: 'var(--green-primary)', filterStatus: 'LIVE' },
    { label: 'Under Review', value: reviewCampaigns.length, color: 'var(--gold)', filterStatus: 'REVIEW' },
    { label: 'Archived', value: drawnCampaigns.length, color: 'var(--text-muted)', filterStatus: 'DRAWN' },
    { label: 'Total Tickets Sold', value: totalTicketsSold.toLocaleString(), color: 'var(--info)', filterStatus: 'all' },
  ];

  const archivedCampaigns = allCampaigns.filter(c => c.status === 'DRAWN' || c.status === 'CLOSED');

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Campaign Manager</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Create, edit, and manage all property campaigns</p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
          <Link href="/admin/calculator" className="btn btn-primary btn-sm">
            <i className="fa-solid fa-calculator" style={{ marginRight: '0.4rem' }} />New via Calculator
          </Link>
          <Link href="/admin/campaigns/new" className="btn btn-outline btn-sm">
            <i className="fa-solid fa-plus" style={{ marginRight: '0.4rem' }} />Quick Create
          </Link>
        </div>
      </div>

      <div className="admin-content">

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {STATS.map((s) => (
            <Link key={s.label} href={`/admin/campaigns?status=${s.filterStatus}`} style={{ textDecoration: 'none' }}>
              <div className="stat-card" style={{ padding: '1rem', borderTop: `4px solid ${s.color}`, cursor: 'pointer' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Campaign table */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
              All Campaigns
              <span style={{ marginLeft: '0.625rem', fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>{total} total</span>
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {(['all', 'LIVE', 'UPCOMING', 'PAUSED', 'REVIEW', 'DRAFT', 'CLOSED', 'DRAWN', 'CANCELLED'] as const).map((s) => (
                <Link
                  key={s}
                  href={`/admin/campaigns?status=${s}&search=${search}`}
                  className={`btn btn-sm ${status === s ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
                >
                  {s === 'all' ? 'All' : s}
                </Link>
              ))}
            </div>
          </div>

          {/* Search */}
          <form method="GET" action="/admin/campaigns" style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
            <input type="hidden" name="status" value={status} />
            <input
              type="text" name="search" defaultValue={search}
              placeholder="Search campaign title or location..."
              className="form-input" style={{ flex: 1, minWidth: 240 }}
            />
            <button type="submit" className="btn btn-primary btn-sm">
              <i className="fa-solid fa-search" style={{ marginRight: '0.4rem' }} />Search
            </button>
            {(search || status !== 'all') && (
              <Link href="/admin/campaigns" className="btn btn-outline btn-sm">Clear</Link>
            )}
          </form>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table data-table-responsive">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Status</th>
                  <th>Tickets</th>
                  <th>Progress</th>
                  <th>Revenue</th>
                  <th>Draw Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No campaigns found.
                    </td>
                  </tr>
                )}
                {campaigns.map((c) => {
                  const sold = c.ticketsSold ?? 0;
                  const pct = c.totalTickets > 0 ? Math.round((sold / c.totalTickets) * 100) : 0;
                  const revenue = sold * Number(c.ticketPrice);
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.propertyState} · {c.propertyLga}</div>
                      </td>
                      <td><span className={`badge ${STATUS_BADGE[c.status] ?? 'badge-gray'}`}>{c.status}</span></td>
                      <td style={{ fontSize: '0.875rem' }}>{sold.toLocaleString()} / {c.totalTickets.toLocaleString()}</td>
                      <td style={{ minWidth: 120 }}>
                        <div className="progress-wrap" style={{ marginBottom: '0.25rem' }}>
                          <div className="progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pct}%</div>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--green-primary)' }}>
                        ₦{(revenue / 1_000_000).toFixed(2)}M
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        {c.drawDate
                          ? new Date(c.drawDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          <Link href={`/admin/campaigns/${c.id}`} className="btn btn-outline btn-sm" title="Edit campaign">
                            <i className="fa-solid fa-pen" />
                          </Link>
                          {(c.status === 'LIVE' || c.status === 'CLOSED') && (
                            <Link href={`/admin/draw?campaign=${c.id}`} className="btn btn-primary btn-sm" title="Draw Manager">
                              <i className="fa-solid fa-dice" />
                            </Link>
                          )}
                          <Link href={`/campaigns/${c.slug}`} target="_blank" className="btn btn-outline btn-sm" title="View public page">
                            <i className="fa-solid fa-arrow-up-right-from-square" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Page {page} of {totalPages} · {total} campaigns
              </div>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                {page > 1 && (
                  <Link href={`/admin/campaigns?status=${status}&search=${search}&page=${page - 1}`} className="btn btn-outline btn-sm">
                    <i className="fa-solid fa-chevron-left" />
                  </Link>
                )}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  return (
                    <Link key={p} href={`/admin/campaigns?status=${status}&search=${search}&page=${p}`}
                      className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline'}`}
                      style={{ minWidth: 36 }}>{p}</Link>
                  );
                })}
                {page < totalPages && (
                  <Link href={`/admin/campaigns?status=${status}&search=${search}&page=${page + 1}`} className="btn btn-outline btn-sm">
                    <i className="fa-solid fa-chevron-right" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Archived / Drawn campaigns */}
        {archivedCampaigns.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Archived Campaigns</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Draw Date</th>
                    <th>Tickets Sold</th>
                    <th>Revenue</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedCampaigns.map((c) => {
                    const sold = c.ticketsSold ?? 0;
                    const revenue = sold * Number(c.ticketPrice);
                    return (
                      <tr key={c.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{c.title}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.propertyState}</div>
                        </td>
                        <td style={{ fontSize: '0.8125rem' }}>
                          {c.drawDate
                            ? new Date(c.drawDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'}
                        </td>
                        <td>{sold.toLocaleString()} / {c.totalTickets.toLocaleString()}</td>
                        <td style={{ fontWeight: 700, color: 'var(--green-primary)' }}>₦{(revenue / 1_000_000).toFixed(2)}M</td>
                        <td><span className={`badge ${STATUS_BADGE[c.status] ?? 'badge-gray'}`}>{c.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.375rem' }}>
                            <Link href={`/admin/campaigns/${c.id}`} className="btn btn-outline btn-sm" title="View details">
                              <i className="fa-solid fa-eye" />
                            </Link>
                            <Link href={`/campaigns/${c.slug}`} target="_blank" className="btn btn-outline btn-sm" title="Public page">
                              <i className="fa-solid fa-arrow-up-right-from-square" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
