'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ── FCCPC fee schedule ─────────────────────────────────────────────────────────
const TIERS = [
  { label: 'Below ₦2M',        max: 2e6,      rate: 0.12,  app: 25000 },
  { label: '₦2M – ₦9.9M',     max: 10e6,     rate: 0.10,  app: 50000 },
  { label: '₦10M – ₦29.9M',   max: 30e6,     rate: 0.085, app: 75000 },
  { label: '₦30M – ₦49.9M',   max: 50e6,     rate: 0.06,  app: 100000 },
  { label: '₦50M – ₦99.9M',   max: 100e6,    rate: 0.052, app: 150000 },
  { label: '₦100M – ₦499.9M', max: 500e6,    rate: 0.045, app: 200000 },
  { label: 'Above ₦500M',      max: Infinity, rate: 0.03,  app: 250000 },
];

function getTier(pv: number) {
  return TIERS.find(t => pv < t.max) ?? TIERS[TIERS.length - 1]!;
}

function fmt(n: number | null) {
  if (n === null || isNaN(n)) return '—';
  return '₦' + Math.round(n).toLocaleString('en-NG');
}

function fmtN(n: number) {
  return Math.round(n).toLocaleString('en-NG');
}

function roundUpTickets(n: number, roundTo = 500) {
  return Math.ceil(n / roundTo) * roundTo;
}

const TICKET_PRESETS = [
  { price: 2500,  label: 'Economy',  color: '#166534', bg: '#f0fdf4' },
  { price: 5000,  label: 'Standard', color: '#0D5E30', bg: '#f0fdf4' },
  { price: 10000, label: 'Premium',  color: '#92400e', bg: '#fef9c3' },
];

interface CalcResult {
  propVal: number;
  isLagos: boolean;
  tier: typeof TIERS[0];
  fccpcMonitoring: number;
  fccpcApp: number;
  fccpcDraw: number;
  fccpcTotal: number;
  lslgaFee: number;
  legalFee: number;
  nisvFee: number;
  stampDuty: number;
  adminFee: number;
  techFee: number;
  insuranceFee: number;
  contingencyAmt: number;
  marketingAmt: number;
  paymentFee: number;
  companyProfit: number;
  totalRevenue: number;
  minThresholdRevenue: number;
  profitPct: number;
  marketingPct: number;
  contingencyPct: number;
}

export default function AdminCalculator() {
  const router = useRouter();

  const [propValue, setPropValue] = useState('');
  const [isLagos, setIsLagos] = useState(false);
  const [profitPct, setProfitPct] = useState(15);
  const [marketingPct, setMarketingPct] = useState(12);
  const [contingencyPct, setContingencyPct] = useState(3);
  const [selectedTicketPrice, setSelectedTicketPrice] = useState<number | null>(null);
  const [customPrice, setCustomPrice] = useState('');
  const [customActive, setCustomActive] = useState(false);

  const compute = useCallback((): CalcResult | null => {
    const pv = parseFloat(propValue);
    if (!pv || pv <= 0) return null;

    const tier = getTier(pv);
    const fccpcMonitoring = pv * tier.rate;
    const fccpcApp = tier.app;
    const fccpcDraw = 25000;
    const fccpcTotal = fccpcMonitoring + fccpcApp + fccpcDraw;

    const lslgaFee = isLagos ? 575000 : 0;
    const legalFee = pv * 0.015;
    const nisvFee = 250000;
    const stampDuty = pv * 0.015;
    const adminFee = pv * 0.02;
    const techFee = 500000 + pv * 0.005;
    const insuranceFee = pv * 0.005;

    const fixedTotal = pv + fccpcTotal + lslgaFee + legalFee + nisvFee
                     + stampDuty + adminFee + techFee + insuranceFee;

    const pp = contingencyPct / 100;
    const contingencyAmt = fixedTotal * pp;
    const fixedPlusContingency = fixedTotal + contingencyAmt;

    const mp = marketingPct / 100;
    const prP = profitPct / 100;
    const variablePct = mp + 0.015 + prP;
    if (variablePct >= 1) return null;

    const totalRevenue = fixedPlusContingency / (1 - variablePct);
    const marketingAmt = totalRevenue * mp;
    const paymentFee = totalRevenue * 0.015;
    const companyProfit = totalRevenue * prP;

    const minThresholdRevenue = pv + fccpcTotal + lslgaFee + legalFee + nisvFee + stampDuty;

    return {
      propVal: pv, isLagos, tier,
      fccpcMonitoring, fccpcApp, fccpcDraw, fccpcTotal,
      lslgaFee, legalFee, nisvFee, stampDuty, adminFee, techFee, insuranceFee,
      contingencyAmt, marketingAmt, paymentFee, companyProfit,
      totalRevenue, minThresholdRevenue,
      profitPct: prP, marketingPct: mp, contingencyPct: pp,
    };
  }, [propValue, isLagos, profitPct, marketingPct, contingencyPct]);

  const result = compute();

  function getSummary(ticketPrice: number, r: CalcResult) {
    const totalTix = roundUpTickets(r.totalRevenue / ticketPrice);
    const minTix = roundUpTickets(r.minThresholdRevenue / ticketPrice, 100);
    const maxPerPerson = Math.max(5, Math.ceil(totalTix * 0.005));
    const actualRevenue = totalTix * ticketPrice;
    const actualProfit = actualRevenue * r.profitPct;
    const breakEvenPct = Math.round(minTix / totalTix * 100);
    return { totalTix, minTix, maxPerPerson, actualRevenue, actualProfit, breakEvenPct };
  }

  const activeSummary = selectedTicketPrice && result
    ? getSummary(selectedTicketPrice, result)
    : null;

  function handleReset() {
    setPropValue('');
    setIsLagos(false);
    setProfitPct(15);
    setMarketingPct(12);
    setContingencyPct(3);
    setSelectedTicketPrice(null);
    setCustomPrice('');
    setCustomActive(false);
  }

  function handleUseValues() {
    if (!result || !selectedTicketPrice || !activeSummary) return;
    const params = new URLSearchParams({
      from: 'calculator',
      ticketPrice: String(selectedTicketPrice),
      totalTickets: String(activeSummary.totalTix),
      minTickets: String(activeSummary.minTix),
      marketValue: String(Math.round(result.propVal)),
      reservePrice: String(Math.round(result.minThresholdRevenue)),
    });
    router.push(`/admin/campaigns/new?${params.toString()}`);
  }

  const hasResult = !!result;
  const canUse = hasResult && !!selectedTicketPrice;

  return (
    <>
      {/* Topbar */}
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Campaign Economics Calculator
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Enter the property value — the calculator works out every cost and recommends your ticket structure.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={handleReset} className="btn btn-outline">
            <i className="fa-solid fa-rotate-left" style={{ marginRight: '0.4rem' }} />
            Reset
          </button>
          <button
            type="button"
            onClick={handleUseValues}
            disabled={!canUse}
            className="btn btn-gold"
            style={{ opacity: canUse ? 1 : 0.5 }}
          >
            <i className="fa-solid fa-arrow-right" style={{ marginRight: '0.4rem' }} />
            Use These Values
          </button>
        </div>
      </div>

      <div className="admin-content">
        <div className="calc-grid">

          {/* ── LEFT: Inputs ── */}
          <div>

            {/* Property Value */}
            <div className="card" style={{ marginBottom: '1.25rem' }}>
              <div className="card-header">
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>
                  <i className="fa-solid fa-building" style={{ color: 'var(--green-primary)', marginRight: '0.5rem' }} />
                  Property Details
                </h3>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">
                    Property Market Value (NGN) <span className="required">*</span>
                  </label>
                  <div className="naira-input-wrap">
                    <span className="naira-prefix">₦</span>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="e.g. 50000000"
                      min={0}
                      value={propValue}
                      onChange={e => {
                        setPropValue(e.target.value);
                        setSelectedTicketPrice(null);
                        setCustomPrice('');
                        setCustomActive(false);
                      }}
                    />
                  </div>
                  <div className="form-hint">
                    This is the amount the property owner will receive. Use the NIESV-certified valuation figure.
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Campaign Location</label>
                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600 }}>
                      <input
                        type="radio" name="location" value="lagos"
                        checked={isLagos}
                        onChange={() => { setIsLagos(true); setSelectedTicketPrice(null); }}
                        style={{ accentColor: 'var(--green-primary)' }}
                      />
                      Lagos State
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600 }}>
                      <input
                        type="radio" name="location" value="other"
                        checked={!isLagos}
                        onChange={() => { setIsLagos(false); setSelectedTicketPrice(null); }}
                        style={{ accentColor: 'var(--green-primary)' }}
                      />
                      Other State
                    </label>
                  </div>
                  <div className="form-hint">Lagos campaigns incur an additional LSLGA licence levy of ₦575,000.</div>
                </div>
              </div>
            </div>

            {/* Business Targets */}
            <div className="card" style={{ marginBottom: '1.25rem' }}>
              <div className="card-header">
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>
                  <i className="fa-solid fa-sliders" style={{ color: 'var(--gold)', marginRight: '0.5rem' }} />
                  Your Business Targets
                </h3>
              </div>
              <div className="card-body">
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Adjust these to match your strategy. The calculator will factor them into the required revenue.
                </p>
                <SliderRow
                  label="Company Profit Margin"
                  value={profitPct} min={5} max={30}
                  onChange={v => { setProfitPct(v); setSelectedTicketPrice(null); }}
                />
                <SliderRow
                  label="Marketing & Advertising"
                  value={marketingPct} min={5} max={25}
                  onChange={v => { setMarketingPct(v); setSelectedTicketPrice(null); }}
                />
                <SliderRow
                  label="Contingency Reserve"
                  value={contingencyPct} min={1} max={10}
                  onChange={v => { setContingencyPct(v); setSelectedTicketPrice(null); }}
                />
              </div>
            </div>

            {/* How it works */}
            <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 12, padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e40af', marginBottom: '0.5rem' }}>
                <i className="fa-solid fa-circle-info" style={{ marginRight: '0.375rem' }} />
                How the calculator works
              </div>
              <ul style={{ fontSize: '0.8125rem', color: '#1e40af', lineHeight: 1.7, paddingLeft: '1.25rem', margin: 0 }}>
                <li>All costs are added to the property value to get total revenue needed</li>
                <li>FCCPC regulatory fees are auto-calculated by the official fee schedule</li>
                <li>Revenue from ticket sales must cover everything before the company earns profit</li>
                <li>The property owner always receives the full property value — nothing is deducted</li>
                <li>Min threshold = tickets needed just to pay the property owner + regulatory costs</li>
              </ul>
            </div>
          </div>

          {/* ── RIGHT: Results ── */}
          <div>

            {/* Cost Breakdown */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>
                  <i className="fa-solid fa-list-check" style={{ color: 'var(--green-primary)', marginRight: '0.5rem' }} />
                  Full Cost Breakdown
                </h3>
                {result && (
                  <span className="badge-info">
                    FCCPC Tier: {result.tier.label} · {(result.tier.rate * 100).toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="card-body">
                {!result ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    <i className="fa-solid fa-building" style={{ fontSize: '2rem', marginBottom: '0.75rem', display: 'block', opacity: 0.3 }} />
                    Enter a property value to see the full cost breakdown
                  </div>
                ) : (
                  <CostBreakdown r={result} />
                )}
              </div>
            </div>

            {/* Ticket Options */}
            {result && (
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>
                    <i className="fa-solid fa-ticket" style={{ color: 'var(--gold)', marginRight: '0.5rem' }} />
                    Choose Your Ticket Price
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Lower prices = more accessible but more tickets to sell. Higher = fewer tickets, more targeted audience.
                  </p>
                </div>
                <div className="card-body">
                  <div className="ticket-grid">
                    {TICKET_PRESETS.map(p => {
                      const totalTix = roundUpTickets(result.totalRevenue / p.price);
                      const minTix = roundUpTickets(result.minThresholdRevenue / p.price, 100);
                      const maxPerPerson = Math.max(5, Math.ceil(totalTix * 0.005));
                      const sel = selectedTicketPrice === p.price && !customActive;
                      return (
                        <div
                          key={p.price}
                          className={`rec-card${sel ? ' selected' : ''}`}
                          style={{ background: sel ? p.bg : '#fff' }}
                          onClick={() => { setSelectedTicketPrice(p.price); setCustomPrice(''); setCustomActive(false); }}
                        >
                          <div className="rec-tier" style={{ color: p.color }}>{p.label}</div>
                          <div className="rec-price" style={{ color: p.color }}>₦{p.price.toLocaleString()}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>per ticket</div>
                          <div className="rec-stats">
                            <div className="rec-stat"><div className="rv">{fmtN(totalTix)}</div><div className="rl">Total Tickets</div></div>
                            <div className="rec-stat"><div className="rv">{fmtN(minTix)}</div><div className="rl">Min Threshold</div></div>
                            <div className="rec-stat"><div className="rv">{fmtN(maxPerPerson)}</div><div className="rl">Max/Person</div></div>
                            <div className="rec-stat"><div className="rv">{Math.round(minTix / totalTix * 100)}%</div><div className="rl">Break-even</div></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Custom price */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem', background: 'var(--bg-secondary)', borderRadius: 10 }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Custom price:</span>
                    <div className="naira-input-wrap" style={{ flex: 1 }}>
                      <span className="naira-prefix" style={{ fontSize: '0.875rem' }}>₦</span>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="e.g. 3500"
                        min={500}
                        step={500}
                        value={customPrice}
                        onChange={e => {
                          setCustomPrice(e.target.value);
                          setCustomActive(true);
                          const val = parseFloat(e.target.value);
                          if (val >= 100) setSelectedTicketPrice(val);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Summary */}
            {result && activeSummary && selectedTicketPrice && (
              <div className="card">
                <div className="card-header">
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>
                    <i className="fa-solid fa-scale-balanced" style={{ color: 'var(--green-primary)', marginRight: '0.5rem' }} />
                    Campaign Summary
                  </h3>
                </div>
                <div className="card-body">
                  {/* Owner / Profit highlight */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{ background: 'var(--green-50,#f0fdf4)', border: '2px solid var(--green-primary)', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--green-primary)', marginBottom: '0.375rem' }}>Property Owner Receives</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--green-primary)' }}>{fmt(result.propVal)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Full market value — 100% of input</div>
                    </div>
                    <div style={{ background: '#fefce8', border: '2px solid var(--gold)', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gold)', marginBottom: '0.375rem' }}>Company Keeps (Profit)</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--gold)' }}>{fmt(activeSummary.actualProfit)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{Math.round(result.profitPct * 100)}% of gross revenue</div>
                    </div>
                  </div>

                  {/* Summary rows */}
                  {[
                    { label: 'Recommended Ticket Price', val: fmt(selectedTicketPrice), highlight: true },
                    { label: 'Total Tickets to Issue', val: fmtN(activeSummary.totalTix) + ' tickets' },
                    { label: 'Minimum Threshold (to proceed)', val: fmtN(activeSummary.minTix) + ' tickets sold (' + activeSummary.breakEvenPct + '% of total)' },
                    { label: 'Max Tickets per Person', val: fmtN(activeSummary.maxPerPerson) + ' tickets (0.5% of total)' },
                    { label: 'Gross Revenue at Full Sell-out', val: fmt(activeSummary.actualRevenue) },
                    { label: 'Total Costs (excl. profit)', val: fmt(activeSummary.actualRevenue - activeSummary.actualProfit) },
                    { label: 'Property Owner Payout', val: fmt(result.propVal) },
                    { label: 'Company Net Profit', val: fmt(activeSummary.actualProfit) },
                  ].map((s, i) => (
                    <div key={i} className="summary-row">
                      <div className="s-label">{s.label}</div>
                      <div className="s-val" style={s.highlight ? { color: 'var(--green-primary)', fontSize: '1.125rem' } : {}}>
                        {s.val}
                      </div>
                    </div>
                  ))}

                  {/* Break-even note */}
                  <div style={{ background: '#f3e8ff', border: '1px solid #c4b5fd', borderRadius: 10, padding: '0.875rem 1rem', marginTop: '1rem', fontSize: '0.8125rem', color: '#6d28d9' }}>
                    <i className="fa-solid fa-info-circle" style={{ marginRight: '0.375rem' }} />
                    <strong>Break-even point:</strong> If at least <strong>{fmtN(activeSummary.minTix)} tickets</strong> are sold ({activeSummary.breakEvenPct}% of total), the property owner is paid and all regulatory obligations are met. Below this threshold, the campaign must be cancelled and all ticket buyers refunded in full — as required by FCCPA 2018 §123.
                  </div>

                  {/* Break-even risk warnings */}
                  {activeSummary.breakEvenPct > 85 && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '0.875rem 1rem', marginTop: '0.75rem', fontSize: '0.8125rem', color: '#dc2626' }}>
                      <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '0.375rem' }} />
                      <strong>Very high risk:</strong> {activeSummary.breakEvenPct}% of tickets must sell before this campaign can proceed. Consider reducing the profit margin or choosing a lower ticket price.
                    </div>
                  )}
                  {activeSummary.breakEvenPct > 75 && activeSummary.breakEvenPct <= 85 && (
                    <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '0.875rem 1rem', marginTop: '0.75rem', fontSize: '0.8125rem', color: '#92400e' }}>
                      <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.375rem' }} />
                      <strong>High threshold:</strong> {activeSummary.breakEvenPct}% of tickets must sell. This is achievable but leaves little margin for error.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleUseValues}
                    className="btn btn-gold btn-full"
                    style={{ marginTop: '1.25rem', fontSize: '1rem', padding: '0.875rem' }}
                  >
                    <i className="fa-solid fa-arrow-right" style={{ marginRight: '0.4rem' }} />
                    Use These Values — Create Campaign
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SliderRow({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div className="slider-row">
      <label>{label}</label>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(parseInt(e.target.value))}
      />
      <span className="slider-val">{value}%</span>
    </div>
  );
}

interface CostRow {
  icon?: string;
  color?: string;
  label: string;
  amount?: number;
  note?: string;
  divider?: boolean;
  total?: boolean;
}

function CostBreakdown({ r }: { r: CalcResult }) {
  const rows: CostRow[] = [
    { icon: 'fa-house', color: '#166534', label: 'Property Payment to Owner', amount: r.propVal, note: '100% of property value — paid to owner on winner verification' },
    { icon: 'fa-shield-halved', color: '#1e40af', label: 'FCCPC Monitoring Fee', amount: r.fccpcMonitoring, note: `${(r.tier.rate * 100).toFixed(1)}% of property value · ${r.tier.label} tier` },
    { icon: 'fa-shield-halved', color: '#1e40af', label: 'FCCPC Application Fee', amount: r.fccpcApp, note: 'One-time application submission fee' },
    { icon: 'fa-shield-halved', color: '#1e40af', label: 'FCCPC Draw Attendance Fee', amount: r.fccpcDraw, note: 'Fixed fee for FCCPC monitor at draw' },
    ...(r.lslgaFee > 0 ? [{ icon: 'fa-building-columns', color: '#7c3aed', label: 'LSLGA Licence Levy', amount: r.lslgaFee, note: 'Lagos State Lotteries & Gaming Authority annual levy' }] : []),
    { icon: 'fa-scale-balanced', color: '#b45309', label: 'Legal Fees (Solicitors)', amount: r.legalFee, note: '1.5% — title transfer, T&C drafting, winner agreement' },
    { icon: 'fa-file-certificate', color: '#6d28d9', label: 'NIESV Valuation Certificate', amount: r.nisvFee, note: 'Independent certified property valuation by NIESV-registered valuer' },
    { icon: 'fa-stamp', color: '#b45309', label: 'Stamp Duty', amount: r.stampDuty, note: '1.5% — statutory stamp duty on property transfer' },
    { icon: 'fa-laptop', color: '#0891b2', label: 'Platform & Technology', amount: r.techFee, note: 'Website, SMS gateway, payment integration, hosting' },
    { icon: 'fa-clipboard-list', color: '#0891b2', label: 'Administrative & Operations', amount: r.adminFee, note: '2% — staff, office, customer care, draw logistics' },
    { icon: 'fa-shield', color: '#0891b2', label: 'Liability Insurance', amount: r.insuranceFee, note: '0.5% — event liability and campaign insurance' },
    { icon: 'fa-life-ring', color: '#dc2626', label: `Contingency Reserve (${Math.round(r.contingencyPct * 100)}%)`, amount: r.contingencyAmt, note: 'Buffer for unexpected costs — returned to company if unused' },
    { divider: true, label: 'Variable Costs (from ticket revenue)' },
    { icon: 'fa-bullhorn', color: '#c2410c', label: `Marketing & Advertising (${Math.round(r.marketingPct * 100)}%)`, amount: r.marketingAmt, note: 'Social media ads, influencer fees, content creation, outdoor' },
    { icon: 'fa-credit-card', color: '#0891b2', label: 'Payment Processing Fees (1.5%)', amount: r.paymentFee, note: 'Paystack/Flutterwave gateway charges on ticket revenue' },
    { icon: 'fa-sack-dollar', color: 'var(--gold)', label: `Company Profit (${Math.round(r.profitPct * 100)}%)`, amount: r.companyProfit, note: 'Net profit retained by RaffleProp after all costs' },
  ];

  return (
    <>
      {rows.map((row, i) => {
        if (row.divider) {
          return (
            <div key={i} style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '0.875rem 0 0.375rem' }}>
              {row.label}
            </div>
          );
        }
        return (
          <div key={i} className="cost-row">
            <div className="cost-label">
              <i className={`fa-solid ${row.icon}`} style={{ color: row.color, width: 14, flexShrink: 0, marginTop: '0.125rem' }} />
              <div className="cost-label-text">
                <div className="cost-name">{row.label}</div>
                <div className="cost-note">{row.note}</div>
              </div>
            </div>
            <div className="cost-amount">{fmt(row.amount ?? 0)}</div>
          </div>
        );
      })}
      <div className="cost-row cost-total">
        <div className="cost-label">
          <i className="fa-solid fa-equals" style={{ marginRight: '0.5rem' }} />
          Total Revenue Required from Ticket Sales
        </div>
        <div className="cost-amount">{fmt(r.totalRevenue)}</div>
      </div>
    </>
  );
}
