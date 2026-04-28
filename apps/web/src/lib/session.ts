import { cookies } from 'next/headers';

export interface ServerSessionUser {
  id: string;
  fullName: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
}

/**
 * Decode the JWT stored in the rp_access httpOnly cookie.
 * This runs only in Server Components / Route Handlers.
 * Does NOT verify the signature — signature verification happens in the API.
 */
export async function getServerSession(): Promise<ServerSessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('rp_access')?.value;
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    return {
      id: payload.sub ?? payload.userId,
      fullName: payload.fullName ?? payload.name ?? '',
      email: payload.email ?? '',
      role: payload.role ?? 'USER',
    };
  } catch {
    return null;
  }
}

/**
 * Get the raw access token for forwarding to the API.
 */
export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('rp_access')?.value ?? null;
}
