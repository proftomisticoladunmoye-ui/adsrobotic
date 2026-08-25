import {
  prisma,
  type AutonomyLevel,
  type CampaignObjective,
  type ChannelType,
  type ConversionDestination,
} from '@adsrobotic/db';
import { validationError } from './errors';
import { buildStrategy } from './strategist';
import { uniqueSlug } from './slug';
import { recordActivity } from './activity';
import { buildDefaultPageConfig } from './landing';

export interface CreateCampaignInput {
  businessId: string;
  name: string;
  objective: CampaignObjective;
  conversionDestination: ConversionDestination;
  destinationValue?: string;
  budgetTotal: number;
  durationDays: number;
  currency?: string;
  autonomyLevel?: AutonomyLevel;
  maxCostPerLead?: number;
  location?: string;
  channel?: ChannelType;
}

/**
 * Create a campaign from the wizard (Spec §13). Persists the AI strategy and a
 * budget rule, provisions a Smart Page when that destination is chosen, and logs
 * the action to the AI activity trail (Spec §21). Campaigns start in
 * `pending_approval` — nothing goes live without the user approving (Spec §6).
 */
export async function createCampaign(input: CreateCampaignInput) {
  if (!input.name.trim()) throw validationError('Give your campaign a name');
  if (!(input.budgetTotal > 0)) throw validationError('Budget must be greater than zero');
  if (!(input.durationDays > 0)) throw validationError('Duration must be at least one day');

  const currency = input.currency ?? 'USD';
  const strategy = buildStrategy({
    objective: input.objective,
    conversionDestination: input.conversionDestination,
    budgetTotal: input.budgetTotal,
    currency,
    durationDays: input.durationDays,
    location: input.location,
  });

  const campaign = await prisma.$transaction(async (tx) => {
    let destinationValue = input.destinationValue?.trim() || null;
    let smartPageId: string | null = null;

    // Auto-provision a Smart Page destination (Spec §5, option 4), pre-filled
    // from the Business Brain so it converts out of the box.
    if (input.conversionDestination === 'smart_page') {
      const config = await buildDefaultPageConfig(input.businessId, {
        headline: input.name.trim(),
        ctaLabel: strategy.successMetric.toLowerCase().includes('whatsapp')
          ? 'Message us'
          : 'Get in touch',
      });
      const page = await tx.landingPage.create({
        data: {
          businessId: input.businessId,
          slug: uniqueSlug(input.name),
          title: input.name.trim(),
          config: config as unknown as object,
        },
      });
      destinationValue = page.id;
      smartPageId = page.id;
    }

    const created = await tx.campaign.create({
      data: {
        businessId: input.businessId,
        name: input.name.trim(),
        objective: input.objective,
        status: 'pending_approval',
        conversionDestination: input.conversionDestination,
        destinationValue,
        channel: input.channel ?? null,
        budgetTotal: input.budgetTotal,
        budgetDaily: strategy.budget.daily,
        currency,
        autonomyLevel: input.autonomyLevel ?? 'assistant',
        strategy: strategy as unknown as object,
      },
    });

    await tx.budgetRule.create({
      data: {
        businessId: input.businessId,
        campaignId: created.id,
        monthlyBudget: input.budgetTotal,
        maxDailySpend: strategy.budget.daily,
        maxCostPerLead: input.maxCostPerLead ?? null,
        actionWhenExceeded: 'pause_campaign',
        autonomyNote: 'AI may pause but must ask before increasing budget.',
      },
    });

    // Attribute the auto-provisioned Smart Page's leads back to this campaign.
    if (smartPageId) {
      await tx.landingPage.update({ where: { id: smartPageId }, data: { campaignId: created.id } });
    }

    return created;
  });

  await recordActivity({
    businessId: input.businessId,
    campaignId: campaign.id,
    type: 'campaign_created',
    summary: `Drafted "${campaign.name}" — ${strategy.channelStrategy.toLowerCase()}, optimising for ${strategy.successMetric.toLowerCase()}.`,
    detail: { strategy },
    autonomyLevel: campaign.autonomyLevel,
  });

  return { campaign, strategy };
}

export async function listCampaigns(businessId: string) {
  return prisma.campaign.findMany({
    where: { businessId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
}

/** Approve a pending campaign — the user's explicit go-ahead (Spec §6). */
export async function approveCampaign(businessId: string, campaignId: string, userId: string) {
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, businessId } });
  if (!campaign) throw validationError('Campaign not found');

  const updated = await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: 'scheduled', approvedById: userId, approvedAt: new Date() },
  });

  await recordActivity({
    businessId,
    campaignId: campaign.id,
    type: 'campaign_created',
    summary: `"${campaign.name}" approved and scheduled to launch.`,
    autonomyLevel: campaign.autonomyLevel,
  });

  return updated;
}
