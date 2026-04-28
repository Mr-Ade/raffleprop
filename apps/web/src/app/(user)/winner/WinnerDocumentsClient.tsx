'use client';

import { useEffect, useRef, useState } from 'react';

type ClaimDoc = {
  id: string;
  step: number;
  name: string;
  description: string | null;
  requiresPhysical: boolean;
  originalFileName: string | null;
  uploadedAt: string | null;
  uploadedByRole: string | null;
  verifiedAt: string | null;
  notes: string | null;
  mimeType: string | null;
  storageKey: string | null;
};

const STEP_LABELS = ['Identity Verification', 'Acceptance Form', 'KYC & Legal', 'Property Transfer', 'Keys Handover'];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function WinnerDocumentsClient({ token }: { token: string }) {
  const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
  const [docs, setDocs] = useState<ClaimDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [downloadLoading, setDownloadLoading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetch(`${API}/api/users/me/claim-documents`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((r) => { if (r.success) setDocs(r.data as ClaimDoc[]); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [API, token]);

  async function handleUpload(doc: ClaimDoc, file: File) {
    setUploadingId(doc.id);
    setUploadErrors((prev) => ({ ...prev, [doc.id]: '' }));
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API}/api/users/me/claim-documents/${doc.id}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const r = await res.json() as { success: boolean; error?: string; data?: ClaimDoc };
      if (r.success && r.data) {
        setDocs((prev) => prev.map((d) => d.id === doc.id ? { ...d, ...r.data } : d));
        if (fileRefs.current[doc.id]) fileRefs.current[doc.id]!.value = '';
      } else {
        setUploadErrors((prev) => ({ ...prev, [doc.id]: r.error ?? 'Upload failed' }));
      }
    } catch {
      setUploadErrors((prev) => ({ ...prev, [doc.id]: 'Upload failed. Please check your connection and try again.' }));
    } finally {
      setUploadingId(null);
    }
  }

  async function handleDownload(doc: ClaimDoc) {
    setDownloadLoading(doc.id);
    setDownloadError(null);
    try {
      const r = await fetch(`${API}/api/users/me/claim-documents/${doc.id}/download-url`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json());
      if (!r.success) { setDownloadError('Could not get download link. Please try again.'); return; }
      const a = document.createElement('a');
      a.href = r.data.url;
      a.download = doc.originalFileName ?? doc.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch { setDownloadError('Download failed. Please check your connection and try again.'); }
    finally { setDownloadLoading(null); }
  }

  if (loading) return null;
  if (docs.length === 0) return null;

  const steps = [1, 2, 3, 4, 5].filter((s) => docs.some((d) => d.step === s));

  return (
    <div className="stat-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>
          <i className="fa-solid fa-folder-open" style={{ marginRight: '0.5rem', color: 'var(--info)' }} />
          Your Claim Documents
        </h2>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          {docs.filter((d) => d.verifiedAt).length} of {docs.length} verified
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {steps.map((step) => (
          <div key={step}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.625rem' }}>
              Step {step} — {STEP_LABELS[step - 1]}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {docs.filter((d) => d.step === step).map((doc) => (
                <div key={doc.id} style={{ borderRadius: 12, border: `1.5px solid ${doc.verifiedAt ? 'var(--green-primary)' : doc.uploadedAt ? 'var(--gold)' : 'var(--border)'}`, padding: '1rem 1.125rem', background: doc.verifiedAt ? 'var(--green-50)' : 'var(--bg-secondary)' }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{doc.name}</span>
                        {doc.verifiedAt && (
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--green-primary)', background: 'var(--green-50)', padding: '0.1rem 0.5rem', borderRadius: 10, border: '1px solid var(--green-primary)30' }}>
                            <i className="fa-solid fa-circle-check" style={{ marginRight: '0.2rem' }} />Verified by RaffleProp
                          </span>
                        )}
                        {doc.uploadedAt && !doc.verifiedAt && (
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#b45309', background: '#fffbeb', padding: '0.1rem 0.5rem', borderRadius: 10 }}>
                            <i className="fa-solid fa-clock" style={{ marginRight: '0.2rem' }} />Under Review
                          </span>
                        )}
                        {!doc.uploadedAt && doc.requiresPhysical && (
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', padding: '0.1rem 0.5rem', borderRadius: 10 }}>
                            <i className="fa-solid fa-building" style={{ marginRight: '0.2rem' }} />Office Visit Required
                          </span>
                        )}
                        {!doc.uploadedAt && !doc.requiresPhysical && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Awaiting Upload</span>
                        )}
                      </div>
                      {doc.description && (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{doc.description}</p>
                      )}
                    </div>
                    {doc.uploadedAt && (
                      <button
                        type="button"
                        onClick={() => handleDownload(doc)}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.75rem', flexShrink: 0 }}
                        disabled={downloadLoading === doc.id}
                      >
                        <i className={`fa-solid ${downloadLoading === doc.id ? 'fa-spinner fa-spin' : 'fa-download'}`} style={{ marginRight: '0.3rem' }} />
                        {downloadLoading === doc.id ? 'Loading…' : 'Download'}
                      </button>
                    )}
                  </div>
                  {downloadError && downloadLoading === null && (
                    <div style={{ fontSize: '0.8125rem', color: '#ef4444', marginTop: '0.375rem' }}>{downloadError}</div>
                  )}

                  {/* Uploaded info */}
                  {doc.uploadedAt && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <i className="fa-solid fa-file" style={{ marginRight: '0.3rem' }} />
                      {doc.originalFileName ?? 'Document'} · Submitted {fmtDate(doc.uploadedAt)}
                      {doc.verifiedAt && <> · Verified {fmtDate(doc.verifiedAt)}</>}
                    </div>
                  )}

                  {/* Physical document notice */}
                  {doc.requiresPhysical && !doc.uploadedAt && (
                    <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: 8, background: '#f5f3ff', border: '1px solid #c4b5fd', fontSize: '0.8125rem', color: '#5b21b6', display: 'flex', gap: '0.5rem', alignItems: 'flex-start', lineHeight: 1.6 }}>
                      <i className="fa-solid fa-building-columns" style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                      <div>
                        <strong>Please visit our office</strong> to present the original document. Our team will verify and upload a certified copy on your behalf.
                        Contact us at <strong>winners@raffleprop.com</strong> to schedule your appointment.
                      </div>
                    </div>
                  )}

                  {/* Upload area for digital docs */}
                  {!doc.requiresPhysical && !doc.verifiedAt && (
                    <div style={{ marginTop: '0.75rem' }}>
                      {doc.uploadedAt ? (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          To replace this file, upload a new one:
                        </div>
                      ) : null}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap', marginTop: doc.uploadedAt ? '0.375rem' : 0 }}>
                        <input
                          ref={(el) => { fileRefs.current[doc.id] = el; }}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          style={{ fontSize: '0.8125rem', flex: 1, minWidth: 0 }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUpload(doc, file);
                          }}
                          disabled={uploadingId === doc.id}
                        />
                        {uploadingId === doc.id && (
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <i className="fa-solid fa-spinner fa-spin" />Uploading…
                          </span>
                        )}
                      </div>
                      {uploadErrors[doc.id] && (
                        <div style={{ fontSize: '0.8125rem', color: '#ef4444', marginTop: '0.375rem' }}>{uploadErrors[doc.id]}</div>
                      )}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
                        Accepted: PDF, JPG, PNG, WEBP (max 10 MB)
                      </div>
                    </div>
                  )}

                  {/* Admin notes */}
                  {doc.notes && (
                    <div style={{ marginTop: '0.625rem', padding: '0.5rem 0.75rem', borderRadius: 6, background: '#eff6ff', border: '1px solid #3b82f620', fontSize: '0.8rem', color: '#1d4ed8' }}>
                      <i className="fa-solid fa-circle-info" style={{ marginRight: '0.3rem' }} />
                      <strong>Note from RaffleProp:</strong> {doc.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
