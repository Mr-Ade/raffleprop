'use client';

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
type Platform      = 'INSTAGRAM' | 'TIKTOK' | 'YOUTUBE' | 'TWITTER_X' | 'FACEBOOK';
type ContentStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PUBLISHED' | 'REJECTED';

interface InfluencerCampaign {
  id: string;
  campaignId: string;
  campaignTitle: string;
  agreementSigned: boolean;
  contentStatus: ContentStatus;
  contentUrl: string | null;
  impressions: number | null;
  clicks: number | null;
  conversions: number | null;
  createdAt: string;
}

interface Influencer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  handle: string | null;
  platforms: Platform[];
  followerCount: number | null;
  engagementRate: string | null;
  campaigns: InfluencerCampaign[];
  createdAt: string;
}

interface CampaignOption { id: string; title: string; status: string; }

// ── Constants ─────────────────────────────────────────────────────────────────
const ALL_PLATFORMS: Platform[] = ['INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'TWITTER_X', 'FACEBOOK'];

const PLATFORM_META: Record<Platform, { label: string; icon: string; color: string }> = {
  INSTAGRAM: { label: 'Instagram', icon: 'fa-instagram',  color: '#E1306C' },
  TIKTOK:    { label: 'TikTok',    icon: 'fa-tiktok',     color: '#2b2b2b' },
  YOUTUBE:   { label: 'YouTube',   icon: 'fa-youtube',    color: '#FF0000' },
  TWITTER_X: { label: 'Twitter/X', icon: 'fa-x-twitter',  color: '#000000' },
  FACEBOOK:  { label: 'Facebook',  icon: 'fa-facebook',   color: '#1877F2' },
};

const STATUS_META: Record<ContentStatus, { label: string; bg: string; color: string }> = {
  DRAFT:     { label: 'Draft',     bg: '#f3f4f6', color: '#374151' },
  SUBMITTED: { label: 'Submitted', bg: '#fef3c7', color: '#92400e' },
  APPROVED:  { label: 'Approved',  bg: '#dbeafe', color: '#1e40af' },
  PUBLISHED: { label: 'Published', bg: '#dcfce7', color: '#166534' },
  REJECTED:  { label: 'Rejected',  bg: '#fee2e2', color: '#b91c1c' },
};

const BLANK_FORM = {
  name: '', email: '', phone: '', handle: '',
  platforms: [] as Platform[],
  followerCount: '', engagementRate: '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtNum(n: number | null | undefined) {
  if (n == null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function StatusPill({ status }: { status: ContentStatus }) {
  const m = STATUS_META[status];
  return (
    <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, background: m.bg, color: m.color }}>
      {m.label}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function InfluencersClient({ token, apiUrl }: { token: string; apiUrl: string }) {
  const [influencers, setInfluencers]   = useState<Influencer[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [search, setSearch]             = useState('');
  const [expandedId, setExpandedId]     = useState<string | null>(null);

  // Add/Edit modal
  const [modal, setModal]       = useState<'add' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Influencer | null>(null);
  const [form, setForm]         = useState(BLANK_FORM);
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState('');

  // Delete influencer confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Campaign link panel state (per expanded influencer)
  const [linkForm, setLinkForm] = useState({ campaignId: '', campaignTitle: '' });
  const [campaigns, setCampaigns]       = useState<CampaignOption[]>([]);
  const [campaignsLoaded, setCampaignsLoaded] = useState(false);
  const [linking, setLinking]           = useState(false);
  const [linkError, setLinkError]       = useState('');

  // Per-link metric editing
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [linkPatch, setLinkPatch]         = useState<Record<string, string | boolean>>({});
  const [patchSaving, setPatchSaving]     = useState(false);
  const [patchError, setPatchError]       = useState('');

  // Unlink confirm
  const [unlinkId, setUnlinkId] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  const [unlinkError, setUnlinkError] = useState('');

  // Campaign load error
  const [campaignsError, setCampaignsError] = useState('');

  // ── Load influencers ───────────────────────────────────────────────────────
  const load = useCallback(() => {
    setLoading(true);
    setError('');
    fetch(`${apiUrl}/api/admin/influencers`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json() as Promise<{ success: boolean; data: Influencer[] }>)
      .then(j => { if (j.success) setInfluencers(j.data); else setError('Failed to load influencers.'); })
      .catch(() => setError('Could not reach the server.'))
      .finally(() => setLoading(false));
  }, [apiUrl, token]);

  useEffect(() => { load(); }, [load]);

  // ── Load campaigns for link picker ────────────────────────────────────────
  const loadCampaigns = useCallback(() => {
    if (campaignsLoaded) return;
    setCampaignsError('');
    fetch(`${apiUrl}/api/admin/comms/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json() as Promise<{ success: boolean; data: { campaigns: CampaignOption[] } }>)
      .then(j => {
        if (j.success) { setCampaigns(j.data.campaigns); setCampaignsLoaded(true); }
        else setCampaignsError('Could not load campaigns.');
      })
      .catch(() => setCampaignsError('Could not load campaigns.'));
  }, [apiUrl, token, campaignsLoaded]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return influencers;
    return influencers.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.handle ?? '').toLowerCase().includes(q) ||
      (i.email ?? '').toLowerCase().includes(q),
    );
  }, [influencers, search]);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const allLinks = influencers.flatMap(i => i.campaigns);
    return {
      total:       influencers.length,
      activeCamps: allLinks.filter(l => ['SUBMITTED', 'APPROVED', 'PUBLISHED'].includes(l.contentStatus)).length,
      impressions: allLinks.reduce((s, l) => s + (l.impressions ?? 0), 0),
      conversions: allLinks.reduce((s, l) => s + (l.conversions ?? 0), 0),
    };
  }, [influencers]);

  // ── Open add modal ────────────────────────────────────────────────────────
  function openAdd() {
    setForm(BLANK_FORM);
    setEditTarget(null);
    setSaveError('');
    setModal('add');
  }

  function openEdit(inf: Influencer) {
    setForm({
      name: inf.name,
      email: inf.email ?? '',
      phone: inf.phone ?? '',
      handle: inf.handle ?? '',
      platforms: inf.platforms,
      followerCount: inf.followerCount != null ? String(inf.followerCount) : '',
      engagementRate: inf.engagementRate ?? '',
    });
    setEditTarget(inf);
    setSaveError('');
    setModal('edit');
  }

  function closeModal() { setModal(null); setEditTarget(null); setSaveError(''); }

  function togglePlatform(p: Platform) {
    setForm(f => ({
      ...f,
      platforms: f.platforms.includes(p) ? f.platforms.filter(x => x !== p) : [...f.platforms, p],
    }));
  }

  // ── Save influencer (add or edit) ─────────────────────────────────────────
  async function handleSave() {
    if (!form.name.trim()) { setSaveError('Name is required.'); return; }
    if (form.platforms.length === 0) { setSaveError('Select at least one platform.'); return; }
    setSaving(true);
    setSaveError('');
    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      handle: form.handle.trim() || undefined,
      platforms: form.platforms,
      followerCount: form.followerCount ? parseInt(form.followerCount, 10) : undefined,
      engagementRate: form.engagementRate ? parseFloat(form.engagementRate) : undefined,
    };
    try {
      const url  = modal === 'edit' ? `${apiUrl}/api/admin/influencers/${editTarget!.id}` : `${apiUrl}/api/admin/influencers`;
      const method = modal === 'edit' ? 'PUT' : 'POST';
      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const json = await res.json() as { success: boolean; data?: Influencer; error?: string };
      if (!res.ok || !json.success) { setSaveError(json.error ?? 'Failed to save.'); return; }
      if (modal === 'add') {
        setInfluencers(prev => [{ ...json.data!, campaigns: [] }, ...prev]);
      } else {
        setInfluencers(prev => prev.map(i => i.id === editTarget!.id ? { ...json.data!, campaigns: i.campaigns } : i));
      }
      closeModal();
    } catch { setSaveError('Network error — try again.'); }
    finally { setSaving(false); }
  }

  // ── Delete influencer ─────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`${apiUrl}/api/admin/influencers/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !json.success) { setDeleteError(json.error ?? 'Failed to delete.'); return; }
      setInfluencers(prev => prev.filter(i => i.id !== deleteId));
      if (expandedId === deleteId) setExpandedId(null);
      setDeleteId(null);
    } catch { setDeleteError('Network error — try again.'); }
    finally { setDeleting(false); }
  }

  // ── Link influencer to campaign ───────────────────────────────────────────
  async function handleLink(influencerId: string) {
    if (!linkForm.campaignId) { setLinkError('Select a campaign.'); return; }
    setLinking(true);
    setLinkError('');
    try {
      const selected = campaigns.find(c => c.id === linkForm.campaignId);
      const res = await fetch(`${apiUrl}/api/admin/influencers/${influencerId}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ campaignId: linkForm.campaignId, campaignTitle: selected?.title ?? linkForm.campaignTitle }),
      });
      const json = await res.json() as { success: boolean; data?: InfluencerCampaign; error?: string };
      if (!res.ok || !json.success) { setLinkError(json.error ?? 'Failed to link.'); return; }
      setInfluencers(prev => prev.map(i =>
        i.id === influencerId ? { ...i, campaigns: [json.data!, ...i.campaigns] } : i,
      ));
      setLinkForm({ campaignId: '', campaignTitle: '' });
    } catch { setLinkError('Network error.'); }
    finally { setLinking(false); }
  }

  // ── Update campaign link metrics / status ─────────────────────────────────
  async function handlePatch(linkId: string, influencerId: string) {
    setPatchSaving(true);
    setPatchError('');
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(linkPatch)) {
      if (k === 'impressions' || k === 'clicks' || k === 'conversions') {
        payload[k] = v === '' ? null : parseInt(v as string, 10);
      } else if (k === 'contentUrl') {
        payload[k] = (v as string).trim() || null;
      } else {
        payload[k] = v;
      }
    }
    try {
      const res = await fetch(`${apiUrl}/api/admin/influencers/campaigns/${linkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const json = await res.json() as { success: boolean; data?: InfluencerCampaign; error?: string };
      if (!res.ok || !json.success) { setPatchError(json.error ?? 'Failed to save.'); return; }
      setInfluencers(prev => prev.map(i =>
        i.id === influencerId
          ? { ...i, campaigns: i.campaigns.map(c => c.id === linkId ? { ...c, ...json.data } : c) }
          : i,
      ));
      setEditingLinkId(null);
      setLinkPatch({});
    } catch { setPatchError('Network error.'); }
    finally { setPatchSaving(false); }
  }

  // ── Unlink campaign ───────────────────────────────────────────────────────
  async function handleUnlink(linkId: string, influencerId: string) {
    setUnlinking(true);
    setUnlinkError('');
    try {
      const res = await fetch(`${apiUrl}/api/admin/influencers/campaigns/${linkId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !json.success) { setUnlinkError(json.error ?? 'Failed to remove campaign link.'); return; }
      setInfluencers(prev => prev.map(i =>
        i.id === influencerId ? { ...i, campaigns: i.campaigns.filter(c => c.id !== linkId) } : i,
      ));
      setUnlinkId(null);
    } catch { setUnlinkError('Network error — try again.'); }
    finally { setUnlinking(false); }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Topbar */}
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Influencer Hub</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Manage influencer partnerships and campaign compliance
          </p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={openAdd}>
          <i className="fa-solid fa-plus" style={{ marginRight: '0.4rem' }} />Add Influencer
        </button>
      </div>

      <div className="admin-content">

        {/* ── Stat cards ── */}
        <div className="stat-grid-4" style={{ marginBottom: '2rem' }}>
          {[
            { label: 'Total Influencers',    value: stats.total,       color: 'var(--green-primary)', icon: 'fa-star' },
            { label: 'Active Campaigns',     value: stats.activeCamps, color: '#8b5cf6',              icon: 'fa-trophy' },
            { label: 'Total Impressions',    value: stats.impressions,  color: '#2563eb',              icon: 'fa-eye' },
            { label: 'Total Conversions',    value: stats.conversions,  color: 'var(--gold)',          icon: 'fa-ticket' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ padding: '1rem', borderTop: `4px solid ${s.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <i className={`fa-solid ${s.icon}`} style={{ color: s.color, fontSize: '0.875rem' }} />
                <div className="stat-label" style={{ margin: 0 }}>{s.label}</div>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: s.color }}>
                {loading ? '…' : fmtNum(s.value)}
              </div>
            </div>
          ))}
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ marginBottom: '1.5rem', padding: '0.875rem 1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius)', color: '#b91c1c', fontSize: '0.875rem' }}>
            <i className="fa-solid fa-circle-xmark" style={{ marginRight: '0.375rem' }} />
            {error}
            <button type="button" onClick={load} style={{ marginLeft: '0.75rem', background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.8125rem' }}>Retry</button>
          </div>
        )}

        {/* ── Search + table ── */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, flex: 1 }}>
              <i className="fa-solid fa-star" style={{ marginRight: '0.5rem', color: 'var(--green-primary)' }} />
              Influencers
              {!loading && <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>({filtered.length})</span>}
            </h3>
            <input
              type="search"
              className="form-input"
              placeholder="Search name, handle, email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: '1 1 180px', maxWidth: 260, padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}
            />
            <button type="button" className="btn btn-outline btn-sm" onClick={load} disabled={loading} title="Refresh">
              <i className={`fa-solid fa-arrows-rotate${loading ? ' fa-spin' : ''}`} />
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.75rem' }} />
              Loading influencers…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <i className="fa-solid fa-star" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.75rem', opacity: 0.2 }} />
              {search ? 'No influencers match your search.' : 'No influencers yet. Add one to get started.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ minWidth: 600 }}>
                <thead>
                  <tr>
                    <th>Influencer</th>
                    <th>Platforms</th>
                    <th style={{ textAlign: 'right' }}>Followers</th>
                    <th style={{ textAlign: 'right' }}>Eng. Rate</th>
                    <th style={{ textAlign: 'right' }}>Campaigns</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inf => {
                    const isExpanded = expandedId === inf.id;
                    function toggleExpand() {
                      const expanding = expandedId !== inf.id;
                      setExpandedId(expanding ? inf.id : null);
                      if (expanding) {
                        loadCampaigns();
                        setEditingLinkId(null);
                        setLinkPatch({});
                        setLinkError('');
                        setPatchError('');
                        setLinkForm({ campaignId: '', campaignTitle: '' });
                        setUnlinkId(null);
                        setUnlinkError('');
                      }
                    }
                    return (
                      <Fragment key={inf.id}>
                        <tr
                          style={{ cursor: 'pointer', background: isExpanded ? 'var(--green-50)' : undefined }}
                          onClick={toggleExpand}
                        >
                          <td style={{ padding: '0.875rem 1rem' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{inf.name}</div>
                            {inf.handle && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{inf.handle}</div>}
                            {inf.email  && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inf.email}</div>}
                          </td>
                          <td style={{ padding: '0.875rem 1rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {inf.platforms.map(p => (
                                <span key={p} title={PLATFORM_META[p].label}
                                  style={{ color: PLATFORM_META[p].color, fontSize: '1.125rem' }}>
                                  <i className={`fa-brands ${PLATFORM_META[p].icon}`} />
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontWeight: 600 }}>
                            {fmtNum(inf.followerCount)}
                          </td>
                          <td style={{ padding: '0.875rem 1rem', textAlign: 'right', color: 'var(--text-muted)' }}>
                            {inf.engagementRate ? `${parseFloat(inf.engagementRate).toFixed(1)}%` : '—'}
                          </td>
                          <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                            <span style={{ fontWeight: 700, color: inf.campaigns.length > 0 ? 'var(--green-primary)' : 'var(--text-muted)' }}>
                              {inf.campaigns.length}
                            </span>
                          </td>
                          <td style={{ padding: '0.875rem 1rem' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button type="button" className="btn btn-outline btn-sm"
                                onClick={() => openEdit(inf)}>
                                <i className="fa-solid fa-pen" />
                              </button>
                              <button type="button"
                                className="btn btn-sm"
                                style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}
                                onClick={() => { setDeleteError(''); setDeleteId(inf.id); }}>
                                <i className="fa-solid fa-trash" />
                              </button>
                              <button type="button" className="btn btn-outline btn-sm"
                                onClick={toggleExpand}
                                style={{ color: isExpanded ? 'var(--green-primary)' : undefined }}>
                                <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'}`} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td colSpan={6} style={{ padding: '0 1rem 1.25rem', background: 'var(--green-50)', borderTop: '1px solid var(--border)' }}>
                              <div style={{ paddingTop: '1rem' }}>

                                {/* Campaign links */}
                                {inf.campaigns.length === 0 ? (
                                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '1rem' }}>No campaigns linked yet.</p>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                    {inf.campaigns.map(link => {
                                      const isEditingThis = editingLinkId === link.id;
                                      const patch = isEditingThis ? linkPatch : {};
                                      const getVal = (k: string, fallback: unknown): unknown => k in patch ? patch[k] : fallback;
                                      return (
                                        <div key={link.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.875rem 1rem' }}>
                                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <div>
                                              <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{link.campaignTitle}</div>
                                              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                                <StatusPill status={link.contentStatus} />
                                                {link.agreementSigned && (
                                                  <span style={{ fontSize: '0.72rem', color: '#166534', background: '#dcfce7', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 600 }}>
                                                    <i className="fa-solid fa-file-signature" style={{ marginRight: '0.25rem' }} />Agreement Signed
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.375rem' }}>
                                              {link.contentUrl && (
                                                <a href={link.contentUrl} target="_blank" rel="noopener noreferrer"
                                                  className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem' }}>
                                                  <i className="fa-solid fa-arrow-up-right-from-square" style={{ marginRight: '0.25rem' }} />Post
                                                </a>
                                              )}
                                              <button type="button" className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem' }}
                                                onClick={() => {
                                                  if (isEditingThis) { setEditingLinkId(null); setLinkPatch({}); setPatchError(''); }
                                                  else {
                                                    setEditingLinkId(link.id);
                                                    setLinkPatch({
                                                      contentStatus:   link.contentStatus,
                                                      agreementSigned: link.agreementSigned,
                                                      contentUrl:      link.contentUrl ?? '',
                                                      impressions:     link.impressions != null ? String(link.impressions) : '',
                                                      clicks:          link.clicks      != null ? String(link.clicks)      : '',
                                                      conversions:     link.conversions != null ? String(link.conversions) : '',
                                                    });
                                                    setPatchError('');
                                                  }
                                                }}>
                                                {isEditingThis ? 'Cancel' : <><i className="fa-solid fa-pen" style={{ marginRight: '0.25rem' }} />Edit</>}
                                              </button>
                                              {!isEditingThis && (
                                                unlinkId === link.id ? (
                                                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                    <button type="button" className="btn btn-sm"
                                                      style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', fontSize: '0.75rem' }}
                                                      disabled={unlinking}
                                                      onClick={() => void handleUnlink(link.id, inf.id)}>
                                                      {unlinking ? '…' : 'Yes, remove'}
                                                    </button>
                                                    <button type="button" className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem' }}
                                                      onClick={() => setUnlinkId(null)}>Cancel</button>
                                                  </div>
                                                ) : (
                                                  <button type="button" className="btn btn-sm"
                                                    style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', fontSize: '0.75rem' }}
                                                    onClick={() => setUnlinkId(link.id)}>
                                                    <i className="fa-solid fa-link-slash" />
                                                  </button>
                                                )
                                              )}
                                            </div>
                                          </div>

                                          {/* Metrics row */}
                                          {!isEditingThis && (link.impressions != null || link.clicks != null || link.conversions != null) && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1.5rem', marginTop: '0.625rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                              <span><strong style={{ color: '#1e293b' }}>{fmtNum(link.impressions)}</strong> impressions</span>
                                              <span><strong style={{ color: '#1e293b' }}>{fmtNum(link.clicks)}</strong> clicks</span>
                                              <span><strong style={{ color: '#1e293b' }}>{fmtNum(link.conversions)}</strong> conversions</span>
                                            </div>
                                          )}

                                          {/* Edit form */}
                                          {isEditingThis && (
                                            <div style={{ marginTop: '0.875rem', paddingTop: '0.875rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                                                <div>
                                                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Content Status</label>
                                                  <select className="form-input" style={{ fontSize: '0.8125rem', padding: '0.35rem 0.625rem' }}
                                                    value={getVal('contentStatus', link.contentStatus) as string}
                                                    onChange={e => setLinkPatch(p => ({ ...p, contentStatus: e.target.value }))}>
                                                    {(['DRAFT', 'SUBMITTED', 'APPROVED', 'PUBLISHED', 'REJECTED'] as ContentStatus[]).map(s => (
                                                      <option key={s} value={s}>{STATUS_META[s].label}</option>
                                                    ))}
                                                  </select>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.25rem' }}>
                                                  <input type="checkbox" id={`agr-${link.id}`}
                                                    checked={!!getVal('agreementSigned', link.agreementSigned)}
                                                    onChange={e => setLinkPatch(p => ({ ...p, agreementSigned: e.target.checked }))} />
                                                  <label htmlFor={`agr-${link.id}`} style={{ fontSize: '0.8125rem', cursor: 'pointer' }}>Agreement Signed</label>
                                                </div>
                                              </div>
                                              <div>
                                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Live Content URL</label>
                                                <input type="url" className="form-input" style={{ fontSize: '0.8125rem', padding: '0.35rem 0.625rem' }}
                                                  placeholder="https://instagram.com/p/..."
                                                  value={getVal('contentUrl', link.contentUrl ?? '') as string}
                                                  onChange={e => setLinkPatch(p => ({ ...p, contentUrl: e.target.value }))} />
                                              </div>
                                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.75rem' }}>
                                                {(['impressions', 'clicks', 'conversions'] as const).map(field => (
                                                  <div key={field}>
                                                    <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>{field}</label>
                                                    <input type="number" min={0} className="form-input" style={{ fontSize: '0.8125rem', padding: '0.35rem 0.625rem' }}
                                                      placeholder="0"
                                                      value={getVal(field, link[field] != null ? String(link[field]) : '') as string}
                                                      onChange={e => setLinkPatch(p => ({ ...p, [field]: e.target.value }))} />
                                                  </div>
                                                ))}
                                              </div>
                                              {patchError && <p style={{ fontSize: '0.8125rem', color: '#b91c1c' }}>{patchError}</p>}
                                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button type="button" className="btn btn-primary btn-sm"
                                                  disabled={patchSaving} onClick={() => void handlePatch(link.id, inf.id)}>
                                                  {patchSaving ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '0.25rem' }} />Saving…</> : 'Save Changes'}
                                                </button>
                                                <button type="button" className="btn btn-outline btn-sm"
                                                  disabled={patchSaving} onClick={() => { setEditingLinkId(null); setLinkPatch({}); setPatchError(''); }}>
                                                  Cancel
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Unlink error */}
                                {unlinkError && (
                                  <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: '#fee2e2', borderRadius: 'var(--radius)', color: '#b91c1c', fontSize: '0.8125rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span><i className="fa-solid fa-circle-xmark" style={{ marginRight: '0.375rem' }} />{unlinkError}</span>
                                    <button type="button" onClick={() => setUnlinkError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontSize: '1rem', lineHeight: 1 }}>×</button>
                                  </div>
                                )}

                                {/* Add campaign link */}
                                <div style={{ background: '#fff', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', padding: '0.875rem 1rem' }}>
                                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                                    <i className="fa-solid fa-link" style={{ marginRight: '0.375rem' }} />Link to Campaign
                                  </div>
                                  {campaignsError ? (
                                    <div style={{ fontSize: '0.8125rem', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <i className="fa-solid fa-circle-xmark" />
                                      {campaignsError}
                                      <button type="button" onClick={() => { setCampaignsError(''); setCampaignsLoaded(false); loadCampaigns(); }}
                                        style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.8125rem', padding: 0 }}>Retry</button>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                      <select className="form-input" style={{ fontSize: '0.8125rem', flex: 1, minWidth: 200, padding: '0.4rem 0.625rem' }}
                                        value={linkForm.campaignId}
                                        onChange={e => setLinkForm(f => ({ ...f, campaignId: e.target.value }))}>
                                        <option value="">— Select campaign —</option>
                                        {campaigns.map(c => (
                                          <option key={c.id} value={c.id}>{c.title} ({c.status})</option>
                                        ))}
                                      </select>
                                      <button type="button" className="btn btn-primary btn-sm"
                                        disabled={linking || !linkForm.campaignId}
                                        onClick={() => void handleLink(inf.id)}>
                                        {linking ? <i className="fa-solid fa-spinner fa-spin" /> : 'Link'}
                                      </button>
                                    </div>
                                  )}
                                  {linkError && <p style={{ fontSize: '0.8125rem', color: '#b91c1c', marginTop: '0.4rem' }}>{linkError}</p>}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                {modal === 'add' ? 'Add Influencer' : `Edit — ${editTarget?.name}`}
              </h2>
              <button type="button" onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Name <span className="required">*</span></label>
                <input type="text" className="form-input" placeholder="Full name or brand name"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" placeholder="contact@email.com"
                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Phone</label>
                  <input type="tel" className="form-input" placeholder="+234..."
                    value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Handle / Username</label>
                <input type="text" className="form-input" placeholder="@username (without @)"
                  value={form.handle} onChange={e => setForm(f => ({ ...f, handle: e.target.value }))} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Platforms <span className="required">*</span></label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  {ALL_PLATFORMS.map(p => {
                    const selected = form.platforms.includes(p);
                    return (
                      <button key={p} type="button" onClick={() => togglePlatform(p)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius)', border: `2px solid ${selected ? PLATFORM_META[p].color : 'var(--border)'}`, background: selected ? PLATFORM_META[p].color + '15' : '#fff', color: selected ? PLATFORM_META[p].color : 'var(--text-muted)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                        <i className={`fa-brands ${PLATFORM_META[p].icon}`} />
                        {PLATFORM_META[p].label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Follower Count</label>
                  <input type="number" min={0} className="form-input" placeholder="e.g. 50000"
                    value={form.followerCount} onChange={e => setForm(f => ({ ...f, followerCount: e.target.value }))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Engagement Rate (%)</label>
                  <input type="number" min={0} max={100} step="0.01" className="form-input" placeholder="e.g. 4.5"
                    value={form.engagementRate} onChange={e => setForm(f => ({ ...f, engagementRate: e.target.value }))} />
                </div>
              </div>
              {saveError && (
                <div style={{ padding: '0.625rem 0.875rem', background: '#fee2e2', borderRadius: 'var(--radius)', color: '#b91c1c', fontSize: '0.8125rem' }}>
                  {saveError}
                </div>
              )}
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={closeModal} disabled={saving}>Cancel</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => void handleSave()} disabled={saving}>
                {saving ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '0.375rem' }} />Saving…</> : (modal === 'add' ? 'Add Influencer' : 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 400, padding: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontWeight: 800, marginBottom: '0.75rem', color: '#b91c1c' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '0.5rem' }} />Delete Influencer
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              This will permanently delete the influencer and all their linked campaign records. This cannot be undone.
            </p>
            {deleteError && (
              <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: '#fee2e2', borderRadius: 'var(--radius)', color: '#b91c1c', fontSize: '0.8125rem' }}>
                {deleteError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { setDeleteId(null); setDeleteError(''); }} disabled={deleting}>Cancel</button>
              <button type="button" className="btn btn-sm"
                style={{ background: '#b91c1c', color: '#fff', border: 'none' }}
                disabled={deleting} onClick={() => void handleDelete()}>
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
