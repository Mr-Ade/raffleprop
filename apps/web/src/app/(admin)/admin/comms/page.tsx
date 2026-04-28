import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAccessToken, getServerSession } from '@/lib/session';
import { CommsClient } from './CommsClient';

export const metadata: Metadata = { title: 'Comms Hub — Admin' };

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export default async function AdminCommsPage() {
  const session = await getServerSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }
  const token = (await getAccessToken()) ?? '';
  return <CommsClient token={token} apiUrl={API} />;
}
