import type { Metadata } from 'next';
import AdminCalculator from '@/components/AdminCalculator';

export const metadata: Metadata = { title: 'Campaign Calculator — Admin' };

export default function CalculatorPage() {
  return <AdminCalculator />;
}
