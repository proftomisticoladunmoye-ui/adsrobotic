import { prisma, type AutonomyLevel, type Campaign } from '@adsrobotic/db';
import { recordActivity } from './activity';
import { ensureAdaptersRegistered, getChannel } from './channels-registry';
import { resolveChannelCredentials } from './channels';

/**
 * Autonomous Budget Guardian (Spec §4, Engine 4). Sweeps active campaigns and
 * enforces the advertiser's guardrails: it compares live spend, cost-per-lead,
 * and daily spend against each campaign's BudgetRule and, when a limit is
 * breached, protects the advertiser's money.
 *
 * Authority is respected (Spec §6): at `manager`/`autonomous` the Guardian may
 * pause automatically; at `advisor`/`assistant` it must not act on its own, so
 * it files a recommendation instead. Every action (or proposal) is logged and
 * the user is notified — nothing happens silently (Spec §21, §22).
 */
export interface GuardianAction {
  campaignId: string;
  campaignName: string;
  reason: string;
  executed: boolean; // true = paused now; false = proposed for approval
  moneyProtected: number;
}

export interface GuardianReport {
  scanned: number;
  actions: GuardianAction[];
}

const AUTONOMY_MAY_PAUSE: Record<AutonomyLevel, boolean> = {
  advisor: false,
  assistant: false,
  manager: true,
  autonomous: true,
};

interface Breach {
  reason: string;
  moneyProtected: number;
}

/** Evaluate one campaign's actual metrics against its budget rule. */
async function evaluateCampaign(campaign: Campaign): Promise<Breach | null> {
  const rule = await prisma.budgetRule.findFirst({
    where: { campaignId: campaign.id, active: true },
  });
  if (!rule) return null;

  const agg = await prisma.campaignMetric.aggregate({
    where: { campaignId: campaign.id, source: 'actual' },
    _sum: { spend: true, leads: true, conversions: true },
  });
  const spend = Number(agg._sum.spend ?? 0);
  const leads = agg._sum.leads ?? 0;
  const customers = agg._sum.conversions ?? 0;

  // Today's spend for the daily cap.
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const todayAgg = await prisma.campaignMetric.aggregate({
    where: { campaignId: campaign.id, source: 'actual', date: { gte: start } },
    _sum: { spend: true },
  });
  const todaySpend = Number(todayAgg._sum.spend ?? 0);

  const budgetTotal = Number(campaign.budgetTotal);

  // Cost-per-lead breach.
  if (rule.maxCostPerLead && leads > 0) {
    const cpl = spend / leads;
    const max = Number(rule.maxCostPerLead);
    if (cpl > max) {
      // Estimated spend avoided over the remaining budget at the current
      // (over-threshold) efficiency. Clearly an estimate (Spec §28).
      const remaining = Math.max(0, budgetTotal - spend);
      return {
        reason: `Cost per lead (${cpl.toFixed(2)} ${campaign.currency}) exceeded your ${max} ${campaign.currency} limit.`,
        moneyProtected: Math.round(remaining * 100) / 100,
      };
    }
  }

  // Cost-per-customer breach.
  if (rule.maxCostPerCustomer && customers > 0) {
    const cpa = spend / customers;
    const max = Number(rule.maxCostPerCustomer);
    if (cpa > max) {
      const remaining = Math.max(0, budgetTotal - spend);
      return {
        reason: `Cost per customer (${cpa.toFixed(2)} ${campaign.currency}) exceeded your ${max} ${campaign.currency} limit.`,
        moneyProtected: Math.round(remaining * 100) / 100,
      };
    }
  }

  // Daily-spend breach.
  if (rule.maxDailySpend && todaySpend > Number(rule.maxDailySpend)) {
    const over = todaySpend - Number(rule.maxDailySpend);
    return {
      reason: `Today's spend (${todaySpend.toFixed(2)} ${campaign.currency}) exceeded your daily cap of ${Number(rule.maxDailySpend)} ${campaign.currency}.`,
      moneyProtected: Math.round(over * 100) / 100,
    };
  }

  // Monthly-budget breach.
  if (rule.monthlyBudget && spend > Number(rule.monthlyBudget)) {
    const over = spend - Number(rule.monthlyBudget);
    return {
      reason: `Total spend reached ${spend.toFixed(2)} ${campaign.currency}, over your ${Number(rule.monthlyBudget)} ${campaign.currency} budget.`,
      moneyProtected: Math.round(over * 100) / 100,
    };
  }

  return null;
}

/**
 * Pause the campaign on its live channel when it was launched there. Best-effort:
 * a channel failure must not stop AdsRobotic from pausing internally, but it is
 * surfaced so the action trail stays honest (Spec §27).
 */
async function pauseOnChannel(campaign: Campaign): Promise<{ attempted: boolean; verified: boolean; error?: string }> {
  if (!campaign.channel || !campaign.externalId) return { attempted: false, verified: false };
  ensureAdaptersRegistered();
  const adapter = getChannel(campaign.channel);
  if (!adapter) return { attempted: false, verified: false };
  const creds = await resolveChannelCredentials(campaign.businessId, campaign.channel);
  if (!creds) return { attempted: false, verified: false };
  const res = await adapter.pauseCampaign(creds, campaign.externalId);
  return { attempted: true, verified: res.verified, ...(res.error ? { error: res.error } : {}) };
}

/**
 * Run the Guardian across one business (or all active campaigns platform-wide
 * when no businessId is given — used by the scheduled worker).
 */
export async function runBudgetGuardian(businessId?: string): Promise<GuardianReport> {
  const campaigns = await prisma.campaign.findMany({
    where: { status: 'active', deletedAt: null, ...(businessId ? { businessId } : {}) },
  });

  const actions: GuardianAction[] = [];

  for (const campaign of campaigns) {
    const breach = await evaluateCampaign(campaign);
    if (!breach) continue;

    const mayPause = AUTONOMY_MAY_PAUSE[campaign.autonomyLevel];

    if (mayPause) {
      const channel = await pauseOnChannel(campaign);
      await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'paused' } });
      await recordActivity({
        businessId: campaign.businessId,
        campaignId: campaign.id,
        type: 'campaign_paused',
        summary: `Paused "${campaign.name}". ${breach.reason}`,
        detail: {
          channelPause: channel.attempted
            ? channel.verified
              ? 'verified'
              : `unverified${channel.error ? `: ${channel.error}` : ''}`
            : 'internal-only',
        },
        moneyProtected: breach.moneyProtected,
        autonomyLevel: campaign.autonomyLevel,
        reversible: true,
      });
      await notify(campaign, `Paused "${campaign.name}" to protect your budget. ${breach.reason}`);
      actions.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        reason: breach.reason,
        executed: true,
        moneyProtected: breach.moneyProtected,
      });
    } else {
      // Lower autonomy: propose, don't act (Spec §6).
      await prisma.aIRecommendation.create({
        data: {
          businessId: campaign.businessId,
          campaignId: campaign.id,
          title: `Pause "${campaign.name}"`,
          body: `I recommend pausing this campaign to protect your budget.`,
          rationale: breach.reason,
          confidence: 'high',
          expectedImpact: { moneyProtected: breach.moneyProtected, action: 'pause_campaign' },
          dataConsidered: { check: 'budget_guardian', autonomy: campaign.autonomyLevel },
          reversible: true,
        },
      });
      await notify(
        campaign,
        `Recommendation: pause "${campaign.name}". ${breach.reason} Approve to act.`,
      );
      actions.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        reason: breach.reason,
        executed: false,
        moneyProtected: breach.moneyProtected,
      });
    }
  }

  return { scanned: campaigns.length, actions };
}

async function notify(campaign: Campaign, body: string): Promise<void> {
  // Notify the organisation owners of the business.
  const memberships = await prisma.membership.findMany({
    where: { organizationId: { in: await orgIdsForBusiness(campaign.businessId) }, role: 'org_owner' },
    select: { userId: true },
  });
  await prisma.notification.createMany({
    data: memberships.map((m) => ({
      userId: m.userId,
      businessId: campaign.businessId,
      type: 'budget_alert' as const,
      title: 'Budget Guardian',
      body,
    })),
  });
}

async function orgIdsForBusiness(businessId: string): Promise<string[]> {
  const b = await prisma.business.findUnique({
    where: { id: businessId },
    select: { organizationId: true },
  });
  return b ? [b.organizationId] : [];
}
