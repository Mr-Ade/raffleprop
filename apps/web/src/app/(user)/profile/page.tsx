import type { Metadata } from 'next';
import ProfileClient from './_client';

export const metadata: Metadata = {
  title: 'My Profile — RaffleProp',
  description: 'Manage your RaffleProp account details, password, and KYC verification.',
  robots: { index: false },
};

export default function ProfilePage() {
  return <ProfileClient />;
}
