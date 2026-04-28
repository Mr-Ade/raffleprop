export type RefundReason = 'CAMPAIGN_CANCELLED' | 'MINIMUM_NOT_REACHED' | 'USER_REQUEST';
export type RefundStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface Refund {
  id: string;
  ticketId: string;
  userId: string;
  campaignId: string;
  amount: number;
  reason: RefundReason;
  status: RefundStatus;
  gatewayRef?: string;
  processedAt?: string;
  createdAt: string;
}
