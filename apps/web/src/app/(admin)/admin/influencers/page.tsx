import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAccessToken, getServerSession } from '@/lib/session';
import { InfluencersClient } from './InfluencersClient';

export const metadata: Metadata = { title: 'Influencer Hub — Admin' };

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export default async function AdminInfluencersPage() {
  const session = await getServerSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }
  const token = (await getAccessToken()) ?? '';
  return <InfluencersClient token={token} apiUrl={API} />;
}
