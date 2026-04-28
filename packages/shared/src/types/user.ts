export type KycStatus = 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  kycStatus: KycStatus;
  role: UserRole;
  referralCode: string;
  referredByCode?: string;
  referralEarnings: number;
  referralCount: number;
  ndprConsentAt: string;
  twoFactorEnabled: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUser {
  id: string;
  fullName: string;
  referralCode: string;
}

export interface RegisterInput {
  email: string;
  phone: string;
  fullName: string;
  password: string;
  referredByCode?: string;
  ndprConsent: true;
  tcAccepted: true;
}

export interface LoginInput {
  email: string;
  password: string;
  totpCode?: string;
}

export interface KycSubmitInput {
  bvn?: string;
  nin?: string;
}
