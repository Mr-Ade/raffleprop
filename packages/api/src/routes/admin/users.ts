import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma, KycStatus, PaymentStatus, NdprRequestStatus, Role } from '@raffleprop/db';
import { authenticate, requireAdmin, requireSuperAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { decrypt } from '../../services/encryption.service';
import { getPresignedDownloadUrl } from '../../services/storage.service';

export const adminUsersRouter: import('express').Router = Router();
adminUsersRouter.use(authenticate, requireAdmin);

// ─── GET /api/admin/users/stats ───────────────────────────────────────────────
// Must be defined BEFORE /:id to avoid Express treating "stats" as an id param
adminUsersRouter.get('/stats', async (_req: Request, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [total, newToday, kycGroups, ndprPending, flaggedCount, bannedCount] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: today } } }),
    prisma.user.groupBy({ by: ['kycStatus'], _count: { _all: true } }),
    prisma.ndprRequest.count({
      where: { status: { in: [NdprRequestStatus.PENDING, NdprRequestStatus.IN_PROGRESS] } },
    }),
    prisma.user.count({ where: { flaggedAt: { not: null }, bannedAt: null } }),
    prisma.user.count({ where: { bannedAt: { not: null } } }),
  ]);

  const kycBreakdown: Record<string, number> = {};
  for (const g of kycGroups) kycBreakdown[g.kycStatus] = g._count._all;

  res.json({
    success: true,
    data: { total, newToday, kycBreakdown, ndprPending, flaggedCount, bannedCount },
  });
});

// ─── GET /api/admin/users/export ──────────────────────────────────────────────
// Returns a CSV. If ?ids=x&ids=y is provided, exports only those users.
// Token via Authorization header (Bearer), never URL param. Must be before /:id.
adminUsersRouter.get('/export', async (req: Request, res: Response) => {
  const rawIds = req.query['ids'];
  const filterIds = rawIds
    ? (Array.isArray(rawIds) ? rawIds : [rawIds]).map(String)
    : null;

  const users = await prisma.user.findMany({
    ...(filterIds ? { where: { id: { in: filterIds } } } : {}),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      kycStatus: true,
      role: true,
      phoneVerified: true,
      emailVerified: true,
      referralCode: true,
      referralCount: true,
      referralEarnings: true,
      deletedAt: true,
      createdAt: true,
      _count: { select: { tickets: true } },
    },
  });

  // Batch total-spent per user
  const ids = users.map(u => u.id);
  const spendAgg = await prisma.ticket.groupBy({
    by: ['userId'],
    where: { userId: { in: ids }, paymentStatus: PaymentStatus.SUCCESS },
    _sum: { totalAmount: true },
  });
  const spendMap = new Map(spendAgg.map(s => [s.userId, Number(s._sum.totalAmount ?? 0)]));

  const header = [
    'ID', 'Full Name', 'Email', 'Phone', 'KYC Status', 'Role',
    'Phone Verified', 'Email Verified', 'Tickets Purchased', 'Total Spent (₦)',
    'Referral Code', 'Referral Count', 'Referral Earnings (₦)',
    'Deleted', 'Registered At',
  ].join(',');

  const rows = users.map(u => [
    u.id,
    `"${(u.fullName ?? '').replace(/"/g, '""')}"`,
    u.email,
    u.phone,
    u.kycStatus,
    u.role,
    u.phoneVerified ? 'Yes' : 'No',
    u.emailVerified ? 'Yes' : 'No',
    u._count.tickets,
    spendMap.get(u.id) ?? 0,
    u.referralCode,
    u.referralCount,
    Number(u.referralEarnings),
    u.deletedAt ? 'Yes' : 'No',
    u.createdAt.toISOString(),
  ].join(','));

  const csv = [header, ...rows].join('\n');
  const filename = `raffleprop-users-${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

// ─── GET /api/admin/users/kyc-queue ──────────────────────────────────────────
// Returns SUBMITTED users with BVN/NIN provided flags + KYC document info.
// Must be before /:id.
adminUsersRouter.get('/kyc-queue', async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    where: { kycStatus: KycStatus.SUBMITTED },
    orderBy: { kycSubmittedAt: 'asc' },
    select: {
      id: true,
      fullName: true,
      email: true,
      kycIdType: true,
      kycDocumentKey: true,
      kycSubmittedAt: true,
      bvnEncrypted: true,
      ninEncrypted: true,
    },
  });
  const queue = users.map(u => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    kycIdType: u.kycIdType,
    kycDocumentKey: u.kycDocumentKey,
    kycSubmittedAt: u.kycSubmittedAt,
    hasBvn: u.bvnEncrypted !== null,
    hasNin: u.ninEncrypted !== null,
  }));
  res.json({ success: true, data: queue });
});

// ─── POST /api/admin/users/bulk-action ───────────────────────────────────────
// Applies ban/unban/flag/unflag to multiple users at once.
// Must be before /:id.
const bulkActionSchema = z.object({
  ids:    z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(['ban', 'unban', 'flag', 'unflag']),
});

adminUsersRouter.post('/bulk-action', validate(bulkActionSchema), async (req: Request, res: Response) => {
  const { ids, action } = req.body as z.infer<typeof bulkActionSchema>;

  const now = new Date();
  const actorId = req.user!.sub;

  let data: Record<string, unknown>;
  if (action === 'ban')    data = { bannedAt: now, bannedBy: actorId };
  else if (action === 'unban')  data = { bannedAt: null, bannedBy: null };
  else if (action === 'flag')   data = { flaggedAt: now, flaggedBy: actorId };
  else                          data = { flaggedAt: null, flaggedBy: null };

  await prisma.user.updateMany({ where: { id: { in: ids } }, data });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: `user.bulk_${action}`,
      entityType: 'User',
      entityId: 'bulk',
      payload: { ids, count: ids.length },
      ip: req.ip ?? null,
    },
  });

  res.json({ success: true, data: { affected: ids.length } });
});

const USER_SELECT = {
  id: true,
  email: true,
  phone: true,
  fullName: true,
  kycStatus: true,
  role: true,
  referralCode: true,
  referralEarnings: true,
  referralCount: true,
  phoneVerified: true,
  emailVerified: true,
  bannedAt: true,
  flaggedAt: true,
  deletedAt: true,
  createdAt: true,
  _count: { select: { tickets: true } },
} as const;

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
adminUsersRouter.get('/', async (req: Request, res: Response) => {
  const page = parseInt((req.query['page'] as string) ?? '1', 10);
  const pageSize = Math.min(parseInt((req.query['pageSize'] as string) ?? '20', 10), 100);
  const kycStatus = req.query['kycStatus'] as KycStatus | undefined;
  const statusFilter = req.query['status'] as string | undefined; // ACTIVE | FLAGGED | BANNED
  const search = req.query['search'] as string | undefined;
  const sortBy = (req.query['sortBy'] as string) ?? 'createdAt';
  const skip = (page - 1) * pageSize;

  // Status filter: BANNED = bannedAt set, FLAGGED = flaggedAt set + not banned, ACTIVE = neither
  const statusWhere =
    statusFilter === 'BANNED' ? { bannedAt: { not: null } } :
    statusFilter === 'FLAGGED' ? { flaggedAt: { not: null }, bannedAt: null } :
    statusFilter === 'ACTIVE' ? { bannedAt: null } :
    {};

  const where = {
    ...statusWhere,
    ...(kycStatus ? { kycStatus } : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const total = await prisma.user.count({ where });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let users: any[];
  let pageSpendMap: Map<string, number>;

  if (sortBy === 'most-spent') {
    // Two-pass: groupBy all matching users for spend, sort, paginate, then fetch details
    const allIds = await prisma.user.findMany({ where, select: { id: true } });
    const idList = allIds.map(u => u.id);

    const spendAgg = idList.length
      ? await prisma.ticket.groupBy({
          by: ['userId'],
          where: { userId: { in: idList }, paymentStatus: PaymentStatus.SUCCESS },
          _sum: { totalAmount: true },
          orderBy: { _sum: { totalAmount: 'desc' } },
        })
      : [];

    const spentIds = spendAgg.map(s => s.userId);
    const unspentIds = idList.filter(id => !spentIds.includes(id));
    const pageIds = [...spentIds, ...unspentIds].slice(skip, skip + pageSize);

    users = await prisma.user.findMany({
      where: { id: { in: pageIds } },
      select: USER_SELECT,
    });
    // Restore sorted order
    const userMap = new Map(users.map(u => [u.id, u]));
    users = pageIds.map(id => userMap.get(id)!).filter(Boolean);

    pageSpendMap = new Map(
      spendAgg.filter(s => pageIds.includes(s.userId)).map(s => [s.userId, Number(s._sum.totalAmount ?? 0)]),
    );
  } else {
    // Standard Prisma orderBy (supports relation-count for most-tickets)
    const FIELD_SORTS: Record<string, object> = {
      createdAt:    { createdAt: 'desc' },
      fullName:     { fullName: 'asc' },
      email:        { email: 'asc' },
      kycStatus:    { kycStatus: 'asc' },
      'most-tickets': { tickets: { _count: 'desc' } },
    };
    const orderBy = (FIELD_SORTS[sortBy] ?? { createdAt: 'desc' }) as import('@prisma/client').Prisma.UserOrderByWithRelationInput;

    users = await prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      select: USER_SELECT,
    });

    const ids = users.map(u => u.id);
    const spendAgg = ids.length
      ? await prisma.ticket.groupBy({
          by: ['userId'],
          where: { userId: { in: ids }, paymentStatus: PaymentStatus.SUCCESS },
          _sum: { totalAmount: true },
        })
      : [];
    pageSpendMap = new Map(spendAgg.map(s => [s.userId, Number(s._sum.totalAmount ?? 0)]));
  }

  const enriched = users.map(u => ({ ...u, totalSpent: pageSpendMap.get(u.id) ?? 0 }));

  res.json({
    success: true,
    data: {
      data: enriched,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

// ─── GET /api/admin/users/:id ─────────────────────────────────────────────────
adminUsersRouter.get('/:id', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params['id'] as string },
    select: {
      id: true,
      email: true,
      phone: true,
      fullName: true,
      kycStatus: true,
      role: true,
      referralCode: true,
      referralEarnings: true,
      referralCount: true,
      phoneVerified: true,
      emailVerified: true,
      ndprConsentAt: true,
      bannedAt: true,
      flaggedAt: true,
      deletedAt: true,
      createdAt: true,
      _count: { select: { tickets: true } },
      tickets: {
        orderBy: { purchasedAt: 'desc' },
        take: 10,
        select: { id: true, ticketNumber: true, campaignId: true, totalAmount: true, paymentStatus: true, purchasedAt: true },
      },
    },
  });

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  res.json({ success: true, data: user });
});

// ─── PUT /api/admin/users/:id/kyc ────────────────────────────────────────────
const kycUpdateSchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED']),
  notes: z.string().optional(),
});

adminUsersRouter.put('/:id/kyc', validate(kycUpdateSchema), async (req: Request, res: Response) => {
  const { status, notes } = req.body as z.infer<typeof kycUpdateSchema>;

  const user = await prisma.user.findUnique({
    where: { id: req.params['id'] as string },
    select: { kycStatus: true },
  });
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }
  if (user.kycStatus !== KycStatus.SUBMITTED) {
    res.status(409).json({ success: false, error: 'User KYC must be in SUBMITTED status' });
    return;
  }

  const updated = await prisma.user.update({
    where: { id: req.params['id'] as string },
    data: { kycStatus: status as KycStatus },
    select: { id: true, fullName: true, email: true, kycStatus: true },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: req.user!.sub,
      action: `user.kyc_${status.toLowerCase()}`,
      entityType: 'User',
      entityId: req.params['id']!,
      payload: { status, notes: notes ?? null },
      ip: req.ip ?? null,
    },
  });

  res.json({ success: true, data: updated });
});

// ─── GET /api/admin/users/:id/kyc-data ───────────────────────────────────────
// Returns decrypted BVN/NIN — SUPER_ADMIN only, strict audit logging
adminUsersRouter.get('/:id/kyc-data', async (req: Request, res: Response) => {
  if (req.user!.role !== 'SUPER_ADMIN') {
    res.status(403).json({ success: false, error: 'Super-admin access required for PII data' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.params['id'] as string },
    select: { id: true, bvnEncrypted: true, ninEncrypted: true, kycStatus: true },
  });
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  // Audit every access to raw PII
  await prisma.auditLog.create({
    data: {
      actorId: req.user!.sub,
      action: 'user.pii_accessed',
      entityType: 'User',
      entityId: req.params['id']!,
      payload: { fields: ['bvn', 'nin'] },
      ip: req.ip ?? null,
    },
  });

  res.json({
    success: true,
    data: {
      bvn: user.bvnEncrypted ? decrypt(user.bvnEncrypted) : null,
      nin: user.ninEncrypted ? decrypt(user.ninEncrypted) : null,
      kycStatus: user.kycStatus,
    },
  });
});

// ─── GET /api/admin/users/:id/kyc-doc ────────────────────────────────────────
// Returns a presigned 15-min download URL for the user's KYC identity document.
// Audited on every access.
adminUsersRouter.get('/:id/kyc-doc', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params['id'] as string },
    select: { id: true, kycDocumentKey: true, kycStatus: true },
  });
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }
  if (!user.kycDocumentKey) {
    res.status(404).json({ success: false, error: 'No KYC document on file for this user.' });
    return;
  }

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.sub,
      action: 'user.kyc_doc_accessed',
      entityType: 'User',
      entityId: req.params['id']!,
      payload: { documentKey: user.kycDocumentKey },
      ip: req.ip ?? null,
    },
  });

  const url = await getPresignedDownloadUrl(user.kycDocumentKey, false, 900); // 15 min
  res.json({ success: true, data: { url, expiresInSeconds: 900 } });
});

// ─── POST /api/admin/users/:id/ban ────────────────────────────────────────────
adminUsersRouter.post('/:id/ban', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params['id'] as string },
    select: { id: true, bannedAt: true, role: true },
  });
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
  if (user.bannedAt) { res.status(409).json({ success: false, error: 'User is already banned.' }); return; }
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    res.status(403).json({ success: false, error: 'Cannot ban admin accounts.' }); return;
  }

  const updated = await prisma.user.update({
    where: { id: req.params['id'] as string },
    data: { bannedAt: new Date(), bannedBy: req.user!.sub },
    select: { id: true, fullName: true, bannedAt: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.sub, action: 'user.banned',
      entityType: 'User', entityId: req.params['id']!,
      payload: { reason: (req.body as { reason?: string }).reason ?? null },
      ip: req.ip ?? null,
    },
  });

  res.json({ success: true, data: updated });
});

// ─── POST /api/admin/users/:id/unban ──────────────────────────────────────────
adminUsersRouter.post('/:id/unban', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params['id'] as string },
    select: { id: true, bannedAt: true },
  });
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
  if (!user.bannedAt) { res.status(409).json({ success: false, error: 'User is not banned.' }); return; }

  const updated = await prisma.user.update({
    where: { id: req.params['id'] as string },
    data: { bannedAt: null, bannedBy: null },
    select: { id: true, fullName: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.sub, action: 'user.unbanned',
      entityType: 'User', entityId: req.params['id']!,
      payload: {}, ip: req.ip ?? null,
    },
  });

  res.json({ success: true, data: updated });
});

// ─── POST /api/admin/users/:id/flag ───────────────────────────────────────────
adminUsersRouter.post('/:id/flag', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params['id'] as string },
    select: { id: true, flaggedAt: true },
  });
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
  if (user.flaggedAt) { res.status(409).json({ success: false, error: 'User is already flagged.' }); return; }

  const updated = await prisma.user.update({
    where: { id: req.params['id'] as string },
    data: { flaggedAt: new Date(), flaggedBy: req.user!.sub },
    select: { id: true, fullName: true, flaggedAt: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.sub, action: 'user.flagged',
      entityType: 'User', entityId: req.params['id']!,
      payload: { reason: (req.body as { reason?: string }).reason ?? null },
      ip: req.ip ?? null,
    },
  });

  res.json({ success: true, data: updated });
});

// ─── PUT /api/admin/users/:id/role ───────────────────────────────────────────
// SUPER_ADMIN only. Promotes or demotes any user's role.
const roleUpdateSchema = z.object({
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']),
});

adminUsersRouter.put('/:id/role', requireSuperAdmin, validate(roleUpdateSchema), async (req: Request, res: Response) => {
  const targetId = req.params['id'] as string;
  const { role } = req.body as z.infer<typeof roleUpdateSchema>;

  if (req.user!.sub === targetId && role !== 'SUPER_ADMIN') {
    res.status(400).json({ success: false, error: 'You cannot demote your own account.' });
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true },
  });
  if (!existing) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: { role: role as Role },
    select: { id: true, fullName: true, email: true, role: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.sub,
      action: 'user.role_changed',
      entityType: 'User',
      entityId: targetId,
      payload: { from: existing.role, to: role },
      ip: req.ip ?? null,
    },
  });

  res.json({ success: true, data: updated });
});

// ─── POST /api/admin/users/:id/unflag ─────────────────────────────────────────
adminUsersRouter.post('/:id/unflag', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params['id'] as string },
    select: { id: true, flaggedAt: true },
  });
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
  if (!user.flaggedAt) { res.status(409).json({ success: false, error: 'User is not flagged.' }); return; }

  const updated = await prisma.user.update({
    where: { id: req.params['id'] as string },
    data: { flaggedAt: null, flaggedBy: null },
    select: { id: true, fullName: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.sub, action: 'user.unflagged',
      entityType: 'User', entityId: req.params['id']!,
      payload: {}, ip: req.ip ?? null,
    },
  });

  res.json({ success: true, data: updated });
});
