import type { Metadata } from 'next';
import NdprClient from './_client';

export const metadata: Metadata = {
  title: 'Data & Privacy — RaffleProp',
  description: 'Exercise your NDPR data rights — download or request deletion of your personal data from RaffleProp.',
  robots: { index: false },
};

export default function NdprPage() {
  return <NdprClient />;
}
