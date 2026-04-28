import type { Metadata } from 'next';
import ForgotPasswordClient from './_client';

export const metadata: Metadata = {
  title: 'Reset Password — RaffleProp',
  description: 'Request a password reset link for your RaffleProp account.',
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
