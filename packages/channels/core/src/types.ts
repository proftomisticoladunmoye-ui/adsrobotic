/**
 * Advertising channel abstraction (Spec §4). AdsRobotic is a channel-agnostic
 * advertising operating system: every integration (Google, Meta, TikTok, the
 * AdsRobotic Network, …) implements this one interface, so the application is
 * never hard-coded around a single platform.
 *
 * Contracts here describe *shape*, not any live API call. Concrete adapters live
 * in sibling packages (e.g. @adsrobotic/channel-meta) and are registered at
 * runtime. The MVP ships only the mock adapter.
 *
 * Reliability rule (Spec §27): never assume a channel action succeeded. Every
 * mutating call returns a typed result the caller must verify.
 */

export type ChannelId =
  | 'google'
  | 'meta'
  | 'instagram'
  | 'facebook'
  | 'youtube'
  | 'tiktok'
  | 'linkedin'
  | 'microsoft'
  | 'adsrobotic_network'
  | 'mock';

export interface Money {
  /** Minor-unit-safe decimal string, e.g. "25.00". */
  amount: string;
  currency: string;
}

export interface ChannelCredentials {
  externalAccountId?: string;
  /** Decrypted at the call boundary; adapters never persist raw tokens. */
  accessToken?: string;
  refreshToken?: string;
  [key: string]: string | undefined;
}

export interface ConnectResult {
  ok: boolean;
  externalAccountId?: string;
  scopes?: string[];
  error?: string;
}

export interface CampaignTypeOption {
  key: string;
  label: string;
  objectives: string[];
}

export interface AudienceOption {
  key: string;
  label: string;
  kind: 'location' | 'interest' | 'demographic' | 'custom';
}

export interface CreateCampaignInput {
  name: string;
  objective: string;
  dailyBudget?: Money;
  totalBudget?: Money;
  startAt?: string;
  endAt?: string;
  targeting?: Record<string, unknown>;
  destinationUrl?: string;
}

/** Result of any mutating operation — always explicitly verifiable (Spec §27). */
export interface ChannelMutationResult {
  ok: boolean;
  /** Provider-side id when the operation created/changed a resource. */
  externalId?: string;
  /** True once the adapter has re-read the resource and confirmed the state. */
  verified: boolean;
  error?: string;
}

export interface CreativeUpload {
  kind: 'image' | 'video' | 'text';
  url?: string;
  text?: string;
  mimeType?: string;
}

export interface CampaignMetricsQuery {
  externalCampaignId: string;
  from: string;
  to: string;
}

export interface ChannelMetrics {
  impressions: number;
  clicks: number;
  spend: Money;
  leads: number;
  conversions: number;
  /** Whether these figures are provider-reported (actual) or modelled. */
  source: 'actual' | 'estimated';
}

/**
 * The single interface every channel adapter implements (Spec §4).
 */
export interface AdvertisingChannel {
  readonly id: ChannelId;
  readonly label: string;

  connectAccount(creds: ChannelCredentials): Promise<ConnectResult>;
  validatePermissions(creds: ChannelCredentials): Promise<{ ok: boolean; missing: string[] }>;
  getAvailableCampaignTypes(): Promise<CampaignTypeOption[]>;
  getAudienceOptions(query?: string): Promise<AudienceOption[]>;

  createCampaign(creds: ChannelCredentials, input: CreateCampaignInput): Promise<ChannelMutationResult>;
  updateCampaign(
    creds: ChannelCredentials,
    externalCampaignId: string,
    patch: Partial<CreateCampaignInput>,
  ): Promise<ChannelMutationResult>;
  pauseCampaign(creds: ChannelCredentials, externalCampaignId: string): Promise<ChannelMutationResult>;
  resumeCampaign(creds: ChannelCredentials, externalCampaignId: string): Promise<ChannelMutationResult>;

  uploadCreative(
    creds: ChannelCredentials,
    externalCampaignId: string,
    creative: CreativeUpload,
  ): Promise<ChannelMutationResult>;

  getCampaignMetrics(creds: ChannelCredentials, query: CampaignMetricsQuery): Promise<ChannelMetrics>;
  getSpend(creds: ChannelCredentials, externalCampaignId: string): Promise<Money>;
  getConversions(creds: ChannelCredentials, externalCampaignId: string): Promise<number>;
}
