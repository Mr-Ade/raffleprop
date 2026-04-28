import { Router, Request, Response } from 'express';
import { prisma } from '@raffleprop/db';
import { authenticate, requireAdmin } from '../../middleware/auth';

export const adminComplianceRouter: import('express').Router = Router();
adminComplianceRouter.use(authenticate, requireAdmin);

// ─── GET /api/admin/compliance/campaigns ─────────────────────────────────────
adminComplianceRouter.get('/campaigns', async (_req: Request, res: Response) => {
  const campaigns = await prisma.campaign.findMany({
    select: {
      id: true, title: true, slug: true,
      propertyState: true, propertyLga: true,
      marketValue: true,
      fccpcRef: true, fccpcApprovalDate: true,
      lslgaRef: true,
      drawDate: true,
      status: true,
      draw: { select: { cpcbFormKey: true, cpcbFiledAt: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: campaigns });
});

// ─── PATCH /api/admin/compliance/campaigns/:id/fccpc-approval ─────────────────
adminComplianceRouter.patch('/campaigns/:id/fccpc-approval', async (req: Request, res: Response) => {
  const { fccpcRef, fccpcApprovalDate } = req.body as { fccpcRef: string; fccpcApprovalDate?: string };
  if (!fccpcRef) {
    res.status(400).json({ success: false, error: 'fccpcRef is required' });
    return;
  }
  const campaignId = req.params['id'] as string;
  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      fccpcRef,
      fccpcApprovalDate: fccpcApprovalDate ? new Date(fccpcApprovalDate) : null,
    },
    select: { id: true, fccpcRef: true, fccpcApprovalDate: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.sub,
      action: 'campaign.fccpc_approval_recorded',
      entityType: 'Campaign',
      entityId: campaignId,
      payload: { fccpcRef, fccpcApprovalDate: fccpcApprovalDate ?? null },
      ip: req.ip ?? null,
    },
  });

  res.json({ success: true, data: updated });
});

// ─── POST /api/admin/compliance/deadlines/ensure-complete ────────────────────
// Finds or creates a RegulatoryDeadline record then marks it COMPLETED.
// Used by the Regulatory Calendar when an admin clicks "Mark Complete" on a
// derived deadline that may not yet exist in the database.
adminComplianceRouter.post('/deadlines/ensure-complete', async (req: Request, res: Response) => {
  const { campaignId, title, description, category, dueAt, notes } = req.body as {
    campaignId?: string;
    title: string;
    description: string;
    category: string;
    dueAt: string;
    notes?: string;
  };

  if (!title || !dueAt) {
    res.status(400).json({ success: false, error: 'title and dueAt are required' });
    return;
  }

  // Find existing record by campaignId + title (first match)
  const existing = await prisma.regulatoryDeadline.findFirst({
    where: {
      title,
      ...(campaignId ? { campaignId } : { campaignId: null }),
    },
  });

  const completedData = {
    status: 'COMPLETED',
    completedAt: new Date(),
    completedBy: req.user!.sub,
    notes: notes ?? null,
  };

  let record;
  if (existing) {
    record = await prisma.regulatoryDeadline.update({
      where: { id: existing.id },
      data: completedData,
    });
  } else {
    record = await prisma.regulatoryDeadline.create({
      data: {
        campaignId: campaignId ?? null,
        title,
        description,
        category,
        dueAt: new Date(dueAt),
        ...completedData,
      },
    });
  }

  res.json({ success: true, data: record });
});

// ─── GET /api/admin/compliance/deadlines ─────────────────────────────────────
adminComplianceRouter.get('/deadlines', async (req: Request, res: Response) => {
  const status = req.query['status'] as string | undefined;
  const category = req.query['category'] as string | undefined;

  const deadlines = await prisma.regulatoryDeadline.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
    },
    orderBy: { dueAt: 'asc' },
  });

  // Auto-mark overdue
  const now = new Date();
  const overdueIds = deadlines
    .filter((d) => d.status === 'PENDING' && d.dueAt < now)
    .map((d) => d.id);

  if (overdueIds.length > 0) {
    await prisma.regulatoryDeadline.updateMany({
      where: { id: { in: overdueIds } },
      data: { status: 'OVERDUE' },
    });
    for (const d of deadlines) {
      if (overdueIds.includes(d.id)) d.status = 'OVERDUE';
    }
  }

  res.json({ success: true, data: deadlines });
});

// ─── PATCH /api/admin/compliance/deadlines/:id/complete ──────────────────────
adminComplianceRouter.patch('/deadlines/:id/complete', async (req: Request, res: Response) => {
  const deadline = await prisma.regulatoryDeadline.findUnique({ where: { id: req.params['id'] as string } });
  if (!deadline) {
    res.status(404).json({ success: false, error: 'Deadline not found' });
    return;
  }

  const updated = await prisma.regulatoryDeadline.update({
    where: { id: req.params['id'] as string },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      completedBy: req.user!.sub,
      notes: (req.body as { notes?: string }).notes ?? null,
    },
  });

  res.json({ success: true, data: updated });
});

// ─── POST /api/admin/compliance/cpcb-form ────────────────────────────────────
// Records that a Form CPC B has been uploaded to R2 for a draw
adminComplianceRouter.post('/cpcb-form', async (req: Request, res: Response) => {
  const { campaignId, r2Key } = req.body as { campaignId: string; r2Key: string };

  const draw = await prisma.draw.findUnique({ where: { campaignId } });
  if (!draw) {
    res.status(404).json({ success: false, error: 'Draw not found for this campaign' });
    return;
  }

  const updated = await prisma.draw.update({
    where: { campaignId },
    data: { cpcbFormKey: r2Key, cpcbFiledAt: new Date() },
  });

  // Mark the FCCPA §124 deadline as completed
  await prisma.regulatoryDeadline.updateMany({
    where: { campaignId, category: 'FCCPA', title: { contains: 'CPC B' }, status: { not: 'COMPLETED' } },
    data: { status: 'COMPLETED', completedAt: new Date(), completedBy: req.user!.sub },
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.sub,
      action: 'draw.cpcb_form_filed',
      entityType: 'Draw',
      entityId: draw.id,
      payload: { r2Key, campaignId },
      ip: req.ip ?? null,
    },
  });

  res.json({ success: true, data: updated });
});

// ─── GET /api/admin/compliance/audit-log ─────────────────────────────────────
adminComplianceRouter.get('/audit-log', async (req: Request, res: Response) => {
  const page = parseInt((req.query['page'] as string) ?? '1', 10);
  const pageSize = Math.min(parseInt((req.query['pageSize'] as string) ?? '50', 10), 200);
  const entityType = req.query['entityType'] as string | undefined;
  const skip = (page - 1) * pageSize;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: entityType ? { entityType } : {},
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.count({ where: entityType ? { entityType } : {} }),
  ]);

  res.json({ success: true, data: { data: logs, total, page, pageSize, totalPages: Math.ceil(total / pageSize) } });
});
