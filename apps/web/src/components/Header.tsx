'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useSession } from '@/lib/session-client';

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useSession();
  const menuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // Close mobile menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      // Ignore clicks on the hamburger button itself — its own onClick handles toggling
      if (hamburgerRef.current?.contains(e.target as Node)) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const isActive = (key: string) => {
    if (key === 'campaigns') return pathname.startsWith('/campaigns');
    if (key === 'how') return pathname === '/how-it-works';
    if (key === 'winners') return pathname === '/winners';
    if (key === 'about') return pathname === '/about';
    if (key === 'faq') return pathname === '/faq';
    return false;
  };

  return (
    <>
      <header id="site-header" className={scrolled ? 'scrolled' : ''}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '65px' }}>
          <Link href="/" className="nav-logo">Raffle<span>Prop</span></Link>

          {/* Desktop nav */}
          <nav className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Link href="/campaigns" className={`nav-link${isActive('campaigns') ? ' active' : ''}`}>Campaigns</Link>
            <Link href="/how-it-works" className={`nav-link${isActive('how') ? ' active' : ''}`}>How It Works</Link>
            <Link href="/winners" className={`nav-link${isActive('winners') ? ' active' : ''}`}>Winners</Link>
            <Link href="/about" className={`nav-link${isActive('about') ? ' active' : ''}`}>About</Link>
            <Link href="/faq" className={`nav-link${isActive('faq') ? ' active' : ''}`}>FAQ</Link>
          </nav>

          {/* Desktop actions */}
          <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--green-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8125rem' }}>
                    {user.fullName?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  {user.fullName?.split(' ')[0] ?? 'Account'}
                </Link>
                <button type="button" onClick={logout} className="btn-nav-login">Logout</button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-nav-login">Log In</Link>
                <Link href="/campaigns" className="btn-nav-cta">Buy Tickets</Link>
              </>
            )}
          </div>

          {/* Hamburger */}
          <button
            type="button"
            ref={hamburgerRef}
            id="hamburger"
            className="mobile-only btn-icon"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            style={{ background: 'none', fontSize: '1.25rem', color: 'var(--text-primary)' }}
          >
            <i className={menuOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars'} />
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      <div id="mobile-menu" ref={menuRef} className={`mobile-menu${menuOpen ? ' open' : ''}`} role="navigation">
        <Link href="/campaigns">Campaigns</Link>
        <Link href="/how-it-works">How It Works</Link>
        <Link href="/winners">Winners</Link>
        <Link href="/about">About</Link>
        <Link href="/faq">FAQ</Link>
        <Link href="/contact">Contact</Link>
        {user ? (
          <>
            <Link href="/dashboard">My Dashboard</Link>
            <Link href="/tickets">My Tickets</Link>
            <button
              type="button"
              onClick={logout}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', color: '#dc2626', fontWeight: 500, cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit', fontSize: '1rem', borderRadius: 'var(--radius-sm)', transition: 'background var(--transition)' }}
            >
              Log Out
            </button>
          </>
        ) : (
          <>
            <Link href="/login">Log In</Link>
            <Link href="/campaigns" className="btn-mobile-cta">Buy Tickets</Link>
          </>
        )}
      </div>
    </>
  );
}
