'use client';

import { useRef, useState } from 'react';

const R2_PUBLIC_URL = process.env['NEXT_PUBLIC_R2_PUBLIC_URL'] ?? '';

type Purpose = 'team_photo' | 'testimonial_avatar' | 'winner_photo' | 'content_media';

interface Props {
  purpose: Purpose;
  entityId: string;
  currentKey?: string | null | undefined;
  onUploaded: (key: string) => void;
  token: string;
  apiUrl: string;
  label?: string;
  /** Size hint for the preview: 'sm' = 48px, 'md' = 80px (default), 'lg' = 120px */
  size?: 'sm' | 'md' | 'lg';
  /** Override the file input accept attribute. Defaults to "image/*" */
  accept?: string;
  /** When true, skips the image-only type guard (for document uploads) */
  allowAnyFile?: boolean;
}

const SIZE_MAP: Record<NonNullable<Props['size']>, number> = { sm: 48, md: 80, lg: 120 };

export function ContentImageUpload({
  purpose,
  entityId,
  currentKey,
  onUploaded,
  token,
  apiUrl,
  label = 'Upload Image',
  size = 'md',
  accept = 'image/*',
  allowAnyFile = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [previewSrc, setPreviewSrc] = useState<string | null>(
    currentKey ? `${R2_PUBLIC_URL}/${currentKey}` : null,
  );

  const px = SIZE_MAP[size];

  async function handleFile(file: File) {
    // Client-side guards
    if (!allowAnyFile && !file.type.startsWith('image/')) {
      setErrorMsg('Please select an image file.');
      setStatus('error');
      return;
    }
    const maxSize = allowAnyFile ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMsg(`File must be under ${allowAnyFile ? '20' : '5'} MB.`);
      setStatus('error');
      return;
    }

    setStatus('uploading');
    setErrorMsg('');

    try {
      // 1. Get presigned upload URL from API
      const presignRes = await fetch(`${apiUrl}/api/admin/storage/presign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ purpose, entityId, mimeType: file.type }),
      });

      if (!presignRes.ok) {
        const err = (await presignRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Presign failed (${presignRes.status})`);
      }

      const presignJson = (await presignRes.json()) as { success: boolean; data: { uploadUrl: string; key: string } };
      const { uploadUrl, key } = presignJson.data;

      // 2. Upload file directly to R2
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadRes.ok) throw new Error(`R2 upload failed (${uploadRes.status})`);

      // 3. Show preview and notify parent
      setPreviewSrc(`${R2_PUBLIC_URL}/${key}`);
      setStatus('done');
      onUploaded(key);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed');
      setStatus('error');
    }
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    // Reset input so the same file can be re-selected after an error
    e.target.value = '';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {/* Preview */}
      <div
        style={{
          width: px, height: px, borderRadius: size === 'sm' ? 6 : 10,
          border: '1px solid var(--border-light)',
          background: 'var(--bg-secondary)',
          overflow: 'hidden', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: px * 0.35,
          color: 'var(--text-muted)',
        }}
      >
        {previewSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewSrc}
            alt="Preview"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <i className="fa-solid fa-image" />
        )}
      </div>

      {/* Upload button */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        aria-label={label}
        style={{ display: 'none' }}
        onChange={onChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={status === 'uploading'}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.35rem 0.75rem',
          fontSize: '0.8rem', fontWeight: 600,
          background: 'var(--card-bg)',
          border: '1px solid var(--border-light)',
          borderRadius: 6, cursor: status === 'uploading' ? 'wait' : 'pointer',
          color: 'var(--text-secondary)',
          opacity: status === 'uploading' ? 0.7 : 1,
        }}
      >
        {status === 'uploading' ? (
          <>
            <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '0.75rem' }} />
            Uploading…
          </>
        ) : status === 'done' ? (
          <>
            <i className="fa-solid fa-check" style={{ color: 'var(--green-primary)', fontSize: '0.75rem' }} />
            {label}
          </>
        ) : (
          <>
            <i className="fa-solid fa-arrow-up-from-bracket" style={{ fontSize: '0.75rem' }} />
            {label}
          </>
        )}
      </button>

      {/* Status messages */}
      {status === 'error' && (
        <p style={{ fontSize: '0.75rem', color: '#dc2626', margin: 0 }}>
          <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.3rem' }} />
          {errorMsg}
        </p>
      )}
      {status === 'done' && (
        <p style={{ fontSize: '0.75rem', color: 'var(--green-primary)', margin: 0 }}>
          <i className="fa-solid fa-circle-check" style={{ marginRight: '0.3rem' }} />
          Uploaded successfully
        </p>
      )}
    </div>
  );
}
