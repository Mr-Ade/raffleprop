/**
 * Cloudflare R2 / AWS S3 compatible storage service.
 *
 * In development, MinIO is used as a drop-in replacement (S3-compatible API).
 * In production, point R2_ENDPOINT at your Cloudflare R2 endpoint.
 *
 * Key design decisions:
 * - Files NEVER stream through the API server (bandwidth & latency)
 * - Regulatory docs use Object Lock (WORM) — enforced at bucket level
 * - Presigned URLs expire after the specified TTL
 */
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, PutObjectCommandInput } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env['R2_ENDPOINT'] ?? `https://${process.env['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env['R2_ACCESS_KEY_ID']!,
    secretAccessKey: process.env['R2_SECRET_ACCESS_KEY']!,
  },
  // Force path-style for MinIO local dev
  forcePathStyle: process.env['NODE_ENV'] !== 'production',
});

const MEDIA_BUCKET = process.env['R2_BUCKET_MEDIA'] ?? 'raffleprop-media';
const DOCS_BUCKET = process.env['R2_BUCKET_DOCUMENTS'] ?? 'raffleprop-regulatory-docs';

// ─── Presigned Upload URL ─────────────────────────────────────────────────────

export async function getPresignedUploadUrl(
  key: string,
  mimeType: string,
  isRegulatory = false,
  ttlSeconds = 3600,
): Promise<string> {
  const bucket = isRegulatory ? DOCS_BUCKET : MEDIA_BUCKET;

  // Validate MIME type for regulatory documents
  if (isRegulatory) {
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedMimeTypes.includes(mimeType)) {
      throw new Error(`Regulatory documents must be PDF, JPEG, or PNG. Got: ${mimeType}`);
    }
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: mimeType,
    // Object Lock (WORM) requires the bucket to be created with object lock enabled.
    // Enable per-bucket in the Cloudflare R2 dashboard before adding these headers in production.
  });

  return getSignedUrl(s3, command, { expiresIn: ttlSeconds });
}

// ─── Presigned Download URL ──────────────────────────────────���────────────────

export async function getPresignedDownloadUrl(
  key: string,
  isRegulatory = false,
  ttlSeconds = 86400, // 24 hours default
): Promise<string> {
  const bucket = isRegulatory ? DOCS_BUCKET : MEDIA_BUCKET;
  const { GetObjectCommand } = await import('@aws-sdk/client-s3');
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3, command, { expiresIn: ttlSeconds });
}

// ─── Check Object Exists ─────────────────────────────────────────────────────

export async function objectExists(key: string, isRegulatory = false): Promise<boolean> {
  try {
    await s3.send(
      new HeadObjectCommand({
        Bucket: isRegulatory ? DOCS_BUCKET : MEDIA_BUCKET,
        Key: key,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

// ─── Server-side Buffer Upload ────────────────────────────────────────────────
// For server-generated files (PDFs, etc.) that don't go through the client.

export async function uploadBuffer(
  key: string,
  buffer: Buffer,
  mimeType: string,
  isRegulatory = false,
): Promise<void> {
  const bucket = isRegulatory ? DOCS_BUCKET : MEDIA_BUCKET;
  const params: PutObjectCommandInput = {
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  };
  await s3.send(new PutObjectCommand(params));
}

// ─── Delete Object (media only — regulatory docs cannot be deleted) ───────────

export async function deleteMediaObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: MEDIA_BUCKET, Key: key }));
}

// ─── Key Generators ───────────────────────────────────────────────────────────

export const storageKeys = {
  campaignFeatured: (campaignId: string, ext = 'webp') =>
    `campaigns/${campaignId}/featured.${ext}`,

  campaignGallery: (campaignId: string, index: number, ext = 'webp') =>
    `campaigns/${campaignId}/gallery/${index}.${ext}`,

  // Regulatory (all go to DOCS_BUCKET)
  receipt: (ticketId: string) => `receipts/${ticketId}.pdf`,
  cpcbForm: (drawId: string) => `cpcb-forms/${drawId}.pdf`,
  titleDeed: (campaignId: string) => `title-deeds/${campaignId}.pdf`,
  surveyPlan: (campaignId: string) => `survey-plans/${campaignId}.pdf`,
  fccpcCert: (campaignId: string) => `fccpc-certs/${campaignId}.pdf`,

  // KYC identity documents (media bucket — not regulatory WORM)
  kycDocument: (userId: string, ext: string) => `kyc/${userId}/id-document.${ext}`,

  // Bank transfer proof screenshots (media bucket)
  bankTransferProof: (ticketId: string, ext: string) => `bank-transfer-proofs/${ticketId}.${ext}`,

  // Winner claim documents (regulatory docs bucket)
  claimDocument: (docId: string, ext: string) => `claim-documents/${docId}.${ext}`,

  // Influencer
  influencerBrief: (linkId: string) => `influencers/${linkId}/brief.pdf`,
  influencerAgreement: (linkId: string) => `influencers/${linkId}/agreement.pdf`,

  // Property documents (non-regulatory, media bucket — can be replaced)
  nisvReport: (campaignId: string) => `property-docs/${campaignId}/niesv-report.pdf`,
  titleClearance: (campaignId: string) => `property-docs/${campaignId}/title-clearance.pdf`,

  // CMS content media (non-regulatory, media bucket)
  teamMemberPhoto:   (memberId: string, ext = 'webp') => `content/team/${memberId}.${ext}`,
  testimonialAvatar: (testimonialId: string, ext = 'webp') => `content/avatars/${testimonialId}.${ext}`,
  winnerPhoto:       (winnerId: string, ext = 'webp') => `content/winners/${winnerId}.${ext}`,
  contentMedia:      (entityId: string, filename: string) => `content/media/${entityId}/${filename}`,
};
