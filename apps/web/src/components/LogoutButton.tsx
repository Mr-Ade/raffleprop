'use client';

import { useSession } from '@/lib/session-client';

export function LogoutButton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const { logout } = useSession();

  return (
    <button type="button" onClick={logout} className={className} style={style}>
      <i className="fa-solid fa-right-from-bracket" style={{ color: '#dc2626' }} />
      Log Out
    </button>
  );
}
