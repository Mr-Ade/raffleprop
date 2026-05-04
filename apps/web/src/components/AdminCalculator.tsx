'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const TIERS = [
  { label: 'Below ₦2M',        max: 2e6,      rate: 0.12,  app: 25000 },
  { label: '₦2M – ₦9.9M',     max: 10e6,     rate: 0.10,  app: 50000 },
  { label: '₦10M – ₦29.9M',   max: 30e6,     rate: 0.085, app: 75000 },
  { label: '₦30M – ₦49.9M',   max: 50e6,     rate: 0.06,  app: 100000 },
  { label: '₦50M – ₦99.9M',   max: 100e6,    rate: 0.052, app: 150000 },
  { label: '₦100M – ₦499.9M', max: 500e6,    rate: 0.045, app: 200000 },
  { label: 'Above ₦500M',      max: Infinity, rate: 0.03,  app: 250000 },
];
function getTier(pv: number) { return TIERS.find(t => pv < t.max) ?? TIERS[TIERS.length - 1]!; }

// ── State regulatory profiles ──────────────────────────────────────────────────

interface StateProfile {
  body: string;
  appFee: number;
  licenceFee: number;
  lotteryLevy: number;
  lotteryLevyPct: number;
  gcfRate: number;
  drawMonitorFee: number;
  otherFees: Array<{ label: string; amount: number }>;
  status: 'Confirmed' | 'Estimated' | 'Unknown';
  lastVerified: string;
  source: string;
  notes: string;
}

const _U: Omit<StateProfile, 'body'> = {
  appFee: 0, licenceFee: 0, lotteryLevy: 0, lotteryLevyPct: 0,
  gcfRate: 0, drawMonitorFee: 0, otherFees: [],
  status: 'Unknown', lastVerified: '', source: '',
  notes: 'No published fee schedule verified for property raffles.',
};

const DEFAULT_STATE_PROFILES: Record<string, StateProfile> = {
  'Abia':        { ..._U, body: 'Abia State Gaming & Lotteries Commission' },
  'Adamawa':     { ..._U, body: 'Adamawa State Lotteries and Gaming Board' },
  'Akwa Ibom':   { ..._U, body: 'Akwa Ibom State Lotteries Board' },
  'Anambra':     { ..._U, body: 'Anambra State Lottery Authority' },
  'Bauchi':      { ..._U, body: 'Bauchi State Lotteries Board' },
  'Bayelsa':     { ..._U, body: 'Bayelsa State Lotteries Board' },
  'Benue':       { ..._U, body: 'Benue State Lotteries Board' },
  'Borno':       { ..._U, body: 'Borno State Lotteries Board' },
  'Cross River': { ..._U, body: 'Cross River State Lotteries Board' },
  'Delta':       { ..._U, body: 'Delta State Lotteries Board' },
  'Ebonyi':      { ..._U, body: 'Ebonyi State Lotteries Board' },
  'Edo':         { ..._U, body: 'Edo State Lotteries and Gaming Agency' },
  'Ekiti':       { ..._U, body: 'Ekiti State Lotteries Board' },
  'Enugu':       { ..._U, body: 'Enugu State Lotteries Board' },
  'FCT (Abuja)': { ..._U, body: 'FCT Lottery Regulatory Office (FCT-LRO)', notes: 'FCT-LRO fee schedule for property raffles not yet confirmed.' },
  'Gombe':       { ..._U, body: 'Gombe State Lotteries Board' },
  'Imo':         { ..._U, body: 'Imo State Lotteries Board' },
  'Jigawa':      { ..._U, body: 'Jigawa State Lotteries Board' },
  'Kaduna':      { ..._U, body: 'Kaduna State Lotteries Board' },
  'Kano':        { ..._U, body: 'Kano State Lotteries Board' },
  'Katsina':     { ..._U, body: 'Katsina State Lotteries Board' },
  'Kebbi':       { ..._U, body: 'Kebbi State Lotteries Board' },
  'Kogi':        { ..._U, body: 'Kogi State Lotteries Board' },
  'Kwara':       { ..._U, body: 'Kwara State Lotteries Board' },
  'Lagos': {
    body: 'Lagos State Lotteries & Gaming Authority (LSLGA)',
    appFee: 0, licenceFee: 575000, lotteryLevy: 0, lotteryLevyPct: 0,
    gcfRate: 0, drawMonitorFee: 0, otherFees: [],
    status: 'Confirmed', lastVerified: '2025-01-01',
    source: 'LSLGA official operator fee schedule',
    notes: 'Annual operator licence levy confirmed at ₦575,000. Application fee and GCF rate not individually verified.',
  },
  'Nasarawa':    { ..._U, body: 'Nasarawa State Lotteries Board' },
  'Niger':       { ..._U, body: 'Niger State Lotteries Board' },
  'Ogun':        { ..._U, body: 'Ogun State Lotteries Board' },
  'Ondo':        { ..._U, body: 'Ondo State Lotteries Board' },
  'Osun':        { ..._U, body: 'Osun State Lotteries Board' },
  'Oyo':         { ..._U, body: 'Oyo State Lotteries Board' },
  'Plateau':     { ..._U, body: 'Plateau State Lotteries Board' },
  'Rivers':      { ..._U, body: 'Rivers State Lotteries Board' },
  'Sokoto':      { ..._U, body: 'Sokoto State Lotteries Board' },
  'Taraba':      { ..._U, body: 'Taraba State Lotteries Board' },
  'Yobe':        { ..._U, body: 'Yobe State Lotteries Board' },
  'Zamfara':     { ..._U, body: 'Zamfara State Lotteries Board' },
};

const STATE_LIST = Object.keys(DEFAULT_STATE_PROFILES).sort();

// ── Types ──────────────────────────────────────────────────────────────────────

interface StateFeeItem { label: string; amount: number; isOverride: boolean; }

interface CalcResult {
  propVal: number; state: string; profile: StateProfile | null;
  tier: typeof TIERS[0];
  fccpcMonitoring: number; fccpcApp: number; fccpcDraw: number; fccpcTotal: number;
  stateFeeTotal: number; stateFeeItems: StateFeeItem[];
  stateIsUnknown: boolean; stateIsOverride: boolean;
  legalFee: number; nisvFee: number; stampDuty: number; adminFee: number;
  techFee: number; insuranceFee: number; contingencyAmt: number;
  marketingAmt: number; paymentFee: number; companyProfit: number;
  totalRevenue: number; minThresholdRevenue: number;
  profitPct: number; marketingPct: number; contingencyPct: number;
  isGated: boolean;
}

type OvKey = 'appFee' | 'licenceFee' | 'lotteryLevy' | 'lotteryLevyPct' | 'gcfRate' | 'drawMonitorFee';
const OV_INIT: Record<OvKey, string> = { appFee: '', licenceFee: '', lotteryLevy: '', lotteryLevyPct: '', gcfRate: '', drawMonitorFee: '' };

const TICKET_PRESETS = [
  { price: 2500,  label: 'Economy',  color: '#166534', bg: '#f0fdf4' },
  { price: 5000,  label: 'Standard', color: '#0D5E30', bg: '#f0fdf4' },
  { price: 10000, label: 'Premium',  color: '#92400e', bg: '#fef9c3' },
];

function fmt(n: number | null) { return n === null || isNaN(n) ? '—' : '₦' + Math.round(n).toLocaleString('en-NG'); }
function fmtN(n: number) { return Math.round(n).toLocaleString('en-NG'); }
function roundUpTickets(n: number, roundTo = 500) { return Math.ceil(n / roundTo) * roundTo; }

function profileToOv(p: StateProfile): Record<OvKey, string> {
  return {
    appFee:         p.appFee         ? String(p.appFee)                              : '',
    licenceFee:     p.licenceFee     ? String(p.licenceFee)                          : '',
    lotteryLevy:    p.lotteryLevy    ? String(p.lotteryLevy)                         : '',
    lotteryLevyPct: p.lotteryLevyPct ? String((p.lotteryLevyPct * 100).toFixed(2))  : '',
    gcfRate:        p.gcfRate        ? String((p.gcfRate        * 100).toFixed(2))   : '',
    drawMonitorFee: p.drawMonitorFee ? String(p.drawMonitorFee)                      : '',
  };
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminCalculator() {
  const router = useRouter();

  const [propValue, setPropValue]             = useState('');
  const [selectedState, setSelectedState]     = useState('');
  const [stateProfiles, setStateProfiles]     = useState<Record<string, StateProfile>>(DEFAULT_STATE_PROFILES);
  const [ackChecked, setAckChecked]           = useState(false);
  const [overrideOpen, setOverrideOpen]       = useState(false);
  const [ovFees, setOvFees]                   = useState<Record<OvKey, string>>(OV_INIT);
  const [profitPct, setProfitPct]             = useState(15);
  const [marketingPct, setMarketingPct]       = useState(12);
  const [contingencyPct, setContingencyPct]   = useState(3);
  const [selectedTicketPrice, setSelectedTicketPrice] = useState<number | null>(null);
  const [customPrice, setCustomPrice]         = useState('');
  const [customActive, setCustomActive]       = useState(false);
  const [editorOpen, setEditorOpen]           = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('rp_state_profiles') ?? '{}') as Record<string, Partial<StateProfile>>;
      if (Object.keys(saved).length > 0) {
        setStateProfiles(prev => {
          const m = { ...prev };
          for (const [k, v] of Object.entries(saved)) {
            if (m[k]) m[k] = { ...m[k]!, ...v };
          }
          return m;
        });
      }
    } catch {}
  }, []);

  function handleStateChange(state: string) {
    setSelectedState(state);
    setAckChecked(false);
    setOverrideOpen(false);
    setSelectedTicketPrice(null);
    setCustomPrice('');
    setCustomActive(false);
    setOvFees(state && stateProfiles[state] ? profileToOv(stateProfiles[state]!) : OV_INIT);
  }

  function handleSaveProfile(state: string, profile: StateProfile) {
    setStateProfiles(prev => ({ ...prev, [state]: profile }));
    try {
      const saved = JSON.parse(localStorage.getItem('rp_state_profiles') ?? '{}');
      saved[state] = profile;
      localStorage.setItem('rp_state_profiles', JSON.stringify(saved));
    } catch {}
    if (state === selectedState) setOvFees(profileToOv(profile));
  }

  function handleResetProfile(state: string) {
    const def = DEFAULT_STATE_PROFILES[state];
    if (!def) return;
    setStateProfiles(prev => ({ ...prev, [state]: { ...def } }));
    try {
      const saved = JSON.parse(localStorage.getItem('rp_state_profiles') ?? '{}');
      delete saved[state];
      localStorage.setItem('rp_state_profiles', JSON.stringify(saved));
    } catch {}
    if (state === selectedState) setOvFees(profileToOv(def));
  }

  const compute = useCallback((): CalcResult | null => {
    const pv = parseFloat(propValue);
    if (!pv || pv <= 0) return null;

    const profile = selectedState ? (stateProfiles[selectedState] ?? null) : null;
    const stateFeeItems: StateFeeItem[] = [];
    let stateIsUnknown = false;
    let stateIsOverride = false;

    if (profile) {
      stateIsOverride = overrideOpen;
      stateIsUnknown  = profile.status === 'Unknown' && !overrideOpen;
      const p = overrideOpen ? {
        ...profile,
        appFee:         parseFloat(ovFees.appFee)         || 0,
        licenceFee:     parseFloat(ovFees.licenceFee)     || 0,
        lotteryLevy:    parseFloat(ovFees.lotteryLevy)    || 0,
        lotteryLevyPct: (parseFloat(ovFees.lotteryLevyPct) || 0) / 100,
        gcfRate:        (parseFloat(ovFees.gcfRate)        || 0) / 100,
        drawMonitorFee: parseFloat(ovFees.drawMonitorFee) || 0,
      } : profile;
      const ov = overrideOpen;
      if (p.appFee         > 0) stateFeeItems.push({ label: `${profile.body} — Application Fee`,                                           amount: p.appFee,               isOverride: ov });
      if (p.licenceFee     > 0) stateFeeItems.push({ label: `${profile.body} — Annual Licence Levy`,                                       amount: p.licenceFee,           isOverride: ov });
      if (p.lotteryLevy    > 0) stateFeeItems.push({ label: `${profile.body} — Campaign Levy`,                                             amount: p.lotteryLevy,          isOverride: ov });
      if (p.lotteryLevyPct > 0) stateFeeItems.push({ label: `${profile.body} — Lottery Levy (${(p.lotteryLevyPct*100).toFixed(1)}% of prize)`, amount: p.lotteryLevyPct * pv, isOverride: ov });
      if (p.gcfRate        > 0) stateFeeItems.push({ label: `${profile.body} — Games Contribution Fund (${(p.gcfRate*100).toFixed(1)}%)`,  amount: p.gcfRate * pv,         isOverride: ov });
      if (p.drawMonitorFee > 0) stateFeeItems.push({ label: `${profile.body} — Draw Monitoring Fee`,                                       amount: p.drawMonitorFee,       isOverride: ov });
      profile.otherFees.forEach(f => stateFeeItems.push({ label: `${profile.body} — ${f.label}`, amount: f.amount, isOverride: false }));
    }

    const stateFeeTotal = stateFeeItems.reduce((s, i) => s + i.amount, 0);
    const tier          = getTier(pv);
    const fccpcMonitoring = pv * tier.rate;
    const fccpcApp        = tier.app;
    const fccpcDraw       = 25000;
    const fccpcTotal      = fccpcMonitoring + fccpcApp + fccpcDraw;
    const legalFee        = pv * 0.015;
    const nisvFee         = 250000;
    const stampDuty       = pv * 0.015;
    const adminFee        = pv * 0.02;
    const techFee         = 500000 + pv * 0.005;
    const insuranceFee    = pv * 0.005;
    const fixedTotal      = pv + fccpcTotal + stateFeeTotal + legalFee + nisvFee + stampDuty + adminFee + techFee + insuranceFee;
    const pp              = contingencyPct / 100;
    const contingencyAmt  = fixedTotal * pp;
    const mp              = marketingPct / 100;
    const prP             = profitPct / 100;
    const variablePct     = mp + 0.015 + prP;
    if (variablePct >= 1) return null;
    const totalRevenue        = (fixedTotal + contingencyAmt) / (1 - variablePct);
    const marketingAmt        = totalRevenue * mp;
    const paymentFee          = totalRevenue * 0.015;
    const companyProfit       = totalRevenue * prP;
    const minThresholdRevenue = pv + fccpcTotal + stateFeeTotal + legalFee + nisvFee + stampDuty;
    const isGated             = !!profile && profile.status === 'Unknown' && !ackChecked && !overrideOpen;

    return {
      propVal: pv, state: selectedState, profile, tier,
      fccpcMonitoring, fccpcApp, fccpcDraw, fccpcTotal,
      stateFeeTotal, stateFeeItems, stateIsUnknown, stateIsOverride,
      legalFee, nisvFee, stampDuty, adminFee, techFee, insuranceFee,
      contingencyAmt, marketingAmt, paymentFee, companyProfit,
      totalRevenue, minThresholdRevenue,
      profitPct: prP, marketingPct: mp, contingencyPct: pp,
      isGated,
    };
  }, [propValue, selectedState, stateProfiles, overrideOpen, ovFees, ackChecked, profitPct, marketingPct, contingencyPct]);

  const result = compute();

  function getSummary(ticketPrice: number, r: CalcResult) {
    const totalTix      = roundUpTickets(r.totalRevenue / ticketPrice);
    const minTix        = roundUpTickets(r.minThresholdRevenue / ticketPrice, 100);
    const maxPerPerson  = Math.max(5, Math.ceil(totalTix * 0.005));
    const actualRevenue = totalTix * ticketPrice;
    const actualProfit  = actualRevenue * r.profitPct;
    const breakEvenPct  = Math.round(minTix / totalTix * 100);
    return { totalTix, minTix, maxPerPerson, actualRevenue, actualProfit, breakEvenPct };
  }

  const activeSummary = selectedTicketPrice && result ? getSummary(selectedTicketPrice, result) : null;
  const profile       = selectedState ? (stateProfiles[selectedState] ?? null) : null;
  const canUse        = !!result && !!selectedTicketPrice && !result.isGated;

  function handleReset() {
    setPropValue(''); setSelectedState(''); setAckChecked(false); setOverrideOpen(false);
    setOvFees(OV_INIT); setProfitPct(15); setMarketingPct(12); setContingencyPct(3);
    setSelectedTicketPrice(null); setCustomPrice(''); setCustomActive(false);
  }

  function handleUseValues() {
    if (!result || !selectedTicketPrice || !activeSummary || result.isGated) return;
    const params = new URLSearchParams({
      from: 'calculator',
      ticketPrice: String(selectedTicketPrice),
      totalTickets: String(activeSummary.totalTix),
      minTickets:   String(activeSummary.minTix),
      marketValue:  String(Math.round(result.propVal)),
      reservePrice: String(Math.round(result.minThresholdRevenue)),
    });
    router.push(`/admin/campaigns/new?${params.toString()}`);
  }

  const statusColor  = profile ? (profile.status === 'Confirmed' ? '#166534' : profile.status === 'Estimated' ? '#92400e' : '#991b1b') : '';
  const statusBg     = profile ? (profile.status === 'Confirmed' ? '#f0fdf4' : profile.status === 'Estimated' ? '#fefce8' : '#fef2f2') : '';
  const statusBorder = profile ? (profile.status === 'Confirmed' ? '#bbf7d0' : profile.status === 'Estimated' ? '#fde68a' : '#fecaca') : '';

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Campaign Economics Calculator</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Enter the property value — the calculator works out every cost and recommends your ticket structure.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={handleReset} className="btn btn-outline">
            <i className="fa-solid fa-rotate-left" style={{ marginRight: '0.4rem' }} />Reset
          </button>
          <button type="button" onClick={handleUseValues} disabled={!canUse} className="btn btn-gold" style={{ opacity: canUse ? 1 : 0.5 }}>
            <i className="fa-solid fa-arrow-right" style={{ marginRight: '0.4rem' }} />Use These Values
          </button>
        </div>
      </div>

      <div className="admin-content">
        <div className="calc-grid">

          {/* LEFT */}
          <div>
            <div className="card" style={{ marginBottom: '1.25rem' }}>
              <div className="card-header">
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>
                  <i className="fa-solid fa-building" style={{ color: 'var(--green-primary)', marginRight: '0.5rem' }} />Property Details
                </h3>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Property Market Value (NGN) <span className="required">*</span></label>
                  <div className="naira-input-wrap">
                    <span className="naira-prefix">₦</span>
                    <input
                      type="number" className="form-input" placeholder="e.g. 50000000" min={0}
                      value={propValue}
                      onChange={e => { setPropValue(e.target.value); setSelectedTicketPrice(null); setCustomPrice(''); setCustomActive(false); }}
                    />
                  </div>
                  <div className="form-hint">Use the NIESV-certified valuation figure.</div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Campaign State</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                    <select
                      className="form-input" style={{ flex: 1, minWidth: 160 }}
                      value={selectedState}
                      onChange={e => handleStateChange(e.target.value)}
                    >
                      <option value="">— Select state —</option>
                      {STATE_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {profile && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: statusBg, color: statusColor, border: `1px solid ${statusBorder}`, borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.55rem', whiteSpace: 'nowrap' }}>
                        <i className="fa-solid fa-circle" style={{ fontSize: '0.45rem' }} />{profile.status}
                      </span>
                    )}
                  </div>

                  {profile && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{profile.body}</span>
                      {profile.lastVerified ? <span> · Last verified: {profile.lastVerified}</span> : <span> · Not yet verified</span>}
                    </div>
                  )}

                  {profile?.status === 'Unknown' && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#9a3412', marginTop: '0.75rem' }}>
                      <i className="fa-solid fa-triangle-exclamation" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                      <span>
                        State regulatory fees for <strong>{selectedState}</strong> have not been verified. The calculation assumes ₦0. Use the{' '}
                        <button type="button" onClick={() => setEditorOpen(true)} style={{ background: 'none', border: 'none', color: '#9a3412', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: 'inherit' }}>
                          Regulatory Profile Editor
                        </button>{' '}
                        below to add fees, or acknowledge to proceed with ₦0.
                      </span>
                    </div>
                  )}

                  {profile?.status === 'Unknown' && (
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginTop: '0.625rem', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer', lineHeight: 1.5 }}>
                      <input type="checkbox" checked={ackChecked} onChange={e => setAckChecked(e.target.checked)} style={{ marginTop: '0.15rem', accentColor: 'var(--green-primary)', flexShrink: 0 }} />
                      I understand state fees for <strong style={{ margin: '0 0.2rem' }}>{selectedState}</strong> have not been verified and accept that this calculation may not reflect actual costs.
                    </label>
                  )}

                  {profile && (
                    <button type="button" onClick={() => setOverrideOpen(o => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.625rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--green-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <i className={`fa-solid ${overrideOpen ? 'fa-chevron-up' : 'fa-sliders'}`} />
                      {overrideOpen ? 'Hide Fee Override' : 'Override State Fees'}
                    </button>
                  )}

                  {overrideOpen && profile && (
                    <div style={{ marginTop: '0.75rem', background: '#f8fafc', border: '1px solid var(--border-light)', borderRadius: 10, padding: '0.875rem 1rem' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.625rem' }}>
                        Manual Fee Override (this calculation only)
                      </div>
                      {([
                        ['appFee',         'Application Fee (₦)'],
                        ['licenceFee',     'Annual Licence Fee (₦)'],
                        ['lotteryLevy',    'Flat Campaign Levy (₦)'],
                        ['lotteryLevyPct', 'Lottery Levy (% of prize)'],
                        ['gcfRate',        'GCF Rate (% of prize)'],
                        ['drawMonitorFee', 'Draw Monitoring Fee (₦)'],
                      ] as [OvKey, string][]).map(([k, lbl]) => (
                        <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', flex: 1 }}>{lbl}</label>
                          <input
                            type="number" min={0} placeholder="0"
                            step={k === 'lotteryLevyPct' || k === 'gcfRate' ? 0.01 : 1}
                            value={ovFees[k]}
                            onChange={e => setOvFees(prev => ({ ...prev, [k]: e.target.value }))}
                            style={{ width: 130, padding: '0.35rem 0.5rem', borderRadius: 6, border: '1px solid var(--border-light)', fontSize: '0.8125rem', textAlign: 'right', background: 'var(--bg)', color: 'var(--text-primary)' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: '1.25rem' }}>
              <div className="card-header">
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>
                  <i className="fa-solid fa-sliders" style={{ color: 'var(--gold)', marginRight: '0.5rem' }} />Your Business Targets
                </h3>
              </div>
              <div className="card-body">
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Adjust these to match your strategy.</p>
                <SliderRow label="Company Profit Margin"   value={profitPct}      min={5}  max={30} onChange={v => { setProfitPct(v);      setSelectedTicketPrice(null); }} />
                <SliderRow label="Marketing & Advertising" value={marketingPct}   min={5}  max={25} onChange={v => { setMarketingPct(v);   setSelectedTicketPrice(null); }} />
                <SliderRow label="Contingency Reserve"     value={contingencyPct} min={1}  max={10} onChange={v => { setContingencyPct(v); setSelectedTicketPrice(null); }} />
              </div>
            </div>

            <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 12, padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e40af', marginBottom: '0.5rem' }}>
                <i className="fa-solid fa-circle-info" style={{ marginRight: '0.375rem' }} />How the calculator works
              </div>
              <ul style={{ fontSize: '0.8125rem', color: '#1e40af', lineHeight: 1.7, paddingLeft: '1.25rem', margin: 0 }}>
                <li>FCCPC federal fees are auto-calculated by the official 7-tier schedule</li>
                <li>State regulatory fees use the verified profile — edit profiles below</li>
                <li>Revenue from ticket sales must cover all costs before profit is earned</li>
                <li>The property owner always receives the full property value</li>
                <li>Min threshold = owner payout + all regulatory costs</li>
              </ul>
            </div>
          </div>

          {/* RIGHT */}
          <div>
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>
                  <i className="fa-solid fa-list-check" style={{ color: 'var(--green-primary)', marginRight: '0.5rem' }} />Full Cost Breakdown
                </h3>
                {result && <span className="badge-info">FCCPC: {result.tier.label} · {(result.tier.rate * 100).toFixed(1)}%</span>}
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

            {result && (
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>
                    <i className="fa-solid fa-ticket" style={{ color: 'var(--gold)', marginRight: '0.5rem' }} />Choose Your Ticket Price
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Lower prices = more accessible but more tickets to sell.</p>
                </div>
                <div className="card-body">
                  {result.isGated && (
                    <div style={{ display: 'flex', gap: '0.5rem', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.8125rem', color: '#9a3412' }}>
                      <i className="fa-solid fa-lock" style={{ flexShrink: 0 }} />
                      Acknowledge the unverified state fees above (or open the fee override panel) to enable campaign creation.
                    </div>
                  )}
                  <div className="ticket-grid">
                    {TICKET_PRESETS.map(p => {
                      const totalTix     = roundUpTickets(result.totalRevenue / p.price);
                      const minTix       = roundUpTickets(result.minThresholdRevenue / p.price, 100);
                      const maxPerPerson = Math.max(5, Math.ceil(totalTix * 0.005));
                      const sel          = selectedTicketPrice === p.price && !customActive;
                      return (
                        <div key={p.price} className={`rec-card${sel ? ' selected' : ''}`} style={{ background: sel ? p.bg : '#fff' }}
                          onClick={() => { setSelectedTicketPrice(p.price); setCustomPrice(''); setCustomActive(false); }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem', background: 'var(--bg-secondary)', borderRadius: 10 }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Custom price:</span>
                    <div className="naira-input-wrap" style={{ flex: 1 }}>
                      <span className="naira-prefix" style={{ fontSize: '0.875rem' }}>₦</span>
                      <input type="number" className="form-input" placeholder="e.g. 3500" min={500} step={500} value={customPrice}
                        onChange={e => { setCustomPrice(e.target.value); setCustomActive(true); const v = parseFloat(e.target.value); if (v >= 100) setSelectedTicketPrice(v); }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {result && activeSummary && selectedTicketPrice && (
              <div className="card">
                <div className="card-header">
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>
                    <i className="fa-solid fa-scale-balanced" style={{ color: 'var(--green-primary)', marginRight: '0.5rem' }} />Campaign Summary
                  </h3>
                </div>
                <div className="card-body">
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
                  {([
                    { label: 'Recommended Ticket Price',       val: fmt(selectedTicketPrice), hl: true },
                    { label: 'Total Tickets to Issue',         val: fmtN(activeSummary.totalTix) + ' tickets' },
                    { label: 'Minimum Threshold (to proceed)', val: fmtN(activeSummary.minTix) + ' tickets sold (' + activeSummary.breakEvenPct + '% of total)' },
                    { label: 'Max Tickets per Person',         val: fmtN(activeSummary.maxPerPerson) + ' tickets (0.5% of total)' },
                    { label: 'Gross Revenue at Full Sell-out', val: fmt(activeSummary.actualRevenue) },
                    { label: 'Total Costs (excl. profit)',     val: fmt(activeSummary.actualRevenue - activeSummary.actualProfit) },
                    { label: 'Property Owner Payout',          val: fmt(result.propVal) },
                    { label: 'Company Net Profit',             val: fmt(activeSummary.actualProfit) },
                  ] as { label: string; val: string; hl?: boolean }[]).map((s, i) => (
                    <div key={i} className="summary-row">
                      <div className="s-label">{s.label}</div>
                      <div className="s-val" style={s.hl ? { color: 'var(--green-primary)', fontSize: '1.125rem' } : {}}>{s.val}</div>
                    </div>
                  ))}
                  <div style={{ background: '#f3e8ff', border: '1px solid #c4b5fd', borderRadius: 10, padding: '0.875rem 1rem', marginTop: '1rem', fontSize: '0.8125rem', color: '#6d28d9' }}>
                    <i className="fa-solid fa-info-circle" style={{ marginRight: '0.375rem' }} />
                    <strong>Break-even point:</strong> If at least <strong>{fmtN(activeSummary.minTix)} tickets</strong> are sold ({activeSummary.breakEvenPct}% of total), the property owner is paid and all regulatory obligations are met. Below this threshold, the campaign must be cancelled and all ticket buyers refunded in full — as required by FCCPA 2018 §123.
                  </div>
                  {activeSummary.breakEvenPct > 85 && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '0.875rem 1rem', marginTop: '0.75rem', fontSize: '0.8125rem', color: '#dc2626' }}>
                      <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '0.375rem' }} />
                      <strong>Very high risk:</strong> {activeSummary.breakEvenPct}% of tickets must sell before this campaign can proceed.
                    </div>
                  )}
                  {activeSummary.breakEvenPct > 75 && activeSummary.breakEvenPct <= 85 && (
                    <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '0.875rem 1rem', marginTop: '0.75rem', fontSize: '0.8125rem', color: '#92400e' }}>
                      <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.375rem' }} />
                      <strong>High threshold:</strong> {activeSummary.breakEvenPct}% of tickets must sell. Achievable but leaves little margin for error.
                    </div>
                  )}
                  <button type="button" onClick={handleUseValues} disabled={!canUse} className="btn btn-gold btn-full" style={{ marginTop: '1.25rem', fontSize: '1rem', padding: '0.875rem', opacity: canUse ? 1 : 0.5 }}>
                    <i className="fa-solid fa-arrow-right" style={{ marginRight: '0.4rem' }} />Use These Values — Create Campaign
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <ProfileEditor
          open={editorOpen}
          onToggle={() => setEditorOpen(o => !o)}
          stateProfiles={stateProfiles}
          onSave={handleSaveProfile}
          onReset={handleResetProfile}
        />
      </div>
    </>
  );
}

// ── SliderRow ──────────────────────────────────────────────────────────────────

function SliderRow({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="slider-row">
      <label>{label}</label>
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(parseInt(e.target.value))} />
      <span className="slider-val">{value}%</span>
    </div>
  );
}

// ── CostBreakdown ──────────────────────────────────────────────────────────────

function CostBreakdown({ r }: { r: CalcResult }) {
  function Divider({ label }: { label: string }) {
    return <div style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '0.875rem 0 0.375rem' }}>{label}</div>;
  }

  function Row({ icon, color, label, amount, note, isOverride, isUnverified, isEstimated }: {
    icon: string; color: string; label: string; amount: number; note: string;
    isOverride?: boolean; isUnverified?: boolean; isEstimated?: boolean;
  }) {
    return (
      <div className="cost-row">
        <div className="cost-label">
          <i className={`fa-solid ${icon}`} style={{ color, width: 14, flexShrink: 0, marginTop: '0.125rem' }} />
          <div className="cost-label-text">
            <div className="cost-name">
              {label}
              {isOverride && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.6rem', fontWeight: 700, background: '#eff6ff', color: '#1e40af', border: '1px solid #93c5fd', borderRadius: 4, padding: '0.1rem 0.3rem', marginLeft: '0.3rem', verticalAlign: 'middle' }}><i className="fa-solid fa-pen-to-square" style={{ fontSize: '0.5rem' }} />Override</span>}
              {isUnverified && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.6rem', fontWeight: 700, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: 4, padding: '0.1rem 0.3rem', marginLeft: '0.3rem', verticalAlign: 'middle' }}><i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '0.5rem' }} />Unverified</span>}
              {isEstimated && !isOverride && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.6rem', fontWeight: 700, background: '#fefce8', color: '#854d0e', border: '1px solid #fde68a', borderRadius: 4, padding: '0.1rem 0.3rem', marginLeft: '0.3rem', verticalAlign: 'middle' }}><i className="fa-solid fa-clock" style={{ fontSize: '0.5rem' }} />Estimated</span>}
            </div>
            <div className="cost-note" style={isUnverified ? { color: '#b45309' } : {}}>{note}</div>
          </div>
        </div>
        <div className="cost-amount" style={isUnverified ? { color: '#92400e' } : {}}>{fmt(amount)}</div>
      </div>
    );
  }

  const isEstimated = r.profile?.status === 'Estimated';

  return (
    <>
      <Row icon="fa-house" color="#166534" label="Property Payment to Owner" amount={r.propVal} note="100% of property value — paid to owner on winner verification" />
      <Divider label="Federal Regulatory Fees (FCCPC)" />
      <Row icon="fa-shield-halved" color="#1e40af" label="FCCPC Monitoring Fee"      amount={r.fccpcMonitoring} note={`${(r.tier.rate * 100).toFixed(1)}% of property value · ${r.tier.label} · Federal Consumer Protection Council`} />
      <Row icon="fa-shield-halved" color="#1e40af" label="FCCPC Application Fee"     amount={r.fccpcApp}        note="One-time application submission fee · Federal Consumer Protection Council" />
      <Row icon="fa-shield-halved" color="#1e40af" label="FCCPC Draw Attendance Fee" amount={r.fccpcDraw}       note="Fixed fee for FCCPC monitor at draw · Federal Consumer Protection Council" />

      {r.state && (
        <>
          <Divider label={`State Regulatory Fees (${r.state})`} />
          {r.stateFeeItems.length > 0
            ? r.stateFeeItems.map((item, i) => (
                <Row key={i} icon="fa-building-columns" color="#7c3aed"
                  label={item.label} amount={item.amount}
                  note={r.profile!.body + (r.profile!.source ? ' · ' + r.profile!.source : '')}
                  isOverride={item.isOverride} isEstimated={isEstimated} />
              ))
            : <Row icon="fa-building-columns" color={r.stateIsUnknown ? '#92400e' : '#6b7280'}
                label={`${r.profile?.body ?? r.state} — State Regulatory Fees`} amount={0}
                note={r.stateIsUnknown ? '⚠ Fees not yet verified. Use the Regulatory Profile Editor below to enter actual fees.' : 'No additional state fees on record.'}
                isUnverified={r.stateIsUnknown} />
          }
        </>
      )}

      <Divider label="Operating Costs" />
      <Row icon="fa-scale-balanced"   color="#b45309"      label="Legal Fees (Solicitors)"                                          amount={r.legalFee}     note="1.5% — title transfer, T&C drafting, winner agreement" />
      <Row icon="fa-file-certificate" color="#6d28d9"      label="NIESV Valuation Certificate"                                     amount={r.nisvFee}      note="Independent certified property valuation by NIESV-registered valuer" />
      <Row icon="fa-stamp"            color="#b45309"      label="Stamp Duty"                                                       amount={r.stampDuty}    note="1.5% — statutory stamp duty on property transfer" />
      <Row icon="fa-laptop"           color="#0891b2"      label="Platform & Technology"                                            amount={r.techFee}      note="Website, SMS gateway, payment integration, hosting" />
      <Row icon="fa-clipboard-list"   color="#0891b2"      label="Administrative & Operations"                                      amount={r.adminFee}     note="2% — staff, office, customer care, draw logistics" />
      <Row icon="fa-shield"           color="#0891b2"      label="Liability Insurance"                                              amount={r.insuranceFee} note="0.5% — event liability and campaign insurance" />
      <Row icon="fa-life-ring"        color="#dc2626"      label={`Contingency Reserve (${Math.round(r.contingencyPct * 100)}%)`}  amount={r.contingencyAmt} note="Buffer for unexpected costs — returned to company if unused" />
      <Divider label="Variable Costs (from ticket revenue)" />
      <Row icon="fa-bullhorn"         color="#c2410c"      label={`Marketing & Advertising (${Math.round(r.marketingPct * 100)}%)`} amount={r.marketingAmt} note="Social media ads, influencer fees, content creation, outdoor" />
      <Row icon="fa-credit-card"      color="#0891b2"      label="Payment Processing Fees (1.5%)"                                   amount={r.paymentFee}   note="Paystack/Flutterwave gateway charges on ticket revenue" />
      <Row icon="fa-sack-dollar"      color="var(--gold)"  label={`Company Profit (${Math.round(r.profitPct * 100)}%)`}             amount={r.companyProfit} note="Net profit retained by RaffleProp after all costs" />
      <div className="cost-row cost-total">
        <div className="cost-label"><i className="fa-solid fa-equals" style={{ marginRight: '0.5rem' }} />Total Revenue Required from Ticket Sales</div>
        <div className="cost-amount">{fmt(r.totalRevenue)}</div>
      </div>
    </>
  );
}

// ── ProfileEditor ──────────────────────────────────────────────────────────────

type EditorForm = {
  body: string; status: StateProfile['status']; lastVerified: string;
  appFee: string; licenceFee: string; lotteryLevy: string;
  lotteryLevyPct: string; gcfRate: string; drawMonitorFee: string;
  source: string; notes: string; editorName: string;
};

const BLANK_FORM: EditorForm = { body: '', status: 'Unknown', lastVerified: '', appFee: '', licenceFee: '', lotteryLevy: '', lotteryLevyPct: '', gcfRate: '', drawMonitorFee: '', source: '', notes: '', editorName: '' };

function ProfileEditor({ open, onToggle, stateProfiles, onSave, onReset }: {
  open: boolean; onToggle: () => void;
  stateProfiles: Record<string, StateProfile>;
  onSave: (state: string, profile: StateProfile) => void;
  onReset: (state: string) => void;
}) {
  const [editorState, setEditorState]   = useState('');
  const [form, setForm]                 = useState<EditorForm>(BLANK_FORM);
  const [changelog, setChangelog]       = useState<Array<{ ts: string; editor: string; state: string; changes: string[] }>>([]);

  useEffect(() => {
    try { setChangelog(JSON.parse(localStorage.getItem('rp_profile_changelog') ?? '[]')); } catch {}
    try {
      const u = JSON.parse(localStorage.getItem('rp_user') ?? '{}') as { fullName?: string; name?: string };
      if (u.fullName ?? u.name) setForm(p => ({ ...p, editorName: u.fullName ?? u.name ?? '' }));
    } catch {}
  }, []);

  function loadState(state: string) {
    setEditorState(state);
    if (!state) return;
    const p = stateProfiles[state];
    if (!p) return;
    setForm(prev => ({
      ...prev, body: p.body, status: p.status, lastVerified: p.lastVerified ?? '',
      appFee:         p.appFee         ? String(p.appFee)                              : '',
      licenceFee:     p.licenceFee     ? String(p.licenceFee)                          : '',
      lotteryLevy:    p.lotteryLevy    ? String(p.lotteryLevy)                         : '',
      lotteryLevyPct: p.lotteryLevyPct ? String((p.lotteryLevyPct * 100).toFixed(2))  : '',
      gcfRate:        p.gcfRate        ? String((p.gcfRate        * 100).toFixed(2))   : '',
      drawMonitorFee: p.drawMonitorFee ? String(p.drawMonitorFee)                      : '',
      source: p.source ?? '', notes: p.notes ?? '',
    }));
  }

  function set(k: keyof EditorForm, v: string) { setForm(p => ({ ...p, [k]: v })); }

  function handleSave() {
    if (!editorState) return;
    const oldP = stateProfiles[editorState]!;
    const newP: StateProfile = {
      body:           form.body.trim() || oldP.body,
      status:         form.status,
      lastVerified:   form.lastVerified,
      appFee:         parseFloat(form.appFee)         || 0,
      licenceFee:     parseFloat(form.licenceFee)     || 0,
      lotteryLevy:    parseFloat(form.lotteryLevy)    || 0,
      lotteryLevyPct: (parseFloat(form.lotteryLevyPct) || 0) / 100,
      gcfRate:        (parseFloat(form.gcfRate)        || 0) / 100,
      drawMonitorFee: parseFloat(form.drawMonitorFee) || 0,
      source:         form.source.trim(),
      notes:          form.notes.trim(),
      otherFees:      oldP.otherFees,
    };
    const editorName = form.editorName.trim() || 'Admin';
    const fields: (keyof StateProfile)[] = ['body','status','appFee','licenceFee','lotteryLevy','lotteryLevyPct','gcfRate','drawMonitorFee','source'];
    const changes = fields.filter(f => String(oldP[f]) !== String(newP[f])).map(f => `${f}: ${String(oldP[f])} → ${String(newP[f])}`);
    const entry = { ts: new Date().toISOString(), editor: editorName, state: editorState, changes: changes.length ? changes : ['(no numeric changes)'] };
    const newLog = [entry, ...changelog].slice(0, 500);
    setChangelog(newLog);
    try { localStorage.setItem('rp_profile_changelog', JSON.stringify(newLog)); } catch {}
    onSave(editorState, newP);
    alert(`Profile for ${editorState} saved.`);
  }

  function handleReset() {
    if (!editorState || !confirm(`Reset ${editorState} profile to defaults?`)) return;
    onReset(editorState);
    loadState(editorState);
  }

  const stateLogs = changelog.filter(l => l.state === editorState);

  return (
    <div style={{ marginTop: '1.5rem', border: '1px solid var(--border-light)', borderRadius: 14, overflow: 'hidden' }}>
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', background: 'var(--bg-secondary)', cursor: 'pointer', userSelect: 'none' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, margin: 0 }}>
          <i className="fa-solid fa-database" style={{ color: 'var(--green-primary)', marginRight: '0.5rem' }} />
          Regulatory Profile Editor
          <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.5rem' }}>Update state fee schedules · saved to this browser</span>
        </h3>
        <i className="fa-solid fa-chevron-down" style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : '' }} />
      </div>

      {open && (
        <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label className="form-label" style={{ fontSize: '0.8125rem' }}>Select State to Edit</label>
            <select className="form-input" style={{ maxWidth: 260 }} value={editorState} onChange={e => loadState(e.target.value)}>
              <option value="">— Select a state —</option>
              {STATE_LIST.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {editorState && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Regulatory Body Name</label>
                  <input type="text" className="form-input" value={form.body} onChange={e => set('body', e.target.value)} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Status</label>
                  <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
                    <option value="Unknown">Unknown — not yet verified</option>
                    <option value="Estimated">Estimated — approximate figures</option>
                    <option value="Confirmed">Confirmed — verified from official source</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Last Verified Date</label>
                  <input type="date" className="form-input" value={form.lastVerified} onChange={e => set('lastVerified', e.target.value)} />
                </div>
                {([
                  ['appFee',         'Application Fee (₦)'],
                  ['licenceFee',     'Annual Licence Fee (₦)'],
                  ['lotteryLevy',    'Flat Campaign Levy (₦)'],
                  ['lotteryLevyPct', 'Lottery Levy (% of prize)'],
                  ['gcfRate',        'GCF Rate (% of prize)'],
                  ['drawMonitorFee', 'Draw Monitoring Fee (₦)'],
                ] as [keyof EditorForm, string][]).map(([k, lbl]) => (
                  <div key={k}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>{lbl}</label>
                    <input type="number" className="form-input" min={0} step={k === 'lotteryLevyPct' || k === 'gcfRate' ? 0.01 : 1} placeholder="0" value={form[k] as string} onChange={e => set(k, e.target.value)} />
                  </div>
                ))}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Source / Reference</label>
                  <input type="text" className="form-input" placeholder="e.g. LSLGA official fee schedule, verified 2026-01-15" value={form.source} onChange={e => set('source', e.target.value)} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Notes</label>
                  <textarea className="form-input" rows={3} style={{ resize: 'vertical', fontFamily: 'inherit' }} placeholder="Additional notes..." value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Editor Name (for change log)</label>
                  <input type="text" className="form-input" placeholder="Your name" value={form.editorName} onChange={e => set('editorName', e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleSave}>
                  <i className="fa-solid fa-floppy-disk" style={{ marginRight: '0.375rem' }} />Save Profile
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={handleReset}>
                  <i className="fa-solid fa-rotate-left" style={{ marginRight: '0.375rem' }} />Reset to Default
                </button>
              </div>

              {stateLogs.length > 0 && (
                <div style={{ marginTop: '1.25rem' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: '0.375rem' }} />Change Log
                  </div>
                  {stateLogs.slice(0, 10).map((l, i) => (
                    <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.375rem 0', borderBottom: '1px solid var(--border-light)', lineHeight: 1.5 }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{new Date(l.ts).toLocaleString('en-NG')}</strong> — {l.editor}
                      <div style={{ marginTop: '0.1rem' }}>{l.changes.join(' · ')}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
