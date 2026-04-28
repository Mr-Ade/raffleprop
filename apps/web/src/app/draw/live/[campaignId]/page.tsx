import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { DrawLiveClient } from '@/components/DrawLiveClient';
import { api } from '@/lib/api';

interface Props {
  params: Promise<{ campaignId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { campaignId } = await params;
  try {
    const data = await api.getDrawLive(campaignId);
    return {
      title: `Live Draw — ${data.campaign.title} | RaffleProp`,
      description: `Watch the live draw for ${data.campaign.title}. Powered by cryptographic randomness.`,
    };
  } catch {
    return { title: 'Live Draw | RaffleProp' };
  }
}

// This page is publicly accessible — no auth required.
// It is designed to be shared on screen via OBS during a YouTube/Instagram live stream.
// Revalidate every 5 seconds on the server so the initial SSR render is fresh.
export const revalidate = 5;

export default async function DrawLivePage({ params }: Props) {
  const { campaignId } = await params;

  let data;
  try {
    data = await api.getDrawLive(campaignId);
  } catch {
    notFound();
  }

  // NEXT_PUBLIC_API_URL is the only variable safe for browser use.
  // API_URL is a server-only internal hostname — never pass it to the client.
  const apiBase = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

  return (
    <DrawLiveClient
      campaignId={campaignId}
      initial={data}
      apiBase={apiBase}
    />
  );
}
