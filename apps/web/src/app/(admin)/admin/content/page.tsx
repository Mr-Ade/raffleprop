import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAccessToken, getServerSession } from '@/lib/session';
import { ContentManager } from './ContentManager';

export const metadata: Metadata = { title: 'Content Management — Admin' };

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

async function fetchAllContent(token: string) {
  try {
    const res = await fetch(`${API_BASE}/api/admin/content`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json() as {
      success: boolean;
      data: {
        settings: Record<string, unknown>;
        faqs: unknown[];
        testimonials: unknown[];
        winners: unknown[];
        trustBadges: unknown[];
        howItWorksSteps: unknown[];
        team: unknown[];
        milestones: unknown[];
      };
    };
    return json.success ? json.data : null;
  } catch { return null; }
}

export default async function AdminContentPage() {
  const session = await getServerSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const token = (await getAccessToken()) ?? '';
  const content = await fetchAllContent(token);

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Content Management</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Edit every section, text, image, and feature of the public site
          </p>
        </div>
      </div>
      <div className="admin-content">
        <ContentManager
          initialSettings={(content?.settings ?? {}) as SiteSettings}
          initialFaqs={(content?.faqs ?? []) as Faq[]}
          initialTestimonials={(content?.testimonials ?? []) as Testimonial[]}
          initialWinners={(content?.winners ?? []) as WinnerStory[]}
          initialTrustBadges={(content?.trustBadges ?? []) as TrustBadge[]}
          initialHowItWorks={(content?.howItWorksSteps ?? []) as HowItWorksStep[]}
          initialTeam={(content?.team ?? []) as TeamMember[]}
          initialMilestones={(content?.milestones ?? []) as CompanyMilestone[]}
          token={token}
          apiUrl={API_BASE}
        />
      </div>
    </>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SiteSettings {
  id?: string;
  siteName?: string;
  tagline?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  whatsappNumber?: string | null;
  twitterUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  youtubeUrl?: string | null;
  tiktokUrl?: string | null;
  linkedinUrl?: string | null;
  maintenanceMode?: boolean;
  maintenanceBanner?: string | null;
  footerTagline?: string | null;
  termsUrl?: string | null;
  privacyUrl?: string | null;
  // Homepage sections (JSON fields)
  heroSection?: { badgeText?: string; heading?: string; subheading?: string } | null;
  heroStats?: Array<{ label: string; value: string }> | null;
  statsSection?: Array<{ label: string; value: string }> | null;
  ctaBanner?: { heading?: string; subtext?: string; primaryButtonLabel?: string; secondaryButtonLabel?: string } | null;
  notificationSection?: { heading?: string; subtext?: string } | null;
  // Company / footer
  companyInfo?: {
    cacNumber?: string;
    fccpcRef?: string;
    lslgaRef?: string;
    scumlRef?: string;
    brandDescription?: string;
    paymentNote?: string;
    copyrightText?: string;
    lawyerName?: string;
    lawyerFirm?: string;
    dpoName?: string;
    privacyEmail?: string;
  } | null;
  // About
  aboutMission?: { heading?: string; paragraphs?: string[] } | null;
  aboutValues?: Array<{ icon?: string; title?: string; body?: string }> | null;
  // Blog
  blogTopics?: Array<{ icon?: string; label?: string }> | null;
  // Document Vault
  documentVault?: Array<{ slot: string; label: string; url?: string | null; r2Key?: string | null }> | null;
  updatedAt?: string;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
  published: boolean;
  createdAt?: string;
}

export interface Testimonial {
  id: string;
  authorName: string;
  authorTitle?: string | null;
  avatarKey?: string | null;
  body: string;
  rating: number;
  published: boolean;
  featured: boolean;
  order: number;
  createdAt?: string;
}

export interface WinnerStory {
  id: string;
  winnerName: string;
  propertyTitle: string;
  propertyState?: string | null;
  prize?: string | null;
  drawDate?: string | null;
  imageKey?: string | null;
  blurb?: string | null;
  drawArchiveUrl?: string | null;
  published: boolean;
  featured: boolean;
  order: number;
  campaignId?: string | null;
  createdAt?: string;
}

export interface TrustBadge {
  id: string;
  text: string;
  iconClass: string;
  order: number;
  enabled: boolean;
  createdAt?: string;
}

export interface HowItWorksStep {
  id: string;
  stepNumber: number;
  icon?: string | null;
  title: string;
  description: string;
  order: number;
  published: boolean;
  createdAt?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  title: string;
  bio: string;
  photoKey?: string | null;
  initials?: string | null;
  avatarColor?: string | null;
  linkedinUrl?: string | null;
  order: number;
  published: boolean;
  createdAt?: string;
}

export interface CompanyMilestone {
  id: string;
  year: string;
  heading: string;
  description: string;
  order: number;
  published: boolean;
  createdAt?: string;
}
