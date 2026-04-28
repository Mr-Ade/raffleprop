'use client';

import { useState } from 'react';
import { Metadata } from 'next';

export default function CalculatorPage() {
  const [propertyValue, setPropertyValue] = useState('');
  const [ticketPrice, setTicketPrice] = useState('');
  const [minFill, setMinFill] = useState('80');
  const [platformFee, setPlatformFee] = useState('10');

  const pv = parseFloat(propertyValue.replace(/,/g, '')) || 0;
  const tp = parseFloat(ticketPrice.replace(/,/g, '')) || 0;
  const minPct = parseFloat(minFill) / 100;
  const feePct = parseFloat(platformFee) / 100;

  const totalTickets = tp > 0 ? Math.ceil(pv / tp) : 0;
  const minTickets = Math.ceil(totalTickets * minPct);
  const breakEvenTickets = tp > 0 ? Math.ceil(pv / (tp * (1 - feePct))) : 0;
  const projRevenue = totalTickets * tp;
  const platformRevenue = projRevenue * feePct;
  const escrowAmount = projRevenue - platformRevenue;

  return (
    <>
      <div className="admin-topbar">
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Campaign Calculator</h1>
      </div>
      <div className="admin-content">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Inputs */}
          <div className="card">
            <div className="card-header" style={{ fontWeight: 700 }}>Campaign Parameters</div>
            <div className="card-body">
              {[
                { label: 'Property Market Value (₦)', value: propertyValue, set: setPropertyValue, placeholder: '25,000,000' },
                { label: 'Ticket Price (₦)', value: ticketPrice, set: setTicketPrice, placeholder: '2,500' },
                { label: 'Minimum Fill % (for draw)', value: minFill, set: setMinFill, placeholder: '80' },
                { label: 'Platform Fee %', value: platformFee, set: setPlatformFee, placeholder: '10' },
              ].map((f) => (
                <div key={f.label} className="form-group">
                  <label className="form-label">{f.label}</label>
                  <input type="text" inputMode="numeric" className="form-input" value={f.value} onChange={(e) => f.set(e.target.value)} placeholder={f.placeholder} />
                </div>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="card">
            <div className="card-header" style={{ fontWeight: 700 }}>Projections</div>
            <div style={{ padding: '0 1.5rem' }}>
              {[
                { label: 'Total Tickets Required', value: totalTickets.toLocaleString(), color: 'var(--text-primary)' },
                { label: 'Minimum Tickets (for draw)', value: minTickets.toLocaleString(), color: 'var(--warning)' },
                { label: 'Break-Even Tickets Sold', value: breakEvenTickets.toLocaleString(), color: 'var(--info)' },
                { label: 'Gross Revenue (100% sold)', value: `₦${projRevenue.toLocaleString()}`, color: 'var(--green-primary)' },
                { label: 'Platform Fee', value: `₦${platformRevenue.toLocaleString()}`, color: 'var(--text-secondary)' },
                { label: 'Escrow / Property Fund', value: `₦${escrowAmount.toLocaleString()}`, color: 'var(--green-primary)' },
              ].map((r) => (
                <div key={r.label} className="spec-row">
                  <span className="spec-key">{r.label}</span>
                  <span className="spec-val" style={{ color: r.color, fontSize: '1rem' }}>{r.value || '—'}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-light)' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <strong>Note:</strong> Ensure the reserve price covers the property acquisition cost plus legal/regulatory fees.
                Minimum fill % should be set high enough that escrow covers the property value.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
