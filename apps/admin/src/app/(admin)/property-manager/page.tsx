import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminPageHeader } from '@/components/AdminPageHeader';
import { getAdminToken } from '@/lib/session';
import { adminFetch } from '@/lib/api';
import type { Campaign } from '@raffleprop/shared';

export const metadata: Metadata = { title: 'Property Manager' };

async function getCampaigns(token: string) {
  try { return await adminFetch<{ data: Campaign[] }>('/api/admin/campaigns', { token, cache: 'no-store' }); }
  catch { return { data: [] }; }
}

export default async function PropertyManagerPage() {
  const token = (await getAdminToken())!;
  const { data: campaigns } = await getCampaigns(token);

  return (
    <>
      <AdminPageHeader title="Property Manager" subtitle="Manage property listings and documents" />
      <div className="admin-content">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {campaigns.length === 0 ? (
            <div className="card"><div className="card-body" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No properties</div></div>
          ) : campaigns.map((c) => {
            const docs = c.documentKeys as Record<string, string | undefined> | null;
            const docCount = docs ? Object.values(docs).filter(Boolean).length : 0;
            return (
              <div key={c.id} className="card">
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{c.title}</h3>
                    <span className={`badge ${c.status === 'LIVE' ? 'badge-green' : c.status === 'DRAFT' ? 'badge-gray' : 'badge-blue'}`}>{c.status}</span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    <i className="fa-solid fa-location-dot" style={{ marginRight: '0.375rem' }} />
                    {c.propertyState}, {c.propertyLga}
                  </div>
                  <div className="spec-row">
                    <span className="spec-key">Market Value</span>
                    <span className="spec-val" style={{ color: 'var(--green-primary)' }}>₦{Number(c.marketValue).toLocaleString()}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-key">Documents</span>
                    <span className="spec-val">{docCount} uploaded</span>
                  </div>
                  <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <Link href={`/campaigns/${c.id}`} className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                      <i className="fa-solid fa-pen" /> Edit
                    </Link>
                    <Link href={`/campaigns/${c.id}?tab=documents`} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                      <i className="fa-solid fa-file-arrow-up" /> Documents
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
