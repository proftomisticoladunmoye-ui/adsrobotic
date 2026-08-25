import { prisma } from '@adsrobotic/db';

export interface DashboardSummary {
  adSpend: number;
  peopleReached: number;
  leads: number;
  qualifiedLeads: number;
  trackedRevenue: number;
  activeCampaigns: number;
  currency: string;
  wallet: { funded: number; adSpend: number; serviceFee: number; reserved: number } | null;
}

/**
 * Aggregate the "what is my advertising money doing?" numbers for the main
 * dashboard (Spec §11). Reads actual metrics only; estimated rows are excluded
 * so headline figures never overstate results (Spec §28).
 */
export async function getDashboardSummary(businessId: string): Promise<DashboardSummary> {
  const [metrics, activeCampaigns, wallet, profile] = await Promise.all([
    prisma.campaignMetric.aggregate({
      where: { campaign: { businessId }, source: 'actual' },
      _sum: { spend: true, impressions: true, leads: true, qualifiedLeads: true, revenue: true },
    }),
    prisma.campaign.count({ where: { businessId, status: 'active', deletedAt: null } }),
    prisma.adWallet.findUnique({ where: { businessId } }),
    prisma.businessProfile.findUnique({ where: { businessId } }),
  ]);

  const sum = metrics._sum;
  return {
    adSpend: Number(sum.spend ?? 0),
    peopleReached: sum.impressions ?? 0,
    leads: sum.leads ?? 0,
    qualifiedLeads: sum.qualifiedLeads ?? 0,
    trackedRevenue: Number(sum.revenue ?? 0),
    activeCampaigns,
    currency: profile?.currency ?? 'USD',
    wallet: wallet
      ? {
          funded: Number(wallet.funded),
          adSpend: Number(wallet.adSpend),
          serviceFee: Number(wallet.serviceFee),
          reserved: Number(wallet.reserved),
        }
      : null,
  };
}
