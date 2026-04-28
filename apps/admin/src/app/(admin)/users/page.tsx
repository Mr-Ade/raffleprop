import type { Metadata } from 'next';
import { AdminPageHeader } from '@/components/AdminPageHeader';
import { getAdminToken } from '@/lib/session';
import { adminFetch } from '@/lib/api';

export const metadata: Metadata = { title: 'Users' };

interface AdminUser { id: string; fullName: string; email: string; phone: string; kycStatus: string; role: string; createdAt: string; referralCount: number; }

async function getUsers(token: string) {
  try { return await adminFetch<{ data: AdminUser[]; total: number }>('/api/admin/users?pageSize=50', { token, cache: 'no-store' }); }
  catch { return { data: [], total: 0 }; }
}

const KYC_BADGE: Record<string, string> = { PENDING: 'badge-gray', SUBMITTED: 'badge-blue', VERIFIED: 'badge-green', REJECTED: 'badge-red' };

export default async function UsersPage() {
  const token = (await getAdminToken())!;
  const { data: users, total } = await getUsers(token);

  return (
    <>
      <AdminPageHeader title="Users" subtitle={`${total} registered users`} />
      <div className="admin-content">
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Phone</th><th>KYC</th><th>Role</th><th>Referrals</th><th>Joined</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No users</td></tr>
                ) : users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.fullName}</td>
                    <td>{u.email}</td>
                    <td>{u.phone}</td>
                    <td><span className={`badge ${KYC_BADGE[u.kycStatus] ?? 'badge-gray'}`}>{u.kycStatus}</span></td>
                    <td><span className="badge badge-blue">{u.role}</span></td>
                    <td>{u.referralCount}</td>
                    <td>{new Date(u.createdAt).toLocaleDateString('en-NG')}</td>
                    <td>
                      {u.kycStatus === 'SUBMITTED' && (
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          <button className="btn btn-primary btn-sm">Verify</button>
                          <button className="btn btn-outline btn-sm" style={{ borderColor: 'var(--error)', color: 'var(--error)' }}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
