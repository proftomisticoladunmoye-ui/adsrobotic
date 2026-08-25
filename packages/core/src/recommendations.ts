import { prisma, type RecommendationStatus } from '@adsrobotic/db';
import { notFoundError } from './errors';
import { recordActivity } from './activity';
import { ensureAdaptersRegistered, getChannel } from './channels-registry';
import { resolveChannelCredentials } from './channels';

/**
 * AI Recommendations (Spec §22). AdsRobotic proposes actions — most created by
 * the Budget Guardian at lower autonomy — with a plain-language "why", a
 * confidence, the expected impact, and whether it's reversible. The user accepts
 * (AdsRobotic applies it) or dismisses. Applying is recorded to the action trail.
 */

export interface RecommendationView {
  id: string;
  campaignId: string | null;
  campaignName: string | null;
  title: string;
  body: string;
  rationale: string;
  confidence: string;
  status: RecommendationStatus;
  reversible: boolean;
  moneyProtected: number | null;
  action: string | null;
  createdAt: Date;
  decidedAt: Date | null;
}

function readImpact(impact: unknown): { moneyProtected: number | null; action: string | null } {
  const o = (impact ?? {}) as Record<string, unknown>;
  return {
    moneyProtected: typeof o.moneyProtected === 'number' ? o.moneyProtected : null,
    action: typeof o.action === 'string' ? o.action : null,
  };
}

export async function listRecommendations(
  businessId: string,
  opts: { status?: RecommendationStatus } = {},
): Promise<RecommendationView[]> {
  const rows = await prisma.aIRecommendation.findMany({
    where: { businessId, ...(opts.status ? { status: opts.status } : {}) },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: { campaign: { select: { name: true } } },
    take: 100,
  });
  return rows.map((r) => {
    const { moneyProtected, action } = readImpact(r.expectedImpact);
    return {
      id: r.id,
      campaignId: r.campaignId,
      campaignName: r.campaign?.name ?? null,
      title: r.title,
      body: r.body,
      rationale: r.rationale,
      confidence: r.confidence,
      status: r.status,
      reversible: r.reversible,
      moneyProtected,
      action,
      createdAt: r.createdAt,
      decidedAt: r.decidedAt,
    };
  });
}

export async function countPendingRecommendations(businessId: string): Promise<number> {
  return prisma.aIRecommendation.count({ where: { businessId, status: 'pending' } });
}

/** Apply a recommendation's action (currently: pause a campaign). */
async function applyAction(businessId: string, campaignId: string | null, action: string | null) {
  if (action !== 'pause_campaign' || !campaignId) return;
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, businessId } });
  if (!campaign) return;

  // Best-effort pause on the live channel, then internally (Spec §27).
  if (campaign.channel && campaign.externalId) {
    ensureAdaptersRegistered();
    const adapter = getChannel(campaign.channel);
    const creds = await resolveChannelCredentials(businessId, campaign.channel);
    if (adapter && creds) await adapter.pauseCampaign(creds, campaign.externalId).catch(() => undefined);
  }
  await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'paused' } });
}

/**
 * Accept a recommendation: apply its action and mark it applied. This is the
 * user's explicit approval for an action the AI could not take autonomously
 * (Spec §6).
 */
export async function acceptRecommendation(
  businessId: string,
  recommendationId: string,
  userId?: string,
): Promise<void> {
  const rec = await prisma.aIRecommendation.findFirst({
    where: { id: recommendationId, businessId },
  });
  if (!rec) throw notFoundError('Recommendation not found');
  if (rec.status !== 'pending') return;

  const { moneyProtected, action } = readImpact(rec.expectedImpact);
  await applyAction(businessId, rec.campaignId, action);

  await prisma.aIRecommendation.update({
    where: { id: rec.id },
    data: { status: 'accepted', decidedAt: new Date(), decidedById: userId ?? null },
  });

  await recordActivity({
    businessId,
    campaignId: rec.campaignId ?? undefined,
    type: action === 'pause_campaign' ? 'campaign_paused' : 'analysis',
    summary: `Accepted recommendation: ${rec.title}.`,
    ...(moneyProtected !== null ? { moneyProtected } : {}),
    reversible: rec.reversible,
  });
}

export async function dismissRecommendation(
  businessId: string,
  recommendationId: string,
  userId?: string,
): Promise<void> {
  const rec = await prisma.aIRecommendation.findFirst({
    where: { id: recommendationId, businessId },
  });
  if (!rec) throw notFoundError('Recommendation not found');
  if (rec.status !== 'pending') return;
  await prisma.aIRecommendation.update({
    where: { id: rec.id },
    data: { status: 'dismissed', decidedAt: new Date(), decidedById: userId ?? null },
  });
}
