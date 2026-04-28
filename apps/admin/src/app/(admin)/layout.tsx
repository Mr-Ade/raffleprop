import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/session';
import { AdminSidebar } from '@/components/AdminSidebar';
import '../globals.css';

export default async function AdminShellLayout({ children }: { children: ReactNode }) {
  const admin = await getAdminSession();
  if (!admin) redirect('/login');

  return (
    <>
      <AdminSidebar user={admin} />
      <div className="admin-main">
        {children}
      </div>
      {/* Mobile bottom nav */}
      <nav className="admin-bottom-nav" aria-label="Admin mobile navigation">
        <a href="/" className="abn-item"><i className="fa-solid fa-gauge-high" /><span>Dashboard</span></a>
        <a href="/campaigns" className="abn-item"><i className="fa-solid fa-house" /><span>Campaigns</span></a>
        <a href="/users" className="abn-item"><i className="fa-solid fa-users" /><span>Users</span></a>
        <a href="/compliance" className="abn-item"><i className="fa-solid fa-scale-balanced" /><span>Comply</span></a>
        <a href="/refund-manager" className="abn-item"><i className="fa-solid fa-rotate-left" /><span>Refunds</span></a>
      </nav>
    </>
  );
}
