import type { Metadata } from 'next';
import { getAccessToken } from '@/lib/session';
import CampaignForm, { type CampaignData } from '@/components/CampaignForm';
import Link from 'next/link';

export const metadata: Metadata = { title: 'New Campaign — Admin' };

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function NewCampaignPage({ searchParams }: Props) {
  const token = (await getAccessToken())!;
  const params = await searchParams;
  const fromCalculator = params['from'] === 'calculator';

  // Pre-fill values passed from the calculator (only include defined numeric values)
  const calcDefaults = fromCalculator ? {
    ...(params['ticketPrice']  ? { ticketPrice:  Number(params['ticketPrice'])  } : {}),
    ...(params['totalTickets'] ? { totalTickets: Number(params['totalTickets']) } : {}),
    ...(params['minTickets']   ? { minTickets:   Number(params['minTickets'])   } : {}),
    ...(params['marketValue']  ? { marketValue:  Number(params['marketValue'])  } : {}),
    ...(params['reservePrice'] ? { reservePrice: Number(params['reservePrice']) } : {}),
  } : undefined;

  return (
    <>
      <div className="admin-topbar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
            <Link href="/admin/campaigns" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'none' }}>
              <i className="fa-solid fa-arrow-left" style={{ marginRight: '0.3rem' }} />Campaigns
            </Link>
            {fromCalculator && (
              <>
                <span style={{ color: 'var(--border)', fontSize: '0.75rem' }}>·</span>
                <Link href="/admin/calculator" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'none' }}>
                  <i className="fa-solid fa-calculator" style={{ marginRight: '0.3rem' }} />Back to Calculator
                </Link>
              </>
            )}
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>New Campaign</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {fromCalculator
              ? 'Ticket pricing pre-filled from the calculator. Complete the remaining details.'
              : 'Fill in the details below to create a new campaign. It will be saved as a Draft.'}
          </p>
        </div>
        {!fromCalculator && (
          <Link href="/admin/calculator" className="btn btn-outline btn-sm">
            <i className="fa-solid fa-calculator" style={{ marginRight: '0.4rem' }} />
            Use Calculator
          </Link>
        )}
      </div>

      {fromCalculator && (
        <div style={{ padding: '0 1.5rem' }}>
          <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 'var(--radius)', fontSize: '0.8125rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fa-solid fa-calculator" />
            <span>
              <strong>Values pre-filled from calculator:</strong> ticket price, total tickets, minimum threshold, market value, and reserve price have been calculated to cover all costs and regulatory fees. You can adjust them if needed.
            </span>
          </div>
        </div>
      )}

      <div className="admin-content">
        <div className="card">
          <div className="card-body" style={{ padding: '1.5rem' }}>
            <CampaignForm mode="create" token={token} initialData={calcDefaults as Partial<CampaignData>} />
          </div>
        </div>
      </div>
    </>
  );
}
