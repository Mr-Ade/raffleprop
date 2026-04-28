import type { Metadata } from 'next';
import { AdminPageHeader } from '@/components/AdminPageHeader';
import { getAdminToken } from '@/lib/session';
import { adminFetch } from '@/lib/api';

export const metadata: Metadata = { title: 'Content Pages' };

interface ContentPage { id: string; slug: string; title: string; status: string; updatedAt: string; }

async function getPages(token: string) {
  try { return await adminFetch<ContentPage[]>('/api/admin/content', { token, cache: 'no-store' }); }
  catch { return []; }
}

export default async function ContentPage() {
  const token = (await getAdminToken())!;
  const pages = await getPages(token);

  return (
    <>
      <AdminPageHeader title="Content Pages" subtitle="Manage CMS pages (FAQ, How It Works, About, etc.)"
        action={<button className="btn btn-primary btn-sm"><i className="fa-solid fa-plus" /> New Page</button>} />
      <div className="admin-content">
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>Title</th><th>Slug</th><th>Status</th><th>Last Updated</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {pages.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No content pages</td></tr>
                ) : pages.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.title}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--green-primary)' }}>/{p.slug}</td>
                    <td><span className={`badge ${p.status === 'PUBLISHED' ? 'badge-green' : 'badge-gold'}`}>{p.status}</span></td>
                    <td>{new Date(p.updatedAt).toLocaleDateString('en-NG')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button className="btn btn-outline btn-sm"><i className="fa-solid fa-pen" /> Edit</button>
                        {p.status === 'DRAFT' && <button className="btn btn-primary btn-sm">Publish</button>}
                      </div>
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
