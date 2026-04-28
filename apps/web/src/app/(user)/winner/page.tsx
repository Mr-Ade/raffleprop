import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerSession, getAccessToken } from '@/lib/session';
import { WinnerDocumentsClient } from './WinnerDocumentsClient';

export const metadata: Metadata = { title: 'Winner Portal — RaffleProp' };

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

type WinnerStatus = {
  isWinner: boolean;
  draw: {
    id: string;
    status: string;
    witnessName: string | null;
    witnessTitle: string | null;
    publicAnnouncedAt: string | null;
    winnerNotifiedAt: string | null;
    fccpcNotifiedAt: string | null;
    claimIdentityVerifiedAt: string | null;
    claimAcceptanceSignedAt: string | null;
    claimKycCompletedAt: string | null;
    claimTransferCompletedAt: string | null;
    claimKeysHandedAt: string | null;
    campaign: {
      title: string;
      slug: string;
      propertyAddress: string;
      marketValue: number;
    };
    winnerTicket: {
      ticketNumber: string;
      purchasedAt: string;
    };
  } | null;
};

async function getWinnerStatus(token: string): Promise<WinnerStatus> {
  try {
    const res = await fetch(`${API}/api/users/me/winner-status`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return { isWinner: false, draw: null };
    const json = await res.json() as { success: boolean; data: WinnerStatus };
    return json.data ?? { isWinner: false, draw: null };
  } catch { return { isWinner: false, draw: null }; }
}

const WINNER_STEPS = [
  {
    step: 1,
    icon: 'fa-trophy',
    title: 'Identity Verification',
    desc: 'Our team contacts you within 3 business days to verify your identity against the ticket purchase record.',
    timeline: 'Within 3 days of draw',
  },
  {
    step: 2,
    icon: 'fa-file-signature',
    title: 'Winner Acceptance Form',
    desc: 'You receive and sign the Winner Acceptance Form, confirming your claim and providing your legal details.',
    timeline: 'Days 3–7',
  },
  {
    step: 3,
    icon: 'fa-building-columns',
    title: 'Legal & KYC Due Diligence',
    desc: 'Full KYC verification (BVN/NIN), legal name check, and anti-money laundering screening.',
    timeline: 'Days 7–21',
  },
  {
    step: 4,
    icon: 'fa-handshake',
    title: 'Property Transfer',
    desc: 'Title deed transfer, legal documentation, and property handover coordinated with a certified surveyor.',
    timeline: 'Days 21–90',
  },
  {
    step: 5,
    icon: 'fa-key',
    title: 'Keys Handover',
    desc: 'Property keys, access codes, and all documentation handed over to you. Congratulations — the property is yours!',
    timeline: 'Day 90',
  },
];

const FAQ = [
  { q: 'How will I be notified if I win?', a: 'You will be contacted by phone and email within 3 business days of the draw. Ensure your contact details are up to date in your profile.' },
  { q: 'Is the draw independently verified?', a: 'Yes. All draws are conducted using random.org\'s cryptographically verified random number generation, witnessed by an independent legal professional, and live-streamed on YouTube.' },
  { q: 'What if I lose my ticket?', a: 'Your ticket is permanently recorded in our system. We can verify your win by your registered email, phone, and ticket number. Physical tickets are not required.' },
  { q: 'Are there any taxes on property winnings?', a: 'Property transfers may be subject to capital gains tax and stamp duty. We recommend consulting a tax adviser. RaffleProp is not responsible for winner tax obligations.' },
  { q: 'What happens if I cannot be reached?', a: 'We make three attempts over 5 business days. If we cannot reach the winner, we follow the FCCPA §124 escalation procedure, which may involve a secondary draw.' },
];

export default async function WinnerPage() {
  const user = (await getServerSession())!;
  const token = (await getAccessToken())!;
  const status = await getWinnerStatus(token);

  const initials = user.fullName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      {/* Mobile header */}
      <div className="portal-mobile-header">
        <div className="portal-mobile-header-avatar">{initials}</div>
        <div>
          <div className="portal-mobile-header-name">Winner Portal</div>
          <div className="portal-mobile-header-sub">{status.isWinner ? '🏆 You are a winner!' : 'Claim information'}</div>
        </div>
      </div>

      {status.isWinner && status.draw ? (
        /* ── Winner view ── */
        <>
          {/* Congratulations banner */}
          <div style={{ background: 'linear-gradient(135deg, #b8860b, var(--gold), #f5c842)', borderRadius: 'var(--radius-xl)', padding: '2rem', marginBottom: '1.5rem', textAlign: 'center', color: '#fff', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '20px 20px' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <i className="fa-solid fa-trophy" style={{ fontSize: '3rem', marginBottom: '0.75rem', display: 'block', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }} />
              <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', fontWeight: 900, margin: '0 0 0.5rem', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                Congratulations, {user.fullName.split(' ')[0]}!
              </h1>
              <p style={{ fontSize: '1rem', opacity: 0.95, margin: 0 }}>
                You have won a property in the RaffleProp draw.
              </p>
            </div>
          </div>

          {/* Win details */}
          <div className="stat-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
              <i className="fa-solid fa-house" style={{ marginRight: '0.5rem', color: 'var(--gold)' }} />
              Your Winning Property
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {[
                { label: 'Campaign', value: status.draw.campaign.title, icon: 'fa-bullhorn' },
                { label: 'Property Address', value: status.draw.campaign.propertyAddress, icon: 'fa-location-dot' },
                { label: 'Market Value', value: `₦${Number(status.draw.campaign.marketValue).toLocaleString()}`, icon: 'fa-naira-sign' },
                { label: 'Winning Ticket', value: status.draw.winnerTicket.ticketNumber, icon: 'fa-ticket', mono: true },
                { label: 'Draw Status', value: status.draw.status, icon: 'fa-circle-check' },
                { label: 'Publicly Announced', value: status.draw.publicAnnouncedAt ? new Date(status.draw.publicAnnouncedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Pending', icon: 'fa-calendar' },
              ].map((d) => (
                <div key={d.label} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    <i className={`fa-solid ${d.icon}`} style={{ marginRight: '0.375rem' }} />
                    {d.label}
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem', fontFamily: (d as { mono?: boolean }).mono ? 'monospace' : undefined }}>
                    {d.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Witness info */}
          {status.draw.witnessName && (
            <div className="stat-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <i className="fa-solid fa-gavel" style={{ marginRight: '0.5rem', color: 'var(--green-primary)' }} />
                Draw witnessed by <strong>{status.draw.witnessName}</strong>
                {status.draw.witnessTitle && <>, {status.draw.witnessTitle}</>}
              </p>
            </div>
          )}

          {/* Claim steps — live progress */}
          {(() => {
            const d = status.draw!;
            const claimSteps = [
              { step: 1, icon: 'fa-id-card', title: 'Identity Verification', desc: 'Our team contacts you to verify your identity against the ticket purchase record.', timeline: 'Within 3 days of draw', doneAt: d.claimIdentityVerifiedAt },
              { step: 2, icon: 'fa-file-signature', title: 'Winner Acceptance Form', desc: 'You receive and sign the Winner Acceptance Form, confirming your claim and providing your legal details.', timeline: 'Days 3–7', doneAt: d.claimAcceptanceSignedAt },
              { step: 3, icon: 'fa-building-columns', title: 'Legal & KYC Due Diligence', desc: 'Full KYC verification (BVN/NIN), legal name check, and anti-money laundering screening.', timeline: 'Days 7–21', doneAt: d.claimKycCompletedAt },
              { step: 4, icon: 'fa-handshake', title: 'Property Transfer', desc: 'Title deed transfer, legal documentation, and property handover coordinated with a certified surveyor.', timeline: 'Days 21–90', doneAt: d.claimTransferCompletedAt },
              { step: 5, icon: 'fa-key', title: 'Keys Handover', desc: 'Property keys, access codes, and all documentation handed over to you.', timeline: 'Day 90', doneAt: d.claimKeysHandedAt },
            ];
            const completedCount = claimSteps.filter((s) => s.doneAt).length;
            const allDone = completedCount === 5;
            return (
              <div className="stat-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h2 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>
                    <i className="fa-solid fa-list-check" style={{ marginRight: '0.5rem', color: 'var(--green-primary)' }} />
                    Your Claim Journey
                  </h2>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: allDone ? 'var(--green-primary)' : 'var(--gold)', background: allDone ? 'var(--green-50)' : '#fef9c3', padding: '0.25rem 0.75rem', borderRadius: 20 }}>
                    {completedCount} / 5 steps complete{allDone ? ' 🎉' : ''}
                  </span>
                </div>
                {/* Progress bar */}
                <div style={{ height: 6, borderRadius: 99, background: 'var(--border-light)', marginBottom: '1.5rem', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, var(--green-primary), var(--green-light))', width: `${(completedCount / 5) * 100}%`, transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ position: 'relative' }}>
                  {claimSteps.map((s, idx) => {
                    const done = !!s.doneAt;
                    const active = !done && (idx === 0 || !!claimSteps[idx - 1]?.doneAt);
                    return (
                      <div key={s.step} style={{ display: 'flex', gap: '1rem', marginBottom: idx < claimSteps.length - 1 ? '1.5rem' : 0, position: 'relative' }}>
                        {idx < claimSteps.length - 1 && (
                          <div style={{ position: 'absolute', left: 19, top: 40, bottom: -24, width: 2, background: done ? 'var(--green-primary)' : 'var(--border-light)', transition: 'background 0.4s' }} />
                        )}
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: done ? 'var(--green-primary)' : active ? 'var(--gold)' : 'var(--bg-secondary)', border: `2px solid ${done ? 'var(--green-primary)' : active ? 'var(--gold)' : 'var(--border)'}`, color: done || active ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1, transition: 'all 0.3s' }}>
                          {done ? <i className="fa-solid fa-check" style={{ fontSize: '0.875rem' }} /> : <i className={`fa-solid ${s.icon}`} style={{ fontSize: '0.875rem' }} />}
                        </div>
                        <div style={{ paddingTop: '0.4rem', opacity: !done && !active ? 0.5 : 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: done ? 'var(--green-primary)' : 'var(--text-primary)', marginBottom: '0.15rem' }}>
                            Step {s.step}: {s.title}
                            {active && !done && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--gold)', background: '#fef9c3', padding: '0.1rem 0.4rem', borderRadius: 10 }}>IN PROGRESS</span>}
                          </div>
                          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: '0 0 0.25rem', lineHeight: 1.5 }}>{s.desc}</p>
                          {done && s.doneAt
                            ? <span style={{ fontSize: '0.75rem', color: 'var(--green-primary)', fontWeight: 600 }}>
                                <i className="fa-solid fa-circle-check" style={{ marginRight: '0.3rem' }} />
                                Completed {new Date(s.doneAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            : <span style={{ fontSize: '0.75rem', color: active ? 'var(--gold)' : 'var(--text-muted)', fontWeight: 600 }}>
                                <i className="fa-solid fa-clock" style={{ marginRight: '0.3rem' }} />
                                {s.timeline}
                              </span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Claim documents — uploaded by RaffleProp admin */}
          <WinnerDocumentsClient token={token} />

          {/* Contact */}
          <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', background: 'var(--green-50)', border: '1px solid var(--green-primary)30', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <i className="fa-solid fa-phone" style={{ color: 'var(--green-primary)', marginTop: '0.15rem', flexShrink: 0 }} />
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Our team will contact you.</strong>{' '}
              Expect a call and email from the RaffleProp Winners Team at{' '}
              <strong>winners@raffleprop.com</strong> within 3 business days. Do not share your ticket details with anyone claiming to be from RaffleProp by phone — we will always email first.
            </div>
          </div>
        </>
      ) : (
        /* ── Non-winner view ── */
        <>
          {/* Page header */}
          <div className="portal-page-header">
            <h1 className="portal-page-title">Winner Portal</h1>
            <p className="portal-page-subtitle">Information about the prize claim process and what happens if you win</p>
          </div>

          {/* Not-a-winner notice */}
          <div style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', marginBottom: '1.5rem', textAlign: 'center' }}>
            <i className="fa-solid fa-ticket" style={{ fontSize: '2.5rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'block', opacity: 0.5 }} />
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              No Winning Ticket Yet
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto 1.25rem' }}>
              You have not won a draw yet. Keep entering campaigns — every ticket is a chance to win a property!
            </p>
            <Link href="/campaigns" className="btn btn-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fa-solid fa-magnifying-glass" />
              Browse Active Campaigns
            </Link>
          </div>

          {/* How claiming works */}
          <div className="stat-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <span className="section-label">The Process</span>
              <h2 style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--text-primary)', margin: '0.25rem 0 0' }}>
                What Happens When You Win
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {WINNER_STEPS.map((s, idx) => (
                <div key={s.step} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--green-primary), var(--green-light))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.8rem', fontWeight: 800 }}>
                    {s.step}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{s.title}</div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--green-primary)', fontWeight: 600 }}>
                      <i className="fa-solid fa-clock" style={{ marginRight: '0.3rem' }} />
                      {s.timeline}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="stat-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
              <i className="fa-solid fa-circle-question" style={{ marginRight: '0.5rem', color: 'var(--green-primary)' }} />
              Winner FAQ
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {FAQ.map((f, idx) => (
                <div key={idx} style={{ borderBottom: idx < FAQ.length - 1 ? '1px solid var(--border-light)' : 'none', padding: '0.875rem 0' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
                    <i className="fa-solid fa-chevron-right" style={{ marginRight: '0.5rem', color: 'var(--green-primary)', fontSize: '0.7rem' }} />
                    {f.q}
                  </div>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6, paddingLeft: '1.25rem' }}>
                    {f.a}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Legitimacy assurance */}
          <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', background: '#fef9c3', border: '1px solid #ca8a0430', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ca8a04', marginTop: '0.15rem', flexShrink: 0 }} />
            <div style={{ fontSize: '0.85rem', color: '#92400e', lineHeight: 1.6 }}>
              <strong>Beware of scams:</strong> RaffleProp will never ask you to pay a fee to claim your prize.
              All winner communications originate from <strong>@raffleprop.com</strong> email addresses only.
              If you receive suspicious contact, report it to <strong>security@raffleprop.com</strong>.
            </div>
          </div>

          {/* Links */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link href="/compliance" className="btn btn-sm" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}>
              <i className="fa-solid fa-shield-halved" style={{ marginRight: '0.375rem' }} />
              Regulatory Compliance
            </Link>
            <Link href="/terms" className="btn btn-sm" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}>
              <i className="fa-solid fa-file-contract" style={{ marginRight: '0.375rem' }} />
              Terms &amp; Conditions
            </Link>
          </div>
        </>
      )}
    </>
  );
}
