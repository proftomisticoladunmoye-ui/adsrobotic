import { prisma } from '@adsrobotic/db';
import { AppError, validationError } from './errors';
import { ensureAdaptersRegistered, getChannel } from './channels-registry';
import { resolveChannelCredentials } from './channels';
import { recordActivity } from './activity';

export interface LaunchResult {
  launched: boolean;
  externalId?: string;
  message: string;
}

/**
 * Launch an approved campaign onto its live advertising channel (Spec §4, §27).
 *
 * Safety: the campaign must already be approved by a human (Spec §6). The channel
 * campaign is created PAUSED by the adapter; we only flip AdsRobotic's status to
 * `active` when the adapter reports the mutation as VERIFIED — never assuming
 * success (Spec §27). Everything is logged to the AI activity trail.
 */
export async function launchCampaign(
  businessId: string,
  campaignId: string,
  userId?: string,
): Promise<LaunchResult> {
  ensureAdaptersRegistered();

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, businessId, deletedAt: null },
  });
  if (!campaign) throw validationError('Campaign not found');
  if (!campaign.approvedAt) throw new AppError('Approve the campaign before launching', 409, 'not_approved');
  if (campaign.externalId) {
    return { launched: true, externalId: campaign.externalId, message: 'Already launched.' };
  }
  if (!campaign.channel) throw validationError('Choose an advertising channel for this campaign');

  const adapter = getChannel(campaign.channel);
  if (!adapter) throw new AppError(`No adapter for channel ${campaign.channel}`, 400, 'no_adapter');

  const creds = await resolveChannelCredentials(businessId, campaign.channel);
  if (!creds) {
    throw new AppError(`Connect your ${campaign.channel} account first`, 400, 'not_connected');
  }

  const result = await adapter.createCampaign(creds, {
    name: campaign.name,
    objective: campaign.objective,
    totalBudget: { amount: String(campaign.budgetTotal), currency: campaign.currency },
    ...(campaign.budgetDaily
      ? { dailyBudget: { amount: String(campaign.budgetDaily), currency: campaign.currency } }
      : {}),
    ...(campaign.destinationValue ? { destinationUrl: campaign.destinationValue } : {}),
  });

  if (!result.ok) {
    throw new AppError(result.error ?? 'The channel rejected the campaign', 502, 'channel_error');
  }
  if (!result.verified) {
    // The adapter could not confirm the created resource — do NOT mark active.
    throw new AppError(
      'The channel accepted the campaign but it could not be verified. Left unlaunched for safety.',
      502,
      'unverified',
    );
  }

  const updated = await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      status: 'active',
      externalId: result.externalId ?? null,
      externalAccountId: creds.externalAccountId ?? null,
      launchedAt: new Date(),
    },
  });

  await recordActivity({
    businessId,
    campaignId: campaign.id,
    type: 'campaign_created',
    summary: `Launched "${campaign.name}" on ${campaign.channel} (verified).`,
    detail: { externalId: result.externalId, channel: campaign.channel },
    autonomyLevel: campaign.autonomyLevel,
  });
  void userId;

  return { launched: true, externalId: updated.externalId ?? undefined, message: 'Launched and verified.' };
}
