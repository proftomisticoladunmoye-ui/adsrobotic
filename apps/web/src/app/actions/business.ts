'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  approveCampaign,
  createCampaign,
  launchCampaign,
  toErrorPayload,
  updateBusinessProfile,
  type CampaignObjective,
  type ChannelType,
  type ConversionDestination,
} from '@adsrobotic/core';
import { getCurrentUser } from '@/lib/current-user';

export interface ActionState {
  error?: string;
}

async function requireBusiness() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.activeBusiness) redirect('/onboarding');
  return user.activeBusiness;
}

export async function saveBrainAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const business = await requireBusiness();
  try {
    await updateBusinessProfile(business.id, {
      industry: String(formData.get('industry') ?? ''),
      description: String(formData.get('description') ?? ''),
      valueProposition: String(formData.get('valueProposition') ?? ''),
      website: String(formData.get('website') ?? ''),
      currency: String(formData.get('currency') ?? '') || undefined,
    });
  } catch (err) {
    return { error: toErrorPayload(err).message };
  }
  redirect('/dashboard');
}

export async function createCampaignAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const business = await requireBusiness();
  try {
    const { campaign } = await createCampaign({
      businessId: business.id,
      name: String(formData.get('name') ?? ''),
      objective: String(formData.get('objective') ?? 'get_leads') as CampaignObjective,
      conversionDestination: String(
        formData.get('conversionDestination') ?? 'whatsapp',
      ) as ConversionDestination,
      destinationValue: String(formData.get('destinationValue') ?? '') || undefined,
      budgetTotal: Number(formData.get('budgetTotal') ?? 0),
      durationDays: Number(formData.get('durationDays') ?? 30),
      location: String(formData.get('location') ?? '') || undefined,
      channel: (String(formData.get('channel') ?? '') || undefined) as ChannelType | undefined,
      maxCostPerLead: formData.get('maxCostPerLead')
        ? Number(formData.get('maxCostPerLead'))
        : undefined,
    });
    revalidatePath('/campaigns');
    redirect(`/campaigns/${campaign.id}`);
  } catch (err) {
    // redirect() throws a control-flow signal; re-throw it so Next can handle it.
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return { error: toErrorPayload(err).message };
  }
}

export async function approveCampaignAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.activeBusiness) redirect('/login');
  const campaignId = String(formData.get('campaignId') ?? '');
  await approveCampaign(user.activeBusiness.id, campaignId, user.id);
  revalidatePath(`/campaigns/${campaignId}`);
}

/** Launch an approved campaign on its live channel. Redirects back with a
 *  result banner; never throws to the user unhandled. */
export async function launchCampaignAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.activeBusiness) redirect('/login');
  const campaignId = String(formData.get('campaignId') ?? '');
  try {
    await launchCampaign(user.activeBusiness.id, campaignId, user.id);
    revalidatePath(`/campaigns/${campaignId}`);
    redirect(`/campaigns/${campaignId}?launched=1`);
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(toErrorPayload(err).message)}`);
  }
}
