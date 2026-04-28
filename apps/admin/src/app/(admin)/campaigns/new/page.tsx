'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export default function NewCampaignPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '', propertyAddress: '', propertyState: '', propertyLga: '',
    propertyType: 'RESIDENTIAL', marketValue: '', reservePrice: '',
    ticketPrice: '', totalTickets: '', minTickets: '',
    escrowBank: '', escrowAccountNo: '', drawMethod: 'RANDOM',
    skillQuestion: '{"question":"","options":["","","",""],"correctIndex":0}',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(k: keyof typeof form, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      let skillQuestion;
      try { skillQuestion = JSON.parse(form.skillQuestion); } catch { setError('Invalid skill question JSON.'); setSaving(false); return; }

      const res = await fetch(`${API}/api/admin/campaigns`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          marketValue: parseFloat(form.marketValue),
          reservePrice: parseFloat(form.reservePrice),
          ticketPrice: parseFloat(form.ticketPrice),
          totalTickets: parseInt(form.totalTickets),
          minTickets: parseInt(form.minTickets),
          skillQuestion,
          bundles: [],
        }),
      });
      const data = await res.json() as { success: boolean; data?: { id: string }; error?: string };
      if (!res.ok || !data.success) { setError(data.error ?? 'Failed.'); return; }
      router.push(`/campaigns/${data.data!.id}`);
    } catch { setError('Network error.'); }
    finally { setSaving(false); }
  }

  return (
    <>
      <div className="admin-topbar">
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>New Campaign</h1>
      </div>
      <div className="admin-content">
        <div className="card" style={{ maxWidth: 720 }}>
          <div className="card-body">
            {error && <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', borderRadius: 'var(--radius)', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#991b1b' }}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {[
                  { key: 'title', label: 'Campaign Title', col: '1 / -1' },
                  { key: 'propertyAddress', label: 'Property Address', col: '1 / -1' },
                  { key: 'propertyState', label: 'State' },
                  { key: 'propertyLga', label: 'LGA' },
                  { key: 'marketValue', label: 'Market Value (₦)', type: 'number' },
                  { key: 'reservePrice', label: 'Reserve Price (₦)', type: 'number' },
                  { key: 'ticketPrice', label: 'Ticket Price (₦)', type: 'number' },
                  { key: 'totalTickets', label: 'Total Tickets', type: 'number' },
                  { key: 'minTickets', label: 'Min. Tickets (for draw)', type: 'number' },
                  { key: 'escrowBank', label: 'Escrow Bank' },
                  { key: 'escrowAccountNo', label: 'Escrow Account No.' },
                ].map((f) => (
                  <div key={f.key} className="form-group" style={{ gridColumn: (f as any).col ?? 'auto' }}>
                    <label className="form-label">{f.label} <span className="required">*</span></label>
                    <input
                      type={f.type ?? 'text'}
                      className="form-input"
                      value={form[f.key as keyof typeof form]}
                      onChange={(e) => set(f.key as keyof typeof form, e.target.value)}
                      required
                    />
                  </div>
                ))}

                <div className="form-group">
                  <label className="form-label">Property Type</label>
                  <select className="form-select" value={form.propertyType} onChange={(e) => set('propertyType', e.target.value)}>
                    {['RESIDENTIAL', 'COMMERCIAL', 'LAND', 'MIXED_USE'].map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Draw Method</label>
                  <select className="form-select" value={form.drawMethod} onChange={(e) => set('drawMethod', e.target.value)}>
                    <option value="RANDOM">Random (CSPRNG)</option>
                    <option value="RANDOM_ORG_VERIFIED">Random.org Verified</option>
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Skill Question (JSON) <span className="required">*</span></label>
                  <textarea
                    className="form-textarea"
                    value={form.skillQuestion}
                    onChange={(e) => set('skillQuestion', e.target.value)}
                    rows={5}
                    style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                  />
                  <p className="form-hint">Format: {`{"question":"...","options":["a","b","c","d"],"correctIndex":0}`}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Saving…</> : 'Create Campaign (Draft)'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => router.push('/campaigns')}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
