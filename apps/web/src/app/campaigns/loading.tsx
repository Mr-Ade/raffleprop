export default function CampaignsLoading() {
  return (
    <div style={{ paddingTop: '65px' }}>
      {/* Hero skeleton */}
      <section style={{ background: 'linear-gradient(135deg,#0D5E30,#0a3a1e)', padding: '3.5rem 0 2.5rem' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div style={{ height: '2.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: 8, width: '42%', margin: '0 auto 1rem' }} />
          <div style={{ height: '1rem', background: 'rgba(255,255,255,0.08)', borderRadius: 8, width: '58%', margin: '0 auto' }} />
        </div>
      </section>

      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        {/* Tab skeleton */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
          {[80, 100, 90, 70].map((w, i) => (
            <div key={i} style={{ height: '2.25rem', background: '#e5e7eb', borderRadius: 'var(--radius)', width: w }} />
          ))}
        </div>

        {/* Card grid skeleton */}
        <div className="campaigns-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="campaign-card" style={{ pointerEvents: 'none' }}>
              <div className="campaign-card-image" style={{ background: '#e5e7eb', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <div className="campaign-card-body">
                <div style={{ height: '0.875rem', background: '#e5e7eb', borderRadius: 6, width: '40%', marginBottom: '0.75rem' }} />
                <div style={{ height: '1.25rem', background: '#e5e7eb', borderRadius: 6, width: '85%', marginBottom: '0.5rem' }} />
                <div style={{ height: '1rem', background: '#e5e7eb', borderRadius: 6, width: '65%', marginBottom: '1rem' }} />
                <div style={{ height: '4px', background: '#e5e7eb', borderRadius: 100, marginBottom: '0.5rem' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ height: '0.75rem', background: '#e5e7eb', borderRadius: 6, width: '38%' }} />
                  <div style={{ height: '0.75rem', background: '#e5e7eb', borderRadius: 6, width: '24%' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ height: '1.25rem', background: '#e5e7eb', borderRadius: 6, width: '34%' }} />
                  <div style={{ height: '2.25rem', background: '#e5e7eb', borderRadius: 'var(--radius)', width: '28%' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
