'use client';

import { useState, useCallback, useEffect } from 'react';
import type {
  SiteSettings, Faq, Testimonial, WinnerStory,
  TrustBadge, HowItWorksStep, TeamMember, CompanyMilestone,
} from './page';
import { ContentImageUpload } from './ContentImageUpload';
import { RichTextEditor } from '@/components/RichTextEditor';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab =
  | 'settings' | 'faqs' | 'testimonials' | 'winners'
  | 'homepage' | 'campaigns' | 'trust' | 'how-it-works' | 'about' | 'footer' | 'vault' | 'pages' | 'topics' | 'comments';

interface ContentPage {
  id: string;
  slug: string;
  title: string;
  content: unknown;
  topic?: string | null;
  metaTitle?: string | null;
  metaDesc?: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt?: string;
}

interface Props {
  initialSettings: SiteSettings;
  initialFaqs: Faq[];
  initialTestimonials: Testimonial[];
  initialWinners: WinnerStory[];
  initialTrustBadges: TrustBadge[];
  initialHowItWorks: HowItWorksStep[];
  initialTeam: TeamMember[];
  initialMilestones: CompanyMilestone[];
  token: string;
  apiUrl: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useApi(apiUrl: string, token: string) {
  return useCallback(
    async (path: string, method = 'GET', body?: unknown) => {
      const res = await fetch(`${apiUrl}/api/admin/content${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
        throw new Error(err.error ?? res.statusText);
      }
      return res.json() as Promise<{ success: boolean; data: unknown }>;
    },
    [apiUrl, token],
  );
}

// Reorder helper — swaps items[idx] with items[idx+dir], persists to API
function reorderItems<T extends { id: string }>(
  items: T[],
  setItems: React.Dispatch<React.SetStateAction<T[]>>,
  idx: number,
  dir: 1 | -1,
  apiPath: string,
  apiRef?: ReturnType<typeof useApi>,
) {
  const next = [...items];
  [next[idx], next[idx + dir]] = [next[idx + dir]!, next[idx]!];
  setItems(next);
  if (apiRef) {
    void apiRef(apiPath, 'PATCH', next.map((item, i) => ({ id: item.id, order: i })));
  }
}

function SaveBtn({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <button type="button" className="btn btn-primary" onClick={onClick} disabled={saving} style={{ minWidth: 100 }}>
      {saving ? 'Saving…' : 'Save Changes'}
    </button>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
      <div className="admin-card-header">
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>{title}</h3>
      </div>
      <div className="admin-card-body">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      {label && (
        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="admin-input" {...props} />;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="admin-textarea" rows={3} {...props} />;
}

function StatusMsg({ msg }: { msg: string }) {
  if (!msg) return null;
  return <span style={{ fontSize: '0.8125rem', color: msg.startsWith('Error') ? 'var(--red)' : 'var(--green-primary)' }}>{msg}</span>;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function DeleteBtn({ onConfirm, disabled }: { onConfirm: () => void; disabled?: boolean }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <span style={{ display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}>
        <button type="button" className="btn btn-danger btn-xs" onClick={() => { setConfirming(false); onConfirm(); }}>Yes</button>
        <button type="button" className="btn btn-outline btn-xs" onClick={() => setConfirming(false)}>No</button>
      </span>
    );
  }
  return (
    <button type="button" className="btn btn-danger btn-xs" disabled={disabled} onClick={() => setConfirming(true)}>Del</button>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────

function SettingsPanel({ settings, api }: { settings: SiteSettings; api: ReturnType<typeof useApi> }) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const set = (k: keyof SiteSettings, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const URL_KEYS: Array<keyof SiteSettings> = [
    'twitterUrl', 'instagramUrl', 'facebookUrl', 'youtubeUrl', 'tiktokUrl', 'linkedinUrl',
    'termsUrl', 'privacyUrl',
  ];
  const NULLABLE_KEYS: Array<keyof SiteSettings> = [
    'supportEmail', 'supportPhone', 'whatsappNumber', 'tagline',
    'maintenanceBanner', 'footerTagline',
  ];

  const save = async () => {
    setSaving(true); setMsg('');
    const payload = { ...form };
    for (const k of URL_KEYS) {
      if (payload[k] === '') (payload as Record<string, unknown>)[k] = null;
    }
    for (const k of NULLABLE_KEYS) {
      if (payload[k] === '') (payload as Record<string, unknown>)[k] = null;
    }
    try { await api('/settings', 'PUT', payload); setMsg('Saved!'); }
    catch (e) { setMsg(`Error: ${(e as Error).message}`); }
    setSaving(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Site Settings</h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}><StatusMsg msg={msg} /><SaveBtn saving={saving} onClick={save} /></div>
      </div>
      <SectionCard title="General">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="Site Name"><Input value={form.siteName ?? ''} onChange={(e) => set('siteName', e.target.value)} /></Field>
          <Field label="Tagline (short description)"><Input value={form.tagline ?? ''} onChange={(e) => set('tagline', e.target.value)} /></Field>
        </div>
      </SectionCard>
      <SectionCard title="Contact & Support">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="Support Email"><Input type="email" value={form.supportEmail ?? ''} onChange={(e) => set('supportEmail', e.target.value)} /></Field>
          <Field label="Support Phone"><Input type="tel" value={form.supportPhone ?? ''} onChange={(e) => set('supportPhone', e.target.value)} /></Field>
          <Field label="WhatsApp Number (intl, digits only)"><Input placeholder="2348012345678" value={form.whatsappNumber ?? ''} onChange={(e) => set('whatsappNumber', e.target.value)} /></Field>
          <div />
        </div>
      </SectionCard>
      <SectionCard title="Social Media URLs">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="Twitter / X"><Input placeholder="https://twitter.com/raffleprop" value={form.twitterUrl ?? ''} onChange={(e) => set('twitterUrl', e.target.value)} /></Field>
          <Field label="Instagram"><Input placeholder="https://instagram.com/raffleprop" value={form.instagramUrl ?? ''} onChange={(e) => set('instagramUrl', e.target.value)} /></Field>
          <Field label="Facebook"><Input placeholder="https://facebook.com/raffleprop" value={form.facebookUrl ?? ''} onChange={(e) => set('facebookUrl', e.target.value)} /></Field>
          <Field label="YouTube"><Input placeholder="https://youtube.com/@raffleprop" value={form.youtubeUrl ?? ''} onChange={(e) => set('youtubeUrl', e.target.value)} /></Field>
          <Field label="TikTok"><Input placeholder="https://tiktok.com/@raffleprop" value={form.tiktokUrl ?? ''} onChange={(e) => set('tiktokUrl', e.target.value)} /></Field>
          <Field label="LinkedIn"><Input placeholder="https://linkedin.com/company/raffleprop" value={form.linkedinUrl ?? ''} onChange={(e) => set('linkedinUrl', e.target.value)} /></Field>
        </div>
      </SectionCard>
      <SectionCard title="Footer & Legal Links">
        <Field label="Footer Tagline (appears under logo)"><Input placeholder="Win property. Transparent. Compliant." value={form.footerTagline ?? ''} onChange={(e) => set('footerTagline', e.target.value)} /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="Terms of Service URL"><Input placeholder="https://raffleprop.com/terms" value={form.termsUrl ?? ''} onChange={(e) => set('termsUrl', e.target.value)} /></Field>
          <Field label="Privacy Policy URL"><Input placeholder="https://raffleprop.com/privacy" value={form.privacyUrl ?? ''} onChange={(e) => set('privacyUrl', e.target.value)} /></Field>
        </div>
      </SectionCard>
      <SectionCard title="Maintenance">
        <Field label="">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.maintenanceMode ?? false} onChange={(e) => set('maintenanceMode', e.target.checked)} />
            <span style={{ fontSize: '0.875rem' }}>Enable maintenance mode (set <code>NEXT_PUBLIC_MAINTENANCE_MODE=true</code> in .env to activate site redirect)</span>
          </label>
        </Field>
        <Field label="Notification Banner (shown in a banner at the top of every page when set — independent of maintenance mode)">
          <Textarea rows={2} placeholder="We're upgrading our payment system — back in 30 minutes." value={form.maintenanceBanner ?? ''} onChange={(e) => set('maintenanceBanner', e.target.value)} />
        </Field>
      </SectionCard>
    </div>
  );
}

// ─── FAQs Panel ───────────────────────────────────────────────────────────────

function FaqsPanel({ faqs: initial, api }: { faqs: Faq[]; api: ReturnType<typeof useApi> }) {
  const [faqs, setFaqs] = useState(initial);
  const [editing, setEditing] = useState<Partial<Faq> | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const save = async () => {
    if (!editing) return;
    setSaving(true); setMsg('');
    try {
      if (editing.id) {
        const r = await api(`/faqs/${editing.id}`, 'PUT', editing) as { success: boolean; data: Faq };
        setFaqs((p) => p.map((f) => (f.id === editing.id ? (r.data as Faq) : f)));
      } else {
        const r = await api('/faqs', 'POST', editing) as { success: boolean; data: Faq };
        setFaqs((p) => [...p, r.data as Faq]);
      }
      setEditing(null); setMsg('Saved!');
    } catch (e) { setMsg(`Error: ${(e as Error).message}`); }
    setSaving(false);
  };

  const del = async (id: string) => {
    try { await api(`/faqs/${id}`, 'DELETE'); setFaqs((p) => p.filter((f) => f.id !== id)); }
    catch (e) { setMsg(`Error: ${(e as Error).message}`); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 800 }}>FAQs</h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <StatusMsg msg={msg} />
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({ question: '', answer: '', category: 'Legality & Regulation', order: faqs.length, published: true })}>+ Add FAQ</button>
        </div>
      </div>
      {editing && (
        <SectionCard title={editing.id ? 'Edit FAQ' : 'New FAQ'}>
          <Field label="Question"><Input value={editing.question ?? ''} onChange={(e) => setEditing((p) => ({ ...p!, question: e.target.value }))} /></Field>
          <Field label="Answer">
            <RichTextEditor key={editing.id ?? 'new'} value={editing.answer ?? ''} onChange={(html) => setEditing((p) => ({ ...p!, answer: html }))} placeholder="Write the answer…" minHeight={120} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '0.75rem' }}>
            <Field label="Category">
              <select
                value={editing.category ?? 'Legality & Regulation'}
                onChange={(e) => setEditing((p) => ({ ...p!, category: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem 0.625rem', fontSize: '0.875rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
              >
                <option>Legality &amp; Regulation</option>
                <option>Tickets &amp; Payment</option>
                <option>The Draw</option>
                <option>Winning &amp; Title Transfer</option>
                <option>Refunds &amp; Security</option>
                <option>Account &amp; Registration</option>
                <option>Referral Programme</option>
                <option>General</option>
              </select>
            </Field>
            <Field label="Order"><Input type="number" value={editing.order ?? 0} onChange={(e) => setEditing((p) => ({ ...p!, order: parseInt(e.target.value) }))} /></Field>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
            <input type="checkbox" checked={editing.published ?? true} onChange={(e) => setEditing((p) => ({ ...p!, published: e.target.checked }))} /> Published
          </label>
          <div style={{ display: 'flex', gap: '0.75rem' }}><SaveBtn saving={saving} onClick={save} /><button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(null)}>Cancel</button></div>
        </SectionCard>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {faqs.map((f, idx) => (
          <div key={f.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{f.question}</span>
                {f.published
                  ? <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'var(--green-50)', color: 'var(--green-primary)', border: '1px solid var(--green-100)', borderRadius: 100, padding: '0.1rem 0.5rem' }}>Live</span>
                  : <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-light)', borderRadius: 100, padding: '0.1rem 0.5rem' }}>Draft</span>}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{f.category}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <button type="button" className="btn btn-outline btn-xs" disabled={idx === 0} onClick={() => reorderItems(faqs, setFaqs, idx, -1, '/faqs/reorder', api)}>↑</button>
                <button type="button" className="btn btn-outline btn-xs" disabled={idx === faqs.length - 1} onClick={() => reorderItems(faqs, setFaqs, idx, 1, '/faqs/reorder', api)}>↓</button>
              </div>
              <button type="button" className="btn btn-outline btn-xs" onClick={() => setEditing(f)}>Edit</button>
              <DeleteBtn onConfirm={() => del(f.id)} />
            </div>
          </div>
        ))}
        {faqs.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No FAQs yet. Add your first FAQ above.</p>}
      </div>
    </div>
  );
}

// ─── Testimonials Panel ───────────────────────────────────────────────────────

function TestimonialsPanel({ testimonials: initial, api, token, apiUrl }: { testimonials: Testimonial[]; api: ReturnType<typeof useApi>; token: string; apiUrl: string }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<Partial<Testimonial> | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const save = async () => {
    if (!editing) return;
    setSaving(true); setMsg('');
    const payload = { authorName: editing.authorName ?? '', authorTitle: editing.authorTitle ?? null, body: editing.body ?? '', avatarKey: editing.avatarKey ?? null, rating: editing.rating ?? 5, published: editing.published ?? true, featured: editing.featured ?? false, order: editing.order ?? 0 };
    try {
      if (editing.id) {
        const r = await api(`/testimonials/${editing.id}`, 'PUT', payload) as { success: boolean; data: Testimonial };
        setItems((p) => p.map((t) => (t.id === editing.id ? (r.data as Testimonial) : t)));
      } else {
        const r = await api('/testimonials', 'POST', payload) as { success: boolean; data: Testimonial };
        setItems((p) => [...p, r.data as Testimonial]);
      }
      setEditing(null); setMsg('Saved!');
    } catch (e) { setMsg(`Error: ${(e as Error).message}`); }
    setSaving(false);
  };

  const del = async (id: string) => {
    try { await api(`/testimonials/${id}`, 'DELETE'); setItems((p) => p.filter((t) => t.id !== id)); }
    catch (e) { setMsg(`Error: ${(e as Error).message}`); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Testimonials</h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <StatusMsg msg={msg} />
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({ rating: 5, published: true, featured: false, order: items.length })}>+ Add</button>
        </div>
      </div>
      {editing && (
        <SectionCard title={editing.id ? 'Edit Testimonial' : 'New Testimonial'}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Field label="Name"><Input value={editing.authorName ?? ''} onChange={(e) => setEditing((p) => ({ ...p!, authorName: e.target.value }))} /></Field>
            <Field label="Location / Title"><Input value={editing.authorTitle ?? ''} onChange={(e) => setEditing((p) => ({ ...p!, authorTitle: e.target.value }))} /></Field>
            <Field label="Rating (1–5)"><Input type="number" min={1} max={5} value={editing.rating ?? 5} onChange={(e) => setEditing((p) => ({ ...p!, rating: parseInt(e.target.value) }))} /></Field>
            <Field label="Order"><Input type="number" value={editing.order ?? 0} onChange={(e) => setEditing((p) => ({ ...p!, order: parseInt(e.target.value) }))} /></Field>
          </div>
          <Field label="Review Text">
            <RichTextEditor key={editing.id ?? 'new'} value={editing.body ?? ''} onChange={(html) => setEditing((p) => ({ ...p!, body: html }))} placeholder="Write the review…" minHeight={100} />
          </Field>
          <Field label="Avatar Photo">
            <ContentImageUpload
              purpose="testimonial_avatar"
              entityId={editing.id ?? 'new'}
              currentKey={editing.avatarKey}
              onUploaded={(key) => setEditing((p) => ({ ...p!, avatarKey: key }))}
              token={token}
              apiUrl={apiUrl}
              label="Upload Avatar"
              size="sm"
            />
          </Field>
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}><input type="checkbox" checked={editing.published ?? true} onChange={(e) => setEditing((p) => ({ ...p!, published: e.target.checked }))} /> Published</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}><input type="checkbox" checked={editing.featured ?? false} onChange={(e) => setEditing((p) => ({ ...p!, featured: e.target.checked }))} /> Featured</label>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}><SaveBtn saving={saving} onClick={save} /><button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(null)}>Cancel</button></div>
        </SectionCard>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {items.map((t, idx) => (
          <div key={t.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t.authorName}</span>
                <span style={{ color: '#f59e0b', fontSize: '0.8125rem' }}>{'★'.repeat(t.rating)}</span>
                {t.published
                  ? <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'var(--green-50)', color: 'var(--green-primary)', border: '1px solid var(--green-100)', borderRadius: 100, padding: '0.1rem 0.5rem' }}>Live</span>
                  : <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-light)', borderRadius: 100, padding: '0.1rem 0.5rem' }}>Draft</span>}
                {t.featured && <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: 100, padding: '0.1rem 0.5rem' }}>Featured</span>}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{stripHtml(t.body ?? '').substring(0, 100)}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <button type="button" className="btn btn-outline btn-xs" disabled={idx === 0} onClick={() => reorderItems(items, setItems, idx, -1, '/testimonials/reorder', api)}>↑</button>
                <button type="button" className="btn btn-outline btn-xs" disabled={idx === items.length - 1} onClick={() => reorderItems(items, setItems, idx, 1, '/testimonials/reorder', api)}>↓</button>
              </div>
              <button type="button" className="btn btn-outline btn-xs" onClick={() => setEditing(t)}>Edit</button>
              <DeleteBtn onConfirm={() => del(t.id)} />
            </div>
          </div>
        ))}
        {items.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No testimonials yet.</p>}
      </div>
    </div>
  );
}

// ─── Winners Panel ────────────────────────────────────────────────────────────

function WinnersPanel({ winners: initial, api, token, apiUrl }: { winners: WinnerStory[]; api: ReturnType<typeof useApi>; token: string; apiUrl: string }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<Partial<WinnerStory> | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const save = async () => {
    if (!editing) return;
    setSaving(true); setMsg('');
    const payload = {
      winnerName: editing.winnerName ?? '',
      propertyTitle: editing.propertyTitle ?? '',
      propertyState: editing.propertyState || null,
      prize: editing.prize || null,
      drawDate: editing.drawDate ? new Date(editing.drawDate).toISOString() : null,
      imageKey: editing.imageKey || null,
      blurb: editing.blurb || null,
      drawArchiveUrl: editing.drawArchiveUrl?.trim() || null,
      published: editing.published ?? true,
      featured: editing.featured ?? false,
      order: editing.order ?? 0,
    };
    try {
      if (editing.id) {
        const r = await api(`/winners/${editing.id}`, 'PUT', payload) as { success: boolean; data: WinnerStory };
        setItems((p) => p.map((w) => (w.id === editing.id ? (r.data as WinnerStory) : w)));
      } else {
        const r = await api('/winners', 'POST', payload) as { success: boolean; data: WinnerStory };
        setItems((p) => [...p, r.data as WinnerStory]);
      }
      setEditing(null); setMsg('Saved!');
    } catch (e) { setMsg(`Error: ${(e as Error).message}`); }
    setSaving(false);
  };

  const del = async (id: string) => {
    try { await api(`/winners/${id}`, 'DELETE'); setItems((p) => p.filter((w) => w.id !== id)); }
    catch (e) { setMsg(`Error: ${(e as Error).message}`); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Winner Stories</h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <StatusMsg msg={msg} />
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({ published: true, featured: false, order: items.length })}>+ Add</button>
        </div>
      </div>
      {editing && (
        <SectionCard title={editing.id ? 'Edit Winner' : 'New Winner'}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Field label="Winner Name"><Input value={editing.winnerName ?? ''} onChange={(e) => setEditing((p) => ({ ...p!, winnerName: e.target.value }))} /></Field>
            <Field label="Property Title"><Input value={editing.propertyTitle ?? ''} onChange={(e) => setEditing((p) => ({ ...p!, propertyTitle: e.target.value }))} /></Field>
            <Field label="Location / State"><Input value={editing.propertyState ?? ''} onChange={(e) => setEditing((p) => ({ ...p!, propertyState: e.target.value }))} /></Field>
            <Field label="Prize Value"><Input placeholder="₦38,000,000" value={editing.prize ?? ''} onChange={(e) => setEditing((p) => ({ ...p!, prize: e.target.value }))} /></Field>
            <Field label="Draw Date"><Input type="date" value={editing.drawDate?.split('T')[0] ?? ''} onChange={(e) => setEditing((p) => ({ ...p!, drawDate: e.target.value }))} /></Field>
            <Field label="Order"><Input type="number" value={editing.order ?? 0} onChange={(e) => setEditing((p) => ({ ...p!, order: parseInt(e.target.value) }))} /></Field>
          </div>
          <Field label="Winner Quote / Blurb"><Textarea rows={3} value={editing.blurb ?? ''} onChange={(e) => setEditing((p) => ({ ...p!, blurb: e.target.value }))} /></Field>
          <Field label="Draw Archive URL (YouTube)"><Input type="url" placeholder="https://youtube.com/watch?v=..." value={editing.drawArchiveUrl ?? ''} onChange={(e) => setEditing((p) => ({ ...p!, drawArchiveUrl: e.target.value || null }))} /></Field>
          <Field label="Winner Photo">
            <ContentImageUpload
              purpose="winner_photo"
              entityId={editing.id ?? 'new'}
              currentKey={editing.imageKey}
              onUploaded={(key) => setEditing((p) => ({ ...p!, imageKey: key }))}
              token={token}
              apiUrl={apiUrl}
              label="Upload Photo"
              size="md"
            />
          </Field>
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}><input type="checkbox" checked={editing.published ?? true} onChange={(e) => setEditing((p) => ({ ...p!, published: e.target.checked }))} /> Published</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}><input type="checkbox" checked={editing.featured ?? false} onChange={(e) => setEditing((p) => ({ ...p!, featured: e.target.checked }))} /> Featured</label>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}><SaveBtn saving={saving} onClick={save} /><button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(null)}>Cancel</button></div>
        </SectionCard>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {items.map((w, idx) => (
          <div key={w.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{w.winnerName}</span>
                {w.published
                  ? <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'var(--green-50)', color: 'var(--green-primary)', border: '1px solid var(--green-100)', borderRadius: 100, padding: '0.1rem 0.5rem' }}>Live</span>
                  : <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-light)', borderRadius: 100, padding: '0.1rem 0.5rem' }}>Draft</span>}
                {w.featured && <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: 100, padding: '0.1rem 0.5rem' }}>Featured</span>}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{w.propertyTitle} · {w.prize} · {w.drawDate?.split('T')[0]}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <button type="button" className="btn btn-outline btn-xs" disabled={idx === 0} onClick={() => reorderItems(items, setItems, idx, -1, '/winners/reorder', api)}>↑</button>
                <button type="button" className="btn btn-outline btn-xs" disabled={idx === items.length - 1} onClick={() => reorderItems(items, setItems, idx, 1, '/winners/reorder', api)}>↓</button>
              </div>
              <button type="button" className="btn btn-outline btn-xs" onClick={() => setEditing(w)}>Edit</button>
              <DeleteBtn onConfirm={() => del(w.id)} />
            </div>
          </div>
        ))}
        {items.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No winners yet.</p>}
      </div>
    </div>
  );
}

// ─── Homepage Panel ───────────────────────────────────────────────────────────

function HomepagePanel({ settings: initial, api }: { settings: SiteSettings; api: ReturnType<typeof useApi> }) {
  const [homeSeo, setHomeSeo] = useState(initial.homeSeo ?? { title: '', description: '' });
  const [hero, setHero] = useState(initial.heroSection ?? { badgeText: '', heading: '', subheading: '' });
  const [heroStats, setHeroStats] = useState(initial.heroStats ?? [{ label: '', value: '' }, { label: '', value: '' }, { label: '', value: '' }]);
  const [statsSection, setStatsSection] = useState(initial.statsSection ?? [{ label: '', value: '' }, { label: '', value: '' }, { label: '', value: '' }, { label: '', value: '' }]);
  const [ctaBanner, setCtaBanner] = useState(initial.ctaBanner ?? { heading: '', subtext: '', primaryButtonLabel: '', secondaryButtonLabel: '' });
  const [notif, setNotif] = useState(initial.notificationSection ?? { heading: '', subtext: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const save = async () => {
    setSaving(true); setMsg('');
    try { await api('/settings', 'PUT', { homeSeo, heroSection: hero, heroStats, statsSection, ctaBanner, notificationSection: notif }); setMsg('Saved!'); }
    catch (e) { setMsg(`Error: ${(e as Error).message}`); }
    setSaving(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Homepage Content</h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}><StatusMsg msg={msg} /><SaveBtn saving={saving} onClick={save} /></div>
      </div>
      <SectionCard title="Home Page SEO">
        <Field label="Meta Title (max 70 chars)">
          <Input placeholder="RaffleProp — Win a Property in Nigeria From ₦2,500" value={homeSeo.title ?? ''} onChange={(e) => setHomeSeo((p) => ({ ...p, title: e.target.value }))} maxLength={70} />
        </Field>
        <Field label="Meta Description (max 160 chars)">
          <Textarea placeholder="Nigeria's most transparent property raffle platform..." value={homeSeo.description ?? ''} onChange={(e) => setHomeSeo((p) => ({ ...p, description: e.target.value }))} maxLength={160} />
        </Field>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Leave blank to use the built-in defaults. These appear in Google search results and link previews.</p>
      </SectionCard>
      <SectionCard title="Hero Section">
        <Field label="Badge Text (top pill)"><Input placeholder="Live Campaign Active · 2 Properties Available" value={hero.badgeText ?? ''} onChange={(e) => setHero((p) => ({ ...p, badgeText: e.target.value }))} /></Field>
        <Field label="Main Heading (line 1)"><Input placeholder="Win a Property." value={hero.heading ?? ''} onChange={(e) => setHero((p) => ({ ...p, heading: e.target.value }))} /></Field>
        <Field label="Gold Sub-heading (line 2)"><Input placeholder="From ₦2,500." value={hero.subheading ?? ''} onChange={(e) => setHero((p) => ({ ...p, subheading: e.target.value }))} /></Field>
      </SectionCard>
      <SectionCard title="Hero Stats Row (3 items)">
        {heroStats.map((s, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Field label={`#${i + 1} Value`}><Input value={s.value} onChange={(e) => setHeroStats((p) => p.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} /></Field>
            <Field label={`#${i + 1} Label`}><Input value={s.label} onChange={(e) => setHeroStats((p) => p.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} /></Field>
          </div>
        ))}
      </SectionCard>
      <SectionCard title="Stats Section (4 counters)">
        {statsSection.map((s, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Field label={`#${i + 1} Value`}><Input value={s.value} onChange={(e) => setStatsSection((p) => p.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} /></Field>
            <Field label={`#${i + 1} Label`}><Input value={s.label} onChange={(e) => setStatsSection((p) => p.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} /></Field>
          </div>
        ))}
      </SectionCard>
      <SectionCard title="CTA Banner">
        <Field label="Heading"><Input value={ctaBanner.heading ?? ''} onChange={(e) => setCtaBanner((p) => ({ ...p, heading: e.target.value }))} /></Field>
        <Field label="Subtext"><Textarea value={ctaBanner.subtext ?? ''} onChange={(e) => setCtaBanner((p) => ({ ...p, subtext: e.target.value }))} /></Field>
        <Field label="Primary Button Label"><Input value={ctaBanner.primaryButtonLabel ?? ''} onChange={(e) => setCtaBanner((p) => ({ ...p, primaryButtonLabel: e.target.value }))} /></Field>
        <Field label="Secondary Button Label"><Input value={ctaBanner.secondaryButtonLabel ?? ''} onChange={(e) => setCtaBanner((p) => ({ ...p, secondaryButtonLabel: e.target.value }))} /></Field>
      </SectionCard>
      <SectionCard title="Notification Section">
        <Field label="Heading"><Input value={notif.heading ?? ''} onChange={(e) => setNotif((p) => ({ ...p, heading: e.target.value }))} /></Field>
        <Field label="Subtext"><Textarea value={notif.subtext ?? ''} onChange={(e) => setNotif((p) => ({ ...p, subtext: e.target.value }))} /></Field>
      </SectionCard>
    </div>
  );
}

// ─── Campaigns Page Panel ─────────────────────────────────────────────────────

function CampaignsPanel({ settings: initial, api }: { settings: SiteSettings; api: ReturnType<typeof useApi> }) {
  const [seo, setSeo] = useState(initial.campaignsSeo ?? { title: '', description: '' });
  const [content, setContent] = useState(initial.campaignsPageContent ?? { heading: '', subheading: '', emptyStateHeading: '', emptyStateBody: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      await api('/settings', 'PUT', { campaignsSeo: seo, campaignsPageContent: content });
      setMsg('Saved!');
    } catch (e) { setMsg(`Error: ${(e as Error).message}`); }
    setSaving(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Campaigns Page Content</h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}><StatusMsg msg={msg} /><SaveBtn saving={saving} onClick={save} /></div>
      </div>
      <SectionCard title="Campaigns Page SEO">
        <Field label="Meta Title (max 70 chars)">
          <Input placeholder="Win a Property in Nigeria | RaffleProp Campaigns" value={seo.title ?? ''} onChange={(e) => setSeo((p) => ({ ...p, title: e.target.value }))} maxLength={70} />
        </Field>
        <Field label="Meta Description (max 160 chars)">
          <Textarea placeholder="Browse all live and upcoming property raffles..." value={seo.description ?? ''} onChange={(e) => setSeo((p) => ({ ...p, description: e.target.value }))} maxLength={160} />
        </Field>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Leave blank to use built-in defaults. Appears in Google search results and link previews.</p>
      </SectionCard>
      <SectionCard title="Page Header Copy">
        <Field label="Heading">
          <Input placeholder="Win a Property" value={content.heading ?? ''} onChange={(e) => setContent((p) => ({ ...p, heading: e.target.value }))} />
        </Field>
        <Field label="Subheading">
          <Textarea rows={2} placeholder="Browse all live and upcoming property raffles. Every draw is FCCPC-approved, escrow-protected, and independently witnessed." value={content.subheading ?? ''} onChange={(e) => setContent((p) => ({ ...p, subheading: e.target.value }))} />
        </Field>
      </SectionCard>
      <SectionCard title="Empty State (no campaigns found)">
        <Field label="Heading">
          <Input placeholder="No Campaigns Found" value={content.emptyStateHeading ?? ''} onChange={(e) => setContent((p) => ({ ...p, emptyStateHeading: e.target.value }))} />
        </Field>
        <Field label="Body text">
          <Textarea placeholder="There are no campaigns matching your filters right now." value={content.emptyStateBody ?? ''} onChange={(e) => setContent((p) => ({ ...p, emptyStateBody: e.target.value }))} />
        </Field>
      </SectionCard>
    </div>
  );
}

// ─── Trust & Compliance Panel ─────────────────────────────────────────────────

function TrustPanel({ badges: initial, settings: initialSettings, api }: { badges: TrustBadge[]; settings: SiteSettings; api: ReturnType<typeof useApi> }) {
  const [badges, setBadges] = useState(initial);
  const [editing, setEditing] = useState<Partial<TrustBadge> | null>(null);
  const [companyInfo, setCI] = useState(initialSettings.companyInfo ?? {});
  const [saving, setSaving] = useState(false);
  const [savingCI, setSavingCI] = useState(false);
  const [msg, setMsg] = useState('');

  const saveBadge = async () => {
    if (!editing) return;
    setSaving(true); setMsg('');
    try {
      if (editing.id) {
        const r = await api(`/trust-badges/${editing.id}`, 'PUT', editing) as { success: boolean; data: TrustBadge };
        setBadges((p) => p.map((b) => (b.id === editing.id ? (r.data as TrustBadge) : b)));
      } else {
        const r = await api('/trust-badges', 'POST', editing) as { success: boolean; data: TrustBadge };
        setBadges((p) => [...p, r.data as TrustBadge]);
      }
      setEditing(null); setMsg('Badge saved!');
    } catch (e) { setMsg(`Error: ${(e as Error).message}`); }
    setSaving(false);
  };

  const delBadge = async (id: string) => {
    try { await api(`/trust-badges/${id}`, 'DELETE'); setBadges((p) => p.filter((b) => b.id !== id)); }
    catch (e) { setMsg(`Error: ${(e as Error).message}`); }
  };

  const saveCI = async () => {
    setSavingCI(true); setMsg('');
    try { await api('/settings', 'PUT', { companyInfo }); setMsg('Company info saved!'); }
    catch (e) { setMsg(`Error: ${(e as Error).message}`); }
    setSavingCI(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Trust & Compliance</h2>
        <StatusMsg msg={msg} />
      </div>
      <SectionCard title="Trust Badges (shown on homepage trust bar)">
        <button type="button" className="btn btn-outline btn-sm" style={{ marginBottom: '0.75rem' }} onClick={() => setEditing({ text: '', iconClass: '', order: badges.length, enabled: true })}>+ Add Badge</button>
        {editing && (
          <div style={{ background: 'var(--bg)', border: '1px solid var(--green-100)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 70px', gap: '0.75rem', alignItems: 'end' }}>
              <Field label="Text"><Input value={editing.text ?? ''} onChange={(e) => setEditing((p) => ({ ...p!, text: e.target.value }))} /></Field>
              <Field label="FA Icon (e.g. fa-shield-halved)"><Input placeholder="fa-shield-halved" value={editing.iconClass ?? ''} onChange={(e) => setEditing((p) => ({ ...p!, iconClass: e.target.value }))} /></Field>
              <Field label="Order"><Input type="number" value={editing.order ?? 0} onChange={(e) => setEditing((p) => ({ ...p!, order: parseInt(e.target.value) }))} /></Field>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
              <input type="checkbox" checked={editing.enabled ?? true} onChange={(e) => setEditing((p) => ({ ...p!, enabled: e.target.checked }))} /> Enabled
            </label>
            <div style={{ display: 'flex', gap: '0.75rem' }}><SaveBtn saving={saving} onClick={saveBadge} /><button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(null)}>Cancel</button></div>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {badges.map((b) => (
            <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--bg)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)' }}>
              <span style={{ fontSize: '0.875rem' }}>
                <i className={`fa-solid ${b.iconClass}`} style={{ marginRight: '0.5rem', color: 'var(--green-primary)' }} />
                {b.text} {!b.enabled && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(off)</span>}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-outline btn-xs" onClick={() => setEditing(b)}>Edit</button>
                <DeleteBtn onConfirm={() => delBadge(b.id)} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Company Registration Info">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="CAC Number"><Input value={companyInfo.cacNumber ?? ''} onChange={(e) => setCI((p) => ({ ...p, cacNumber: e.target.value }))} /></Field>
          <Field label="FCCPC Reference"><Input value={companyInfo.fccpcRef ?? ''} onChange={(e) => setCI((p) => ({ ...p, fccpcRef: e.target.value }))} /></Field>
          <Field label="LSLGA Reference"><Input value={companyInfo.lslgaRef ?? ''} onChange={(e) => setCI((p) => ({ ...p, lslgaRef: e.target.value }))} /></Field>
          <Field label="SCUML Reference"><Input value={companyInfo.scumlRef ?? ''} onChange={(e) => setCI((p) => ({ ...p, scumlRef: e.target.value }))} /></Field>
          <Field label="Lawyer Name"><Input value={companyInfo.lawyerName ?? ''} onChange={(e) => setCI((p) => ({ ...p, lawyerName: e.target.value }))} /></Field>
          <Field label="Lawyer Firm"><Input value={companyInfo.lawyerFirm ?? ''} onChange={(e) => setCI((p) => ({ ...p, lawyerFirm: e.target.value }))} /></Field>
          <Field label="DPO Name"><Input value={companyInfo.dpoName ?? ''} onChange={(e) => setCI((p) => ({ ...p, dpoName: e.target.value }))} /></Field>
          <Field label="Privacy Email"><Input type="email" value={companyInfo.privacyEmail ?? ''} onChange={(e) => setCI((p) => ({ ...p, privacyEmail: e.target.value }))} /></Field>
        </div>
        <div style={{ marginTop: '0.75rem' }}><SaveBtn saving={savingCI} onClick={saveCI} /></div>
      </SectionCard>
    </div>
  );
}

// ─── How It Works Panel ───────────────────────────────────────────────────────

function HowItWorksPanel({ steps: initial, api }: { steps: HowItWorksStep[]; api: ReturnType<typeof useApi> }) {
  const [steps, setSteps] = useState(initial);
  const [editing, setEditing] = useState<Partial<HowItWorksStep> | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const save = async () => {
    if (!editing) return;
    setSaving(true); setMsg('');
    try {
      if (editing.id) {
        const r = await api(`/how-it-works/${editing.id}`, 'PUT', editing) as { success: boolean; data: HowItWorksStep };
        setSteps((p) => p.map((s) => (s.id === editing.id ? (r.data as HowItWorksStep) : s)));
      } else {
        const r = await api('/how-it-works', 'POST', editing) as { success: boolean; data: HowItWorksStep };
        setSteps((p) => [...p, r.data as HowItWorksStep]);
      }
      setEditing(null); setMsg('Saved!');
    } catch (e) { setMsg(`Error: ${(e as Error).message}`); }
    setSaving(false);
  };

  const del = async (id: string) => {
    try { await api(`/how-it-works/${id}`, 'DELETE'); setSteps((p) => p.filter((s) => s.id !== id)); }
    catch (e) { setMsg(`Error: ${(e as Error).message}`); }
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = steps.findIndex((s) => s.id === id);
    if (idx < 0 || idx + dir < 0 || idx + dir >= steps.length) return;
    const arr = [...steps];
    [arr[idx], arr[idx + dir]] = [arr[idx + dir]!, arr[idx]!];
    const ordered = arr.map((s, i) => ({ ...s, order: i }));
    setSteps(ordered);
    try { await api('/how-it-works/reorder', 'PATCH', ordered.map((s) => ({ id: s.id, order: s.order }))); }
    catch (e) { setMsg(`Error: ${(e as Error).message}`); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 800 }}>How It Works Steps</h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <StatusMsg msg={msg} />
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({ stepNumber: steps.length + 1, title: '', description: '', order: steps.length, published: true })}>+ Add Step</button>
        </div>
      </div>
      {editing && (
        <SectionCard title={editing.id ? 'Edit Step' : 'New Step'}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px', gap: '0.75rem' }}>
            <Field label="Step #"><Input type="number" value={editing.stepNumber ?? 1} onChange={(e) => setEditing((p) => ({ ...p!, stepNumber: parseInt(e.target.value) }))} /></Field>
            <Field label="Title"><Input value={editing.title ?? ''} onChange={(e) => setEditing((p) => ({ ...p!, title: e.target.value }))} /></Field>
            <Field label="Order"><Input type="number" value={editing.order ?? 0} onChange={(e) => setEditing((p) => ({ ...p!, order: parseInt(e.target.value) }))} /></Field>
          </div>
          <Field label="Description">
            <RichTextEditor key={editing.id ?? 'new'} value={editing.description ?? ''} onChange={(html) => setEditing((p) => ({ ...p!, description: html }))} placeholder="Describe this step…" minHeight={100} />
          </Field>
          <Field label="Icon (optional FA class)"><Input placeholder="fa-house" value={editing.icon ?? ''} onChange={(e) => setEditing((p) => ({ ...p!, icon: e.target.value || null }))} /></Field>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
            <input type="checkbox" checked={editing.published ?? true} onChange={(e) => setEditing((p) => ({ ...p!, published: e.target.checked }))} /> Published
          </label>
          <div style={{ display: 'flex', gap: '0.75rem' }}><SaveBtn saving={saving} onClick={save} /><button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(null)}>Cancel</button></div>
        </SectionCard>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {steps.map((s, idx) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--card-bg)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', padding: '0.875rem 1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <button type="button" className="btn btn-outline btn-xs" onClick={() => move(s.id, -1)} disabled={idx === 0}>↑</button>
              <button type="button" className="btn btn-outline btn-xs" onClick={() => move(s.id, 1)} disabled={idx === steps.length - 1}>↓</button>
            </div>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--green-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.875rem', flexShrink: 0 }}>{s.stepNumber}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.title}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{stripHtml(s.description).substring(0, 80)}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-outline btn-xs" onClick={() => setEditing(s)}>Edit</button>
              <DeleteBtn onConfirm={() => del(s.id)} />
            </div>
          </div>
        ))}
        {steps.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No steps yet. Add your first step to get started.</p>}
      </div>
    </div>
  );
}

// ─── About Page Panel ─────────────────────────────────────────────────────────

function AboutPanel({ settings: initialSettings, team: initialTeam, milestones: initialMilestones, api, token, apiUrl }: {
  settings: SiteSettings; team: TeamMember[]; milestones: CompanyMilestone[]; api: ReturnType<typeof useApi>; token: string; apiUrl: string;
}) {
  const [mission, setMission] = useState(initialSettings.aboutMission ?? { heading: '', paragraphs: [''] });
  const [values, setValues] = useState<Array<{ icon?: string; title?: string; body?: string }>>(initialSettings.aboutValues ?? []);
  const [team, setTeam] = useState(initialTeam);
  const [milestones, setMilestones] = useState(initialMilestones);
  const [editingMember, setEditingMember] = useState<Partial<TeamMember> | null>(null);
  const [editingMS, setEditingMS] = useState<Partial<CompanyMilestone> | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const saveMission = async () => {
    setSaving(true); setMsg('');
    try { await api('/settings', 'PUT', { aboutMission: mission, aboutValues: values }); setMsg('Saved!'); }
    catch (e) { setMsg(`Error: ${(e as Error).message}`); }
    setSaving(false);
  };

  const saveMember = async () => {
    if (!editingMember) return;
    setSaving(true); setMsg('');
    const payload = {
      ...editingMember,
      linkedinUrl: editingMember.linkedinUrl || null,
    };
    try {
      if (editingMember.id) {
        const r = await api(`/team/${editingMember.id}`, 'PUT', payload) as { success: boolean; data: TeamMember };
        setTeam((p) => p.map((m) => (m.id === editingMember.id ? (r.data as TeamMember) : m)));
      } else {
        const r = await api('/team', 'POST', payload) as { success: boolean; data: TeamMember };
        setTeam((p) => [...p, r.data as TeamMember]);
      }
      setEditingMember(null); setMsg('Member saved!');
    } catch (e) { setMsg(`Error: ${(e as Error).message}`); }
    setSaving(false);
  };

  const delMember = async (id: string) => {
    try { await api(`/team/${id}`, 'DELETE'); setTeam((p) => p.filter((m) => m.id !== id)); }
    catch (e) { setMsg(`Error: ${(e as Error).message}`); }
  };

  const saveMilestone = async () => {
    if (!editingMS) return;
    setSaving(true); setMsg('');
    try {
      if (editingMS.id) {
        const r = await api(`/milestones/${editingMS.id}`, 'PUT', editingMS) as { success: boolean; data: CompanyMilestone };
        setMilestones((p) => p.map((m) => (m.id === editingMS.id ? (r.data as CompanyMilestone) : m)));
      } else {
        const r = await api('/milestones', 'POST', editingMS) as { success: boolean; data: CompanyMilestone };
        setMilestones((p) => [...p, r.data as CompanyMilestone]);
      }
      setEditingMS(null); setMsg('Milestone saved!');
    } catch (e) { setMsg(`Error: ${(e as Error).message}`); }
    setSaving(false);
  };

  const delMilestone = async (id: string) => {
    try { await api(`/milestones/${id}`, 'DELETE'); setMilestones((p) => p.filter((m) => m.id !== id)); }
    catch (e) { setMsg(`Error: ${(e as Error).message}`); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 800 }}>About Page</h2>
        <StatusMsg msg={msg} />
      </div>

      <SectionCard title="Mission Section">
        <Field label="Heading"><Input value={mission.heading ?? ''} onChange={(e) => setMission((p) => ({ ...p, heading: e.target.value }))} /></Field>
        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Paragraphs</label>
        {(mission.paragraphs ?? []).map((para, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Textarea rows={2} style={{ flex: 1 }} value={para} onChange={(e) => setMission((p) => ({ ...p, paragraphs: (p.paragraphs ?? []).map((x, j) => j === i ? e.target.value : x) }))} />
            <button type="button" className="btn btn-danger btn-xs" onClick={() => setMission((p) => ({ ...p, paragraphs: (p.paragraphs ?? []).filter((_, j) => j !== i) }))}>×</button>
          </div>
        ))}
        <button type="button" className="btn btn-outline btn-xs" onClick={() => setMission((p) => ({ ...p, paragraphs: [...(p.paragraphs ?? []), ''] }))}>+ Paragraph</button>
        <div style={{ marginTop: '1rem' }}><SaveBtn saving={saving} onClick={saveMission} /></div>
      </SectionCard>

      <SectionCard title="Values (4 cards)">
        {values.map((v, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr auto', gap: '0.75rem', marginBottom: '0.5rem', alignItems: 'end' }}>
            <Field label={i === 0 ? 'FA Icon' : ''}><Input placeholder="fa-eye" value={v.icon ?? ''} onChange={(e) => setValues((p) => p.map((x, j) => j === i ? { ...x, icon: e.target.value } : x))} /></Field>
            <Field label={i === 0 ? 'Title' : ''}><Input value={v.title ?? ''} onChange={(e) => setValues((p) => p.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} /></Field>
            <Field label={i === 0 ? 'Body' : ''}><Input value={v.body ?? ''} onChange={(e) => setValues((p) => p.map((x, j) => j === i ? { ...x, body: e.target.value } : x))} /></Field>
            <button type="button" className="btn btn-danger btn-xs" style={{ marginBottom: '0.3rem' }} onClick={() => setValues((p) => p.filter((_, j) => j !== i))}>×</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
          <button type="button" className="btn btn-outline btn-xs" onClick={() => setValues((p) => [...p, { icon: '', title: '', body: '' }])}>+ Add</button>
          <SaveBtn saving={saving} onClick={saveMission} />
        </div>
      </SectionCard>

      <SectionCard title="Team Members">
        <button type="button" className="btn btn-primary btn-sm" style={{ marginBottom: '0.75rem' }} onClick={() => setEditingMember({ order: team.length, published: true })}>+ Add Member</button>
        {editingMember && (
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Field label="Name"><Input value={editingMember.name ?? ''} onChange={(e) => setEditingMember((p) => ({ ...p!, name: e.target.value }))} /></Field>
              <Field label="Title / Role"><Input value={editingMember.title ?? ''} onChange={(e) => setEditingMember((p) => ({ ...p!, title: e.target.value }))} /></Field>
              <Field label="Initials (2 chars)"><Input maxLength={2} value={editingMember.initials ?? ''} onChange={(e) => setEditingMember((p) => ({ ...p!, initials: e.target.value }))} /></Field>
              <Field label="Avatar Color (hex)"><Input placeholder="#0D5E30" value={editingMember.avatarColor ?? ''} onChange={(e) => setEditingMember((p) => ({ ...p!, avatarColor: e.target.value }))} /></Field>
              <Field label="LinkedIn URL"><Input value={editingMember.linkedinUrl ?? ''} onChange={(e) => setEditingMember((p) => ({ ...p!, linkedinUrl: e.target.value }))} /></Field>
              <Field label="Order"><Input type="number" value={editingMember.order ?? 0} onChange={(e) => setEditingMember((p) => ({ ...p!, order: parseInt(e.target.value) }))} /></Field>
            </div>
            <Field label="Bio"><Textarea rows={3} value={editingMember.bio ?? ''} onChange={(e) => setEditingMember((p) => ({ ...p!, bio: e.target.value }))} /></Field>
            <Field label="Profile Photo">
              <ContentImageUpload
                purpose="team_photo"
                entityId={editingMember.id ?? 'new'}
                currentKey={editingMember.photoKey}
                onUploaded={(key) => setEditingMember((p) => ({ ...p!, photoKey: key }))}
                token={token}
                apiUrl={apiUrl}
                label="Upload Photo"
                size="md"
              />
            </Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
              <input type="checkbox" checked={editingMember.published ?? true} onChange={(e) => setEditingMember((p) => ({ ...p!, published: e.target.checked }))} /> Published
            </label>
            <div style={{ display: 'flex', gap: '0.75rem' }}><SaveBtn saving={saving} onClick={saveMember} /><button type="button" className="btn btn-outline btn-sm" onClick={() => setEditingMember(null)}>Cancel</button></div>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {team.map((m, idx) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{m.name} · {m.title}</span>
                  {!m.published && <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-light)', borderRadius: 100, padding: '0.1rem 0.5rem' }}>Hidden</span>}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{stripHtml(m.bio).substring(0, 60)}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button type="button" className="btn btn-outline btn-xs" disabled={idx === 0} onClick={() => reorderItems(team, setTeam, idx, -1, '/team/reorder', api)}>↑</button>
                  <button type="button" className="btn btn-outline btn-xs" disabled={idx === team.length - 1} onClick={() => reorderItems(team, setTeam, idx, 1, '/team/reorder', api)}>↓</button>
                </div>
                <button type="button" className="btn btn-outline btn-xs" onClick={() => setEditingMember(m)}>Edit</button>
                <DeleteBtn onConfirm={() => delMember(m.id)} />
              </div>
            </div>
          ))}
          {team.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No team members yet.</p>}
        </div>
      </SectionCard>

      <SectionCard title="Company Milestones">
        <button type="button" className="btn btn-primary btn-sm" style={{ marginBottom: '0.75rem' }} onClick={() => setEditingMS({ order: milestones.length, published: true })}>+ Add Milestone</button>
        {editingMS && (
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
              <Field label="Year / Date"><Input placeholder="Q1 2024" value={editingMS.year ?? ''} onChange={(e) => setEditingMS((p) => ({ ...p!, year: e.target.value }))} /></Field>
              <Field label="Heading"><Input value={editingMS.heading ?? ''} onChange={(e) => setEditingMS((p) => ({ ...p!, heading: e.target.value }))} /></Field>
            </div>
            <Field label="Description"><Textarea rows={3} value={editingMS.description ?? ''} onChange={(e) => setEditingMS((p) => ({ ...p!, description: e.target.value }))} /></Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
              <input type="checkbox" checked={editingMS.published ?? true} onChange={(e) => setEditingMS((p) => ({ ...p!, published: e.target.checked }))} /> Published
            </label>
            <div style={{ display: 'flex', gap: '0.75rem' }}><SaveBtn saving={saving} onClick={saveMilestone} /><button type="button" className="btn btn-outline btn-sm" onClick={() => setEditingMS(null)}>Cancel</button></div>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {milestones.map((m, idx) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem' }}>
              <div><div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{m.year} — {m.heading}</div><div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{stripHtml(m.description).substring(0, 80)}</div></div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button type="button" className="btn btn-outline btn-xs" disabled={idx === 0} onClick={() => reorderItems(milestones, setMilestones, idx, -1, '/milestones/reorder', api)}>↑</button>
                  <button type="button" className="btn btn-outline btn-xs" disabled={idx === milestones.length - 1} onClick={() => reorderItems(milestones, setMilestones, idx, 1, '/milestones/reorder', api)}>↓</button>
                </div>
                <button type="button" className="btn btn-outline btn-xs" onClick={() => setEditingMS(m)}>Edit</button>
                <DeleteBtn onConfirm={() => delMilestone(m.id)} />
              </div>
            </div>
          ))}
          {milestones.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No milestones yet.</p>}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Footer & Navigation Panel ────────────────────────────────────────────────

function FooterPanel({ settings: initial, api }: { settings: SiteSettings; api: ReturnType<typeof useApi> }) {
  const [form, setForm] = useState({
    tiktokUrl: initial.tiktokUrl ?? '',
    linkedinUrl: initial.linkedinUrl ?? '',
    companyInfo: initial.companyInfo ?? {} as NonNullable<SiteSettings['companyInfo']>,
    blogTopics: (initial.blogTopics ?? []) as Array<{ icon?: string; label?: string }>,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const save = async () => {
    setSaving(true); setMsg('');
    try { await api('/settings', 'PUT', { tiktokUrl: form.tiktokUrl || null, linkedinUrl: form.linkedinUrl || null, companyInfo: form.companyInfo, blogTopics: form.blogTopics }); setMsg('Saved!'); }
    catch (e) { setMsg(`Error: ${(e as Error).message}`); }
    setSaving(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Footer & Navigation</h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}><StatusMsg msg={msg} /><SaveBtn saving={saving} onClick={save} /></div>
      </div>
      <SectionCard title="Additional Social Links">
        <Field label="TikTok URL"><Input placeholder="https://tiktok.com/@raffleprop" value={form.tiktokUrl} onChange={(e) => setForm((p) => ({ ...p, tiktokUrl: e.target.value }))} /></Field>
        <Field label="LinkedIn URL"><Input placeholder="https://linkedin.com/company/raffleprop" value={form.linkedinUrl} onChange={(e) => setForm((p) => ({ ...p, linkedinUrl: e.target.value }))} /></Field>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Twitter, Instagram, Facebook, YouTube, WhatsApp are in Site Settings.</p>
      </SectionCard>
      <SectionCard title="Footer Text">
        <Field label="Brand Description"><Textarea rows={3} value={form.companyInfo.brandDescription ?? ''} onChange={(e) => setForm((p) => ({ ...p, companyInfo: { ...p.companyInfo, brandDescription: e.target.value } }))} /></Field>
        <Field label="Payment Note"><Input value={form.companyInfo.paymentNote ?? ''} onChange={(e) => setForm((p) => ({ ...p, companyInfo: { ...p.companyInfo, paymentNote: e.target.value } }))} /></Field>
        <Field label="Copyright Text (use {year})"><Input placeholder="© {year} RaffleProp Ltd. All rights reserved." value={form.companyInfo.copyrightText ?? ''} onChange={(e) => setForm((p) => ({ ...p, companyInfo: { ...p.companyInfo, copyrightText: e.target.value } }))} /></Field>
      </SectionCard>
      <SectionCard title="Blog Topics">
        {form.blogTopics.map((t, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: '0.75rem', marginBottom: '0.5rem', alignItems: 'end' }}>
            <Field label={i === 0 ? 'FA Icon' : ''}><Input placeholder="fa-house" value={t.icon ?? ''} onChange={(e) => setForm((p) => ({ ...p, blogTopics: p.blogTopics.map((x, j) => j === i ? { ...x, icon: e.target.value } : x) }))} /></Field>
            <Field label={i === 0 ? 'Label' : ''}><Input value={t.label ?? ''} onChange={(e) => setForm((p) => ({ ...p, blogTopics: p.blogTopics.map((x, j) => j === i ? { ...x, label: e.target.value } : x) }))} /></Field>
            <button type="button" className="btn btn-danger btn-xs" style={{ marginBottom: '0.3rem' }} onClick={() => setForm((p) => ({ ...p, blogTopics: p.blogTopics.filter((_, j) => j !== i) }))}>×</button>
          </div>
        ))}
        <button type="button" className="btn btn-outline btn-xs" onClick={() => setForm((p) => ({ ...p, blogTopics: [...p.blogTopics, { icon: '', label: '' }] }))}>+ Add Topic</button>
      </SectionCard>
    </div>
  );
}

// ─── Blog Topics Panel ────────────────────────────────────────────────────────

const DEFAULT_TOPICS = [
  { icon: 'fa-house-chimney',     label: 'Lagos Property Market' },
  { icon: 'fa-map-location-dot',  label: 'Abuja Property Market' },
  { icon: 'fa-piggy-bank',        label: 'Property Investment Tips' },
  { icon: 'fa-building-columns',  label: 'Land Titles & Legal' },
  { icon: 'fa-file-contract',     label: 'Deed of Assignment' },
  { icon: 'fa-scale-balanced',    label: 'FCCPA & Consumer Rights' },
  { icon: 'fa-trophy',            label: 'Winner Stories' },
  { icon: 'fa-globe-africa',      label: 'Diaspora Property' },
  { icon: 'fa-building',          label: 'Off-Plan Buying Guide' },
  { icon: 'fa-landmark',          label: 'Property Finance & Mortgages' },
  { icon: 'fa-ticket',            label: 'How Raffles Work' },
  { icon: 'fa-city',              label: 'Port Harcourt Market' },
];

function BlogTopicsPanel({ settings: initial, api }: { settings: SiteSettings; api: ReturnType<typeof useApi> }) {
  const [topics, setTopics] = useState<Array<{ icon: string; label: string }>>(
    () => (initial.blogTopics ?? []).map((t) => ({ icon: t.icon ?? '', label: t.label ?? '' }))
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      await api('/settings', 'PUT', { blogTopics: topics.filter((t) => t.label.trim()) });
      setMsg('Topics saved!');
    } catch (e) { setMsg(`Error: ${(e as Error).message}`); }
    setSaving(false);
  };

  const seed = () => setTopics(DEFAULT_TOPICS.map((t) => ({ icon: t.icon, label: t.label })));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.25rem' }}>Blog Topics</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Topics appear on the blog page. Assign them to posts from the CMS Pages tab.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <StatusMsg msg={msg} />
          <SaveBtn saving={saving} onClick={save} />
        </div>
      </div>

      <SectionCard title="Manage Topics">
        <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="btn btn-outline btn-xs" onClick={() => setTopics((p) => [...p, { icon: 'fa-tag', label: '' }])}>+ Add Topic</button>
          {topics.length === 0 && (
            <button type="button" className="btn btn-outline btn-xs" onClick={seed}>Seed 12 Default Topics</button>
          )}
        </div>
        {topics.map((t, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '160px 1fr auto', gap: '0.75rem', marginBottom: '0.625rem', alignItems: 'end' }}>
            <Field label={i === 0 ? 'FA Icon class' : ''}>
              <div style={{ position: 'relative' }}>
                <Input placeholder="fa-house-chimney" value={t.icon} onChange={(e) => setTopics((p) => p.map((x, j) => j === i ? { ...x, icon: e.target.value } : x))} />
                {t.icon && <i className={`fa-solid ${t.icon}`} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--green-primary)', pointerEvents: 'none' }} />}
              </div>
            </Field>
            <Field label={i === 0 ? 'Topic label (used to tag posts)' : ''}>
              <Input placeholder="Lagos Property Market" value={t.label} onChange={(e) => setTopics((p) => p.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
            </Field>
            <button type="button" className="btn btn-danger btn-xs" style={{ marginBottom: '0.3rem' }} onClick={() => setTopics((p) => p.filter((_, j) => j !== i))}>×</button>
          </div>
        ))}
        {topics.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No topics yet. Add one above or seed the defaults.</p>
        )}
      </SectionCard>

      <SectionCard title="Preview">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {topics.filter((t) => t.label).map((t, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', background: 'var(--green-50)', border: '1px solid var(--green-100)', borderRadius: 100, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--green-primary)' }}>
              <i className={`fa-solid ${t.icon || 'fa-tag'}`} style={{ fontSize: '0.7rem' }} />
              {t.label}
            </span>
          ))}
          {topics.filter((t) => t.label).length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Save topics above to see the preview.</p>}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── CMS Pages Panel ──────────────────────────────────────────────────────────

const R2_PUBLIC_URL = process.env['NEXT_PUBLIC_R2_PUBLIC_URL'] ?? '';

function PagesPanel({ settings, api, token, apiUrl }: { settings: SiteSettings; api: ReturnType<typeof useApi>; token: string; apiUrl: string }) {
  const [pages, setPages] = useState<ContentPage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<Partial<ContentPage> | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const availableTopics = (settings.blogTopics ?? []).map((t) => t.label ?? '').filter(Boolean);

  const imageUploadHandler = useCallback(async (file: File): Promise<string> => {
    const entityId = editing?.id ?? 'new';
    const presignRes = await fetch(`${apiUrl}/api/admin/storage/presign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ purpose: 'content_media', entityId, mimeType: file.type }),
    });
    if (!presignRes.ok) {
      const err = (await presignRes.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? `Presign failed (${presignRes.status})`);
    }
    const { data: { uploadUrl, key } } = (await presignRes.json()) as { data: { uploadUrl: string; key: string } };
    const uploadRes = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
    if (!uploadRes.ok) throw new Error(`Upload failed (${uploadRes.status})`);
    return `${R2_PUBLIC_URL}/${key}`;
  }, [apiUrl, token, editing?.id]);

  const load = useCallback(async () => {
    try { const r = await api('/pages') as { success: boolean; data: ContentPage[] }; setPages(r.data as ContentPage[]); setLoaded(true); }
    catch (e) { setMsg(`Error: ${(e as Error).message}`); }
  }, [api]);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!editing) return;
    setSaving(true); setMsg('');
    const payload = {
      slug: editing.slug,
      title: editing.title,
      content: typeof editing.content === 'string' ? editing.content : '',
      topic: editing.topic || null,
      metaTitle: editing.metaTitle || null,
      metaDesc: editing.metaDesc || null,
      status: editing.status ?? 'DRAFT',
    };
    try {
      if (editing.id) {
        const r = await api(`/pages/${editing.id}`, 'PUT', payload) as { success: boolean; data: ContentPage };
        setPages((p) => p.map((x) => (x.id === editing.id ? (r.data as ContentPage) : x)));
      } else {
        const r = await api('/pages', 'POST', payload) as { success: boolean; data: ContentPage };
        setPages((p) => [...p, r.data as ContentPage]);
      }
      setEditing(null); setMsg('Saved!');
    } catch (e) { setMsg(`Error: ${(e as Error).message}`); }
    setSaving(false);
  };

  const del = async (id: string) => {
    try { await api(`/pages/${id}`, 'DELETE'); setPages((p) => p.filter((x) => x.id !== id)); }
    catch (e) { setMsg(`Error: ${(e as Error).message}`); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 800 }}>CMS Pages</h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <StatusMsg msg={msg} />
          {!loaded && <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Loading…</span>}
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({ slug: '', title: '', content: '', status: 'DRAFT' })}>+ New Page</button>
        </div>
      </div>
      {editing && (
        <SectionCard title={editing.id ? 'Edit Page' : 'New Page'}>
          <Field label="Slug (URL path)"><Input placeholder="about-us" value={editing.slug ?? ''} onChange={(e) => setEditing((p) => ({ ...p!, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} /></Field>
          <Field label="Title"><Input value={editing.title ?? ''} onChange={(e) => setEditing((p) => ({ ...p!, title: e.target.value }))} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <Field label="Meta Title"><Input value={editing.metaTitle ?? ''} onChange={(e) => setEditing((p) => ({ ...p!, metaTitle: e.target.value }))} /></Field>
            <Field label="Topic">
              <select className="admin-input" value={editing.topic ?? ''} onChange={(e) => setEditing((p) => ({ ...p!, topic: e.target.value || null }))}>
                <option value="">— No topic —</option>
                {availableTopics.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className="admin-input" value={editing.status ?? 'DRAFT'} onChange={(e) => setEditing((p) => ({ ...p!, status: e.target.value as 'DRAFT' | 'PUBLISHED' }))}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </Field>
          </div>
          <Field label="Meta Description"><Textarea rows={2} value={editing.metaDesc ?? ''} onChange={(e) => setEditing((p) => ({ ...p!, metaDesc: e.target.value }))} /></Field>
          <Field label="Content">
            <RichTextEditor
              key={editing.id ?? 'new'}
              value={typeof editing.content === 'string' ? editing.content : ''}
              onChange={(html) => setEditing((p) => ({ ...p!, content: html }))}
              placeholder="Write blog post content…"
              minHeight={320}
              imageUploadHandler={imageUploadHandler}
            />
          </Field>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}><SaveBtn saving={saving} onClick={save} /><button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(null)}>Cancel</button></div>
        </SectionCard>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {pages.map((p) => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', padding: '0.875rem 1rem' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.title} <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>/{p.slug}</span></div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                <span style={{ padding: '0.125rem 0.5rem', borderRadius: 100, fontSize: '0.75rem', background: p.status === 'PUBLISHED' ? 'var(--green-50)' : 'var(--bg)', border: '1px solid', borderColor: p.status === 'PUBLISHED' ? 'var(--green-100)' : 'var(--border-light)', color: p.status === 'PUBLISHED' ? 'var(--green-primary)' : 'var(--text-muted)' }}>{p.status}</span>
                {p.topic && <span style={{ padding: '0.125rem 0.5rem', borderRadius: 100, fontSize: '0.75rem', background: '#ede9fe', color: '#6d28d9', border: '1px solid #ddd6fe' }}>{p.topic}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-outline btn-xs" onClick={() => setEditing({ ...p, content: typeof p.content === 'string' ? p.content : '' })}>Edit</button>
              <DeleteBtn onConfirm={() => del(p.id)} />
            </div>
          </div>
        ))}
        {pages.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No pages yet.</p>}
      </div>
    </div>
  );
}

// ─── Document Vault Panel ─────────────────────────────────────────────────────

const VAULT_SLOTS = [
  { slot: 'cac_cert',           label: 'CAC Certificate' },
  { slot: 'fccpc_approval',     label: 'FCCPC Approval Certificate' },
  { slot: 'terms',              label: 'Terms & Conditions' },
  { slot: 'privacy',            label: 'Privacy Policy' },
  { slot: 'deed_template',      label: 'Deed of Assignment Template' },
  { slot: 'escrow_confirm',     label: 'Escrow Confirmation Letter' },
  { slot: 'valuation_guide',    label: 'Property Valuation Guidelines' },
  { slot: 'draw_cert_template', label: 'Draw Certificate Template' },
  { slot: 'co_sample',          label: 'Certificate of Occupancy (sample)' },
  { slot: 'survey_sample',      label: 'Survey Plan (sample)' },
];

type VaultEntry = { slot: string; label: string; url?: string | null; r2Key?: string | null };

function DocumentVaultPanel({ settings: initial, api, token, apiUrl }: { settings: SiteSettings; api: ReturnType<typeof useApi>; token: string; apiUrl: string }) {
  const [vault, setVault] = useState<VaultEntry[]>(() =>
    VAULT_SLOTS.map((s) => {
      const existing = (initial.documentVault ?? []).find((e) => e.slot === s.slot);
      return { slot: s.slot, label: s.label, url: existing?.url ?? null, r2Key: existing?.r2Key ?? null };
    })
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const setEntry = (slot: string, patch: Partial<VaultEntry>) =>
    setVault((p) => p.map((e) => e.slot === slot ? { ...e, ...patch } : e));

  const isValidUrl = (s: string | null | undefined): boolean => {
    if (!s) return false;
    try { new URL(s); return true; } catch { return false; }
  };

  const save = async () => {
    setSaving(true); setMsg('');
    const sanitized = vault.map((e) => ({
      ...e,
      url: isValidUrl(e.url) ? e.url : null,
    }));
    try {
      await api('/settings', 'PUT', { documentVault: sanitized });
      setMsg('Saved!');
    } catch (e) { setMsg(`Error: ${(e as Error).message}`); }
    setSaving(false);
  };

  const R2_PUBLIC = process.env['NEXT_PUBLIC_R2_PUBLIC_URL'] ?? '';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Document Vault</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Site-wide regulatory documents. Upload to R2 or link an external URL.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}><StatusMsg msg={msg} /><SaveBtn saving={saving} onClick={save} /></div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {vault.map((entry) => (
          <div key={entry.slot} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: '0.875rem', flex: '1 1 200px' }}>{entry.label}</span>
              {entry.r2Key && (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'var(--green-50)', color: 'var(--green-primary)', border: '1px solid var(--green-100)', borderRadius: 100, padding: '0.1rem 0.5rem' }}>
                  <i className="fa-solid fa-file-arrow-up" style={{ marginRight: '0.25rem' }} />R2 Upload
                </span>
              )}
              {entry.url && (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)', borderRadius: 100, padding: '0.1rem 0.5rem' }}>
                  <i className="fa-solid fa-link" style={{ marginRight: '0.25rem' }} />External URL
                </span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'end' }}>
              <Field label="External URL (optional)">
                <Input
                  placeholder="https://raffleprop.com/docs/..."
                  value={entry.url ?? ''}
                  onChange={(e) => setEntry(entry.slot, { url: e.target.value || null })}
                />
              </Field>
              <div>
                <ContentImageUpload
                  purpose="content_media"
                  entityId={`vault-${entry.slot}`}
                  currentKey={entry.r2Key}
                  onUploaded={(key) => setEntry(entry.slot, { r2Key: key })}
                  token={token}
                  apiUrl={apiUrl}
                  label="Upload Document"
                  size="sm"
                  accept="image/*,application/pdf,.pdf,.doc,.docx"
                  allowAnyFile
                />
              </div>
            </div>
            {(entry.r2Key || entry.url) && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {entry.r2Key && <span>R2: <a href={`${R2_PUBLIC}/${entry.r2Key}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--green-primary)' }}>View file</a></span>}
                {entry.r2Key && entry.url && <span style={{ margin: '0 0.5rem' }}>·</span>}
                {entry.url && <span>URL: <a href={entry.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--green-primary)' }}>{entry.url.substring(0, 60)}</a></span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Comments Panel ───────────────────────────────────────────────────────────

interface BlogComment {
  id: string;
  pageSlug: string;
  body: string;
  approved: boolean;
  createdAt: string;
  parentId: string | null;
  user: { id: string; fullName: string; email: string };
}

function CommentsPanel({ api }: { api: ReturnType<typeof useApi> }) {
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [slugFilter, setSlugFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'hidden'>('all');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = slugFilter ? `?slug=${encodeURIComponent(slugFilter)}` : '';
      const res = await api(`/comments${qs}`) as { success: boolean; data: BlogComment[] };
      setComments(res.data ?? []);
    } catch (e) {
      setMsg(`Error: ${(e as Error).message}`);
    }
    setLoading(false);
  }, [api, slugFilter]);

  useEffect(() => { void load(); }, [load]);

  async function toggleApprove(c: BlogComment) {
    setMsg('');
    try {
      await api(`/comments/${c.id}`, 'PATCH', { approved: !c.approved });
      setComments((prev) => prev.map((x) => x.id === c.id ? { ...x, approved: !c.approved } : x));
      setMsg(c.approved ? 'Comment hidden.' : 'Comment approved.');
    } catch (e) { setMsg(`Error: ${(e as Error).message}`); }
    setTimeout(() => setMsg(''), 3000);
  }

  async function deleteComment(id: string) {
    setMsg('');
    try {
      await api(`/comments/${id}`, 'DELETE');
      setComments((prev) => prev.filter((x) => x.id !== id));
      setMsg('Deleted.');
    } catch (e) { setMsg(`Error: ${(e as Error).message}`); }
    setTimeout(() => setMsg(''), 3000);
  }

  const filtered = comments.filter((c) => {
    if (statusFilter === 'approved') return c.approved;
    if (statusFilter === 'hidden') return !c.approved;
    return true;
  });

  const approvedCount = comments.filter((c) => c.approved).length;
  const hiddenCount = comments.filter((c) => !c.approved).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Blog Comments</h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <StatusMsg msg={msg} />
          <button type="button" className="btn btn-outline btn-sm" onClick={() => void load()}>
            <i className="fa-solid fa-rotate-right" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Total', value: comments.length, color: 'var(--text-primary)', icon: 'fa-comments' },
          { label: 'Approved', value: approvedCount, color: '#16a34a', icon: 'fa-circle-check' },
          { label: 'Hidden', value: hiddenCount, color: '#ca8a04', icon: 'fa-eye-slash' },
        ].map((s) => (
          <div key={s.label} className="admin-card" style={{ padding: '0.875rem', textAlign: 'center' }}>
            <i className={`fa-solid ${s.icon}`} style={{ color: s.color, marginBottom: '0.25rem', display: 'block' }} />
            <div style={{ fontSize: '1.375rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input
          className="admin-input"
          placeholder="Filter by blog slug..."
          value={slugFilter}
          onChange={(e) => setSlugFilter(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select
          className="admin-input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'approved' | 'hidden')}
          style={{ width: 'auto' }}
        >
          <option value="all">All Status</option>
          <option value="approved">Approved</option>
          <option value="hidden">Hidden</option>
        </select>
        {slugFilter && (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setSlugFilter('')}>Clear</button>
        )}
      </div>

      {/* Comment list */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block' }} />
            Loading comments…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fa-regular fa-comments" style={{ fontSize: '2rem', marginBottom: '0.75rem', display: 'block', opacity: 0.4 }} />
            <p style={{ margin: 0 }}>{comments.length === 0 ? 'No comments yet.' : 'No comments match your filter.'}</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8375rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}>
                {['Author', 'Post', 'Comment', 'Type', 'Status', 'Date', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '0.625rem 0.875rem', textAlign: 'left', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-light)', background: c.approved ? 'transparent' : 'rgba(250,204,21,0.05)' }}>
                  <td style={{ padding: '0.75rem 0.875rem', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.user.fullName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.user.email}</div>
                  </td>
                  <td style={{ padding: '0.75rem 0.875rem', verticalAlign: 'top', maxWidth: 140 }}>
                    <span style={{ fontSize: '0.775rem', color: 'var(--green-primary)', fontFamily: 'monospace', wordBreak: 'break-all' }}>{c.pageSlug}</span>
                  </td>
                  <td style={{ padding: '0.75rem 0.875rem', verticalAlign: 'top', maxWidth: 300 }}>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {c.body}
                    </p>
                  </td>
                  <td style={{ padding: '0.75rem 0.875rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: 99, background: c.parentId ? '#ede9fe' : '#dbeafe', color: c.parentId ? '#7c3aed' : '#2563eb', fontWeight: 600 }}>
                      {c.parentId ? 'Reply' : 'Comment'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.875rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: 99, background: c.approved ? '#dcfce7' : '#fef9c3', color: c.approved ? '#16a34a' : '#ca8a04', fontWeight: 700 }}>
                      {c.approved ? 'Approved' : 'Hidden'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.875rem', verticalAlign: 'top', whiteSpace: 'nowrap', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                    {new Date(c.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '0.75rem 0.875rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button
                        type="button"
                        className={`btn btn-xs ${c.approved ? 'btn-outline' : 'btn-primary'}`}
                        onClick={() => void toggleApprove(c)}
                        title={c.approved ? 'Hide comment' : 'Approve comment'}
                      >
                        <i className={`fa-solid ${c.approved ? 'fa-eye-slash' : 'fa-check'}`} />
                        {c.approved ? ' Hide' : ' Approve'}
                      </button>
                      <DeleteBtn onConfirm={() => void deleteComment(c.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Showing {filtered.length} of {comments.length} comment{comments.length !== 1 ? 's' : ''}.
        Hidden comments are not visible to the public.
      </p>
    </div>
  );
}

// ─── Sidebar Nav ──────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: Tab; label: string; icon: string }[] = [
  { id: 'settings',     label: 'Site Settings',      icon: 'fa-gear' },
  { id: 'pages',        label: 'CMS Pages',           icon: 'fa-file-lines' },
  { id: 'topics',       label: 'Blog Topics',         icon: 'fa-tags' },
  { id: 'homepage',     label: 'Homepage',            icon: 'fa-house' },
  { id: 'campaigns',    label: 'Campaigns Page',      icon: 'fa-ticket' },
  { id: 'trust',        label: 'Trust & Compliance',  icon: 'fa-shield-halved' },
  { id: 'how-it-works', label: 'How It Works',        icon: 'fa-list-ol' },
  { id: 'faqs',         label: 'FAQs',                icon: 'fa-circle-question' },
  { id: 'testimonials', label: 'Testimonials',        icon: 'fa-star' },
  { id: 'winners',      label: 'Winner Stories',      icon: 'fa-trophy' },
  { id: 'about',        label: 'About Page',          icon: 'fa-people-group' },
  { id: 'footer',       label: 'Footer & Nav',        icon: 'fa-newspaper' },
  { id: 'vault',        label: 'Document Vault',      icon: 'fa-folder-open' },
  { id: 'comments',    label: 'Blog Comments',       icon: 'fa-comments' },
];

// ─── Root ─────────────────────────────────────────────────────────────────────

export function ContentManager({
  initialSettings, initialFaqs, initialTestimonials, initialWinners,
  initialTrustBadges, initialHowItWorks, initialTeam, initialMilestones,
  token, apiUrl,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('settings');
  const [exportState, setExportState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const api = useApi(apiUrl, token);

  return (
    <div style={{ display: 'flex', gap: 0, minHeight: '80vh' }}>
      {/* Sidebar */}
      <nav style={{ width: 200, flexShrink: 0, borderRight: '1px solid var(--border-light)', paddingTop: '0.25rem', paddingRight: '0.75rem', position: 'sticky', top: 80, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1 }}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem', width: '100%',
                padding: '0.575rem 0.75rem', borderRadius: 'var(--radius)', border: 'none', cursor: 'pointer',
                fontSize: '0.8125rem', fontWeight: activeTab === item.id ? 700 : 500, textAlign: 'left',
                background: activeTab === item.id ? 'var(--green-50)' : 'transparent',
                color: activeTab === item.id ? 'var(--green-primary)' : 'var(--text-secondary)',
                marginBottom: '0.125rem',
              }}
            >
              <i className={`fa-solid ${item.icon}`} style={{ width: 16, textAlign: 'center', flexShrink: 0, fontSize: '0.8125rem' }} />
              {item.label}
            </button>
          ))}
        </div>
        {/* Export backup button */}
        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            disabled={exportState === 'busy'}
            onClick={async () => {
              setExportState('busy');
              try {
                const res = await fetch(`${apiUrl}/api/admin/content/export`, { headers: { Authorization: `Bearer ${token}` } });
                if (!res.ok) throw new Error(`Export failed (${res.status})`);
                const json = await res.json() as unknown;
                const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `cms-backup-${new Date().toISOString().slice(0, 10)}.json`;
                a.click(); URL.revokeObjectURL(url);
                setExportState('done');
                setTimeout(() => setExportState('idle'), 3000);
              } catch { setExportState('error'); setTimeout(() => setExportState('idle'), 4000); }
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
              padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)', border: 'none',
              cursor: exportState === 'busy' ? 'wait' : 'pointer',
              fontSize: '0.75rem', fontWeight: 500,
              color: exportState === 'error' ? '#dc2626' : exportState === 'done' ? 'var(--green-primary)' : 'var(--text-muted)',
              background: 'transparent', opacity: exportState === 'busy' ? 0.6 : 1,
            }}
          >
            <i className={`fa-solid ${exportState === 'busy' ? 'fa-circle-notch fa-spin' : exportState === 'done' ? 'fa-check' : exportState === 'error' ? 'fa-circle-exclamation' : 'fa-download'}`} style={{ fontSize: '0.75rem' }} />
            {exportState === 'busy' ? 'Exporting…' : exportState === 'done' ? 'Downloaded!' : exportState === 'error' ? 'Export failed' : 'Export Backup'}
          </button>
        </div>
      </nav>

      {/* Panel */}
      <div style={{ flex: 1, minWidth: 0, paddingLeft: '2rem', paddingTop: '0.25rem' }}>
        {activeTab === 'settings'     && <SettingsPanel settings={initialSettings} api={api} />}
        {activeTab === 'homepage'     && <HomepagePanel settings={initialSettings} api={api} />}
        {activeTab === 'campaigns'    && <CampaignsPanel settings={initialSettings} api={api} />}
        {activeTab === 'trust'        && <TrustPanel badges={initialTrustBadges} settings={initialSettings} api={api} />}
        {activeTab === 'how-it-works' && <HowItWorksPanel steps={initialHowItWorks} api={api} />}
        {activeTab === 'faqs'         && <FaqsPanel faqs={initialFaqs} api={api} />}
        {activeTab === 'testimonials' && <TestimonialsPanel testimonials={initialTestimonials} api={api} token={token} apiUrl={apiUrl} />}
        {activeTab === 'winners'      && <WinnersPanel winners={initialWinners} api={api} token={token} apiUrl={apiUrl} />}
        {activeTab === 'about'        && <AboutPanel settings={initialSettings} team={initialTeam} milestones={initialMilestones} api={api} token={token} apiUrl={apiUrl} />}
        {activeTab === 'footer'       && <FooterPanel settings={initialSettings} api={api} />}
        {activeTab === 'vault'        && <DocumentVaultPanel settings={initialSettings} api={api} token={token} apiUrl={apiUrl} />}
        {activeTab === 'pages'        && <PagesPanel settings={initialSettings} api={api} token={token} apiUrl={apiUrl} />}
        {activeTab === 'topics'       && <BlogTopicsPanel settings={initialSettings} api={api} />}
        {activeTab === 'comments'     && <CommentsPanel api={api} />}
      </div>
    </div>
  );
}
