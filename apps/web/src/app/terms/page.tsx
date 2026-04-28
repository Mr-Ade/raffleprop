import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms & Conditions — RaffleProp',
  description: 'RaffleProp Terms & Conditions — the rules governing participation in FCCPC-regulated promotional competitions on the RaffleProp platform.',
};

const LAST_UPDATED = '21 April 2026';


export default function TermsPage() {
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
            Terms &amp; Conditions
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Last updated: {LAST_UPDATED}</p>
        </div>
      </div>

      <section style={{ padding: '3rem 1.5rem 5rem' }}>
        <div className="container" style={{ maxWidth: 760 }}>

<Section id="s1" title="1. About RaffleProp">
            <p>RaffleProp Ltd (&ldquo;RaffleProp&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is a company registered with the Corporate Affairs Commission of Nigeria under RC 9484205. We operate a FCCPC-regulated promotional competition platform for real property. Our registered office is 36 Minfa Crescent, Karu, Nigeria.</p>
          </Section>

          <Section id="s2" title="2. Nature of the Competition">
            <p>RaffleProp operates Promotional Competitions as defined under the Federal Competition &amp; Consumer Protection Act (FCCPA) 2018. All competitions require participants to correctly answer a skill-based question to enter. Participation is not a lottery or game of chance.</p>
          </Section>

          <Section id="s3" title="3. Eligibility">
            <p>You must be: (a) at least 18 years of age; (b) a Nigerian citizen or resident, including Nigerian citizens residing abroad (diaspora); (c) not an employee, director, agent or immediate family member of RaffleProp or its partners. By purchasing a ticket, you confirm you meet these criteria.</p>
          </Section>

          <Section id="s4" title="4. Ticket Purchase">
            <p>Tickets are sold at the price shown on each campaign page. All payments must be made through our approved payment gateways (Paystack, Flutterwave). A FCCPA §118-compliant receipt is issued for every purchase. Tickets are non-transferable and non-refundable except as stated in Section 7.</p>
          </Section>

          <Section id="s5" title="5. The Draw">
            <p>Draws are conducted using a cryptographically verifiable random number generator (random.org signed seed), in the presence of an independent property lawyer, notary public, and escrow bank representative. Draws are live-streamed on YouTube and archived permanently. The FCCPC is notified of the result within 24 hours per FCCPA §124.</p>
          </Section>

          <Section id="s6" title="6. Winner Notification & Title Transfer">
            <p>The winner is contacted within 3 days of the draw. Identity verification (BVN + NIN) is required. RaffleProp covers all legal fees for the Deed of Assignment and title transfer. Title transfer typically completes within 30–60 days. No prize is transferable to a third party.</p>
          </Section>

          <Section id="s7" title="7. Refunds">
            <p>A full refund is automatically issued within 3–5 business days if: (a) the minimum ticket threshold is not reached by the draw date; (b) RaffleProp cancels the campaign for any reason. Once the minimum threshold is reached, tickets are non-refundable except in the event of RaffleProp cancellation.</p>
          </Section>

          <Section id="s8" title="8. Escrow">
            <p>All ticket proceeds are held in a ring-fenced escrow account at the bank named on each campaign page. Funds are released to RaffleProp only after the draw is completed and the FCCPC winner list is verified. The escrow bank and account number are published on every campaign page.</p>
          </Section>

          <Section id="s9" title="9. Limitation of Liability">
            <p>To the extent permitted by Nigerian law, RaffleProp&apos;s liability to any participant shall not exceed the total amount paid by that participant for tickets in the relevant campaign. RaffleProp is not liable for indirect, consequential or incidental losses.</p>
          </Section>

          <Section id="s10" title="10. Governing Law">
            <p>These Terms are governed by and construed in accordance with the laws of the Federal Republic of Nigeria. Any disputes shall be subject to the exclusive jurisdiction of the courts of Lagos State.</p>
          </Section>

          <Section id="s11" title="11. Data Protection">
            <p>RaffleProp collects and processes your personal data in accordance with our <Link href="/privacy" style={{ color: 'var(--green-primary)' }}>Privacy Policy</Link> and the Nigeria Data Protection Regulation (NDPR) 2019. By registering on the platform you consent to such processing. You may exercise your data rights — including access, correction, and deletion — via your account dashboard or by emailing <a href="mailto:privacy@raffleprop.com" style={{ color: 'var(--green-primary)' }}>privacy@raffleprop.com</a>.</p>
          </Section>

          <Section id="s12" title="12. User Accounts & Conduct">
            <p>Each individual may hold only one RaffleProp account. Creating multiple accounts, submitting false identity information, or attempting to manipulate the draw by any means is prohibited and will result in immediate disqualification, account suspension, and forfeiture of all tickets purchased. RaffleProp reserves the right to suspend or terminate any account where fraudulent activity is suspected, without prior notice.</p>
          </Section>

          <Section id="s13" title="13. Amendments">
            <p>RaffleProp may update these Terms at any time. Where changes are material, registered users will be notified by email at least 7 days before the changes take effect. Continued use of the platform after that date constitutes acceptance of the updated Terms. The date at the top of this page always reflects the most recent revision.</p>
          </Section>

          <Section id="s14" title="14. Severability">
            <p>If any provision of these Terms is found to be invalid, unlawful, or unenforceable by a court of competent jurisdiction, that provision shall be deemed severed from the remaining Terms, which shall continue in full force and effect.</p>
          </Section>

          <Section id="s15" title="15. Contact">
            <p>For legal enquiries: <a href="mailto:legal@raffleprop.com" style={{ color: 'var(--green-primary)' }}>legal@raffleprop.com</a>. For general enquiries: <a href="mailto:hello@raffleprop.com" style={{ color: 'var(--green-primary)' }}>hello@raffleprop.com</a>.</p>
          </Section>

          {/* Related documents */}
          <div style={{
            borderTop: '1px solid var(--border-light)', paddingTop: '2rem', marginTop: '1rem',
            display: 'flex', gap: '0.75rem', flexWrap: 'wrap',
          }}>
            <Link href="/privacy" className="btn btn-outline btn-sm">
              <i className="fa-solid fa-lock" style={{ marginRight: '0.375rem' }} />
              Privacy Policy
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
