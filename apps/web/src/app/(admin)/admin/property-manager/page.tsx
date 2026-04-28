import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAccessToken, getServerSession } from '@/lib/session';
import { PropertyManager } from './PropertyManager';

export const metadata: Metadata = { title: 'Property Manager — Admin' };

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export default async function AdminPropertyManagerPage() {
  const session = await getServerSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }
  const token = (await getAccessToken()) ?? '';
  return <PropertyManager token={token} apiUrl={API_BASE} />;
}
