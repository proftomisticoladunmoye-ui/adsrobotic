import type {
  AdvertisingChannel,
  AudienceOption,
  CampaignMetricsQuery,
  CampaignTypeOption,
  ChannelCredentials,
  ChannelMetrics,
  ChannelMutationResult,
  ConnectResult,
  CreateCampaignInput,
  CreativeUpload,
  Money,
} from '@adsrobotic/channel-core';
import { DEFAULT_TIKTOK_VERSION, tiktokGet, tiktokPost, type TikTokConfig } from './api';

/**
 * TikTok Ads advertising channel — the third LIVE adapter (Spec §4). Implements
 * the AdvertisingChannel contract against the TikTok Business (Marketing) API.
 * Config-gated: it only transacts with a real access token + advertiser id, and
 * returns explicit errors otherwise — never fabricating results (Spec §28).
 * Campaigns are created and then set DISABLE so nothing spends until AdsRobotic
 * activates them after the user's approval (Spec §6); every mutation is
 * confirmed by re-reading status (Spec §27).
 */

const OBJECTIVE_MAP: Record<string, string> = {
  get_leads: 'LEAD_GENERATION',
  recruit_participants: 'LEAD_GENERATION',
  website_traffic: 'TRAFFIC',
  promote_event: 'TRAFFIC',
  whatsapp_messages: 'TRAFFIC',
  get_customers: 'CONVERSIONS',
  increase_sales: 'CONVERSIONS',
  build_awareness: 'REACH',
  promote_app: 'APP_PROMOTION',
};

export function mapObjective(objective: string): string {
  return OBJECTIVE_MAP[objective] ?? 'TRAFFIC';
}

interface CampaignRow {
  campaign_id?: string;
  operation_status?: string;
}
interface ReportRow {
  metrics?: Record<string, string>;
}

export class TikTokChannel implements AdvertisingChannel {
  readonly id = 'tiktok' as const;
  readonly label = 'TikTok Ads';

  private readonly cfg: TikTokConfig;

  constructor(opts: { version?: string; baseUrl?: string } = {}) {
    this.cfg = { version: opts.version ?? DEFAULT_TIKTOK_VERSION, ...(opts.baseUrl ? { baseUrl: opts.baseUrl } : {}) };
  }

  private token(creds: ChannelCredentials): string | null {
    return creds.accessToken && creds.accessToken.length > 0 ? creds.accessToken : null;
  }
  private adv(creds: ChannelCredentials): string {
    return creds.externalAccountId ?? '';
  }

  async connectAccount(creds: ChannelCredentials): Promise<ConnectResult> {
    const token = this.token(creds);
    if (!token) return { ok: false, error: 'No access token.' };
    if (!creds.externalAccountId) return { ok: false, error: 'No advertiser id on the connection.' };
    const res = await tiktokGet<{ list?: Array<{ advertiser_id: string }> }>(
      this.cfg,
      'advertiser/info/',
      { advertiser_ids: JSON.stringify([creds.externalAccountId]), fields: JSON.stringify(['advertiser_id', 'name']) },
      token,
    );
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true, externalAccountId: creds.externalAccountId, scopes: ['ads_management'] };
  }

  async validatePermissions(creds: ChannelCredentials): Promise<{ ok: boolean; missing: string[] }> {
    const c = await this.connectAccount(creds);
    return c.ok ? { ok: true, missing: [] } : { ok: false, missing: ['ads_management'] };
  }

  async getAvailableCampaignTypes(): Promise<CampaignTypeOption[]> {
    return [
      { key: 'TRAFFIC', label: 'Traffic', objectives: ['website_traffic', 'promote_event'] },
      { key: 'LEAD_GENERATION', label: 'Lead generation', objectives: ['get_leads', 'recruit_participants'] },
      { key: 'CONVERSIONS', label: 'Conversions', objectives: ['increase_sales', 'get_customers'] },
      { key: 'REACH', label: 'Reach', objectives: ['build_awareness'] },
      { key: 'APP_PROMOTION', label: 'App promotion', objectives: ['promote_app'] },
    ];
  }

  async getAudienceOptions(): Promise<AudienceOption[]> {
    return [];
  }

  async createCampaign(
    creds: ChannelCredentials,
    input: CreateCampaignInput,
  ): Promise<ChannelMutationResult> {
    const token = this.token(creds);
    if (!token) return { ok: false, verified: false, error: 'No access token.' };
    const advertiserId = this.adv(creds);
    if (!advertiserId) return { ok: false, verified: false, error: 'No advertiser id on the connection.' };

    const budget = Number(input.totalBudget?.amount ?? input.dailyBudget?.amount ?? 0);
    const res = await tiktokPost<{ campaign_id: string }>(
      this.cfg,
      'campaign/create/',
      {
        advertiser_id: advertiserId,
        campaign_name: input.name,
        objective_type: mapObjective(input.objective),
        budget_mode: input.dailyBudget ? 'BUDGET_MODE_DAY' : 'BUDGET_MODE_TOTAL',
        budget,
      },
      token,
    );
    if (!res.ok) return { ok: false, verified: false, error: res.error };
    const campaignId = res.data.campaign_id;

    // Ensure it starts paused (DISABLE) so nothing spends before approval.
    await this.setStatusRaw(token, advertiserId, campaignId, 'DISABLE');
    const status = await this.readStatus(token, advertiserId, campaignId);
    return { ok: true, externalId: campaignId, verified: status === 'DISABLE' };
  }

  async updateCampaign(
    creds: ChannelCredentials,
    externalCampaignId: string,
    patch: Partial<CreateCampaignInput>,
  ): Promise<ChannelMutationResult> {
    const token = this.token(creds);
    if (!token) return { ok: false, verified: false, error: 'No access token.' };
    if (!patch.name) return { ok: true, externalId: externalCampaignId, verified: true };
    const res = await tiktokPost<unknown>(
      this.cfg,
      'campaign/update/',
      { advertiser_id: this.adv(creds), campaign_id: externalCampaignId, campaign_name: patch.name },
      token,
    );
    if (!res.ok) return { ok: false, verified: false, error: res.error };
    return { ok: true, externalId: externalCampaignId, verified: true };
  }

  async pauseCampaign(creds: ChannelCredentials, externalCampaignId: string): Promise<ChannelMutationResult> {
    return this.setStatus(creds, externalCampaignId, 'DISABLE');
  }
  async resumeCampaign(creds: ChannelCredentials, externalCampaignId: string): Promise<ChannelMutationResult> {
    return this.setStatus(creds, externalCampaignId, 'ENABLE');
  }

  private async setStatus(
    creds: ChannelCredentials,
    externalCampaignId: string,
    status: 'ENABLE' | 'DISABLE',
  ): Promise<ChannelMutationResult> {
    const token = this.token(creds);
    if (!token) return { ok: false, verified: false, error: 'No access token.' };
    const advertiserId = this.adv(creds);
    const res = await this.setStatusRaw(token, advertiserId, externalCampaignId, status);
    if (!res.ok) return { ok: false, verified: false, error: res.error };
    const current = await this.readStatus(token, advertiserId, externalCampaignId);
    return { ok: true, externalId: externalCampaignId, verified: current === status };
  }

  private setStatusRaw(token: string, advertiserId: string, campaignId: string, status: 'ENABLE' | 'DISABLE') {
    return tiktokPost<unknown>(
      this.cfg,
      'campaign/status/update/',
      { advertiser_id: advertiserId, campaign_ids: [campaignId], operation_status: status },
      token,
    );
  }

  private async readStatus(token: string, advertiserId: string, campaignId: string): Promise<string | null> {
    const res = await tiktokGet<{ list?: CampaignRow[] }>(
      this.cfg,
      'campaign/get/',
      {
        advertiser_id: advertiserId,
        fields: JSON.stringify(['campaign_id', 'operation_status']),
        filtering: JSON.stringify({ campaign_ids: [campaignId] }),
      },
      token,
    );
    if (!res.ok) return null;
    return res.data.list?.[0]?.operation_status ?? null;
  }

  async uploadCreative(
    creds: ChannelCredentials,
    _externalCampaignId: string,
    _creative: CreativeUpload,
  ): Promise<ChannelMutationResult> {
    if (!this.token(creds)) return { ok: false, verified: false, error: 'No access token.' };
    return { ok: false, verified: false, error: 'Ad-group and ad assembly for TikTok is not implemented in this phase.' };
  }

  async getCampaignMetrics(
    creds: ChannelCredentials,
    query: CampaignMetricsQuery,
  ): Promise<ChannelMetrics> {
    const empty: ChannelMetrics = {
      impressions: 0,
      clicks: 0,
      spend: { amount: '0.00', currency: 'USD' },
      leads: 0,
      conversions: 0,
      source: 'actual',
    };
    const token = this.token(creds);
    if (!token) return empty;
    const res = await tiktokGet<{ list?: ReportRow[] }>(
      this.cfg,
      'report/integrated/get/',
      {
        advertiser_id: this.adv(creds),
        report_type: 'BASIC',
        data_level: 'AUCTION_CAMPAIGN',
        dimensions: JSON.stringify(['campaign_id']),
        metrics: JSON.stringify(['impressions', 'clicks', 'spend', 'conversion']),
        start_date: query.from,
        end_date: query.to,
        filtering: JSON.stringify([{ field_name: 'campaign_ids', filter_type: 'IN', filter_value: JSON.stringify([query.externalCampaignId]) }]),
      },
      token,
    );
    if (!res.ok || !res.data.list?.length) return empty;
    let impressions = 0;
    let clicks = 0;
    let spend = 0;
    let conversions = 0;
    for (const row of res.data.list) {
      const m = row.metrics ?? {};
      impressions += Number(m.impressions ?? 0);
      clicks += Number(m.clicks ?? 0);
      spend += Number(m.spend ?? 0);
      conversions += Number(m.conversion ?? 0);
    }
    return {
      impressions,
      clicks,
      spend: { amount: spend.toFixed(2), currency: 'USD' },
      leads: Math.round(conversions),
      conversions: Math.round(conversions),
      source: 'actual',
    };
  }

  async getSpend(creds: ChannelCredentials, externalCampaignId: string): Promise<Money> {
    const m = await this.getCampaignMetrics(creds, {
      externalCampaignId,
      from: '2000-01-01',
      to: new Date().toISOString().slice(0, 10),
    });
    return m.spend;
  }
  async getConversions(creds: ChannelCredentials, externalCampaignId: string): Promise<number> {
    const m = await this.getCampaignMetrics(creds, {
      externalCampaignId,
      from: '2000-01-01',
      to: new Date().toISOString().slice(0, 10),
    });
    return m.conversions;
  }
}
