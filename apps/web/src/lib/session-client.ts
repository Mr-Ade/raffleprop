'use client';

import { useCallback, useEffect, useState } from 'react';

export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
}

interface SessionState {
  user: SessionUser | null;
  loading: boolean;
}

// Module-level cache so all useSession instances share one fetch
let _user: SessionUser | null = null;
let _fetched = false;
let _listeners: Array<() => void> = [];

function notifyListeners() {
  _listeners.forEach((fn) => fn());
}

async function fetchSession(): Promise<SessionUser | null> {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
    const json = await res.json() as { user: SessionUser | null };
    return json.user ?? null;
  } catch {
    return null;
  }
}

export function useSession() {
  const [state, setState] = useState<SessionState>({ user: _user, loading: !_fetched });

  useEffect(() => {
    const update = () => setState({ user: _user, loading: false });
    _listeners.push(update);

    if (!_fetched) {
      fetchSession().then((user) => {
        _user = user;
        _fetched = true;
        notifyListeners();
      });
    } else {
      // Already fetched — sync immediately
      update();
    }

    return () => { _listeners = _listeners.filter((l) => l !== update); };
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } catch { /* ignore */ }
    _user = null;
    _fetched = false;
    notifyListeners();
    window.location.href = '/login';
  }, []);

  const refresh = useCallback(async () => {
    const user = await fetchSession();
    _user = user;
    _fetched = true;
    notifyListeners();
  }, []);

  return { user: state.user, loading: state.loading, logout, refresh };
}

export function getClientUser(): SessionUser | null {
  return _user;
}
