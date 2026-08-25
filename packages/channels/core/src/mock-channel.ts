import type {
  AdvertisingChannel,
  ChannelCredentials,
  ChannelMetrics,
  ChannelMutationResult,
  CreateCampaignInput,
  CreativeUpload,
  Money,
} from './types';

/**
 * MockChannel — a fully in-memory adapter used for the MVP, demo mode (Spec §25),
 * and tests. It implements the full AdvertisingChannel contract without making
 * any external calls, and always reports `verified: true` since state is local.
 */
export class MockChannel implements AdvertisingChannel {
  readonly id = 'mock' as const;
  readonly label = 'Demo Channel';

  private seq = 0;
  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}_${this.seq}`;
  }

  async connectAccount(): Promise<{ ok: true; externalAccountId: string; scopes: string[] }> {
    return { ok: true, externalAccountId: this.nextId('acct'), scopes: ['ads.read', 'ads.write'] };
  }

  async validatePermissions(): Promise<{ ok: boolean; missing: string[] }> {
    return { ok: true, missing: [] };
  }

  async getAvailableCampaignTypes() {
    return [
      { key: 'search', label: 'Search Intent', objectives: ['get_leads', 'website_traffic'] },
      { key: 'social', label: 'Social Discovery', objectives: ['get_customers', 'build_awareness'] },
      { key: 'retargeting', label: 'Retargeting', objectives: ['increase_sales'] },
    ];
  }

  async getAudienceOptions() {
    return [
      { key: 'kampala', label: 'Kampala + 10km', kind: 'location' as const },
      { key: 'smb-owners', label: 'Business owners 25–50', kind: 'demographic' as const },
      { key: 'baking', label: 'Interest: fresh food & baking', kind: 'interest' as const },
    ];
  }

  async createCampaign(
    _creds: ChannelCredentials,
    _input: CreateCampaignInput,
  ): Promise<ChannelMutationResult> {
    return { ok: true, externalId: this.nextId('cmp'), verified: true };
  }

  async updateCampaign(
    _creds: ChannelCredentials,
    externalCampaignId: string,
  ): Promise<ChannelMutationResult> {
    return { ok: true, externalId: externalCampaignId, verified: true };
  }

  async pauseCampaign(
    _creds: ChannelCredentials,
    externalCampaignId: string,
  ): Promise<ChannelMutationResult> {
    return { ok: true, externalId: externalCampaignId, verified: true };
  }

  async resumeCampaign(
    _creds: ChannelCredentials,
    externalCampaignId: string,
  ): Promise<ChannelMutationResult> {
    return { ok: true, externalId: externalCampaignId, verified: true };
  }

  async uploadCreative(
    _creds: ChannelCredentials,
    _externalCampaignId: string,
    _creative: CreativeUpload,
  ): Promise<ChannelMutationResult> {
    return { ok: true, externalId: this.nextId('crv'), verified: true };
  }

  async getCampaignMetrics(): Promise<ChannelMetrics> {
    return {
      impressions: 48230,
      clicks: 2814,
      spend: { amount: '380.00', currency: 'USD' },
      leads: 326,
      conversions: 87,
      source: 'actual',
    };
  }

  async getSpend(): Promise<Money> {
    return { amount: '380.00', currency: 'USD' };
  }

  async getConversions(): Promise<number> {
    return 87;
  }
}
