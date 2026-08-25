import { prisma, type ChannelType } from '@adsrobotic/db';

/**
 * Real Business Outcome Intelligence (Spec §1 Engine 5, §15). Models the full
 * customer journey — impression → click → landing-page view → lead → qualified
 * lead → customer → revenue — from the data AdsRobotic actually holds, and
 * derives the conversion rates and cost/return metrics that tell a business what
 * its money achieved.
 *
 * Honesty (Spec §28): reach/spend come from channel-reported CampaignMetric
 * rows (actual only — estimated rows are excluded); leads/customers/revenue come
 * from first-party records (the lead inbox and confirmed sales). The two are
 * combined transparently, never conflated, and never fabricated.
 */

export interface FunnelStage {
  key: string;
  label: string;
  value: number;
  /** Conversion rate from the previous meaningful stage (0..1), null for the top. */
  fromPrevious: number | null;
}

export interface ChannelRow {
  channel: ChannelType;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  customers: number;
  revenue: number;
}

export interface ConversionIntelligence {
  funnel: FunnelStage[];
  spend: number;
  revenue: number;
  roas: number | null;
  costPerLead: number | null;
  costPerQualifiedLead: number | null;
  costPerCustomer: number | null;
  repeatCustomers: number;
  currency: string;
  channels: ChannelRow[];
  /** Everything here is measured, not modelled. */
  source: 'actual';
}

function rate(n: number, d: number): number | null {
  return d > 0 ? n / d : null;
}

export async function getConversionIntelligence(businessId: string): Promise<ConversionIntelligence> {
  const [metrics, pageViews, leads, sales, profile, leadRows, saleRows, byChannelMetrics] =
    await Promise.all([
      prisma.campaignMetric.aggregate({
        where: { campaign: { businessId }, source: 'actual' },
        _sum: { impressions: true, clicks: true, spend: true },
      }),
      prisma.landingPage.aggregate({ where: { businessId }, _sum: { views: true } }),
      prisma.lead.findMany({
        where: { businessId },
        select: { status: true, qualified: true, campaign: { select: { channel: true } } },
      }),
      prisma.sale.aggregate({ where: { businessId }, _sum: { amount: true }, _count: { _all: true } }),
      prisma.businessProfile.findUnique({ where: { businessId } }),
      prisma.lead.count({ where: { businessId } }),
      prisma.sale.findMany({
        where: { businessId },
        select: { amount: true, repeat: true, campaign: { select: { channel: true } } },
      }),
      prisma.campaignMetric.groupBy({
        by: ['channel'],
        where: { campaign: { businessId }, source: 'actual' },
        _sum: { spend: true, impressions: true, clicks: true },
      }),
    ]);

  const impressions = metrics._sum.impressions ?? 0;
  const clicks = metrics._sum.clicks ?? 0;
  const views = pageViews._sum.views ?? 0;
  const spend = Number(metrics._sum.spend ?? 0);
  const revenue = Number(sales._sum.amount ?? 0);

  const leadCount = leadRows;
  const qualifiedCount = leads.filter((l) => l.qualified || l.status === 'qualified' || l.status === 'converted').length;
  const customerCount = leads.filter((l) => l.status === 'converted').length;
  const repeatCustomers = saleRows.filter((s) => s.repeat).length;

  // Build the funnel; `fromPrevious` chains off the previous non-zero-eligible stage.
  const raw: Array<{ key: string; label: string; value: number }> = [
    { key: 'impressions', label: 'Impressions', value: impressions },
    { key: 'clicks', label: 'Clicks', value: clicks },
    { key: 'page_views', label: 'Landing-page views', value: views },
    { key: 'leads', label: 'Leads', value: leadCount },
    { key: 'qualified', label: 'Qualified leads', value: qualifiedCount },
    { key: 'customers', label: 'Customers', value: customerCount },
  ];
  const funnel: FunnelStage[] = raw.map((s, i) => ({
    ...s,
    fromPrevious: i === 0 ? null : rate(s.value, raw[i - 1]!.value),
  }));

  // Per-channel breakdown: spend/reach from metrics, leads/customers/revenue
  // attributed first-party via the campaign's channel.
  const channelMap = new Map<ChannelType, ChannelRow>();
  const ensure = (ch: ChannelType): ChannelRow => {
    let row = channelMap.get(ch);
    if (!row) {
      row = { channel: ch, spend: 0, impressions: 0, clicks: 0, leads: 0, customers: 0, revenue: 0 };
      channelMap.set(ch, row);
    }
    return row;
  };
  for (const m of byChannelMetrics) {
    if (!m.channel) continue;
    const row = ensure(m.channel);
    row.spend += Number(m._sum.spend ?? 0);
    row.impressions += m._sum.impressions ?? 0;
    row.clicks += m._sum.clicks ?? 0;
  }
  for (const l of leads) {
    const ch = l.campaign?.channel;
    if (!ch) continue;
    const row = ensure(ch);
    row.leads += 1;
    if (l.status === 'converted') row.customers += 1;
  }
  for (const s of saleRows) {
    const ch = s.campaign?.channel;
    if (!ch) continue;
    ensure(ch).revenue += Number(s.amount);
  }

  return {
    funnel,
    spend,
    revenue,
    roas: rate(revenue, spend),
    costPerLead: rate(spend, leadCount),
    costPerQualifiedLead: rate(spend, qualifiedCount),
    costPerCustomer: rate(spend, customerCount),
    repeatCustomers,
    currency: profile?.currency ?? 'USD',
    channels: [...channelMap.values()].sort((a, b) => b.spend - a.spend),
    source: 'actual',
  };
}
