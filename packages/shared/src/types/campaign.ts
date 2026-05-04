export type CampaignStatus = 'DRAFT' | 'REVIEW' | 'UPCOMING' | 'LIVE' | 'PAUSED' | 'CLOSED' | 'DRAWN' | 'CANCELLED';
export type PropertyType = 'RESIDENTIAL' | 'COMMERCIAL' | 'LAND' | 'MIXED_USE';
export type DrawMethod = 'RANDOM' | 'RANDOM_ORG_VERIFIED';

export interface SkillQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface Bundle {
  tickets: number;
  price: number;
  label: string;
  savings?: number;
}

export interface CampaignDocumentKeys {
  titleDeed?: string;
  surveyPlan?: string;
  fccpcCert?: string;
  lslgaCert?: string;
  escrowAgreement?: string;
}

export interface Campaign {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  propertyAddress: string;
  propertyState: string;
  propertyLga: string;
  propertyType: PropertyType;
  marketValue: number;
  reservePrice: number;
  ticketPrice: number;
  totalTickets: number;
  minTickets: number;
  status: CampaignStatus;
  fccpcRef?: string;
  fctLroRef?: string;
  lslgaRef?: string;
  displayOrder?: number;
  escrowBank?: string;
  escrowAccountNo?: string;
  skillQuestion: SkillQuestion;
  bundles: Bundle[];
  drawDate?: string;
  drawMethod: DrawMethod;
  featuredImageKey?: string;
  galleryKeys: string[];
  documentKeys: CampaignDocumentKeys;
  // Rich property details
  bedrooms?: number;
  bathrooms?: number;
  buildingArea?: number;
  landArea?: number;
  parkingSpaces?: number;
  propertyFeatures: string[];
  cOfOConfirmed?: boolean;
  // Legal & trust
  propertyLawyer?: string;
  valuationFirm?: string;
  valuationRef?: string;
  cacRegNumber?: string;
  fccpcApprovalDate?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  closedAt?: string;
  // Discovery & ranking
  featured?: boolean;
  hotScore?: number;
  // Computed
  ticketsSold?: number;
  percentageSold?: number;
  // Draw result — only present for DRAWN campaigns
  draw?: {
    status: string;
    winnerTicket?: { ticketNumber: string } | null;
  } | null;
}

export interface CreateCampaignInput {
  title: string;
  propertyAddress: string;
  propertyState: string;
  propertyLga: string;
  propertyType: PropertyType;
  marketValue: number;
  reservePrice: number;
  ticketPrice: number;
  totalTickets: number;
  minTickets: number;
  fccpcRef?: string;
  lslgaRef?: string;
  escrowBank?: string;
  escrowAccountNo?: string;
  skillQuestion: SkillQuestion;
  bundles: Bundle[];
  drawDate?: string;
  drawMethod?: DrawMethod;
}
