import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { api } from '@/lib/api';

interface Props {
  params: Promise<{ campaignId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { campaignId } = await params;
  try {
    const data = await api.getDrawLive(campaignId);
    return {
      title: `Verify Draw — ${data.campaign.title} | RaffleProp`,
      description: 'Independently verify the fairness of the RaffleProp draw result.',
    };
  } catch {
    return { title: 'Verify Draw | RaffleProp' };
  }
}

export const revalidate = 60;

export default async function DrawVerifyPage({ params }: Props) {
  const { campaignId } = await params;

  let data;
  try {
    data = await api.getDrawLive(campaignId);
  } catch {
    notFound();
  }

  const { campaign, draw } = data;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #071f11 0%, #0D5E30 50%, #071f11 100%)',
      color: '#fff',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: '3rem 1.5rem',
    }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800, marginBottom: '0.5rem' }}>
            Verify Draw Result
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>{campaign.title}</p>
        </div>

        {!draw || draw.status !== 'COMPLETED' ? (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16,
            padding: '2rem',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.5)',
          }}>
            {!draw
              ? 'No draw has been initiated for this campaign yet.'
              : `Draw is currently ${draw.status.toLowerCase()} — verification available after completion.`}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Winner result */}
            <div style={{
              background: 'rgba(200,146,42,0.1)',
              border: '1px solid rgba(200,146,42,0.3)',
              borderRadius: 16,
              padding: '1.5rem',
            }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1, color: '#f0c060', fontWeight: 600, marginBottom: '0.75rem' }}>
                Winner
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                🏆 {draw.winnerFirstName}
              </div>
              <div style={{ fontFamily: 'monospace', color: '#f0c060', fontSize: '1rem' }}>
                Ticket {draw.winnerTicketNumber}
              </div>
              {draw.ticketCount && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                  Selected from {draw.ticketCount.toLocaleString()} eligible tickets
                </div>
              )}
            </div>

            {/* Seed commitment */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16,
              padding: '1.5rem',
            }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: '0.75rem' }}>
                Seed Commitment (published BEFORE draw)
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#f0c060', wordBreak: 'break-all', lineHeight: 1.7 }}>
                {draw.seedCommitment ?? 'Not available'}
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                This hash was announced publicly before the draw ran, proving the random seed was
                fixed before any result was known.
              </div>
            </div>

            {/* Revealed draw seed */}
            <div style={{
              background: 'rgba(163,230,53,0.06)',
              border: '1px solid rgba(163,230,53,0.2)',
              borderRadius: 16,
              padding: '1.5rem',
            }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(163,230,53,0.6)', fontWeight: 600, marginBottom: '0.75rem' }}>
                Revealed Draw Seed (disclosed AFTER draw)
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#a3e635', wordBreak: 'break-all', lineHeight: 1.7 }}>
                {draw.drawSeed ?? 'Not available'}
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                Run <code style={{ background: 'rgba(0,0,0,0.4)', padding: '0.1rem 0.35rem', borderRadius: 4, color: '#a3e635' }}>sha256sum</code> on this value — the result must match the seed commitment above.
              </div>
            </div>

            {/* Two-phase verification details */}
            {draw.drawPreSeed && draw.ticketListHash && (
              <>
                <div style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 16,
                  padding: '1.5rem',
                }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: '0.75rem' }}>
                    Revealed Pre-Seed (committed at campaign launch)
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#a3e635', wordBreak: 'break-all', lineHeight: 1.7 }}>
                    {draw.drawPreSeed}
                  </div>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                    This value was generated when the campaign went LIVE — before any tickets were sold — and its SHA-256 hash was published as the seed commitment above.
                  </div>
                </div>

                <div style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 16,
                  padding: '1.5rem',
                }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: '0.75rem' }}>
                    Ticket List Hash
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#a3e635', wordBreak: 'break-all', lineHeight: 1.7 }}>
                    {draw.ticketListHash}
                  </div>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                    SHA-256 of all confirmed ticket numbers (sorted ascending, comma-separated). Determined by who bought tickets — not by the operator.
                  </div>
                </div>
              </>
            )}

            {/* How to verify */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              padding: '1.5rem',
            }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: '1rem' }}>
                How to Verify Independently
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem' }}>
                    Step 1 — Confirm the pre-seed was committed before tickets sold:
                  </div>
                  <div style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.4)', padding: '0.65rem 0.85rem', borderRadius: 8, fontSize: '0.78rem', color: '#a3e635', wordBreak: 'break-all' }}>
                    echo -n &quot;{draw.drawPreSeed ?? 'DRAW_PRE_SEED'}&quot; | sha256sum
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.3rem' }}>
                    Result must equal the seed commitment above (published at campaign launch).
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem' }}>
                    Step 2 — Confirm the final draw seed was computed correctly:
                  </div>
                  <div style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.4)', padding: '0.65rem 0.85rem', borderRadius: 8, fontSize: '0.78rem', color: '#a3e635', wordBreak: 'break-all' }}>
                    echo -n &quot;{draw.drawPreSeed ?? 'DRAW_PRE_SEED'}:{draw.ticketListHash ?? 'TICKET_LIST_HASH'}&quot; | sha256sum
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.3rem' }}>
                    Result must equal the revealed draw seed above.
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem' }}>
                    Step 3 — Confirm winner index:
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
                    winnerIndex = BigInt(&quot;0x&quot; + drawSeed.slice(0,16)) % {draw.ticketCount?.toLocaleString() ?? 'ticketCount'}. The ticket at that position in the sorted, quantity-expanded ticket list is the winner.
                  </div>
                </div>
              </div>
            </div>

            {/* Compliance note */}
            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', padding: '0.5rem 0' }}>
              This draw was conducted in accordance with FCCPA §124.
              An independent witness was present. Full audit log is maintained.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
