import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/auth/', '/user/'],
    },
    sitemap: 'https://raffleprop.com/sitemap.xml',
  }
}