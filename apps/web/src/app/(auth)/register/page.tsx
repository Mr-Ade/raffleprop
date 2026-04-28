import type { Metadata } from 'next';
import RegisterClient from './_client';

export const metadata: Metadata = {
  title: 'Create Account — RaffleProp',
  description: 'Join RaffleProp and enter property raffle competitions from ₦2,500 per ticket. FCCPC-regulated, escrow-protected.',
  robots: { index: false },
};

export default function RegisterPage() {
  return <RegisterClient />;
}
