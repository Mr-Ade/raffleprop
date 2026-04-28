import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAccessToken } from '@/lib/session';
import CampaignForm, { type CampaignData } from '@/components/CampaignForm';
import CampaignStatusBar from '@/components/CampaignStatusBar';

export const metadata: Metadata = { title: 'Edit Campaign — Admin' };

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

async function getCampaign(token: string, id: string) {
  try {
    const res = await fetch(`${API}/api/admin/campaigns/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json() as { success: boolean; data: Record<string, unknown> };
    return json.data ?? null;
  } catch { return null; }
}


export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const token = (await getAccessToken())!;
  const campaign = await getCampaign(token, id);
  if (!campaign) notFound();

  const status = campaign['status'] as string;
  const title = campaign['title'] as string;
  const slug = campaign['slug'] as string;
  const fccpcRef = (campaign['fccpcRef'] as string | null) ?? null;
  const ticketsSold = (campaign['ticketsSold'] as number) ?? 0;
  const totalTickets = (campaign['totalTickets'] as number) ?? 0;
  const pct = totalTickets > 0 ? Math.round((ticketsSold / totalTickets) * 100) : 0;

  return (
    <>
      <div className="admin-topbar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
            <Link href="/admin/campaigns" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'none' }}>
              <i className="fa-solid fa-arrow-left" style={{ marginRight: '0.3rem' }} />All Campaigns
            </Link>
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.375rem' }}>{title}</h1>
          {/* Status badge + action buttons — always visible in topbar */}
          <CampaignStatusBar campaignId={id} status={status} fccpcRef={fccpcRef} token={token} />
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
            {ticketsSold.toLocaleString()} / {totalTickets.toLocaleString()} tickets · {pct}% sold
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['LIVE', 'PAUSED', 'CLOSED', 'DRAWN'].includes(status) && (
            <Link href={`/admin/draw?campaign=${id}`} className="btn btn-primary btn-sm">
              <i className="fa-solid fa-dice" style={{ marginRight: '0.375rem' }} />Draw Manager
            </Link>
          )}
          <Link href={`/campaigns/${slug}`} target="_blank" className="btn btn-outline btn-sm">
            <i className="fa-solid fa-arrow-up-right-from-square" style={{ marginRight: '0.375rem' }} />Public Page
          </Link>
        </div>
      </div>

      <div className="admin-content">

        {/* Ticket progress card */}
        {['LIVE', 'PAUSED'].includes(status) && (
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tickets Sold</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--green-primary)' }}>{ticketsSold.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Remaining</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{(totalTickets - ticketsSold).toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Revenue</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--green-primary)' }}>
                ₦{((ticketsSold * Number(campaign['ticketPrice'])) / 1_000_000).toFixed(2)}M
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="progress-wrap" style={{ marginBottom: '0.25rem' }}>
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pct}% complete</div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Campaign Details</h3>
          </div>
          <div className="card-body" style={{ padding: '1.5rem' }}>
            <CampaignForm mode="edit" initialData={campaign as CampaignData} token={token} />
          </div>
        </div>

      </div>
    </>
  );
}
