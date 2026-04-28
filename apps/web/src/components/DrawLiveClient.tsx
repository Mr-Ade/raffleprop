'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { CountdownTimer } from './CountdownTimer';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DrawLiveData {
  campaign: {
    id: string;
    title: string;
    propertyAddress: string;
    propertyState: string;
    propertyLga: string;
    marketValue: string;
    totalTickets: number;
    ticketPrice: string;
    drawDate: string | null;
    drawMethod: string;
    featuredImageKey: string | null;
    status: string;
  };
  draw: {
    id: string;
    status: string;
    seedCommitment: string | null;
    ticketCount: number | null;
    publicAnnouncedAt: string | null;
    initiatedAt: string;
    winnerFirstName: string | null;
    winnerTicketNumber: string | null;
  } | null;
  ticketsSold: number;
}

interface Props {
  campaignId: string;
  initial: DrawLiveData;
  apiBase: string;
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  color: string;
  size: number;
  opacity: number;
}

const CONFETTI_COLORS = [
  '#C8922A', '#f0c060', '#0D5E30', '#15803d',
  '#ffffff', '#fbbf24', '#34d399', '#a3e635',
];

function createParticle(canvasWidth: number): Particle {
  return {
    x: Math.random() * canvasWidth,
    y: -10,
    vx: (Math.random() - 0.5) * 4,
    vy: Math.random() * 3 + 2,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.3,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]!,
    size: Math.random() * 8 + 4,
    opacity: 1,
  };
}

function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const spawnRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Spawn particles in bursts
    let spawnCount = 0;
    const spawnInterval = window.setInterval(() => {
      for (let i = 0; i < 15; i++) {
        particles.current.push(createParticle(canvas.width));
      }
      spawnCount++;
      if (spawnCount > 20) window.clearInterval(spawnInterval);
    }, 150);
    spawnRef.current = spawnInterval;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.current = particles.current.filter((p) => p.opacity > 0.02);

      for (const p of particles.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // gravity
        p.angle += p.spin;
        if (p.y > canvas.height * 0.7) p.opacity -= 0.01;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      window.clearInterval(spawnInterval);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 100,
      }}
    />
  );
}

// ─── Spinning ticket drum animation ──────────────────────────────────────────

function DrawingAnimation({ ticketCount }: { ticketCount: number }) {
  const [frame, setFrame] = useState(0);
  const tickets = ['#04821', '#12345', '#07731', '#19283', '#00142', '#33901'];

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % tickets.length), 120);
    return () => clearInterval(id);
  }, [tickets.length]);

  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          display: 'inline-block',
          background: 'rgba(255,255,255,0.08)',
          border: '2px solid rgba(200,146,42,0.4)',
          borderRadius: 16,
          padding: '2rem 3rem',
          marginBottom: '1.5rem',
          minWidth: 260,
        }}
      >
        {/* Spinning drum */}
        <div
          style={{
            fontSize: '3.5rem',
            animation: 'spin 0.8s linear infinite',
            display: 'inline-block',
            marginBottom: '0.75rem',
          }}
        >
          🎰
        </div>

        {/* Flipping ticket numbers */}
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: '1.6rem',
            fontWeight: 700,
            color: '#C8922A',
            letterSpacing: 3,
            minHeight: '2.4rem',
            overflow: 'hidden',
          }}
        >
          RP-{tickets[frame]}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem',
          color: 'rgba(255,255,255,0.8)',
          fontSize: '1.1rem',
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#C8922A',
            animation: 'pulse 1s ease-in-out infinite',
            display: 'inline-block',
          }}
        />
        Selecting winner from {ticketCount.toLocaleString()} eligible tickets…
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 4000; // poll every 4 seconds

export function DrawLiveClient({ campaignId, initial, apiBase }: Props) {
  const [data, setData] = useState<DrawLiveData>(initial);
  const [showConfetti, setShowConfetti] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const drawStatus = data.draw?.status ?? 'NONE';

  // Poll the live endpoint
  const poll = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/draws/${campaignId}/live`);
      if (!res.ok) return;
      const json = (await res.json()) as { success: boolean; data: DrawLiveData };
      if (!json.success) return;

      setData((prev) => {
        const newStatus = json.data.draw?.status ?? 'NONE';
        const oldStatus = prev.draw?.status ?? 'NONE';

        // Trigger confetti when status transitions to COMPLETED
        if (newStatus === 'COMPLETED' && oldStatus !== 'COMPLETED') {
          setShowConfetti(true);
          setJustCompleted(true);
          setTimeout(() => setShowConfetti(false), 8000);
        }
        return json.data;
      });
    } catch {
      // Network hiccup — keep showing current data
    }
  }, [campaignId, apiBase]);

  useEffect(() => {
    // Stop polling once draw is completed/filed
    if (drawStatus === 'COMPLETED' || drawStatus === 'FILED') {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [poll, drawStatus]);

  // Show confetti on initial load if already completed (page refresh after win)
  useEffect(() => {
    if (initial.draw?.status === 'COMPLETED') {
      setShowConfetti(true);
      setJustCompleted(true);
      setTimeout(() => setShowConfetti(false), 8000);
    }
  }, [initial.draw?.status]);

  const { campaign, draw, ticketsSold } = data;
  const pct = Math.min(100, Math.round((ticketsSold / campaign.totalTickets) * 100));
  const formatNaira = (v: string | number) =>
    '₦' + Number(v).toLocaleString('en-NG', { maximumFractionDigits: 0 });

  return (
    <>
      {/* Confetti layer */}
      {showConfetti && <ConfettiCanvas />}

      {/* CSS keyframes injected inline — overlay page has no global CSS dependency */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.4); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes winner-glow { 0%,100% { box-shadow: 0 0 24px rgba(200,146,42,0.4); } 50% { box-shadow: 0 0 60px rgba(200,146,42,0.9), 0 0 120px rgba(200,146,42,0.3); } }
        @keyframes ticket-pop { 0% { transform: scale(0.6) rotate(-6deg); opacity: 0; } 60% { transform: scale(1.08) rotate(2deg); } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }
        .winner-card { animation: winner-glow 2s ease-in-out infinite, fadeInUp 0.6s ease; }
        .ticket-number { animation: ticket-pop 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275) both; }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #071f11 0%, #0D5E30 50%, #071f11 100%)',
          color: '#fff',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1.5rem',
        }}
      >
        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(200,146,42,0.15)',
              border: '1px solid rgba(200,146,42,0.35)',
              borderRadius: 100,
              padding: '0.4rem 1rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: '#f0c060',
              marginBottom: '1rem',
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: drawStatus === 'LIVE' ? '#ef4444' : '#C8922A',
                animation: 'pulse 1.2s ease-in-out infinite',
                display: 'inline-block',
              }}
            />
            {drawStatus === 'LIVE' ? 'Live Draw' : drawStatus === 'COMPLETED' ? 'Draw Complete' : 'RaffleProp Live'}
          </div>

          <h1
            style={{
              fontSize: 'clamp(1.6rem, 4vw, 2.8rem)',
              fontWeight: 800,
              lineHeight: 1.2,
              marginBottom: '0.5rem',
              maxWidth: 700,
            }}
          >
            {campaign.title}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem' }}>
            {campaign.propertyAddress} · {campaign.propertyState}
          </p>
        </div>

        {/* ── Prize value strip ── */}
        <div
          style={{
            display: 'flex',
            gap: '2.5rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginBottom: '2.5rem',
          }}
        >
          {[
            { label: 'Prize Value', value: formatNaira(campaign.marketValue) },
            { label: 'Ticket Price', value: formatNaira(campaign.ticketPrice) },
            { label: 'Tickets Sold', value: ticketsSold.toLocaleString() },
            { label: 'Draw Method', value: campaign.drawMethod === 'RANDOM_ORG_VERIFIED' ? 'Random.org Verified' : 'Cryptographic RNG' },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.6rem)', fontWeight: 700, color: '#f0c060' }}>{value}</div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── Progress bar ── */}
        <div style={{ width: '100%', maxWidth: 560, marginBottom: '2.5rem' }}>
          <div
            style={{
              height: 8,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 100,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${pct}%`,
                background: 'linear-gradient(90deg, #C8922A, #f0c060)',
                borderRadius: 100,
                transition: 'width 0.8s ease',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>
            <span>{ticketsSold.toLocaleString()} sold</span>
            <span>{pct}% of {campaign.totalTickets.toLocaleString()}</span>
          </div>
        </div>

        {/* ── Main state panel ── */}
        <div
          style={{
            width: '100%',
            maxWidth: 640,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20,
            padding: 'clamp(1.5rem, 4vw, 2.5rem)',
            marginBottom: '2rem',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* PENDING / no draw yet — show countdown */}
          {(!draw || draw.status === 'PENDING') && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: '0.75rem' }}>
                Draw Starts In
              </div>
              {campaign.drawDate ? (
                <CountdownTimer endDate={campaign.drawDate} />
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.4)' }}>Draw date to be announced</p>
              )}
            </div>
          )}

          {/* SCHEDULED — seed commitment revealed, worker about to run */}
          {draw?.status === 'SCHEDULED' && (
            <div style={{ textAlign: 'center', animation: 'fadeInUp 0.5s ease' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔐</div>
              <h2 style={{ fontWeight: 700, fontSize: '1.3rem', marginBottom: '0.5rem' }}>
                Draw Seed Committed
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                The random seed has been locked. This commitment was published before any result is known —
                proving the winning number cannot be changed after this point.
              </p>
              {draw.seedCommitment && (
                <div
                  style={{
                    background: 'rgba(0,0,0,0.35)',
                    borderRadius: 10,
                    padding: '0.85rem 1rem',
                    fontFamily: 'monospace',
                    fontSize: '0.72rem',
                    color: '#f0c060',
                    wordBreak: 'break-all',
                    letterSpacing: 0.5,
                    marginBottom: '1rem',
                    border: '1px solid rgba(200,146,42,0.2)',
                  }}
                >
                  <div style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                    SHA-256 Seed Commitment
                  </div>
                  {draw.seedCommitment}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f0c060', animation: 'pulse 1s ease-in-out infinite', display: 'inline-block' }} />
                Draw will begin momentarily…
              </div>
            </div>
          )}

          {/* LIVE — draw worker running */}
          {draw?.status === 'LIVE' && (
            <div style={{ animation: 'fadeInUp 0.5s ease' }}>
              <DrawingAnimation ticketCount={data.draw?.ticketCount ?? data.ticketsSold} />

              {draw.seedCommitment && (
                <div
                  style={{
                    marginTop: '1.5rem',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: 10,
                    padding: '0.75rem 1rem',
                    fontSize: '0.7rem',
                    color: 'rgba(255,255,255,0.4)',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.25)', display: 'block', marginBottom: 3 }}>Committed seed (locked before draw):</span>
                  {draw.seedCommitment}
                </div>
              )}
            </div>
          )}

          {/* COMPLETED — reveal winner */}
          {draw?.status === 'COMPLETED' && draw.winnerTicketNumber && (
            <div style={{ textAlign: 'center', animation: 'fadeInUp 0.6s ease' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏆</div>
              <div
                style={{ fontSize: '0.85rem', color: '#f0c060', textTransform: 'uppercase', letterSpacing: 2, marginBottom: '1rem', fontWeight: 600 }}
              >
                We Have a Winner!
              </div>

              {/* Winner card */}
              <div
                className="winner-card"
                style={{
                  background: 'linear-gradient(135deg, rgba(200,146,42,0.2) 0%, rgba(200,146,42,0.05) 100%)',
                  border: '2px solid rgba(200,146,42,0.5)',
                  borderRadius: 16,
                  padding: '1.75rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>
                  Congratulations
                </div>
                <div style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, marginBottom: '0.75rem' }}>
                  {draw.winnerFirstName}! 🎉
                </div>
                <div
                  className="ticket-number"
                  style={{
                    display: 'inline-block',
                    background: 'rgba(200,146,42,0.2)',
                    border: '1px solid rgba(200,146,42,0.5)',
                    borderRadius: 8,
                    padding: '0.5rem 1.25rem',
                    fontFamily: 'monospace',
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    color: '#f0c060',
                    letterSpacing: 2,
                  }}
                >
                  {draw.winnerTicketNumber}
                </div>
              </div>

              {/* Verification strip */}
              {draw.seedCommitment && (
                <div
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: 10,
                    padding: '1rem',
                    textAlign: 'left',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: '0.5rem', fontWeight: 600 }}>
                    Independent Verification
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', wordBreak: 'break-all', lineHeight: 1.6 }}>
                    Committed seed: {draw.seedCommitment}
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>
                    Visit{' '}
                    <span style={{ color: '#f0c060' }}>
                      raffleprop.com/draw/verify/{campaignId}
                    </span>{' '}
                    for independent draw verification
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer strip ── */}
        <div
          style={{
            display: 'flex',
            gap: '1.5rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
            fontSize: '0.75rem',
            color: 'rgba(255,255,255,0.3)',
            textAlign: 'center',
          }}
        >
          <span>🔒 CAC Registered</span>
          <span>🏦 Escrow Protected</span>
          <span>⚖️ FCCPA §124 Compliant</span>
          <span>✅ Cryptographic Draw — Cannot Be Rigged</span>
        </div>

        {/* ── Powered by watermark (bottom right) ── */}
        <div
          style={{
            position: 'fixed',
            bottom: '1rem',
            right: '1.25rem',
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.2)',
            fontWeight: 600,
            letterSpacing: 1,
          }}
        >
          RaffleProp.com
        </div>
      </div>
    </>
  );
}
