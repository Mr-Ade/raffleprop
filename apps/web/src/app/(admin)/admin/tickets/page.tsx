import type { Metadata } from 'next';
import Link from 'next/link';
import { getAccessToken } from '@/lib/session';
import { TicketReceiptButton } from './TicketReceiptButton';
import { TicketsExportButton } from './TicketsExportButton';
import { ConfirmTransferButton } from './ConfirmTransferButton';

export const metadata: Metadata = { title: 'Ticket Registry — Admin' };

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

// ─── Types ────────────────────────────────────────────────────────────────────

type AdminTicket = {
  id: string;
  ticketNumber: string;
  receiptNumber: string;
  paymentRef: string;
  paymentStatus: string;
  paymentGateway: string;
  bankTransferRef: string | null;
  bankTransferProofKey: string | null;
  quantity: number;
  totalAmount: string | number;
  unitPrice: string | number;
  purchasedAt: string;
  skillCorrect: boolean;
  user:     { id: string; fullName: string; email: string };
  campaign: { id: string; title: string; slug: string };
};

type StatusStat    = { count: number; revenue: number };
type TicketsResponse = {
  data: AdminTicket[];
  total: number;
  page: number;
  totalPages: number;
  stats: Record<string, StatusStat>;
  todayCount: number;
};

type CampaignBreakdown = {
  id: string; title: string; slug: string; status: string;
  totalTickets: number; minTickets: number; ticketPrice: number;
  soldCount: number; revenue: number; remaining: number;
  pct: number; minMet: boolean;
};

// ─── Data fetchers ────────────────────────────────────────────────────────────

async function getTickets(
  token: string,
  filters: { status: string; gateway: string; campaignId: string; dateFrom: string; dateTo: string; search: string; page: number },
): Promise<TicketsResponse | null> {
  try {
    const p = new URLSearchParams({ page: String(filters.page), pageSize: '20' });
    if (filters.status     !== 'all' && filters.status)     p.set('status',     filters.status);
    if (filters.gateway    !== 'all' && filters.gateway)    p.set('gateway',    filters.gateway);
    if (filters.campaignId !== 'all' && filters.campaignId) p.set('campaignId', filters.campaignId);
    if (filters.dateFrom)  p.set('dateFrom', filters.dateFrom);
    if (filters.dateTo)    p.set('dateTo',   filters.dateTo);
    if (filters.search)    p.set('search',   filters.search);

    const res = await fetch(`${API}/api/admin/tickets?${p}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json() as { success: boolean; data: TicketsResponse };
    return json.data ?? null;
  } catch { return null; }
}

async function getCampaignBreakdown(token: string): Promise<CampaignBreakdown[]> {
  try {
    const res = await fetch(`${API}/api/admin/tickets/by-campaign`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json() as { success: boolean; data: CampaignBreakdown[] };
    return json.data ?? [];
  } catch { return []; }
}

// ─── Style constants ──────────────────────────────────────────────────────────

const STATUS_INFO: Record<string, { label: string; bg: string; color: string; border: string }> = {
  SUCCESS:  { label: 'Paid',     bg: '#f0fdf4', color: '#166534', border: '#86efac' },
  PENDING:  { label: 'Pending',  bg: '#fef9c3', color: '#a16207', border: '#fde047' },
  FAILED:   { label: 'Failed',   bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' },
  REFUNDED: { label: 'Refunded', bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' },
};

const CAMPAIGN_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  LIVE:      { bg: '#f0fdf4', color: '#166534' },
  CLOSED:    { bg: '#f3f4f6', color: '#6b7280' },
  DRAWN:     { bg: '#ede9fe', color: '#6d28d9' },
  REVIEW:    { bg: '#fef9c3', color: '#a16207' },
  CANCELLED: { bg: '#fee2e2', color: '#b91c1c' },
};

const TH: React.CSSProperties = {
  padding: '0.625rem 0.875rem',
  fontSize: '0.7rem', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.07em',
  color: 'var(--text-muted)', background: '#f9fafb',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap', textAlign: 'left',
};
const TD: React.CSSProperties = {
  padding: '0.75rem 0.875rem',
  fontSize: '0.8125rem', color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--border-light)',
  verticalAlign: 'middle',
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_INFO[status] ?? { label: status, bg: '#f3f4f6', color: '#374151', border: '#d1d5db' };
  return (
    <span style={{
      display: 'inline-block', padding: '0.2rem 0.55rem', borderRadius: 20,
      fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {s.label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string; gateway?: string; campaignId?: string;
    dateFrom?: string; dateTo?: string; search?: string; page?: string;
  }>;
}) {
  const sp         = await searchParams;
  const token      = (await getAccessToken())!;
  const status     = sp.status     ?? 'all';
  const gateway    = sp.gateway    ?? 'all';
  const campaignId = sp.campaignId ?? 'all';
  const dateFrom   = sp.dateFrom   ?? '';
  const dateTo     = sp.dateTo     ?? '';
  const search     = sp.search     ?? '';
  const page       = parseInt(sp.page ?? '1', 10);

  const [result, breakdown] = await Promise.all([
    getTickets(token, { status, gateway, campaignId, dateFrom, dateTo, search, page }),
    getCampaignBreakdown(token),
  ]);

  const tickets    = result?.data       ?? [];
  const total      = result?.total      ?? 0;
  const totalPages = result?.totalPages ?? 1;
  const stats      = result?.stats      ?? {};

  const successStat  = stats['SUCCESS']  ?? { count: 0, revenue: 0 };
  const pendingStat  = stats['PENDING']  ?? { count: 0, revenue: 0 };
  const failedStat   = stats['FAILED']   ?? { count: 0, revenue: 0 };
  const refundedStat = stats['REFUNDED'] ?? { count: 0, revenue: 0 };
  const soldToday    = result?.todayCount ?? 0;

  const isFiltered = status !== 'all' || gateway !== 'all' || campaignId !== 'all' || dateFrom || dateTo || search;

  const exportParams = { status, gateway, campaignId, dateFrom, dateTo, search };

  const pageLink = (p: number) => {
    const q = new URLSearchParams({ page: String(p) });
    if (status     !== 'all') q.set('status',     status);
    if (gateway    !== 'all') q.set('gateway',    gateway);
    if (campaignId !== 'all') q.set('campaignId', campaignId);
    if (dateFrom)  q.set('dateFrom', dateFrom);
    if (dateTo)    q.set('dateTo',   dateTo);
    if (search)    q.set('search',   search);
    return `/admin/tickets?${q}`;
  };

  return (
    <>
      {/* Topbar */}
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Ticket Registry</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            FCCPA §118 — permanent transaction records
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
          <TicketsExportButton token={token} apiUrl={API} params={exportParams} />
        </div>
      </div>

      <div className="admin-content">

        {/* ── Stats row ──────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>

          <div className="stat-card" style={{ padding: '1rem', borderTop: '4px solid var(--green-primary)' }}>
            <div style={{ fontSize: '1.625rem', fontWeight: 900, color: 'var(--green-primary)' }}>
              ₦{(successStat.revenue / 1_000_000).toFixed(1)}M
            </div>
            <div className="stat-label">Total Revenue</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {successStat.count.toLocaleString('en-NG')} paid
            </div>
          </div>

          <div className="stat-card" style={{ padding: '1rem', borderTop: '4px solid var(--gold)' }}>
            <div style={{ fontSize: '1.625rem', fontWeight: 900, color: 'var(--gold)' }}>
              {(successStat.count).toLocaleString('en-NG')}
            </div>
            <div className="stat-label">Confirmed</div>
            {soldToday > 0 && (
              <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '0.25rem' }}>
                +{soldToday} today
              </div>
            )}
          </div>

          {pendingStat.count > 0 && (
            <Link href="/admin/tickets?status=PENDING" style={{ textDecoration: 'none' }}>
              <div className="stat-card" style={{ padding: '1rem', borderTop: '4px solid var(--warning)', cursor: 'pointer' }}>
                <div style={{ fontSize: '1.625rem', fontWeight: 900, color: 'var(--warning)' }}>
                  {pendingStat.count}
                </div>
                <div className="stat-label">Pending Payment</div>
              </div>
            </Link>
          )}

          {refundedStat.count > 0 && (
            <Link href="/admin/tickets?status=REFUNDED" style={{ textDecoration: 'none' }}>
              <div className="stat-card" style={{ padding: '1rem', borderTop: '4px solid #6b7280', cursor: 'pointer' }}>
                <div style={{ fontSize: '1.625rem', fontWeight: 900, color: '#6b7280' }}>
                  {refundedStat.count}
                </div>
                <div className="stat-label">Refunded</div>
              </div>
            </Link>
          )}

          {failedStat.count > 0 && (
            <Link href="/admin/tickets?status=FAILED" style={{ textDecoration: 'none' }}>
              <div className="stat-card" style={{ padding: '1rem', borderTop: '4px solid var(--error)', cursor: 'pointer' }}>
                <div style={{ fontSize: '1.625rem', fontWeight: 900, color: 'var(--error)' }}>
                  {failedStat.count}
                </div>
                <div className="stat-label">Failed</div>
              </div>
            </Link>
          )}
        </div>

        {/* ── Main tickets table card ─────────────────────────────────── */}
        <div className="card" style={{ marginBottom: '2rem' }}>

          {/* Card header + status tabs */}
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.125rem' }}>All Tickets</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {total.toLocaleString('en-NG')} result{total !== 1 ? 's' : ''}
                {isFiltered ? ' · filtered' : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
              {(['all', 'SUCCESS', 'PENDING', 'REFUNDED', 'FAILED'] as const).map((s) => {
                const active = status === s;
                const info   = s !== 'all' ? STATUS_INFO[s] : null;
                const count  = s !== 'all' && stats[s] ? ` (${stats[s].count})` : '';
                return (
                  <Link key={s}
                    href={`/admin/tickets?status=${s}${gateway !== 'all' ? `&gateway=${gateway}` : ''}${campaignId !== 'all' ? `&campaignId=${campaignId}` : ''}${dateFrom ? `&dateFrom=${dateFrom}` : ''}${dateTo ? `&dateTo=${dateTo}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
                    style={{
                      padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.75rem',
                      fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
                      ...(active
                        ? (s === 'all'
                            ? { background: 'var(--green-primary)', color: '#fff', border: '1px solid var(--green-primary)' }
                            : { background: info!.bg, color: info!.color, border: `1px solid ${info!.border}` })
                        : { background: '#f3f4f6', color: 'var(--text-muted)', border: '1px solid var(--border)' }),
                    }}
                  >
                    {s === 'all' ? 'All' : info!.label}{count}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          <form method="GET" action="/admin/tickets"
            style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <input type="hidden" name="status" value={status} />

            {/* Campaign */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: '1 1 160px', minWidth: 0 }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                Campaign
              </label>
              <select name="campaignId" defaultValue={campaignId} className="form-select">
                <option value="all">All Campaigns</option>
                {breakdown.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            {/* Gateway */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: '0 0 140px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                Gateway
              </label>
              <select name="gateway" defaultValue={gateway} className="form-select">
                <option value="all">All Gateways</option>
                <option value="PAYSTACK">Paystack</option>
                <option value="FLUTTERWAVE">Flutterwave</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>

            {/* Date From */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: '0 0 140px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                Date From
              </label>
              <input type="date" name="dateFrom" defaultValue={dateFrom} className="form-input" />
            </div>

            {/* Date To */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: '0 0 140px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                Date To
              </label>
              <input type="date" name="dateTo" defaultValue={dateTo} className="form-input" />
            </div>

            {/* Search */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: '1 1 180px', minWidth: 0 }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                Search
              </label>
              <input
                type="text" name="search" defaultValue={search}
                placeholder="Ticket#, receipt#, payment ref, name…"
                className="form-input"
              />
            </div>

            <div style={{ display: 'flex', gap: '0.375rem', paddingBottom: '1px' }}>
              <button type="submit" className="btn btn-primary btn-sm">Apply</button>
              {isFiltered && (
                <Link href="/admin/tickets" className="btn btn-outline btn-sm">Clear</Link>
              )}
            </div>
          </form>

          {/* Table */}
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="data-table" style={{ minWidth: 1140 }}>
              <colgroup>
                <col style={{ width: 130 }} />
                <col style={{ minWidth: 180 }} />
                <col style={{ minWidth: 150 }} />
                <col style={{ width: 50 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 140 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 60 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 120 }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={TH}>Ticket #</th>
                  <th style={TH}>User</th>
                  <th style={TH}>Campaign</th>
                  <th style={{ ...TH, textAlign: 'center' }}>Qty</th>
                  <th style={TH}>Amount</th>
                  <th style={TH}>Gateway</th>
                  <th style={TH}>Gateway Ref</th>
                  <th style={TH}>Status</th>
                  <th style={{ ...TH, textAlign: 'center' }}>Skill</th>
                  <th style={TH}>Date</th>
                  <th style={TH}>Receipt</th>
                  <th style={TH}>Transfer</th>
                </tr>
              </thead>
              <tbody>
                {tickets.length === 0 && (
                  <tr>
                    <td colSpan={12} style={{ ...TD, textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                      <i className="fa-solid fa-ticket" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem', opacity: 0.3 }} />
                      No tickets match the current filters.
                    </td>
                  </tr>
                )}
                {tickets.map((t) => (
                  <tr key={t.id}>

                    {/* Ticket number — styled green pill */}
                    <td style={TD}>
                      <code style={{
                        fontSize: '0.78rem', fontWeight: 700,
                        color: 'var(--green-primary)',
                        background: 'var(--green-50)',
                        padding: '0.15rem 0.45rem',
                        borderRadius: 4,
                        whiteSpace: 'nowrap',
                      }}>
                        {t.ticketNumber}
                      </code>
                    </td>

                    {/* User */}
                    <td style={TD}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 170 }}>
                        {t.user.fullName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 170 }}>
                        {t.user.email}
                      </div>
                    </td>

                    {/* Campaign */}
                    <td style={TD}>
                      <Link href={`/campaigns/${t.campaign.slug}`} target="_blank"
                        title={t.campaign.title}
                        style={{ color: 'var(--green-primary)', fontWeight: 600, fontSize: '0.8125rem', textDecoration: 'none' }}>
                        {t.campaign.title.length > 26 ? t.campaign.title.slice(0, 26) + '…' : t.campaign.title}
                      </Link>
                    </td>

                    {/* Qty */}
                    <td style={{ ...TD, textAlign: 'center', fontWeight: 700 }}>×{t.quantity}</td>

                    {/* Amount */}
                    <td style={{ ...TD, fontWeight: 700, color: 'var(--green-primary)', whiteSpace: 'nowrap' }}>
                      ₦{Number(t.totalAmount).toLocaleString('en-NG')}
                    </td>

                    {/* Gateway */}
                    <td style={TD}>
                      {(() => {
                        const gw = t.paymentGateway;
                        const gwStyle =
                          gw === 'PAYSTACK'      ? { bg: '#e0f2fe', color: '#0369a1', border: '#7dd3fc', label: 'Paystack' } :
                          gw === 'FLUTTERWAVE'   ? { bg: '#fce7f3', color: '#be185d', border: '#f9a8d4', label: 'Flutterwave' } :
                                                   { bg: '#fef9c3', color: '#a16207', border: '#fde047', label: 'Bank Transfer' };
                        return (
                          <span style={{
                            display: 'inline-block', padding: '0.15rem 0.45rem', borderRadius: 4,
                            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.03em',
                            background: gwStyle.bg, color: gwStyle.color,
                            border: `1px solid ${gwStyle.border}`,
                            whiteSpace: 'nowrap',
                          }}>
                            {gwStyle.label}
                          </span>
                        );
                      })()}
                    </td>

                    {/* Gateway Ref */}
                    <td style={{ ...TD, maxWidth: 130 }}>
                      <code style={{ fontSize: '0.72rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                        {t.paymentRef}
                      </code>
                    </td>

                    {/* Status */}
                    <td style={TD}><StatusPill status={t.paymentStatus} /></td>

                    {/* Skill */}
                    <td style={{ ...TD, textAlign: 'center' }}>
                      {t.skillCorrect
                        ? <i className="fa-solid fa-circle-check" style={{ color: 'var(--success)', fontSize: '0.9rem' }} title="Correct" />
                        : <i className="fa-solid fa-circle-xmark" style={{ color: 'var(--error)', fontSize: '0.9rem' }} title="Wrong" />}
                    </td>

                    {/* Date */}
                    <td style={{ ...TD, whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                      {new Date(t.purchasedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>

                    {/* Receipt */}
                    <td style={TD}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <code style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {t.receiptNumber}
                        </code>
                        {t.paymentStatus === 'SUCCESS' && (
                          <TicketReceiptButton ticketId={t.id} token={token} apiUrl={API} />
                        )}
                      </div>
                    </td>

                    {/* Bank Transfer action */}
                    <td style={TD}>
                      {t.paymentGateway === 'BANK_TRANSFER' && t.paymentStatus === 'PENDING' && (
                        <ConfirmTransferButton
                          ticketId={t.id}
                          ticketNumber={t.ticketNumber}
                          bankTransferRef={t.bankTransferRef}
                          bankTransferProofKey={t.bankTransferProofKey}
                          token={token}
                          apiUrl={API}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', flexWrap: 'wrap', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Page {page} of {totalPages} · {total.toLocaleString('en-NG')} tickets
              </span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {page > 1 && (
                  <Link href={pageLink(page - 1)} className="btn btn-outline btn-sm">
                    <i className="fa-solid fa-chevron-left" style={{ fontSize: '0.7rem' }} />
                  </Link>
                )}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  return (
                    <Link key={p} href={pageLink(p)}
                      className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline'}`}
                      style={{ minWidth: 34, textAlign: 'center' }}>{p}
                    </Link>
                  );
                })}
                {page < totalPages && (
                  <Link href={pageLink(page + 1)} className="btn btn-outline btn-sm">
                    <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.7rem' }} />
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Tickets by Campaign breakdown ──────────────────────────── */}
        {breakdown.length > 0 && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-light)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Tickets by Campaign</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                Revenue, sold count, and minimum threshold status per campaign
              </p>
            </div>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="data-table" style={{ minWidth: 760 }}>
                <colgroup>
                  <col style={{ minWidth: 220 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 80 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 160 }} />
                  <col style={{ width: 120 }} />
                  <col style={{ width: 130 }} />
                  <col style={{ width: 90 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={TH}>Campaign</th>
                    <th style={{ ...TH, textAlign: 'center' }}>Capacity</th>
                    <th style={{ ...TH, textAlign: 'center' }}>Sold</th>
                    <th style={{ ...TH, textAlign: 'center' }}>Remaining</th>
                    <th style={TH}>Progress</th>
                    <th style={TH}>Revenue</th>
                    <th style={TH}>Min. Threshold</th>
                    <th style={TH}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((c) => {
                    const camSt = CAMPAIGN_STATUS_STYLE[c.status] ?? { bg: '#f3f4f6', color: '#6b7280' };
                    return (
                      <tr key={c.id}>

                        {/* Campaign name + status */}
                        <td style={TD}>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.title}</div>
                          <span style={{
                            display: 'inline-block', marginTop: '0.2rem',
                            padding: '0.1rem 0.45rem', borderRadius: 20,
                            fontSize: '0.7rem', fontWeight: 700,
                            background: camSt.bg, color: camSt.color,
                          }}>
                            {c.status}
                          </span>
                        </td>

                        {/* Capacity */}
                        <td style={{ ...TD, textAlign: 'center', fontWeight: 600 }}>
                          {c.totalTickets.toLocaleString('en-NG')}
                        </td>

                        {/* Sold */}
                        <td style={{ ...TD, textAlign: 'center', fontWeight: 700, color: 'var(--green-primary)' }}>
                          {c.soldCount.toLocaleString('en-NG')}
                        </td>

                        {/* Remaining */}
                        <td style={{ ...TD, textAlign: 'center', color: 'var(--text-muted)' }}>
                          {c.remaining.toLocaleString('en-NG')}
                        </td>

                        {/* Progress bar */}
                        <td style={TD}>
                          <div style={{ background: '#e5e7eb', borderRadius: 99, height: 6, overflow: 'hidden', marginBottom: '0.25rem' }}>
                            <div style={{
                              height: '100%', borderRadius: 99,
                              width: `${c.pct}%`,
                              background: c.pct >= 80 ? 'var(--success)' : c.pct >= 50 ? 'var(--warning)' : 'var(--info)',
                            }} />
                          </div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.pct}%</span>
                        </td>

                        {/* Revenue */}
                        <td style={{ ...TD, fontWeight: 700, color: 'var(--green-primary)', whiteSpace: 'nowrap' }}>
                          ₦{c.revenue.toLocaleString('en-NG')}
                        </td>

                        {/* Min threshold */}
                        <td style={TD}>
                          <div style={{ fontSize: '0.8125rem' }}>{c.minTickets.toLocaleString('en-NG')} min</div>
                          <span style={{
                            display: 'inline-block', marginTop: '0.2rem',
                            padding: '0.1rem 0.45rem', borderRadius: 20,
                            fontSize: '0.7rem', fontWeight: 700,
                            background: c.minMet ? '#f0fdf4' : '#fef9c3',
                            color:      c.minMet ? '#166534' : '#a16207',
                          }}>
                            {c.minMet ? '✓ Met' : '⚠ Not met'}
                          </span>
                        </td>

                        {/* Filter to this campaign */}
                        <td style={TD}>
                          <Link
                            href={`/admin/tickets?campaignId=${c.id}`}
                            className="btn btn-outline btn-sm"
                            title="Filter tickets to this campaign"
                          >
                            <i className="fa-solid fa-filter" style={{ marginRight: '0.3rem', fontSize: '0.7rem' }} />
                            Filter
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FCCPA notice */}
        <div style={{ padding: '0.875rem 1.25rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 'var(--radius-lg)', fontSize: '0.8rem', color: '#166534' }}>
          <i className="fa-solid fa-shield-halved" style={{ marginRight: '0.5rem' }} />
          <strong>FCCPA §118:</strong> Ticket records are permanent and cannot be deleted.
          All transaction data is retained indefinitely for regulatory compliance.
          Receipt PDFs are stored in a WORM-protected object store.
        </div>

      </div>
    </>
  );
}
