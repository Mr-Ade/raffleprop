import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';
import { AdminSidebarNav, AdminBottomNav } from '@/components/AdminNav';
import type { ReactNode } from 'react';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getServerSession();
  if (!user) redirect('/login?redirect=/admin/dashboard');

  // Only ADMIN and SUPER_ADMIN may access this layout
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Desktop sidebar — client component for active nav state */}
      <AdminSidebarNav userName={user.fullName} userRole={user.role} />

      {/* Main area */}
      <div className="admin-main">
        {children}
      </div>

      {/* Mobile bottom nav */}
      <AdminBottomNav />
    </div>
  );
}
