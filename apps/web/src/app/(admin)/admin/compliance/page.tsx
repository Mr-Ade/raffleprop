import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAccessToken, getServerSession } from '@/lib/session';
import { ComplianceManager } from './ComplianceManager';

export const metadata: Metadata = { title: 'FCCPC Approvals — Admin' };

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export default async function AdminCompliancePage() {
  const session = await getServerSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }
  const token = (await getAccessToken()) ?? '';
  return <ComplianceManager token={token} apiUrl={API_BASE} />;
}
