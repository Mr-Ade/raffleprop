/**
 * Presigned upload URL endpoint.
 *
 * Flow:
 * 1. Admin requests presigned PUT URL with file type + purpose
 * 2. API validates, generates R2 presigned URL, returns it
 * 3. Admin's browser uploads directly to R2 (never through API)
 * 4. Admin POSTs the R2 key back to the relevant resource endpoint
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { getPresignedUploadUrl, storageKeys } from '../../services/storage.service';

export const adminStorageRouter: import('express').Router = Router();
adminStorageRouter.use(authenticate, requireAdmin);

const presignSchema = z.object({
  purpose: z.enum([
    'campaign_featured',
    'campaign_gallery',
    'campaign_video',
    'title_deed',
    'survey_plan',
    'fccpc_cert',
    'cpcb_form',
    'niesv_report',
    'title_clearance',
    'influencer_brief',
    'influencer_agreement',
    'team_photo',
    'testimonial_avatar',
    'winner_photo',
    'content_media',
  ]),
  entityId: z.string().min(1), // campaignId, drawId, linkId depending on purpose
  mimeType: z.string().min(1),
  index: z.number().int().min(0).optional(), // for gallery items
});

adminStorageRouter.post('/presign', validate(presignSchema), async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof presignSchema>;
  const { purpose, entityId, mimeType, index } = body;

  const REGULATORY_PURPOSES = ['title_deed', 'survey_plan', 'fccpc_cert', 'cpcb_form', 'influencer_agreement'];
  const isRegulatory = REGULATORY_PURPOSES.includes(purpose);

  // Determine key
  let key: string;
  const ext = mimeType.split('/')[1] ?? 'bin';

  switch (purpose) {
    case 'campaign_featured':
      key = storageKeys.campaignFeatured(entityId, ext);
      break;
    case 'campaign_gallery':
      key = storageKeys.campaignGallery(entityId, index ?? 0, ext);
      break;
    case 'campaign_video':
      key = `campaigns/${entityId}/video.${ext}`;
      break;
    case 'title_deed':
      key = storageKeys.titleDeed(entityId);
      break;
    case 'survey_plan':
      key = storageKeys.surveyPlan(entityId);
      break;
    case 'fccpc_cert':
      key = storageKeys.fccpcCert(entityId);
      break;
    case 'cpcb_form':
      key = storageKeys.cpcbForm(entityId);
      break;
    case 'niesv_report':
      key = storageKeys.nisvReport(entityId);
      break;
    case 'title_clearance':
      key = storageKeys.titleClearance(entityId);
      break;
    case 'influencer_brief':
      key = storageKeys.influencerBrief(entityId);
      break;
    case 'influencer_agreement':
      key = storageKeys.influencerAgreement(entityId);
      break;
    case 'team_photo':
      key = storageKeys.teamMemberPhoto(entityId, ext);
      break;
    case 'testimonial_avatar':
      key = storageKeys.testimonialAvatar(entityId, ext);
      break;
    case 'winner_photo':
      key = storageKeys.winnerPhoto(entityId, ext);
      break;
    case 'content_media': {
      const filename = `${Date.now()}.${ext}`;
      key = storageKeys.contentMedia(entityId, filename);
      break;
    }
    default:
      res.status(400).json({ success: false, error: 'Unknown purpose' });
      return;
  }

  const uploadUrl = await getPresignedUploadUrl(key, mimeType, isRegulatory);

  res.json({
    success: true,
    data: {
      uploadUrl,
      key,
      isRegulatory,
      expiresIn: 3600,
    },
  });
});
