import { PrismaClient, CampaignStatus, PropertyType, DrawMethod, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { customAlphabet } from 'nanoid';

const prisma = new PrismaClient();
const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Super Admin User ──────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@RaffleProp2024!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@raffleprop.com' },
    update: {},
    create: {
      email: 'admin@raffleprop.com',
      phone: '+2348000000001',
      fullName: 'RaffleProp Admin',
      passwordHash: adminHash,
      role: Role.SUPER_ADMIN,
      referralCode: 'ADMIN001',
      ndprConsentAt: new Date(),
      ndprConsentIp: '127.0.0.1',
      tcAcceptedAt: new Date(),
      tcAcceptedIp: '127.0.0.1',
      phoneVerified: true,
      emailVerified: true,
    },
  });

  // ─── Test User ─────────────────────────────────────────────────────────────
  const userHash = await bcrypt.hash('User@Test2024!', 12);
  await prisma.user.upsert({
    where: { email: 'testuser@example.com' },
    update: {},
    create: {
      email: 'testuser@example.com',
      phone: '+2348012345678',
      fullName: 'Test User',
      passwordHash: userHash,
      role: Role.USER,
      referralCode: nanoid(),
      ndprConsentAt: new Date(),
      ndprConsentIp: '127.0.0.1',
      tcAcceptedAt: new Date(),
      tcAcceptedIp: '127.0.0.1',
      phoneVerified: true,
      emailVerified: true,
    },
  });

  // ─── Sample Campaigns (matching existing MOCK_DATA) ───────────────────────
  const campaignData = [
    {
      slug: 'lekki-phase1-luxury-duplex',
      title: '4-Bedroom Luxury Duplex – Lekki Phase 1',
      propertyAddress: '14 Admiralty Way, Lekki Phase 1',
      propertyState: 'Lagos',
      propertyLga: 'Eti-Osa',
      propertyType: PropertyType.RESIDENTIAL,
      marketValue: 85000000,
      reservePrice: 45000000,
      ticketPrice: 5000,
      totalTickets: 10000,
      minTickets: 5000,
      status: CampaignStatus.LIVE,
      fccpcRef: 'FCCPC/2024/RP/0042',
      lslgaRef: 'LSLB/2024/RT/0117',
      escrowBank: 'Guaranty Trust Bank',
      escrowAccountNo: '0123456789',
      skillQuestion: {
        question: 'What is the capital city of Nigeria?',
        options: ['Lagos', 'Kano', 'Abuja', 'Ibadan'],
        correctIndex: 2,
      },
      bundles: [
        { tickets: 1, price: 5000, label: 'Single' },
        { tickets: 3, price: 13500, label: 'Trio', savings: 1500 },
        { tickets: 5, price: 21000, label: 'Fiver', savings: 4000 },
        { tickets: 10, price: 40000, label: 'Decade', savings: 10000 },
      ],
      drawDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      drawMethod: DrawMethod.RANDOM,
      allowedGateways: ['PAYSTACK', 'FLUTTERWAVE', 'BANK_TRANSFER'],
      galleryKeys: [],
      documentKeys: {},
      createdBy: admin.id,
      publishedAt: new Date(),
    },
    {
      slug: 'abuja-gwarinpa-semi-detached',
      title: '3-Bedroom Semi-Detached Bungalow – Gwarinpa, Abuja',
      propertyAddress: '7 3rd Avenue, Gwarinpa Estate',
      propertyState: 'FCT',
      propertyLga: 'Abuja Municipal',
      propertyType: PropertyType.RESIDENTIAL,
      marketValue: 45000000,
      reservePrice: 25000000,
      ticketPrice: 2500,
      totalTickets: 12000,
      minTickets: 6000,
      status: CampaignStatus.LIVE,
      fccpcRef: 'FCCPC/2024/RP/0043',
      lslgaRef: null,
      escrowBank: 'Zenith Bank',
      escrowAccountNo: '9876543210',
      skillQuestion: {
        question: 'How many states does Nigeria have?',
        options: ['30', '36', '40', '42'],
        correctIndex: 1,
      },
      bundles: [
        { tickets: 1, price: 2500, label: 'Single' },
        { tickets: 5, price: 11000, label: 'Fiver', savings: 1500 },
        { tickets: 10, price: 20000, label: 'Decade', savings: 5000 },
      ],
      drawDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      drawMethod: DrawMethod.RANDOM,
      allowedGateways: ['PAYSTACK', 'FLUTTERWAVE', 'BANK_TRANSFER'],
      galleryKeys: [],
      documentKeys: {},
      createdBy: admin.id,
      publishedAt: new Date(),
    },
    {
      slug: 'ph-gra-commercial-plot',
      title: 'Commercial Land Plot – GRA Phase 2, Port Harcourt',
      propertyAddress: 'Plot 22, GRA Phase 2, Port Harcourt',
      propertyState: 'Rivers',
      propertyLga: 'Port Harcourt',
      propertyType: PropertyType.LAND,
      marketValue: 30000000,
      reservePrice: 18000000,
      ticketPrice: 1500,
      totalTickets: 15000,
      minTickets: 8000,
      status: CampaignStatus.DRAFT,
      fccpcRef: null,
      lslgaRef: null,
      escrowBank: null,
      escrowAccountNo: null,
      skillQuestion: {
        question: 'What is 15% of 200,000?',
        options: ['20,000', '25,000', '30,000', '35,000'],
        correctIndex: 2,
      },
      bundles: [
        { tickets: 1, price: 1500, label: 'Single' },
        { tickets: 5, price: 6500, label: 'Fiver', savings: 1000 },
        { tickets: 10, price: 12000, label: 'Decade', savings: 3000 },
      ],
      drawDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      drawMethod: DrawMethod.RANDOM_ORG_VERIFIED,
      allowedGateways: ['PAYSTACK', 'FLUTTERWAVE', 'BANK_TRANSFER'],
      galleryKeys: [],
      documentKeys: {},
      createdBy: admin.id,
      publishedAt: null,
    },
  ];

  for (const campaign of campaignData) {
    await prisma.campaign.upsert({
      where: { slug: campaign.slug },
      update: {},
      create: campaign,
    });
  }

  console.log('✅ Seed complete.');
  console.log('   Admin: admin@raffleprop.com / Admin@RaffleProp2024!');
  console.log('   User:  testuser@example.com / User@Test2024!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
