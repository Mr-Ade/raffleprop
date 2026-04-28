export type PaymentGateway = 'PAYSTACK' | 'FLUTTERWAVE';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface Ticket {
  id: string;
  ticketNumber: string;
  campaignId: string;
  userId: string;
  bundleLabel?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentRef: string;
  paymentGateway: PaymentGateway;
  paymentStatus: PaymentStatus;
  skillAnswer: number;
  skillCorrect: boolean;
  ipAddress: string;
  userAgent: string;
  purchasedAt: string;
  receiptNumber: string;
}

export interface InitiateTicketInput {
  campaignId: string;
  bundleLabel?: string;
  quantity: number;
  skillAnswer: number;
  gateway?: PaymentGateway;
}

export interface InitiateTicketResponse {
  ticketId: string;
  authorizationUrl: string;
  paymentRef: string;
}
