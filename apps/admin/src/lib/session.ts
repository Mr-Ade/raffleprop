import { cookies } from 'next/headers';

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
}

export async function getAdminSession(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('rp_admin')?.value;
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    if (!['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) return null;
    return { id: payload.sub, fullName: payload.fullName ?? '', email: payload.email ?? '', role: payload.role };
  } catch { return null; }
}

export async function getAdminToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('rp_admin')?.value ?? null;
}
