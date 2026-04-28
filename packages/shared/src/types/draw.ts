export type DrawStatus = 'PENDING' | 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'FILED';

export interface Draw {
  id: string;
  campaignId: string;
  status: DrawStatus;
  witnessName?: string;
  witnessTitle?: string;
  drawSeed?: string;
  winnerTicketId?: string;
  fccpcNotifiedAt?: string;
  winnerNotifiedAt?: string;
  publicAnnouncedAt?: string;
  cpcbFormKey?: string;
  cpcbFiledAt?: string;
  createdAt: string;
}
