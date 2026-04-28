'use client';
import { useState } from 'react';

const ROLES = ['USER', 'ADMIN', 'SUPER_ADMIN'] as const;
type Role = (typeof ROLES)[number];

const ROLE_LABEL: Record<Role, string> = {
  USER: 'User',
  ADMIN: 'Admin',
  SUPER_ADMIN: 'Super Admin',
};

export function ChangeRoleButton({
  userId,
  currentRole,
  isSelf,
  token,
  apiUrl,
}: {
  userId: string;
  currentRole: Role;
  isSelf: boolean;
  token: string;
  apiUrl: string;
}) {
  const [selected, setSelected] = useState<Role>(currentRole as Role);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [appliedRole, setAppliedRole] = useState<Role>(currentRole as Role);

  async function handleApply() {
    if (selected === appliedRole) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: selected }),
      });
      const json = await res.json() as { success: boolean; error?: string; data?: { role: string } };
      if (!json.success) { setError(json.error ?? 'Failed to update role'); return; }
      setAppliedRole(selected);
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
      <div style={{ fontSize: '0.8125rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Change Role</span>
        <span style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: 500 }}>Super Admin only</span>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={selected}
          onChange={e => { setSelected(e.target.value as Role); setError(''); }}
          className="form-select"
          style={{ fontSize: '0.8125rem', padding: '0.375rem 0.625rem', flex: 1, minWidth: 140 }}
          disabled={loading || isSelf}
        >
          {ROLES.map(r => (
            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleApply}
          disabled={loading || selected === appliedRole || isSelf}
          className="btn btn-sm btn-primary"
          style={{ whiteSpace: 'nowrap' }}
        >
          {loading ? 'Saving…' : 'Apply'}
        </button>
      </div>
      {isSelf && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
          You cannot change your own role.
        </p>
      )}
      {appliedRole !== currentRole && !error && (
        <p style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '0.375rem' }}>
          Role updated to {ROLE_LABEL[appliedRole]}.
        </p>
      )}
      {error && <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.375rem' }}>{error}</p>}
    </div>
  );
}
