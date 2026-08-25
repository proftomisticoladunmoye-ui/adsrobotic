import { prisma, type BusinessBrainStage, type Prisma } from '@adsrobotic/db';
import type { GroundedFact } from '@adsrobotic/ai';
import { notFoundError } from './errors';

export interface BrainProfileInput {
  industry?: string;
  description?: string;
  mission?: string;
  valueProposition?: string;
  website?: string;
  brandVoice?: string;
  currency?: string;
}

/**
 * Update a business's Brain profile and recompute its maturity stage (Spec §1).
 * The stage ladder reflects how much AdsRobotic actually knows: it advances as
 * profile fields, customers, and campaign history accumulate.
 */
export async function updateBusinessProfile(businessId: string, input: BrainProfileInput) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw notFoundError('Business not found');

  const data: Prisma.BusinessProfileUpdateInput = {};
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === 'string' && v.trim()) {
      (data as Record<string, unknown>)[k] = v.trim();
    }
  }

  await prisma.businessProfile.upsert({
    where: { businessId },
    update: data,
    create: { businessId, ...(data as Prisma.BusinessProfileCreateWithoutBusinessInput) },
  });

  const stage = await computeBrainStage(businessId);
  if (stage !== business.brainStage) {
    await prisma.business.update({ where: { id: businessId }, data: { brainStage: stage } });
  }
  return { stage };
}

/** Derive the current maturity stage from what the Brain has learned. */
export async function computeBrainStage(businessId: string): Promise<BusinessBrainStage> {
  const [profile, customerCount, campaignCount, metricCount] = await Promise.all([
    prisma.businessProfile.findUnique({ where: { businessId } }),
    prisma.customer.count({ where: { businessId } }),
    prisma.campaign.count({ where: { businessId } }),
    prisma.campaignMetric.count({ where: { campaign: { businessId } } }),
  ]);

  const profileComplete = Boolean(
    profile?.industry && profile?.description && profile?.valueProposition,
  );

  if (metricCount >= 30 && campaignCount >= 2) return 'predictive';
  if (campaignCount >= 1 && metricCount > 0) return 'campaign_intelligence';
  if (customerCount >= 5) return 'patterns_detected';
  if (profileComplete) return 'profile_established';
  return 'new';
}

/**
 * Assemble the verified facts the AI is permitted to use for a business
 * (Spec §22). Only records that exist are returned — the provider must not
 * invent anything beyond these.
 */
export async function assembleBusinessFacts(businessId: string): Promise<GroundedFact[]> {
  const [business, profile, products, audiences] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId } }),
    prisma.businessProfile.findUnique({ where: { businessId } }),
    prisma.product.findMany({ where: { businessId }, take: 10 }),
    prisma.audienceProfile.findMany({ where: { businessId }, take: 5 }),
  ]);

  const facts: GroundedFact[] = [];
  if (business) {
    facts.push({ ref: `business:${business.id}`, kind: 'profile', text: `The business is called ${business.name}.` });
  }
  if (profile?.industry) {
    facts.push({ ref: 'profile:industry', kind: 'profile', text: `Industry: ${profile.industry}.` });
  }
  if (profile?.description) {
    facts.push({ ref: 'profile:description', kind: 'profile', text: profile.description });
  }
  if (profile?.valueProposition) {
    facts.push({ ref: 'profile:value', kind: 'profile', text: `Value proposition: ${profile.valueProposition}.` });
  }
  for (const p of products) {
    facts.push({ ref: `product:${p.id}`, kind: 'output', text: `Offers "${p.name}"${p.price ? ` at ${p.price} ${p.currency}` : ''}.` });
  }
  for (const a of audiences) {
    facts.push({ ref: `audience:${a.id}`, kind: 'interest', text: `Known audience: ${a.name}.` });
  }
  return facts;
}
