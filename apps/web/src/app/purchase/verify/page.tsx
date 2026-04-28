import type { Metadata } from 'next';
import PurchaseVerifyClient from './_client';

export const metadata: Metadata = {
  title: 'Payment Confirmation — RaffleProp',
  description: 'Confirming your ticket purchase on RaffleProp.',
  robots: { index: false },
};

export default function PurchaseVerifyPage() {
  return <PurchaseVerifyClient />;
}
