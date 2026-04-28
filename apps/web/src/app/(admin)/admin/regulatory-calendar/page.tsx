import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAccessToken, getServerSession } from '@/lib/session';
import { RegulatoryCalendar } from './RegulatoryCalendar';

export const metadata: Metadata = { title: 'Regulatory Calendar — Admin' };

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export default async function AdminRegulatoryCalendarPage() {
  const session = await getServerSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }
  const token = (await getAccessToken()) ?? '';
  return <RegulatoryCalendar token={token} apiUrl={API_BASE} />;
}
