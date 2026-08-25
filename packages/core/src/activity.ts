import { prisma, type AIActivityType, type AutonomyLevel } from '@adsrobotic/db';

export interface RecordActivityInput {
  businessId: string;
  campaignId?: string | undefined;
  type: AIActivityType;
  summary: string;
  detail?: object | undefined;
  moneyProtected?: number | undefined;
  autonomyLevel?: AutonomyLevel | undefined;
  reversible?: boolean | undefined;
}

/**
 * Record a significant AI action to the activity trail (Spec §21). Every entry
 * is explainable and, where relevant, notes money protected and reversibility —
 * powering the "Why did the AI do this?" surface (Spec §22).
 */
export async function recordActivity(input: RecordActivityInput) {
  return prisma.aIActivity.create({
    data: {
      businessId: input.businessId,
      campaignId: input.campaignId ?? null,
      type: input.type,
      summary: input.summary,
      detail: (input.detail as object) ?? undefined,
      moneyProtected: input.moneyProtected ?? null,
      autonomyLevel: input.autonomyLevel ?? 'assistant',
      reversible: input.reversible ?? true,
    },
  });
}

export async function recentActivity(businessId: string, take = 10) {
  return prisma.aIActivity.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
    take,
  });
}

/** Append to the immutable-by-convention audit log (Spec §21). */
export async function audit(input: {
  organizationId?: string;
  businessId?: string;
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: object;
  ip?: string;
}) {
  return prisma.auditLog.create({
    data: {
      organizationId: input.organizationId ?? null,
      businessId: input.businessId ?? null,
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      metadata: (input.metadata as object) ?? undefined,
      ip: input.ip ?? null,
    },
  });
}
