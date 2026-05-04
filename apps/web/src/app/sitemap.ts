import { MetadataRoute } from 'next'
import { cms } from '@/lib/cms'

const API_URL = process.env['API_URL'] ?? process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'
const BASE_URL = 'https://raffleprop.com'

async function fetchPublishedCampaigns(): Promise<Array<{ slug: string; updatedAt?: string }>> {
  try {
    const res = await fetch(
      `${API_URL}/api/campaigns?status=LIVE&pageSize=200`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return []
    const json = await res.json() as { success: boolean; data?: { data?: Array<{ slug: string; updatedAt?: string }> } }
    const live = json.data?.data ?? []

    const res2 = await fetch(
      `${API_URL}/api/campaigns?status=DRAWN&pageSize=200`,
      { next: { revalidate: 3600 } }
    )
    if (!res2.ok) return live
    const json2 = await res2.json() as { success: boolean; data?: { data?: Array<{ slug: string; updatedAt?: string }> } }
    return [...live, ...(json2.data?.data ?? [])]
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [campaigns, pages] = await Promise.all([
    fetchPublishedCampaigns(),
    cms.getPages().catch(() => [] as Array<{ slug: string; updatedAt: string }>),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/campaigns`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/how-it-works`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/trust-legal`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/winners`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/compliance`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/data-rights`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]

  const campaignRoutes: MetadataRoute.Sitemap = campaigns.map((c) => ({
    url: `${BASE_URL}/campaigns/${c.slug}`,
    lastModified: c.updatedAt ? new Date(c.updatedAt) : new Date(),
    changeFrequency: 'daily',
    priority: 0.85,
  }))

  const blogRoutes: MetadataRoute.Sitemap = pages
    .filter((p) => p.slug)
    .map((p) => ({
      url: `${BASE_URL}/blog/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.65,
    }))

  return [...staticRoutes, ...campaignRoutes, ...blogRoutes]
}
