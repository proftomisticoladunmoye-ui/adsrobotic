/**
 * Demo seed — the "Kampala bakery wants 100 new customers" scenario (Spec §25).
 * Creates one organisation, one business with an established Brain, a funded ad
 * wallet, an active WhatsApp-lead campaign, sample metrics, and one AI activity.
 *
 * Idempotent-ish: safe to run against an empty database. Uses upserts on unique
 * keys where possible.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-bakery' },
    update: {},
    create: { name: 'Kampala Fresh Bakery', slug: 'demo-bakery', type: 'business' },
  });

  const business = await prisma.business.upsert({
    where: { slug: 'kampala-fresh-bakery' },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Kampala Fresh Bakery',
      slug: 'kampala-fresh-bakery',
      brainStage: 'campaign_intelligence',
      autonomyLevel: 'manager',
      profile: {
        create: {
          industry: 'Food & Beverage',
          description: 'Artisan bakery serving fresh bread, cakes, and pastries in Kampala.',
          valueProposition: 'Fresh every morning, delivered across the city.',
          currency: 'UGX',
          locations: [{ label: 'Main store', city: 'Kampala', country: 'Uganda' }],
        },
      },
      wallet: {
        create: { currency: 'USD', funded: 500, adSpend: 380, serviceFee: 30, reserved: 90 },
      },
    },
  });

  const campaign = await prisma.campaign.create({
    data: {
      businessId: business.id,
      name: 'Weekend Fresh — WhatsApp Orders',
      objective: 'get_customers',
      status: 'active',
      conversionDestination: 'whatsapp',
      channel: 'meta',
      budgetTotal: 300,
      budgetDaily: 25,
      currency: 'USD',
      autonomyLevel: 'manager',
      strategy: {
        primaryAudience: 'Residents aged 25–50 within 10km of Kampala',
        channelStrategy: 'Social discovery + retargeting',
        creativeStrategy: 'Benefit-focused (fresh, fast delivery)',
        successMetric: 'Cost per qualified WhatsApp lead',
      },
      budgetRules: {
        create: {
          businessId: business.id,
          monthlyBudget: 300,
          maxDailySpend: 25,
          maxCostPerLead: 5,
          actionWhenExceeded: 'pause_campaign',
          autonomyNote: 'AI may pause but must ask before increasing budget.',
        },
      },
    },
  });

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  await prisma.campaignMetric.create({
    data: {
      campaignId: campaign.id,
      date: today,
      channel: 'meta',
      impressions: 48230,
      clicks: 2814,
      spend: 380,
      leads: 326,
      qualifiedLeads: 87,
      conversions: 87,
      revenue: 1840,
      source: 'actual',
    },
  });

  await prisma.aIActivity.create({
    data: {
      businessId: business.id,
      campaignId: campaign.id,
      type: 'analysis',
      summary:
        'Search-intent traffic is producing qualified leads 37% cheaper than social discovery.',
      autonomyLevel: 'manager',
      reversible: true,
    },
  });

  console.log(`Seeded org ${org.slug} / business ${business.slug} / campaign ${campaign.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
