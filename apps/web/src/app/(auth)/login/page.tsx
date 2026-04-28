import type { Metadata } from 'next';
import LoginClient from './_client';

export const metadata: Metadata = {
  title: 'Sign In — RaffleProp',
  description: 'Sign in to your RaffleProp account using email or phone OTP.',
  robots: { index: false },
};

export default function LoginPage() {
  return <LoginClient />;
}
