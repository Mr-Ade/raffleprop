import type { Metadata } from 'next';
import { getAccessToken } from '@/lib/session';
import { DrawManagerClient } from './DrawManagerClient';

export const metadata: Metadata = { title: 'Draw Manager — Admin' };

export default async function AdminDrawPage() {
  const token = (await getAccessToken()) ?? '';
  return <DrawManagerClient token={token} />;
}
