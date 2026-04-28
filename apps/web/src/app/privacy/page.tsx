import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — RaffleProp',
  description: 'How RaffleProp collects, uses, and protects your personal data under the Nigeria Data Protection Regulation (NDPR) 2019.',
};

const LAST_UPDATED = '21 April 2026';


export default function PrivacyPage() {
  const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
    <div id={id} style={{ marginBottom: '2rem', scrollMarginTop: '80px' }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>{title}</h2>
      <div style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>{children}</div>
    </div>
  );

  return (
    <main id="main-content">

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0a3a1e 0%, #0D5E30 100%)', padding: '3rem 1.5rem 2.5rem', paddingTop: 'calc(3rem + 65px)' }}>
        <div className="container">
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 900, color: '#fff', margin: '0 0 0.5rem', letterSpacing: '-0.03em' }}>
            Privacy Policy
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Last updated: {LAST_UPDATED} · Governed by the NDPR 2019</p>
        </div>
      </div>

      <section style={{ padding: '3rem 1.5rem 5rem' }}>
        <div className="container" style={{ maxWidth: 760 }}>

<Section id="p1" title="1. Data Controller">
            <p>RaffleProp Ltd, 36 Minfa Crescent, Karu, Nigeria (RC 9484205) is the Data Controller for all personal data collected through this platform. Our Data Protection Officer can be reached at <a href="mailto:privacy@raffleprop.com" style={{ color: 'var(--green-primary)' }}>privacy@raffleprop.com</a>.</p>
          </Section>

          <Section id="p2" title="2. Data We Collect">
            <p>We collect the following categories of personal data:</p>
            <ul className="legal-list legal-list-2col">
              <li>Identity: full name, date of birth</li>
              <li>Contact: email address, phone number</li>
              <li>Government ID: BVN (encrypted), NIN (encrypted)</li>
              <li>Technical: IP address, device, browser, OS</li>
              <li>Transaction: ticket history, payment references</li>
              <li>Usage: pages visited, campaign interactions</li>
            </ul>
            <p style={{ marginTop: '0.75rem' }}>We never collect or store raw card numbers. All card payments are processed directly on Paystack or Flutterwave&apos;s PCI-DSS compliant hosted pages.</p>
          </Section>

          <Section id="p3" title="3. How We Use Your Data">
            <p>We use your personal data for the following purposes:</p>
            <ul className="legal-list legal-list-2col">
              <li>Process ticket purchases and issue FCCPA §118 receipts</li>
              <li>Verify your identity when you win (BVN + NIN matching)</li>
              <li>Send campaign receipts, draw notifications, and account alerts</li>
              <li>Send marketing communications (with your consent only)</li>
              <li>Comply with AML/KYC obligations under SCUML regulations</li>
              <li>Respond to NDPR data subject requests</li>
              <li>Detect and prevent fraud and multiple accounts</li>
              <li>Report draw results to the FCCPC per FCCPA §124</li>
            </ul>
          </Section>

          <Section id="p4" title="4. Legal Basis for Processing">
            <p>Under the NDPR 2019, we process your data on the following lawful bases:</p>
            <ul className="legal-list">
              <li><strong>Contract:</strong> processing necessary to deliver the ticket purchase and competition service you have entered into</li>
              <li><strong>Legal obligation:</strong> KYC/AML verification, FCCPA §118 record-keeping, and FCCPC reporting</li>
              <li><strong>Consent:</strong> marketing communications — withdraw at any time via account settings or by emailing privacy@raffleprop.com</li>
              <li><strong>Legitimate interest:</strong> fraud prevention and platform security, where our interests do not override your rights</li>
            </ul>
          </Section>

          <Section id="p5" title="5. BVN & NIN Encryption">
            <p>BVN and NIN data are encrypted at rest using AES-256-GCM before storage. Decryption occurs only during KYC verification for winner identity confirmation. These fields are never logged, displayed, or transmitted in plain text. Encryption keys are stored separately from the encrypted data and are rotated periodically.</p>
          </Section>

          <Section id="p6" title="6. Data Sharing">
            <p>We share your data only where strictly necessary:</p>
            <ul className="legal-list">
              <li><strong>Escrow bank:</strong> winner identity verification only (BVN/NIN matching)</li>
              <li><strong>Payment gateways (Paystack, Flutterwave):</strong> transaction processing — they receive only the data required to process payment</li>
              <li><strong>FCCPC:</strong> draw results and winner details as required by FCCPA §124</li>
              <li><strong>Property lawyers:</strong> winner contact details for Deed of Assignment preparation</li>
            </ul>
            <p style={{ marginTop: '0.75rem' }}>We never sell, rent, or trade your personal data to any third party for commercial purposes.</p>
          </Section>

          <Section id="p7" title="7. Security Measures">
            <p>We apply the following technical and organisational security measures:</p>
            <ul className="legal-list legal-list-2col">
              <li>All data in transit encrypted via TLS 1.3</li>
              <li>BVN/NIN encrypted at rest with AES-256-GCM</li>
              <li>Regulatory documents stored in WORM (write-once) storage</li>
              <li>Access to personal data restricted on a need-to-know basis</li>
              <li>Admin accounts require two-factor authentication (TOTP)</li>
              <li>No PII written to application logs in plain text</li>
              <li>All data access events recorded in an append-only audit log</li>
            </ul>
          </Section>

          <Section id="p8" title="8. Your NDPR Rights">
            <p>Under the Nigeria Data Protection Regulation 2019, you have the following rights:</p>
            <ul className="legal-list legal-list-2col">
              <li><strong>Access:</strong> request a full export of your data</li>
              <li><strong>Rectification:</strong> correct inaccurate or incomplete data</li>
              <li><strong>Erasure:</strong> request anonymisation (subject to FCCPA §118 retention for ticket records)</li>
              <li><strong>Withdraw consent:</strong> opt out of marketing at any time</li>
              <li><strong>Portability:</strong> receive your data in a machine-readable format</li>
              <li><strong>Complaint:</strong> lodge a complaint with NITDA</li>
            </ul>
            <p style={{ marginTop: '0.75rem' }}>
              Exercise your rights at the <Link href="/data-rights" style={{ color: 'var(--green-primary)' }}>NDPR / Data Rights</Link> page or by emailing <a href="mailto:privacy@raffleprop.com" style={{ color: 'var(--green-primary)' }}>privacy@raffleprop.com</a>. We respond within 30 days as required by NDPR.
            </p>
          </Section>

          <Section id="p9" title="9. Data Retention">
            <p>We retain personal data for the following periods:</p>
            <ul className="legal-list">
              <li><strong>Account data</strong> (name, email, phone): retained while your account is active, then anonymised within 30 days of a verified deletion request</li>
              <li><strong>BVN/NIN (encrypted):</strong> retained only while your account is active; deleted upon account anonymisation</li>
              <li><strong>Ticket and transaction records:</strong> retained permanently as required by FCCPA §118 — this legal obligation overrides the NDPR right to erasure for regulatory records</li>
              <li><strong>Financial/audit records:</strong> retained for 7 years for tax and audit purposes</li>
              <li><strong>Marketing consent records:</strong> retained indefinitely as proof of consent, even after withdrawal</li>
            </ul>
          </Section>

          <Section id="p10" title="10. Cookies">
            <p>We use only essential session cookies required for authentication and security. We do not use advertising, tracking, or analytics cookies. No third-party scripts (Google Analytics, Meta Pixel, etc.) are loaded without your explicit consent.</p>
          </Section>

          <Section id="p11" title="11. Children's Privacy">
            <p>RaffleProp is intended for users aged 18 and over. We do not knowingly collect personal data from individuals under the age of 18. If you believe we have inadvertently collected data from a minor, please contact us at <a href="mailto:privacy@raffleprop.com" style={{ color: 'var(--green-primary)' }}>privacy@raffleprop.com</a> and we will delete it promptly.</p>
          </Section>

          <Section id="p12" title="12. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. Where changes are material, we will notify registered users by email at least 7 days before the changes take effect. The date at the top of this page always reflects the most recent revision. Continued use of the platform after the effective date constitutes acceptance of the updated policy.</p>
          </Section>

          <Section id="p13" title="13. Contact & Complaints">
            <p>
              For any privacy-related enquiries or to exercise your data rights, contact our Data Protection Officer at{' '}
              <a href="mailto:privacy@raffleprop.com" style={{ color: 'var(--green-primary)' }}>privacy@raffleprop.com</a>.
            </p>
            <p style={{ marginTop: '0.75rem' }}>
              If you are not satisfied with our response, you have the right to lodge a complaint with <strong>NITDA</strong> (National Information Technology Development Agency), the NDPR supervisory authority, at <a href="https://nitda.gov.ng" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--green-primary)' }}>nitda.gov.ng</a>.
            </p>
          </Section>

          {/* Related documents */}
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '2rem', marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link href="/terms" className="btn btn-outline btn-sm">
              <i className="fa-solid fa-file-contract" style={{ marginRight: '0.375rem' }} />
              Terms &amp; Conditions
            </Link>
            <Link href="/data-rights" className="btn btn-outline btn-sm">
              <i className="fa-solid fa-file-export" style={{ marginRight: '0.375rem' }} />
              NDPR / Data Rights
            </Link>
            <Link href="/compliance" className="btn btn-outline btn-sm">
              <i className="fa-solid fa-building-columns" style={{ marginRight: '0.375rem' }} />
              Regulatory Compliance
            </Link>
            <Link href="/contact" className="btn btn-outline btn-sm">
              <i className="fa-solid fa-envelope" style={{ marginRight: '0.375rem' }} />
              Contact Us
            </Link>
          </div>

        </div>
      </section>
    </main>
  );
}
