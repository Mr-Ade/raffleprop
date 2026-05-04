/**
 * CMS fetch library — typed, ISR-aware.
 *
 * All functions use Next.js `next: { revalidate }` for ISR.
 * Every call wraps in .catch(() => null | []) so a CMS outage never
 * takes down the public site — callers fall back to hardcoded defaults.
 */

// On the server (Vercel), prefer API_URL (Railway direct URL) to bypass custom-domain DNS.
// On the client, API_URL is undefined (not NEXT_PUBLIC_*), so fall back to NEXT_PUBLIC_API_URL.
const API_URL = process.env['API_URL'] ?? process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
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
  // Home page SEO (admin-editable title/description)
  homeSeo?: { title?: string; description?: string } | null;
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
  topic?: string | null;
  heroImage?: string | null;
  metaTitle?: string | null;
  metaDesc?: string | null;
  updatedAt: string;
}

export interface CmsPageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CmsPageList {
  data: Omit<CmsPage, 'content'>[];
  meta: CmsPageMeta;
}

export interface CmsTopic {
  icon: string;
  label: string;
  count: number;
}

export interface CmsStats {
  ticketsSoldToday: number;
  activeCampaigns: number;
  propertiesWon: number;
  totalTicketsSold: number;
  totalPrizeValue: number;
  prizesAwarded: number;
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

// The /pages list endpoint returns { success, data: [...], meta: {...} } at the top level.
// fetchCms extracts only json.data, so we need a dedicated helper that reads the full envelope.
async function fetchCmsPageList(path: string, revalidate = 60): Promise<CmsPageList | null> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate } } as RequestInit & { next: { revalidate: number } });
  if (!res.ok) return null;
  const json = (await res.json()) as { success: boolean; data: Omit<CmsPage, 'content'>[]; meta: CmsPageMeta };
  if (!json.success) return null;
  return { data: json.data ?? [], meta: json.meta };
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

  getPages: () => fetchCmsArray<Omit<CmsPage, 'content'>>('/pages', 60).catch(() => []),

  getPagesPaginated: (opts: { topic?: string; page?: number; limit?: number } = {}) => {
    const params = new URLSearchParams();
    if (opts.topic)  params.set('topic',  opts.topic);
    if (opts.page)   params.set('page',   String(opts.page));
    if (opts.limit)  params.set('limit',  String(opts.limit));
    const qs = params.toString();
    return fetchCmsPageList(`/pages${qs ? `?${qs}` : ''}`).catch(() => null);
  },

  getFeaturedPages: (count = 3) =>
    fetchCmsPageList(`/pages?featured=${count}`).catch(() => null),

  getTopics: () => fetchCmsArray<CmsTopic>('/topics', 120).catch(() => []),

  getStats: () => fetchCms<CmsStats>('/stats', 60).catch(() => null),
};
