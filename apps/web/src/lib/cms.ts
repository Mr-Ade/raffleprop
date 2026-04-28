/**
 * CMS fetch library — typed, ISR-aware.
 *
 * All functions use Next.js `next: { revalidate }` for ISR.
 * Every call wraps in .catch(() => null | []) so a CMS outage never
 * takes down the public site — callers fall back to hardcoded defaults.
 */

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const BASE = `${API_URL}/api/content`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CmsSettings {
  // Social / contact
  twitterUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  youtubeUrl?: string | null;
  whatsappNumber?: string | null;
  supportEmail?: string | null;
  tiktokUrl?: string | null;
  linkedinUrl?: string | null;
  // Homepage sections
  heroSection?: { badgeText?: string; heading?: string; subheading?: string } | null;
  heroStats?: Array<{ label: string; value: string }> | null;
  statsSection?: Array<{ label: string; value: string }> | null;
  ctaBanner?: {
    heading?: string;
    subtext?: string;
    primaryButtonLabel?: string;
    secondaryButtonLabel?: string;
  } | null;
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
  // Misc
  siteName?: string | null;
  tagline?: string | null;
  footerTagline?: string | null;
  termsUrl?: string | null;
  privacyUrl?: string | null;
  maintenanceMode?: boolean | null;
  maintenanceBanner?: string | null;
}

export interface CmsFaq {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
}

export interface CmsTestimonial {
  id: string;
  authorName: string;
  authorTitle?: string | null;
  body: string;
  rating: number;
  avatarKey?: string | null;
  featured: boolean;
  order: number;
}

export interface CmsWinner {
  id: string;
  winnerName: string;
  propertyState?: string | null;
  propertyTitle: string;
  prize?: string | null;
  blurb?: string | null;
  imageKey?: string | null;
  drawDate?: string | null;
  drawArchiveUrl?: string | null;
  featured: boolean;
}

export interface CmsTrustBadge {
  id: string;
  text: string;
  iconClass: string;
  order: number;
}

export interface CmsHowItWorksStep {
  id: string;
  stepNumber: number;
  icon?: string | null;
  title: string;
  description: string;
  order: number;
}

export interface CmsTeamMember {
  id: string;
  name: string;
  title: string;
  bio: string;
  photoKey?: string | null;
  initials?: string | null;
  avatarColor?: string | null;
  linkedinUrl?: string | null;
  order: number;
}

export interface CmsMilestone {
  id: string;
  year: string;
  heading: string;
  description: string;
  order: number;
}

export interface CmsPage {
  id: string;
  slug: string;
  title: string;
  content: unknown;
  metaTitle?: string | null;
  metaDesc?: string | null;
  updatedAt: string;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchCms<T>(path: string, revalidate = 300): Promise<T | null> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate } } as RequestInit & { next: { revalidate: number } });
  if (!res.ok) return null;
  const json = (await res.json()) as { success: boolean; data: T };
  return json.data ?? null;
}

async function fetchCmsArray<T>(path: string, revalidate = 300): Promise<T[]> {
  const result = await fetchCms<T[]>(path, revalidate);
  return result ?? [];
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const cms = {
  getSettings: (revalidate = 300) =>
    fetchCms<CmsSettings>('/settings', revalidate).catch(() => null),

  getFaqs: () => fetchCmsArray<CmsFaq>('/faqs').catch(() => []),

  getTestimonials: () => fetchCmsArray<CmsTestimonial>('/testimonials').catch(() => []),

  getWinners: () => fetchCmsArray<CmsWinner>('/winners').catch(() => []),

  getTrustBadges: () => fetchCmsArray<CmsTrustBadge>('/trust-badges').catch(() => []),

  getHowItWorks: () => fetchCmsArray<CmsHowItWorksStep>('/how-it-works').catch(() => []),

  getTeam: () => fetchCmsArray<CmsTeamMember>('/team').catch(() => []),

  getMilestones: () => fetchCmsArray<CmsMilestone>('/milestones').catch(() => []),

  getPage: (slug: string) =>
    fetchCms<CmsPage>(`/pages/${encodeURIComponent(slug)}`, 600).catch(() => null),

  getPages: () => fetchCmsArray<Omit<CmsPage, 'content'>>('/pages', 600).catch(() => []),
};
