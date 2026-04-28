import Link from 'next/link';
import { cms } from '@/lib/cms';

export async function Footer() {
  const settings = await cms.getSettings().catch(() => null);
  const year = new Date().getFullYear();

  const brandDesc = settings?.companyInfo?.brandDescription
    ?? "Nigeria's first FCCPC-regulated property raffle platform. Win your dream home through transparent, compliant ticket draws.";
  const copyrightText = (settings?.companyInfo?.copyrightText ?? `© {year} RaffleProp Ltd. RC 9484205 · FCCPC Registered · All rights reserved.`)
    .replace('{year}', String(year));
  const paymentNote = settings?.companyInfo?.paymentNote
    ?? 'Payments secured by Paystack & Flutterwave';

  const twitterUrl   = settings?.twitterUrl   ?? 'https://twitter.com/raffleprop';
  const instagramUrl = settings?.instagramUrl ?? 'https://instagram.com/raffleprop_ng';
  const facebookUrl  = settings?.facebookUrl  ?? 'https://facebook.com/raffleprop';
  const youtubeUrl   = settings?.youtubeUrl   ?? 'https://youtube.com/@raffleprop';
  const tiktokUrl    = settings?.tiktokUrl    ?? 'https://tiktok.com/@raffleprop';
  const whatsapp     = settings?.whatsappNumber ?? '2348127298167';
  const whatsappUrl  = whatsapp.startsWith('http') ? whatsapp : `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`;
  const linkedinUrl  = settings?.linkedinUrl  ?? null;

  return (
    <footer id="site-footer">
      <div className="container" style={{ paddingTop: '3.5rem', paddingBottom: '2rem' }}>
        <div className="footer-grid">
          {/* Brand column */}
          <div>
            <div className="footer-logo">Raffle<span>Prop</span></div>
            <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.75rem', lineHeight: 1.7, maxWidth: 280 }}>
              {brandDesc}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
              {twitterUrl && (
                <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Twitter">
                  <i className="fa-brands fa-x-twitter" />
                </a>
              )}
              {instagramUrl && (
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Instagram">
                  <i className="fa-brands fa-instagram" />
                </a>
              )}
              {facebookUrl && (
                <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Facebook">
                  <i className="fa-brands fa-facebook-f" />
                </a>
              )}
              {youtubeUrl && (
                <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="YouTube">
                  <i className="fa-brands fa-youtube" />
                </a>
              )}
              {tiktokUrl && (
                <a href={tiktokUrl} target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="TikTok">
                  <i className="fa-brands fa-tiktok" />
                </a>
              )}
              {linkedinUrl && (
                <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="LinkedIn">
                  <i className="fa-brands fa-linkedin-in" />
                </a>
              )}
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="WhatsApp">
                <i className="fa-brands fa-whatsapp" />
              </a>
            </div>
          </div>

          {/* Campaigns */}
          <div>
            <p className="footer-heading">Campaigns</p>
            <Link href="/campaigns" className="footer-link">Active Campaigns</Link>
            <Link href="/campaigns?status=upcoming" className="footer-link">Upcoming</Link>
            <Link href="/winners" className="footer-link">Past Winners</Link>
            <Link href="/how-it-works" className="footer-link">How It Works</Link>
          </div>

          {/* Company */}
          <div>
            <p className="footer-heading">Company</p>
            <Link href="/about" className="footer-link">About Us</Link>
            <Link href="/faq" className="footer-link">FAQ</Link>
            <Link href="/contact" className="footer-link">Contact</Link>
            <Link href="/blog" className="footer-link">Blog</Link>
          </div>

          {/* Legal */}
          <div>
            <p className="footer-heading">Legal</p>
            <Link href="/trust-legal" className="footer-link">Trust &amp; Legal Centre</Link>
            <Link href="/terms" className="footer-link">Terms &amp; Conditions</Link>
            <Link href="/privacy" className="footer-link">Privacy Policy</Link>
            <Link href="/data-rights" className="footer-link">NDPR / Data Rights</Link>
            <Link href="/compliance" className="footer-link">Regulatory Compliance</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <p>{copyrightText}</p>
          <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)' }}>{paymentNote}</p>
        </div>
      </div>
    </footer>
  );
}
