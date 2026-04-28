import type { Metadata } from 'next';
import VerifyPhoneClient from './_client';

export const metadata: Metadata = {
  title: 'Verify Phone — RaffleProp',
  description: 'Enter the OTP sent to your phone to verify your RaffleProp account.',
  robots: { index: false },
};

export default function VerifyPhonePage() {
  return <VerifyPhoneClient />;
}
