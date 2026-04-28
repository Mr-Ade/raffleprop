import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerSession, getAccessToken } from '@/lib/session';
import { CopyButton } from '@/components/CopyButton';

export const metadata: Metadata = { title: 'Referral Programme — RaffleProp' };

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const SITE_URL = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://raffleprop.com';

type ReferralStats = {
  referralCode: string;
  referralCount: number;
  referralEarnings: number;
  freeTicketsEarned: number;
  nextFreeTicketIn: number;
  progressPercent: number;
};

async function getReferralStats(token: string): Promise<ReferralStats | null> {
  try {
    const res = await fetch(`${API}/api/users/me/referral-stats`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json() as { success: boolean; data: ReferralStats };
    return json.data ?? null;
  } catch { return null; }
}

const HOW_IT_WORKS = [
  { step: '01', title: 'Get Your Link', desc: 'Your unique referral code is shown below. Share it with friends and family.' },
  { step: '02', title: 'Friend Registers', desc: 'When someone registers using your code, they become one of your referrals.' },
  { step: '03', title: 'Earn Rewards', desc: 'Every 5 successful referrals earns you a ₦5,000 ticket credit automatically.' },
  { step: '04', title: 'Keep Winning', desc: 'There is no cap — the more you refer, the more credits you accumulate.' },
];

export default async function ReferralsPage() {
  const user = (await getServerSession())!;
  const token = (await getAccessToken())!;
  const stats = await getReferralStats(token);

  const referralCode = stats?.referralCode ?? '—';
  const referralCount = stats?.referralCount ?? 0;
  const referralEarnings = stats?.referralEarnings ?? 0;
  const freeTicketsEarned = stats?.freeTicketsEarned ?? 0;
  const nextFreeTicketIn = stats?.nextFreeTicketIn ?? 5;
  const progressPercent = stats?.progressPercent ?? 0;

  const referralLink = `${SITE_URL}/register?ref=${referralCode}`;
  const shareText = encodeURIComponent(
    `Join RaffleProp and win a property! Use my referral code ${referralCode} when you register: ${referralLink}`
  );
  const whatsappUrl = `https://wa.me/?text=${shareText}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${shareText}`;

  return (
    <>
      {/* Mobile header */}
      <div className="portal-mobile-header">
        <div className="portal-mobile-header-avatar">
          {user.fullName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
        </div>
        <div>
          <div className="portal-mobile-header-name">Referral Programme</div>
          <div className="portal-mobile-header-sub">Invite friends, earn rewards</div>
        </div>
      </div>

      {/* Page header */}
      <div className="portal-page-header">
        <h1 className="portal-page-title">Referral Programme</h1>
        <p className="portal-page-subtitle">Invite friends and earn ticket credits for every 5 referrals</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Referrals', value: referralCount, color: 'var(--green-primary)', icon: 'fa-users' },
          { label: 'Free Tickets Earned', value: freeTicketsEarned, color: 'var(--gold)', icon: 'fa-ticket' },
          { label: 'Total Earnings', value: `₦${referralEarnings.toLocaleString()}`, color: '#3b82f6', icon: 'fa-naira-sign' },
          { label: 'Next Reward In', value: `${nextFreeTicketIn} referrals`, color: 'var(--text-secondary)', icon: 'fa-gift' },
        ].map((s) => (
          <div key={s.label} className="stat-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <i className={`fa-solid ${s.icon}`} style={{ fontSize: '1.5rem', color: s.color, marginBottom: '0.5rem', display: 'block' }} />
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Referral link card */}
      <div className="stat-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
          <i className="fa-solid fa-link" style={{ marginRight: '0.5rem', color: 'var(--green-primary)' }} />
          Your Referral Code &amp; Link
        </h2>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {/* Code badge */}
          <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-lg)', background: 'var(--green-50)', border: '2px dashed var(--green-primary)' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '1.375rem', fontWeight: 800, color: 'var(--green-primary)', letterSpacing: '0.1em' }}>
              {referralCode}
            </span>
          </div>

          {/* Link input */}
          <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <i className="fa-solid fa-globe" />
            {referralLink}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <CopyButton
            text={referralLink}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          />
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm"
            style={{ background: '#25D366', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <i className="fa-brands fa-whatsapp" />
            Share on WhatsApp
          </a>
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm"
            style={{ background: '#1DA1F2', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <i className="fa-brands fa-twitter" />
            Share on X
          </a>
        </div>
      </div>

      {/* Progress bar */}
      <div className="stat-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
            <i className="fa-solid fa-trophy" style={{ marginRight: '0.5rem', color: 'var(--gold)' }} />
            Progress to Next Free Ticket
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {referralCount % 5} / 5 referrals
          </div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 99, height: 12, overflow: 'hidden', marginBottom: '0.5rem' }}>
          <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, var(--green-primary), var(--green-light))', width: `${progressPercent}%`, transition: 'width 0.6s ease' }} />
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {nextFreeTicketIn === 5
            ? 'Start referring friends to earn your first free ticket credit!'
            : `Only ${nextFreeTicketIn} more referral${nextFreeTicketIn !== 1 ? 's' : ''} until your next ₦5,000 ticket credit!`}
        </p>
      </div>

      {/* How it works */}
      <div className="stat-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
          <i className="fa-solid fa-circle-info" style={{ marginRight: '0.5rem', color: 'var(--green-primary)' }} />
          How the Programme Works
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {HOW_IT_WORKS.map((step) => (
            <div key={step.step} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--green-primary), var(--green-light))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>
                {step.step}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{step.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Terms */}
      <div style={{ padding: '1rem 1.5rem', borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--text-secondary)' }}>Terms:</strong>{' '}
        Referral credits are issued as ₦5,000 ticket vouchers after every 5 verified registrations using your code.
        Self-referrals are not permitted. Credits are non-transferable and cannot be converted to cash.
        RaffleProp reserves the right to withhold credits for accounts suspected of fraud.
        See our <Link href="/terms" style={{ color: 'var(--green-primary)' }}>Terms &amp; Conditions</Link> for full details.
      </div>
    </>
  );
}
