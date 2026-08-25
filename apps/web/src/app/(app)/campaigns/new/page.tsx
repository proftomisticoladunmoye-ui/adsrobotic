import type { Metadata } from 'next';
import { availableChannels } from '@adsrobotic/core';
import { CampaignWizard } from '@/components/campaign-wizard';
import { createCampaignAction } from '@/app/actions/business';
import { getCurrentUser } from '@/lib/current-user';

export const metadata: Metadata = { title: 'New campaign' };
export const dynamic = 'force-dynamic';

export default async function NewCampaignPage() {
  const business = (await getCurrentUser())!.activeBusiness!;
  // Currency lives on the profile; default to USD for the wizard preview.
  const currency = 'USD';
  void business;
  const channels = availableChannels();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ar-blue">Create a campaign</h1>
        <p className="mt-1 text-ar-muted">
          Answer a few questions — AdsRobotic builds the strategy, creatives, and safety rules.
        </p>
      </div>
      <CampaignWizard action={createCampaignAction} currency={currency} channels={channels} />
    </div>
  );
}
