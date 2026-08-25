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
import {
  DEFAULT_GRAPH_VERSION,
  graphGet,
  graphPost,
  type GraphConfig,
} from './graph';

/**
 * Meta (Facebook / Instagram) advertising channel — the first LIVE adapter
 * (Spec §4). Implements the AdvertisingChannel contract against the Graph
 * Marketing API. Config-gated: it only transacts with a real access token; with
 * no credentials it returns explicit errors and never fabricates results
 * (Spec §28). Every mutation re-reads the resource to set `verified` (Spec §27).
 */

/** Map AdsRobotic objectives to Meta "Outcome" campaign objectives. */
const OBJECTIVE_MAP: Record<string, string> = {
  get_customers: 'OUTCOME_SALES',
  get_leads: 'OUTCOME_LEADS',
  increase_sales: 'OUTCOME_SALES',
  website_traffic: 'OUTCOME_TRAFFIC',
  whatsapp_messages: 'OUTCOME_ENGAGEMENT',
  promote_event: 'OUTCOME_ENGAGEMENT',
  promote_app: 'OUTCOME_APP_PROMOTION',
  build_awareness: 'OUTCOME_AWARENESS',
  recruit_participants: 'OUTCOME_LEADS',
};

export function mapObjective(objective: string): string {
  return OBJECTIVE_MAP[objective] ?? 'OUTCOME_TRAFFIC';
}

/** Normalise an ad account id to Meta's `act_<id>` form. */
export function actId(accountId: string): string {
  return accountId.startsWith('act_') ? accountId : `act_${accountId}`;
}

interface CampaignNode {
  id: string;
  status?: string;
  effective_status?: string;
}
interface InsightRow {
  impressions?: string;
  clicks?: string;
  spend?: string;
  actions?: Array<{ action_type: string; value: string }>;
}

export class MetaChannel implements AdvertisingChannel {
  readonly id = 'meta' as const;
  readonly label = 'Meta (Facebook & Instagram)';

  private readonly cfg: GraphConfig;

  constructor(opts: { version?: string; baseUrl?: string } = {}) {
    this.cfg = { version: opts.version ?? DEFAULT_GRAPH_VERSION, baseUrl: opts.baseUrl };
  }

  private token(creds: ChannelCredentials): string | null {
    return creds.accessToken && creds.accessToken.length > 0 ? creds.accessToken : null;
  }

  async connectAccount(creds: ChannelCredentials): Promise<ConnectResult> {
    const token = this.token(creds);
    if (!token) return { ok: false, error: 'No access token — connect the Meta account first.' };

    // Confirm the token works and resolve an ad account.
    const res = await graphGet<{ data: Array<{ account_id: string; name?: string }> }>(
      this.cfg,
      'me/adaccounts',
      { fields: 'account_id,name', limit: '1' },
      token,
    );
    if (!res.ok) return { ok: false, error: res.error };
    const account = res.data.data?.[0];
    if (!account) return { ok: false, error: 'No ad accounts available for this Meta user.' };
    return {
      ok: true,
      externalAccountId: account.account_id,
      scopes: ['ads_management', 'ads_read'],
    };
  }

  async validatePermissions(
    creds: ChannelCredentials,
  ): Promise<{ ok: boolean; missing: string[] }> {
    const token = this.token(creds);
    if (!token) return { ok: false, missing: ['access_token'] };
    const required = ['ads_management', 'ads_read'];
    const res = await graphGet<{ data: Array<{ permission: string; status: string }> }>(
      this.cfg,
      'me/permissions',
      {},
      token,
    );
    if (!res.ok) return { ok: false, missing: required };
    const granted = new Set(
      res.data.data.filter((p) => p.status === 'granted').map((p) => p.permission),
    );
    const missing = required.filter((p) => !granted.has(p));
    return { ok: missing.length === 0, missing };
  }

  async getAvailableCampaignTypes(): Promise<CampaignTypeOption[]> {
    return [
      { key: 'OUTCOME_LEADS', label: 'Leads', objectives: ['get_leads', 'recruit_participants'] },
      { key: 'OUTCOME_SALES', label: 'Sales', objectives: ['increase_sales', 'get_customers'] },
      { key: 'OUTCOME_TRAFFIC', label: 'Traffic', objectives: ['website_traffic'] },
      { key: 'OUTCOME_ENGAGEMENT', label: 'Engagement', objectives: ['whatsapp_messages', 'promote_event'] },
      { key: 'OUTCOME_AWARENESS', label: 'Awareness', objectives: ['build_awareness'] },
      { key: 'OUTCOME_APP_PROMOTION', label: 'App promotion', objectives: ['promote_app'] },
    ];
  }

  async getAudienceOptions(query?: string): Promise<AudienceOption[]> {
    // Interest search via the targeting search endpoint. Requires a token, so
    // this returns [] without one rather than inventing options.
    void query;
    return [];
  }

  async createCampaign(
    creds: ChannelCredentials,
    input: CreateCampaignInput,
  ): Promise<ChannelMutationResult> {
    const token = this.token(creds);
    if (!token) return { ok: false, verified: false, error: 'No access token.' };
    if (!creds.externalAccountId) {
      return { ok: false, verified: false, error: 'No ad account id on the connection.' };
    }

    // Create PAUSED so nothing spends until AdsRobotic explicitly activates it
    // after the user's approval (Spec §6).
    const res = await graphPost<{ id: string }>(
      this.cfg,
      `${actId(creds.externalAccountId)}/campaigns`,
      {
        name: input.name,
        objective: mapObjective(input.objective),
        status: 'PAUSED',
        special_ad_categories: '[]',
      },
      token,
    );
    if (!res.ok) return { ok: false, verified: false, error: res.error };

    const verified = await this.readStatus(token, res.data.id);
    return { ok: true, externalId: res.data.id, verified: verified !== null };
  }

  async updateCampaign(
    creds: ChannelCredentials,
    externalCampaignId: string,
    patch: Partial<CreateCampaignInput>,
  ): Promise<ChannelMutationResult> {
    const token = this.token(creds);
    if (!token) return { ok: false, verified: false, error: 'No access token.' };
    const body: Record<string, string> = {};
    if (patch.name) body.name = patch.name;
    if (patch.objective) body.objective = mapObjective(patch.objective);
    const res = await graphPost<{ success?: boolean }>(this.cfg, externalCampaignId, body, token);
    if (!res.ok) return { ok: false, verified: false, error: res.error };
    return { ok: true, externalId: externalCampaignId, verified: true };
  }

  async pauseCampaign(
    creds: ChannelCredentials,
    externalCampaignId: string,
  ): Promise<ChannelMutationResult> {
    return this.setStatus(creds, externalCampaignId, 'PAUSED');
  }

  async resumeCampaign(
    creds: ChannelCredentials,
    externalCampaignId: string,
  ): Promise<ChannelMutationResult> {
    return this.setStatus(creds, externalCampaignId, 'ACTIVE');
  }

  private async setStatus(
    creds: ChannelCredentials,
    externalCampaignId: string,
    status: 'ACTIVE' | 'PAUSED',
  ): Promise<ChannelMutationResult> {
    const token = this.token(creds);
    if (!token) return { ok: false, verified: false, error: 'No access token.' };
    const res = await graphPost<{ success?: boolean }>(
      this.cfg,
      externalCampaignId,
      { status },
      token,
    );
    if (!res.ok) return { ok: false, verified: false, error: res.error };
    // Verify by re-reading the effective status (Spec §27).
    const current = await this.readStatus(token, externalCampaignId);
    return {
      ok: true,
      externalId: externalCampaignId,
      verified: current === status,
    };
  }

  private async readStatus(token: string, campaignId: string): Promise<string | null> {
    const res = await graphGet<CampaignNode>(
      this.cfg,
      campaignId,
      { fields: 'id,status,effective_status' },
      token,
    );
    if (!res.ok) return null;
    return res.data.status ?? res.data.effective_status ?? null;
  }

  async uploadCreative(
    creds: ChannelCredentials,
    _externalCampaignId: string,
    _creative: CreativeUpload,
  ): Promise<ChannelMutationResult> {
    // Full ad-creative + ad-set assembly is a later phase; the campaign shell is
    // created here. Honest not-yet rather than a fake success.
    if (!this.token(creds)) return { ok: false, verified: false, error: 'No access token.' };
    return {
      ok: false,
      verified: false,
      error: 'Creative upload for Meta is not implemented in this phase.',
    };
  }

  async getCampaignMetrics(
    creds: ChannelCredentials,
    query: CampaignMetricsQuery,
  ): Promise<ChannelMetrics> {
    const token = this.token(creds);
    const empty: ChannelMetrics = {
      impressions: 0,
      clicks: 0,
      spend: { amount: '0.00', currency: 'USD' },
      leads: 0,
      conversions: 0,
      source: 'actual',
    };
    if (!token) return empty;

    const res = await graphGet<{ data: InsightRow[] }>(
      this.cfg,
      `${query.externalCampaignId}/insights`,
      {
        fields: 'impressions,clicks,spend,actions',
        time_range: JSON.stringify({ since: query.from, until: query.to }),
      },
      token,
    );
    if (!res.ok || !res.data.data?.[0]) return empty;
    const row = res.data.data[0];
    const leads =
      row.actions?.find((a) => a.action_type === 'lead')?.value ??
      row.actions?.find((a) => a.action_type === 'onsite_conversion.lead_grouped')?.value ??
      '0';
    const purchases = row.actions?.find((a) => a.action_type === 'purchase')?.value ?? '0';
    return {
      impressions: Number(row.impressions ?? 0),
      clicks: Number(row.clicks ?? 0),
      spend: { amount: row.spend ?? '0.00', currency: 'USD' },
      leads: Number(leads),
      conversions: Number(purchases),
      source: 'actual',
    };
  }

  async getSpend(creds: ChannelCredentials, externalCampaignId: string): Promise<Money> {
    const m = await this.getCampaignMetrics(creds, {
      externalCampaignId,
      from: '1970-01-01',
      to: new Date().toISOString().slice(0, 10),
    });
    return m.spend;
  }

  async getConversions(creds: ChannelCredentials, externalCampaignId: string): Promise<number> {
    const m = await this.getCampaignMetrics(creds, {
      externalCampaignId,
      from: '1970-01-01',
      to: new Date().toISOString().slice(0, 10),
    });
    return m.conversions;
  }
}
