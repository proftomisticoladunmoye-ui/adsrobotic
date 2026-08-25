/**
 * One-off demo seed against whatever DATABASE_URL is set (e.g. Neon). Creates a
 * login-able demo account with sample campaigns, a Smart Page + lead, and
 * creatives. Idempotent-ish: if the demo user already exists, it exits quietly.
 *
 *   DATABASE_URL=... pnpm --filter @adsrobotic/web exec tsx scripts/seed-demo.ts
 */
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL first');
  const core = await import('@adsrobotic/core');
  const { prisma } = await import('@adsrobotic/db');

  const existing = await prisma.user.findUnique({ where: { email: 'demo@adsrobotic.test' } });
  if (existing) {
    console.log('Demo already seeded — nothing to do.');
    await prisma.$disconnect();
    return;
  }

  const reg = await core.registerUser({
    email: 'demo@adsrobotic.test',
    password: 'demo-password-1',
    name: 'Enoch',
    businessName: 'Kampala Fresh Bakery',
  });
  await core.updateBusinessProfile(reg.businessId, {
    industry: 'Food & Beverage',
    description: 'Artisan bakery serving fresh bread, cakes, and pastries across Kampala.',
    valueProposition: 'Fresh every morning, delivered across the city.',
    currency: 'USD',
  });
  await prisma.adWallet.update({
    where: { businessId: reg.businessId },
    data: { funded: 500, adSpend: 380, serviceFee: 30, reserved: 90 },
  });

  const { campaign } = await core.createCampaign({
    businessId: reg.businessId,
    name: 'Weekend Fresh — WhatsApp Orders',
    objective: 'whatsapp_messages',
    conversionDestination: 'whatsapp',
    destinationValue: '+256700000000',
    channel: 'meta',
    budgetTotal: 300,
    durationDays: 30,
    location: 'Kampala + 10km',
    maxCostPerLead: 5,
  });
  await core.approveCampaign(reg.businessId, campaign.id, reg.user.id);
  await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'active' } });

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

  const sp = await core.createCampaign({
    businessId: reg.businessId,
    name: 'Fresh Bread Offer',
    objective: 'get_leads',
    conversionDestination: 'smart_page',
    channel: 'meta',
    budgetTotal: 120,
    durationDays: 30,
  });
  const page = await prisma.landingPage.findUnique({ where: { id: sp.campaign.destinationValue! } });
  if (page) {
    await core.updateLandingPage(reg.businessId, page.id, { published: true });
    await core.recordPageView(page.id);
    await core.recordPageView(page.id);
    await core.createPageLead(page.slug, { name: 'Amina', phone: '+256700111222', message: 'Do you deliver?' });
  }

  const gen = await core.generateCreativeSet(reg.businessId, { objective: 'whatsapp_messages' });
  await core.saveCreativeVariations(reg.businessId, gen.variations);
  await core.generateCreativeVisual(reg.businessId, { headline: gen.variations[0]!.headline, cta: gen.variations[0]!.cta });

  console.log('✅ Seeded demo@adsrobotic.test / demo-password-1');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
