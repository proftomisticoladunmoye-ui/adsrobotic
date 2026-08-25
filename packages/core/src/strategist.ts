import type { CampaignObjective, ConversionDestination } from '@adsrobotic/db';

/**
 * AI Campaign Strategist (Spec §2, Engine 2). Turns a business goal into an
 * executable, explainable strategy. This is a deterministic planner: it makes a
 * defensible recommendation with plain-language reasoning and never fabricates
 * performance numbers. A later phase lets an external AI provider enrich it.
 */
export interface StrategyInput {
  objective: CampaignObjective;
  conversionDestination: ConversionDestination;
  budgetTotal: number;
  currency: string;
  durationDays: number;
  location?: string;
}

export interface CampaignStrategy {
  objective: CampaignObjective;
  targetMarket: string;
  primaryAudience: string;
  budget: { total: number; daily: number; currency: string };
  durationDays: number;
  channelStrategy: string;
  creativeStrategy: string;
  conversionDestination: ConversionDestination;
  successMetric: string;
  automationRule: string;
  reasoning: string;
}

const AUDIENCE_BY_OBJECTIVE: Record<CampaignObjective, string> = {
  get_customers: 'Nearby prospects likely to buy, aged 25–50',
  get_leads: 'Decision-makers actively researching your category',
  increase_sales: 'Past visitors and lookalikes of your best customers',
  website_traffic: 'Interest-matched audiences in your market',
  whatsapp_messages: 'Local prospects who prefer to chat before buying',
  promote_event: 'People in the area interested in the event topic',
  promote_app: 'Mobile users matching your app’s core use case',
  build_awareness: 'A broad, interest-relevant audience in your market',
  recruit_participants: 'People matching your study’s eligibility criteria',
};

const SUCCESS_METRIC: Record<CampaignObjective, string> = {
  get_customers: 'Cost per new customer',
  get_leads: 'Cost per qualified lead',
  increase_sales: 'Return on ad spend',
  website_traffic: 'Cost per engaged visit',
  whatsapp_messages: 'Cost per qualified WhatsApp conversation',
  promote_event: 'Cost per registration',
  promote_app: 'Cost per install',
  build_awareness: 'Cost per thousand reached',
  recruit_participants: 'Cost per eligible sign-up',
};

export function buildStrategy(input: StrategyInput): CampaignStrategy {
  const daily = Math.max(1, Math.round((input.budgetTotal / input.durationDays) * 100) / 100);

  const channelStrategy =
    input.objective === 'increase_sales'
      ? 'Retargeting first, then search intent and social discovery'
      : input.objective === 'build_awareness'
        ? 'Social discovery and video reach'
        : 'Search intent + social discovery + retargeting';

  const creativeStrategy =
    'Test four angles — problem, benefit, social proof, and urgency — then concentrate budget on the winner.';

  const successMetric = SUCCESS_METRIC[input.objective];

  return {
    objective: input.objective,
    targetMarket: input.location?.trim() || 'Your primary market',
    primaryAudience: AUDIENCE_BY_OBJECTIVE[input.objective],
    budget: { total: input.budgetTotal, daily, currency: input.currency },
    durationDays: input.durationDays,
    channelStrategy,
    creativeStrategy,
    conversionDestination: input.conversionDestination,
    successMetric,
    automationRule: `Pause any campaign whose ${successMetric.toLowerCase()} exceeds your maximum threshold.`,
    reasoning: `For a goal of "${input.objective.replace(/_/g, ' ')}", the plan spreads ${input.currency} ${input.budgetTotal} over ${input.durationDays} days (${input.currency} ${daily}/day). It leads with ${channelStrategy.toLowerCase()} because that ordering reaches the highest-intent people first, and it optimises toward ${successMetric.toLowerCase()} so spend follows real outcomes, not vanity clicks.`,
  };
}
