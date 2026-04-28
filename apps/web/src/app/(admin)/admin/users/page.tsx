import type { Metadata } from 'next';
import Link from 'next/link';
import { getAccessToken } from '@/lib/session';
import { ExportButton } from './ExportButton';
import { NdprRequestsTable } from './NdprRequestsTable';
import { UsersTable } from './UsersTable';
import { KycQueueTable } from './KycQueueTable';

export const metadata: Metadata = { title: 'User Management — Admin' };

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  kycStatus: string;
  role: string;
  referralCode: string;
  referralCount: number;
  phoneVerified: boolean;
  emailVerified: boolean;
  totalSpent: number;
  bannedAt: string | null;
  flaggedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  _count: { tickets: number };
};

type UsersResponse = { data: AdminUser[]; total: number; page: number; totalPages: number };

type StatsResponse = {
  total: number;
  newToday: number;
  kycBreakdown: Record<string, number>;
  ndprPending: number;
  flaggedCount: number;
  bannedCount: number;
};

type NdprRequest = {
  id: string;
  userId: string;
  requestType: string;
  status: string;
  requestedAt: string;
  dueAt: string;
  notes: string | null;
  user?: { fullName: string; email: string; _count: { tickets: number } } | null;
};

export type KycQueueEntry = {
  id: string;
  fullName: string;
  email: string;
  kycIdType: string | null;
  kycDocumentKey: string | null;
  kycSubmittedAt: string | null;
  hasBvn: boolean;
  hasNin: boolean;
};

async function getUsers(
  token: string, search: string, kycFilter: string, statusFilter: string, sortBy: string, page: number,
): Promise<UsersResponse | null> {
  try {
    const params = new URLSearchParams({ page: String(page), pageSize: '20', sortBy });
    if (search) params.set('search', search);
    if (kycFilter !== 'all') params.set('kycStatus', kycFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    const res = await fetch(`${API}/api/admin/users?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json() as { success: boolean; data: UsersResponse };
    return json.data ?? null;
  } catch { return null; }
}

async function getStats(token: string): Promise<StatsResponse | null> {
  try {
    const res = await fetch(`${API}/api/admin/users/stats`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json() as { success: boolean; data: StatsResponse };
    return json.data ?? null;
  } catch { return null; }
}

async function getNdprRequests(token: string): Promise<NdprRequest[]> {
  try {
    const res = await fetch(`${API}/api/ndpr/requests`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json() as { success: boolean; data: NdprRequest[] };
    return json.data ?? [];
  } catch { return []; }
}

async function getKycQueue(token: string): Promise<KycQueueEntry[]> {
  try {
    const res = await fetch(`${API}/api/admin/users/kyc-queue`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json() as { success: boolean; data: KycQueueEntry[] };
    return json.data ?? [];
  } catch { return []; }
}

const SORT_OPTIONS = [
  { value: 'createdAt',    label: 'Newest First' },
  { value: 'fullName',     label: 'Name A–Z' },
  { value: 'email',        label: 'Email A–Z' },
  { value: 'kycStatus',    label: 'KYC Status' },
  { value: 'most-tickets', label: 'Most Tickets' },
  { value: 'most-spent',   label: 'Most Spent' },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; kyc?: string; status?: string; sortBy?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const token = (await getAccessToken())!;
  const search = sp.search ?? '';
  const kyc = sp.kyc ?? 'all';
  const status = sp.status ?? 'all';
  const sortBy = sp.sortBy ?? 'createdAt';
  const page = parseInt(sp.page ?? '1', 10);

  const [result, stats, ndprRequests, kycQueue] = await Promise.all([
    getUsers(token, search, kyc, status, sortBy, page),
    getStats(token),
    getNdprRequests(token),
    getKycQueue(token),
  ]);

  const users = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;

  const kycVerified  = stats?.kycBreakdown?.['VERIFIED'] ?? 0;
  const kycSubmitted = stats?.kycBreakdown?.['SUBMITTED'] ?? 0;
  const ndprPending  = stats?.ndprPending ?? 0;
  const newToday     = stats?.newToday ?? 0;
  const flaggedCount = stats?.flaggedCount ?? 0;
  const bannedCount  = stats?.bannedCount ?? 0;

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>User Management</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Manage registered users, KYC verification, and account flags
          </p>
        </div>
        <ExportButton apiUrl={`${API}/api/admin/users/export`} token={token} />
      </div>

      <div className="admin-content">

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <Link href="/admin/users" style={{ textDecoration: 'none' }}>
            <div className="stat-card" style={{ padding: '1rem', borderTop: '4px solid var(--green-primary)', cursor: 'pointer' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--green-primary)' }}>{(stats?.total ?? total).toLocaleString('en-NG')}</div>
              <div className="stat-label">Total Users</div>
              {newToday > 0 && <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '0.25rem' }}>+{newToday} today</div>}
            </div>
          </Link>

          <Link href="/admin/users?kyc=VERIFIED" style={{ textDecoration: 'none' }}>
            <div className="stat-card" style={{ padding: '1rem', borderTop: '4px solid var(--info)', cursor: 'pointer' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--info)' }}>{kycVerified.toLocaleString('en-NG')}</div>
              <div className="stat-label">KYC Verified</div>
            </div>
          </Link>

          <Link href="/admin/users?kyc=SUBMITTED" style={{ textDecoration: 'none' }}>
            <div className="stat-card" style={{ padding: '1rem', borderTop: '4px solid var(--warning)', cursor: 'pointer' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--warning)' }}>{kycSubmitted.toLocaleString('en-NG')}</div>
              <div className="stat-label">KYC Pending</div>
            </div>
          </Link>

          {flaggedCount > 0 && (
            <Link href="/admin/users?status=FLAGGED" style={{ textDecoration: 'none' }}>
              <div className="stat-card" style={{ padding: '1rem', borderTop: '4px solid #d97706', cursor: 'pointer' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#d97706' }}>{flaggedCount}</div>
                <div className="stat-label">Flagged</div>
              </div>
            </Link>
          )}

          {bannedCount > 0 && (
            <Link href="/admin/users?status=BANNED" style={{ textDecoration: 'none' }}>
              <div className="stat-card" style={{ padding: '1rem', borderTop: '4px solid var(--danger)', cursor: 'pointer' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--danger)' }}>{bannedCount}</div>
                <div className="stat-label">Banned</div>
              </div>
            </Link>
          )}

          {ndprPending > 0 && (
            <div className="stat-card" style={{ padding: '1rem', borderTop: '4px solid #7c3aed' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#7c3aed' }}>{ndprPending}</div>
              <div className="stat-label">NDPR Deletions</div>
            </div>
          )}
        </div>

        {/* KYC pending alert */}
        {kycSubmitted > 0 && (
          <div style={{ padding: '1rem 1.25rem', background: '#fef9c3', border: '1px solid #fde047', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <i className="fa-solid fa-id-card" style={{ color: '#a16207', fontSize: '1.125rem' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#a16207' }}>
                {kycSubmitted} KYC submission{kycSubmitted !== 1 ? 's' : ''} awaiting review
              </div>
              <div style={{ fontSize: '0.8rem', color: '#92400e' }}>Review submitted documents and approve or reject.</div>
            </div>
            <Link href="/admin/users?kyc=SUBMITTED" className="btn btn-sm"
              style={{ marginLeft: 'auto', background: '#fef9c3', border: '1px solid #fde047', color: '#a16207', whiteSpace: 'nowrap' }}>
              Review Queue
            </Link>
          </div>
        )}

        {/* KYC Approval Queue */}
        {kycQueue.length > 0 && (
          <KycQueueTable entries={kycQueue} token={token} apiUrl={API} />
        )}

        {/* Users table — client component for checkboxes + bulk actions + ban/flag */}
        <UsersTable
          users={users}
          total={total}
          page={page}
          totalPages={totalPages}
          search={search}
          kyc={kyc}
          status={status}
          sortBy={sortBy}
          token={token}
          apiUrl={API}
          sortOptions={SORT_OPTIONS}
        />

        {/* NDPR Deletion Requests */}
        <NdprRequestsTable requests={ndprRequests} token={token} apiUrl={`${API}/api/ndpr`} />

        {/* NDPR compliance notice */}
        <div style={{ padding: '0.875rem 1.25rem', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 'var(--radius-lg)', fontSize: '0.8rem', color: '#6d28d9' }}>
          <i className="fa-solid fa-circle-info" style={{ marginRight: '0.5rem' }} />
          <strong>NDPR 2019:</strong> Deletion requests must be actioned within 30 days.
          Transaction and compliance records cannot be deleted under FCCPA 2018 §122 even on user request.
        </div>

      </div>
    </>
  );
}
