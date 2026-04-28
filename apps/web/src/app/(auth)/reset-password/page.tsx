import type { Metadata } from 'next';
import ResetPasswordClient from './_client';

export const metadata: Metadata = {
  title: 'New Password — RaffleProp',
  description: 'Set a new password for your RaffleProp account.',
  robots: { index: false },
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
