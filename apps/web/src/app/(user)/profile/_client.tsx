'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/session-client';

type FullProfile = {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  kycStatus: 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
  phoneVerified: boolean;
  emailVerified: boolean;
  referralCode: string;
  createdAt: string;
};

const KYC_STATUS_STYLES = {
  PENDING:   { bg: '#fef9c3', color: '#ca8a04', icon: 'fa-clock',        label: 'KYC Pending' },
  SUBMITTED: { bg: '#dbeafe', color: '#2563eb', icon: 'fa-hourglass-half', label: 'KYC Under Review' },
  VERIFIED:  { bg: '#dcfce7', color: '#16a34a', icon: 'fa-circle-check', label: 'KYC Verified' },
  REJECTED:  { bg: '#fee2e2', color: '#dc2626', icon: 'fa-circle-xmark', label: 'KYC Rejected' },
};

export default function ProfilePage() {
  const { user } = useSession();
  const [tab, setTab] = useState<'info' | 'kyc' | 'security'>('info');
  const [profile, setProfile] = useState<FullProfile | null>(null);

  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((j: { success: boolean; data: FullProfile }) => { if (j.success) setProfile(j.data); })
      .catch(() => null);
  }, []);

  const displayName = profile?.fullName ?? user?.fullName ?? '';
  const email = profile?.email ?? user?.email ?? '';
  const initials = displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'U';
  const kycStatus = profile?.kycStatus ?? 'PENDING';
  const kycStyle = KYC_STATUS_STYLES[kycStatus];

  const kycChecklist = [
    { label: 'Name provided', done: !!displayName },
    { label: 'Email address', done: profile?.emailVerified ?? !!email },
    { label: 'Phone number', done: profile?.phoneVerified ?? false },
    { label: 'BVN (required for winners)', done: kycStatus === 'SUBMITTED' || kycStatus === 'VERIFIED' },
    { label: 'Government ID', done: kycStatus === 'VERIFIED' },
  ];

  return (
    <>
      {/* Mobile header */}
      <div className="portal-mobile-header">
        <div className="portal-mobile-header-avatar">{initials}</div>
        <div>
          <div className="portal-mobile-header-name">{displayName || 'Profile'}</div>
          <div className="portal-mobile-header-email">{email}</div>
        </div>
        <Link href="/campaigns" className="btn btn-gold btn-sm" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          <i className="fa-solid fa-ticket" /> Buy
        </Link>
      </div>

      {/* Page header */}
      <h1 style={{ fontSize: '1.625rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
        Profile &amp; KYC
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
        Keep your profile up to date. KYC is required when you win a property draw.
      </p>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.6fr)', gap: '1.5rem', alignItems: 'start' }}
           id="profile-grid">

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Avatar card */}
          <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,var(--green-primary),var(--green-light))', color: '#fff', fontSize: '2rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              {initials}
            </div>
            <div style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: '0.2rem' }}>{displayName || '—'}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{email}</div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.3rem 0.875rem', borderRadius: 99, background: kycStyle.bg, color: kycStyle.color, fontSize: '0.8rem', fontWeight: 700 }}>
              <i className={`fa-solid ${kycStyle.icon}`} />
              {kycStyle.label}
            </span>
          </div>

          {/* KYC checklist */}
          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>KYC Verification Status</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {kycChecklist.map((item) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', color: item.done ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  <i className={item.done ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark'} style={{ color: item.done ? 'var(--green-primary)' : 'var(--border)' }} />
                  {item.label}
                </div>
              ))}
            </div>
            <div style={{ padding: '0.875rem 1.25rem', background: '#fffbeb', borderTop: '1px solid #fde68a', fontSize: '0.8125rem', color: '#92400e', borderRadius: '0 0 14px 14px' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '0.4rem' }} />
              BVN and ID are only required if you win. You can enter draws without completing KYC.
            </div>
          </div>

          {/* Privacy & Account quick actions */}
          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                <i className="fa-solid fa-lock" style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }} />
                Privacy &amp; Account
              </span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <Link href="/ndpr" className="btn btn-outline btn-sm" style={{ justifyContent: 'flex-start' }}>
                <i className="fa-solid fa-download" /> Download My Data (NDPR)
              </Link>
              <Link href="/terms-log" className="btn btn-sm" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)', justifyContent: 'flex-start' }}>
                <i className="fa-solid fa-file-contract" /> View T&amp;C Acceptance Log
              </Link>
              <Link href="/ndpr" className="btn btn-sm" style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', justifyContent: 'flex-start' }}>
                <i className="fa-solid fa-trash" /> Delete Account
              </Link>
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div>
          {/* Tab nav */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)', marginBottom: '1.25rem' }}>
            {([
              { key: 'info', label: 'Personal Info', icon: 'fa-user' },
              { key: 'kyc', label: 'KYC', icon: 'fa-id-card' },
              { key: 'security', label: 'Security', icon: 'fa-lock' },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.75rem 1.1rem', fontWeight: 600, fontSize: '0.875rem',
                  color: tab === t.key ? 'var(--green-primary)' : 'var(--text-muted)',
                  borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                  borderBottom: tab === t.key ? '2px solid var(--green-primary)' : '2px solid transparent',
                  marginBottom: '-2px', background: 'none', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <i className={`fa-solid ${t.icon}`} style={{ fontSize: '0.8rem' }} />
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'info' && <PersonalInfoTab profile={profile} />}
          {tab === 'kyc' && <KycTab kycStatus={kycStatus} />}
          {tab === 'security' && <SecurityTab />}
        </div>
      </div>

      {/* Collapse grid on mobile */}
      <style>{`
        @media (max-width: 768px) {
          #profile-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}

/* ─── Personal Info Tab ────────────────────────────────────────────────────── */
function PersonalInfoTab({ profile }: { profile: FullProfile | null }) {
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (profile?.fullName) setFullName(profile.fullName);
  }, [profile?.fullName]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName }),
      });
      setMsg({ text: res.ok ? 'Profile updated successfully.' : 'Update failed. Please try again.', ok: res.ok });
    } catch { setMsg({ text: 'Network error.', ok: false }); }
    finally { setSaving(false); }
  }

  return (
    <div className="card">
      <div className="card-header">
        <span style={{ fontWeight: 700, fontSize: '1rem' }}>
          <i className="fa-solid fa-user" style={{ color: 'var(--green-primary)', marginRight: '0.5rem' }} />
          Personal Information
        </span>
      </div>
      <div className="card-body">
        {msg && (
          <div style={{ padding: '0.75rem 1rem', background: msg.ok ? '#dcfce7' : '#fee2e2', borderRadius: 'var(--radius)', marginBottom: '1.25rem', fontSize: '0.875rem', color: msg.ok ? '#166534' : '#b91c1c', fontWeight: 600 }}>
            <i className={`fa-solid ${msg.ok ? 'fa-circle-check' : 'fa-circle-xmark'}`} style={{ marginRight: '0.5rem' }} />
            {msg.text}
          </div>
        )}
        <form onSubmit={save}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="pf-firstname" className="form-label">First Name</label>
              <input
                id="pf-firstname"
                type="text"
                className="form-input"
                value={fullName.split(' ')[0] ?? ''}
                onChange={(e) => setFullName(`${e.target.value} ${fullName.split(' ').slice(1).join(' ')}`.trim())}
                autoComplete="given-name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="pf-lastname" className="form-label">Last Name</label>
              <input
                id="pf-lastname"
                type="text"
                className="form-input"
                value={fullName.split(' ').slice(1).join(' ')}
                onChange={(e) => setFullName(`${fullName.split(' ')[0] ?? ''} ${e.target.value}`.trim())}
                autoComplete="family-name"
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="pf-email" className="form-label">Email Address</label>
            <input id="pf-email" type="email" className="form-input" value={profile?.email ?? ''} disabled aria-disabled="true" style={{ opacity: 0.6 }} />
            <p className="form-hint">Email cannot be changed. Contact support if needed.</p>
          </div>
          <div className="form-group">
            <label htmlFor="pf-phone" className="form-label">Phone Number</label>
            <input id="pf-phone" type="tel" className="form-input" value={profile?.phone ?? ''} disabled aria-disabled="true" style={{ opacity: 0.6 }} />
            <p className="form-hint">Phone number is verified and cannot be changed here.</p>
          </div>
          {profile?.referralCode && (
            <div className="form-group">
              <label className="form-label">Referral Code</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--green-50)', border: '1px solid var(--green-100)', fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', color: 'var(--green-primary)', letterSpacing: '0.05em' }}>
                {profile.referralCode}
              </div>
              <p className="form-hint">Share this code to earn ticket credits. <Link href="/referrals" style={{ color: 'var(--green-primary)' }}>View Referral Programme →</Link></p>
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Saving…</> : <><i className="fa-solid fa-save" /> Save Changes</>}
          </button>
        </form>
      </div>
    </div>
  );
}

const KYC_ID_TYPE_MAP: Record<string, string> = {
  'National ID Card (NIN slip)': 'NIN_SLIP',
  'International Passport': 'PASSPORT',
  "Driver's Licence": 'DRIVERS_LICENCE',
  "Voter's Card (PVC)": 'VOTERS_CARD',
};

/* ─── KYC Tab ──────────────────────────────────────────────────────────────── */
function KycTab({ kycStatus }: { kycStatus: string }) {
  const [bvn, setBvn] = useState('');
  const [nin, setNin] = useState('');
  const [idType, setIdType] = useState('');
  const [documentKey, setDocumentKey] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadedName, setUploadedName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);
    try {
      const mimeType = file.type || 'application/octet-stream';
      const urlRes = await fetch(`/api/users/me/kyc-upload-url?mimeType=${encodeURIComponent(mimeType)}`);
      const urlData = await urlRes.json() as { success: boolean; data?: { uploadUrl: string; documentKey: string }; error?: string };
      if (!urlData.success || !urlData.data) { setMsg({ text: urlData.error ?? 'Could not get upload URL.', ok: false }); return; }
      const { uploadUrl, documentKey: key } = urlData.data;
      const putRes = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': mimeType } });
      if (!putRes.ok) { setMsg({ text: 'Upload failed. Please try again.', ok: false }); return; }
      setDocumentKey(key);
      setUploadedName(file.name);
    } catch { setMsg({ text: 'Upload failed. Please try again.', ok: false }); }
    finally { setUploading(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!documentKey) { setMsg({ text: 'Please upload your ID document first.', ok: false }); return; }
    const idTypeEnum = KYC_ID_TYPE_MAP[idType];
    if (!idTypeEnum) { setMsg({ text: 'Please select your ID document type.', ok: false }); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/users/me/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bvn, nin, idType: idTypeEnum, documentKey }),
      });
      const data = await res.json() as { success: boolean; error?: string };
      setMsg({ text: data.success ? 'KYC information submitted for review. We will notify you within 3–5 business days.' : (data.error ?? 'Submission failed.'), ok: data.success });
    } catch { setMsg({ text: 'Network error.', ok: false }); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="card">
      <div className="card-header">
        <span style={{ fontWeight: 700, fontSize: '1rem' }}>
          <i className="fa-solid fa-id-card" style={{ color: 'var(--green-primary)', marginRight: '0.5rem' }} />
          KYC Information{' '}
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>(required for winners only)</span>
        </span>
      </div>
      <div className="card-body">
        {kycStatus === 'VERIFIED' && (
          <div style={{ padding: '1rem', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 'var(--radius)', fontSize: '0.875rem', color: '#166534', lineHeight: 1.6 }}>
            <i className="fa-solid fa-circle-check" style={{ marginRight: '0.5rem', fontSize: '1rem' }} />
            <strong>KYC Verified.</strong> Your identity has been confirmed. No further action is needed.
          </div>
        )}
        {kycStatus === 'SUBMITTED' && (
          <div style={{ padding: '1rem', background: '#dbeafe', border: '1px solid #bfdbfe', borderRadius: 'var(--radius)', fontSize: '0.875rem', color: '#1e40af', lineHeight: 1.6 }}>
            <i className="fa-solid fa-hourglass-half" style={{ marginRight: '0.5rem' }} />
            <strong>Under Review.</strong> Your KYC documents have been submitted and are being reviewed. We will notify you within 3–5 business days.
          </div>
        )}
        {(kycStatus === 'PENDING' || kycStatus === 'REJECTED') && (
          <>
            {kycStatus === 'REJECTED' && (
              <div style={{ padding: '0.875rem 1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius)', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#b91c1c' }}>
                <i className="fa-solid fa-circle-xmark" style={{ marginRight: '0.5rem' }} />
                Your previous KYC submission was rejected. Please re-submit with valid documents.
              </div>
            )}
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius)', padding: '0.875rem 1rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#92400e' }}>
              <i className="fa-solid fa-shield-halved" style={{ marginRight: '0.5rem' }} />
              <strong>Security Note:</strong> BVN and NIN are encrypted with AES-256-GCM and are only accessed during winner verification. We comply with the NDPR 2019.
            </div>
            {msg && (
              <div style={{ padding: '0.75rem 1rem', background: msg.ok ? '#dcfce7' : '#fee2e2', borderRadius: 'var(--radius)', marginBottom: '1.25rem', fontSize: '0.875rem', color: msg.ok ? '#166534' : '#b91c1c' }}>
                {msg.text}
              </div>
            )}
            <form onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="kyc-bvn" className="form-label">BVN (Bank Verification Number) <span style={{ color: 'var(--error)' }}>*</span></label>
            <input id="kyc-bvn" type="text" inputMode="numeric" maxLength={11} className="form-input" value={bvn} onChange={(e) => setBvn(e.target.value.replace(/\D/g, ''))} placeholder="Enter 11-digit BVN" />
            <p className="form-hint">Required to claim prize. Encrypted at rest.</p>
          </div>
          <div className="form-group">
            <label htmlFor="kyc-nin" className="form-label">NIN (National Identity Number) <span style={{ color: 'var(--error)' }}>*</span></label>
            <input id="kyc-nin" type="text" inputMode="numeric" maxLength={11} className="form-input" value={nin} onChange={(e) => setNin(e.target.value.replace(/\D/g, ''))} placeholder="Enter 11-digit NIN" />
          </div>
          <div className="form-group">
            <label htmlFor="kyc-id-type" className="form-label">ID Document Type</label>
            <select id="kyc-id-type" className="form-input" value={idType} onChange={(e) => setIdType(e.target.value)} style={{ cursor: 'pointer' }}>
              <option value="">Select document type</option>
              <option>National ID Card (NIN slip)</option>
              <option>International Passport</option>
              <option>Driver&apos;s Licence</option>
              <option>Voter&apos;s Card (PVC)</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Upload ID Document <span style={{ color: 'var(--error)' }}>*</span></label>
            <label
              style={{ border: `2px dashed ${documentKey ? 'var(--green-primary)' : 'var(--border)'}`, borderRadius: 10, padding: '1.5rem', textAlign: 'center', cursor: uploading ? 'not-allowed' : 'pointer', transition: 'border-color 0.2s', background: documentKey ? 'var(--green-50)' : 'var(--bg-secondary)', display: 'block' }}
            >
              {uploading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--green-primary)', marginBottom: '0.5rem', display: 'block' }} />
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Uploading…</div>
                </>
              ) : documentKey ? (
                <>
                  <i className="fa-solid fa-circle-check" style={{ fontSize: '2rem', color: 'var(--green-primary)', marginBottom: '0.5rem', display: 'block' }} />
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--green-primary)' }}>{uploadedName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Click to replace</div>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '2rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }} />
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Click to upload or drag &amp; drop</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PNG, JPG, PDF (max 5MB)</div>
                </>
              )}
              <input type="file" accept="image/jpeg,image/png,application/pdf" style={{ display: 'none' }} disabled={uploading} onChange={handleFileChange} />
            </label>
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting || uploading || bvn.length < 11 || nin.length < 11 || !documentKey || !idType}>
            {submitting ? <><i className="fa-solid fa-spinner fa-spin" /> Submitting…</> : <><i className="fa-solid fa-save" /> Save KYC Information</>}
          </button>
        </form>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Security Tab ─────────────────────────────────────────────────────────── */
function SecurityTab() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const requirements = [
    { label: 'At least 8 characters', met: next.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(next) },
    { label: 'Number', met: /[0-9]/.test(next) },
    { label: 'Special character', met: /[^A-Za-z0-9]/.test(next) },
  ];

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) { setMsg({ text: 'Passwords do not match.', ok: false }); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/users/me/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json() as { success: boolean; error?: string };
      setMsg({ text: data.success ? 'Password changed successfully.' : (data.error ?? 'Failed to change password.'), ok: data.success });
      if (data.success) { setCurrent(''); setNext(''); setConfirm(''); }
    } catch { setMsg({ text: 'Network error.', ok: false }); }
    finally { setSaving(false); }
  }

  return (
    <div className="card">
      <div className="card-header">
        <span style={{ fontWeight: 700, fontSize: '1rem' }}>
          <i className="fa-solid fa-lock" style={{ color: 'var(--green-primary)', marginRight: '0.5rem' }} />
          Change Password
        </span>
      </div>
      <div className="card-body">
        {msg && (
          <div style={{ padding: '0.75rem 1rem', background: msg.ok ? '#dcfce7' : '#fee2e2', borderRadius: 'var(--radius)', marginBottom: '1.25rem', fontSize: '0.875rem', color: msg.ok ? '#166534' : '#b91c1c', fontWeight: 600 }}>
            <i className={`fa-solid ${msg.ok ? 'fa-circle-check' : 'fa-circle-xmark'}`} style={{ marginRight: '0.5rem' }} />
            {msg.text}
          </div>
        )}
        <form onSubmit={changePassword}>
          {/* Current password */}
          <div className="form-group">
            <label htmlFor="sec-current" className="form-label">Current Password</label>
            <div className="password-wrap" suppressHydrationWarning>
              <input id="sec-current" type={showCurrent ? 'text' : 'password'} className="form-input" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required suppressHydrationWarning />
              <button type="button" className="password-toggle" onClick={() => setShowCurrent(!showCurrent)} aria-label="Toggle password visibility">
                <i className={`fa-solid ${showCurrent ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
          </div>
          {/* New password */}
          <div className="form-group">
            <label htmlFor="sec-new" className="form-label">New Password</label>
            <div className="password-wrap" suppressHydrationWarning>
              <input id="sec-new" type={showNext ? 'text' : 'password'} className="form-input" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required suppressHydrationWarning />
              <button type="button" className="password-toggle" onClick={() => setShowNext(!showNext)} aria-label="Toggle password visibility">
                <i className={`fa-solid ${showNext ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
          </div>
          {/* Password requirements */}
          {next.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem', marginBottom: '1rem', marginTop: '-0.5rem' }}>
              {requirements.map((r) => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.775rem', color: r.met ? 'var(--green-primary)' : 'var(--text-muted)' }}>
                  <i className={`fa-solid ${r.met ? 'fa-check' : 'fa-xmark'}`} style={{ fontSize: '0.7rem' }} />
                  {r.label}
                </div>
              ))}
            </div>
          )}
          {/* Confirm */}
          <div className="form-group">
            <label htmlFor="sec-confirm" className="form-label">Confirm New Password</label>
            <div className="password-wrap" suppressHydrationWarning>
              <input id="sec-confirm" type={showConfirm ? 'text' : 'password'} className="form-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required suppressHydrationWarning
                style={{ borderColor: confirm && next !== confirm ? 'var(--error)' : undefined }} />
              <button type="button" className="password-toggle" onClick={() => setShowConfirm(!showConfirm)} aria-label="Toggle password visibility">
                <i className={`fa-solid ${showConfirm ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
            {confirm && next !== confirm && <p className="form-hint" style={{ color: 'var(--error)' }}>Passwords do not match.</p>}
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving || !requirements.every((r) => r.met)}>
            {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Updating…</> : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
