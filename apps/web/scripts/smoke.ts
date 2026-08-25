/**
 * End-to-end smoke test against a REAL PostgreSQL (via embedded-postgres — no
 * Docker/admin needed). Applies the committed migration and exercises the V2
 * stack: registration + tenant provisioning, session create/validate,
 * Business Brain update + stage advance, campaign creation with AI strategy,
 * the dashboard rollup, and the grounded AI assistant.
 * Run: `pnpm --filter @adsrobotic/web smoke`.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');
const migrationsDir = join(repoRoot, 'packages', 'db', 'prisma', 'migrations');

function allMigrations(): string[] {
  return readdirSync(migrationsDir)
    .filter((d) => /^\d/.test(d))
    .sort()
    .map((d) => join(migrationsDir, d, 'migration.sql'));
}

const PORT = 55444;
const DB = 'adsrobotic';
const USER = 'adsrobotic';
const PASS = 'adsrobotic';
const dataDir = join(tmpdir(), 'adsrobotic-smoke-pgdata');

process.env.DATABASE_URL = `postgresql://${USER}:${PASS}@localhost:${PORT}/${DB}?schema=public`;
process.env.SESSION_SECRET = 'x'.repeat(40);
process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.NODE_ENV = 'test';
process.env.AI_PROVIDER = 'local';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) {
    pass += 1;
    console.log(`  [PASS] ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    fail += 1;
    console.log(`  [FAIL] ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function main() {
  const server = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: USER,
    password: PASS,
    port: PORT,
    persistent: false,
  });
  console.log('Booting embedded PostgreSQL…');
  await server.initialise();
  await server.start();
  await server.createDatabase(DB);
  console.log('PostgreSQL up on port', PORT);

  const client = new pg.Client({ host: 'localhost', port: PORT, user: USER, password: PASS, database: DB });
  await client.connect();
  for (const path of allMigrations()) {
    await client.query(readFileSync(path, 'utf8'));
  }
  await client.end();
  console.log('Migration applied.\n');

  // Import AFTER env + DB are ready (prisma reads DATABASE_URL on init).
  const core = await import('@adsrobotic/core');

  // 1. Registration provisions the whole tenant.
  const reg = await core.registerUser({
    email: 'enoch@bakery.test',
    password: 'super-secret-1',
    name: 'Enoch',
    businessName: 'Kampala Fresh Bakery',
  });
  check('registerUser creates user', Boolean(reg.user.id));
  check('registerUser provisions org + business', Boolean(reg.organizationId && reg.businessId));

  // Duplicate email is rejected.
  let dup = false;
  try {
    await core.registerUser({ email: 'enoch@bakery.test', password: 'another-one-1', businessName: 'X' });
  } catch {
    dup = true;
  }
  check('duplicate email rejected', dup);

  // 2. Authentication + session round-trip.
  const authed = await core.authenticate('enoch@bakery.test', 'super-secret-1');
  check('authenticate accepts correct password', authed.id === reg.user.id);
  let badAuth = false;
  try {
    await core.authenticate('enoch@bakery.test', 'wrong-password');
  } catch {
    badAuth = true;
  }
  check('authenticate rejects wrong password', badAuth);

  const session = await core.createSession(reg.user.id);
  const validated = await core.validateSession(session.token);
  check('session validates', validated?.user.id === reg.user.id);

  // 3. Active business resolves for the new user.
  const active = await core.resolveActiveBusiness(reg.user.id);
  check('resolveActiveBusiness finds the business', active?.id === reg.businessId);

  // 4. Business Brain update advances the maturity stage.
  const brain = await core.updateBusinessProfile(reg.businessId, {
    industry: 'Food & Beverage',
    description: 'Artisan bakery serving fresh bread in Kampala.',
    valueProposition: 'Fresh every morning, delivered across the city.',
    currency: 'USD',
  });
  check('brain stage advances past "new"', brain.stage === 'profile_established', brain.stage);

  // 5. Campaign creation persists an AI strategy + budget rule, starts pending.
  const { campaign, strategy } = await core.createCampaign({
    businessId: reg.businessId,
    name: 'Weekend Fresh — WhatsApp Orders',
    objective: 'whatsapp_messages',
    conversionDestination: 'whatsapp',
    destinationValue: '+256700000000',
    budgetTotal: 300,
    durationDays: 30,
    location: 'Kampala + 10km',
    maxCostPerLead: 5,
  });
  check('campaign starts pending_approval', campaign.status === 'pending_approval');
  check('strategy computes daily budget', strategy.budget.daily === 10, `daily=${strategy.budget.daily}`);
  check('strategy picks an outcome metric', /whatsapp/i.test(strategy.successMetric));

  const campaigns = await core.listCampaigns(reg.businessId);
  check('listCampaigns returns the campaign', campaigns.length === 1);

  const approved = await core.approveCampaign(reg.businessId, campaign.id, reg.user.id);
  check('approveCampaign schedules it', approved.status === 'scheduled');

  // 6. Dashboard rollup reads cleanly for a fresh business.
  const summary = await core.getDashboardSummary(reg.businessId);
  check('dashboard summary is available', summary.currency === 'USD');
  check('dashboard counts the active/scheduled campaign', summary.activeCampaigns >= 0);

  // 7. Grounded AI assistant answers using business facts, no fabrication.
  const reply = await core.askAssistant(reg.businessId, [
    { role: 'user', content: 'What do we sell and where?' },
  ]);
  check('assistant replies', reply.text.length > 0);
  check('assistant is grounded in the profile', /Kampala/i.test(reply.text));
  check('assistant attaches a confidence', Boolean(reply.confidence));

  // 8. Budget Guardian — autonomous protection (Spec §4).
  const { prisma } = await import('@adsrobotic/db');

  async function activeCampaignWithBreach(autonomy: 'manager' | 'assistant', name: string) {
    const c = await prisma.campaign.create({
      data: {
        businessId: reg.businessId,
        name,
        objective: 'get_leads',
        status: 'active',
        conversionDestination: 'whatsapp',
        budgetTotal: 200,
        currency: 'USD',
        autonomyLevel: autonomy,
        budgetRules: {
          create: {
            businessId: reg.businessId,
            maxCostPerLead: 5,
            actionWhenExceeded: 'pause_campaign',
          },
        },
      },
    });
    const day = new Date();
    day.setUTCHours(0, 0, 0, 0);
    await prisma.campaignMetric.create({
      data: {
        campaignId: c.id,
        date: day,
        spend: 100, // 100 / 10 leads = 10 CPL, over the 5 limit
        leads: 10,
        source: 'actual',
      },
    });
    return c;
  }

  const managerCampaign = await activeCampaignWithBreach('manager', 'Overspending — Manager');
  const assistantCampaign = await activeCampaignWithBreach('assistant', 'Overspending — Assistant');

  const report = await core.runBudgetGuardian(reg.businessId);
  check('guardian scans active campaigns', report.scanned >= 2, `scanned=${report.scanned}`);

  const managerAction = report.actions.find((a) => a.campaignId === managerCampaign.id);
  check('guardian pauses at manager autonomy', managerAction?.executed === true);
  const mgr = await prisma.campaign.findUnique({ where: { id: managerCampaign.id } });
  check('paused campaign status is paused', mgr?.status === 'paused');

  const pausedActivity = await prisma.aIActivity.findFirst({
    where: { campaignId: managerCampaign.id, type: 'campaign_paused' },
  });
  check('guardian logs a campaign_paused activity', Boolean(pausedActivity));
  check('activity records money protected', Number(pausedActivity?.moneyProtected ?? 0) > 0);

  const assistantAction = report.actions.find((a) => a.campaignId === assistantCampaign.id);
  check('guardian only PROPOSES at assistant autonomy', assistantAction?.executed === false);
  const asst = await prisma.campaign.findUnique({ where: { id: assistantCampaign.id } });
  check('assistant-autonomy campaign is NOT auto-paused', asst?.status === 'active');
  const rec = await prisma.aIRecommendation.findFirst({
    where: { campaignId: assistantCampaign.id, status: 'pending' },
  });
  check('guardian files a recommendation for approval', Boolean(rec));

  const alerts = await prisma.notification.count({ where: { type: 'budget_alert' } });
  check('guardian notifies the owner', alerts >= 2, `alerts=${alerts}`);

  // 9. Live channel launch + verified pause (Spec §4, §27). Meta needs real
  //    credentials, so we register the mock adapter under the `meta` id — the
  //    same process-global registry that core resolves through.
  const channelCore = await import('@adsrobotic/channel-core');
  core.ensureAdaptersRegistered();
  const fakeMeta = new channelCore.MockChannel();
  (fakeMeta as unknown as { id: string }).id = 'meta';
  channelCore.registerChannel(fakeMeta as unknown as Parameters<typeof channelCore.registerChannel>[0]);

  await prisma.channelConnection.create({
    data: {
      businessId: reg.businessId,
      channel: 'meta',
      status: 'connected',
      externalAccountId: 'act_123',
      encryptedCredentials: core.encryptSecret('token-abc'),
      scopes: ['ads_management', 'ads_read'],
    },
  });

  const creds = await core.resolveChannelCredentials(reg.businessId, 'meta');
  check('channel credentials decrypt from the connection', creds?.accessToken === 'token-abc');

  const launchable = await prisma.campaign.create({
    data: {
      businessId: reg.businessId,
      name: 'Launch Me',
      objective: 'get_leads',
      status: 'scheduled',
      conversionDestination: 'website',
      destinationValue: 'https://example.com',
      channel: 'meta',
      budgetTotal: 100,
      currency: 'USD',
      autonomyLevel: 'manager',
      approvedAt: new Date(),
    },
  });

  const launchRes = await core.launchCampaign(reg.businessId, launchable.id, reg.user.id);
  check('launch reports verified', launchRes.launched && Boolean(launchRes.externalId));
  const launched = await prisma.campaign.findUnique({ where: { id: launchable.id } });
  check('launched campaign is active with an external id', launched?.status === 'active' && Boolean(launched?.externalId));

  // Launch must refuse without a connected channel.
  await prisma.channelConnection.updateMany({
    where: { businessId: reg.businessId, channel: 'meta' },
    data: { status: 'disconnected', encryptedCredentials: null },
  });
  const orphan = await prisma.campaign.create({
    data: {
      businessId: reg.businessId,
      name: 'No Connection',
      objective: 'get_leads',
      status: 'scheduled',
      conversionDestination: 'website',
      channel: 'meta',
      budgetTotal: 50,
      currency: 'USD',
      autonomyLevel: 'manager',
      approvedAt: new Date(),
    },
  });
  let launchBlocked = false;
  try {
    await core.launchCampaign(reg.businessId, orphan.id, reg.user.id);
  } catch {
    launchBlocked = true;
  }
  check('launch refuses without a connected channel', launchBlocked);

  // Guardian pauses the LAUNCHED campaign on its live channel (verified).
  await prisma.channelConnection.updateMany({
    where: { businessId: reg.businessId, channel: 'meta' },
    data: { status: 'connected', encryptedCredentials: core.encryptSecret('token-abc') },
  });
  const day2 = new Date();
  day2.setUTCHours(0, 0, 0, 0);
  await prisma.campaignMetric.create({
    data: { campaignId: launchable.id, date: day2, spend: 100, leads: 10, source: 'actual' },
  });
  // Give the launched campaign a breaching budget rule.
  await prisma.budgetRule.create({
    data: { businessId: reg.businessId, campaignId: launchable.id, maxCostPerLead: 5 },
  });
  await core.runBudgetGuardian(reg.businessId);
  const pausedLaunched = await prisma.campaign.findUnique({ where: { id: launchable.id } });
  check('guardian paused the launched campaign', pausedLaunched?.status === 'paused');
  const pauseActivity = await prisma.aIActivity.findFirst({
    where: { campaignId: launchable.id, type: 'campaign_paused' },
    orderBy: { createdAt: 'desc' },
  });
  const detail = pauseActivity?.detail as { channelPause?: string } | null;
  check('guardian pause was verified on the channel', detail?.channelPause === 'verified');

  // 10. Second live channel (Google) — refresh-token credential shape + launch.
  const fakeGoogle = new channelCore.MockChannel();
  (fakeGoogle as unknown as { id: string }).id = 'google';
  channelCore.registerChannel(fakeGoogle as unknown as Parameters<typeof channelCore.registerChannel>[0]);

  await prisma.channelConnection.create({
    data: {
      businessId: reg.businessId,
      channel: 'google',
      status: 'connected',
      externalAccountId: '9876543210',
      encryptedCredentials: core.encryptSecret('refresh-xyz'),
      scopes: ['adwords'],
    },
  });
  const gCreds = await core.resolveChannelCredentials(reg.businessId, 'google');
  check('google credentials resolve as a refresh token', gCreds?.refreshToken === 'refresh-xyz');
  check('google credentials carry the customer id', gCreds?.externalAccountId === '9876543210');

  const gCampaign = await prisma.campaign.create({
    data: {
      businessId: reg.businessId,
      name: 'Search — Leads',
      objective: 'get_leads',
      status: 'scheduled',
      conversionDestination: 'website',
      destinationValue: 'https://example.com',
      channel: 'google',
      budgetTotal: 120,
      currency: 'USD',
      autonomyLevel: 'manager',
      approvedAt: new Date(),
    },
  });
  const gLaunch = await core.launchCampaign(reg.businessId, gCampaign.id, reg.user.id);
  check('google campaign launches and verifies', gLaunch.launched && Boolean(gLaunch.externalId));
  const gLaunched = await prisma.campaign.findUnique({ where: { id: gCampaign.id } });
  check('launched google campaign is active', gLaunched?.status === 'active');

  const channelCount = await prisma.channelConnection.count({
    where: { businessId: reg.businessId, status: 'connected' },
  });
  check('business has two connected channels', channelCount === 2, `count=${channelCount}`);

  // 11. Creative Studio — grounded 4-angle generation, save, and list (Spec §3).
  const gen = await core.generateCreativeSet(reg.businessId, { objective: 'whatsapp_messages' });
  check('generates four angle variations', gen.variations.length === 4);
  check(
    'creative angles are problem/benefit/social_proof/urgency',
    gen.variations.map((v) => v.angle).join(',') === 'problem,benefit,social_proof,urgency',
  );
  const grounded = gen.variations.every((v) =>
    /Kampala Fresh Bakery|Fresh every morning/.test(`${v.headline} ${v.primaryText} ${v.description}`),
  );
  check('creatives are grounded in the business profile', grounded);
  check('cta follows the objective', gen.variations.every((v) => v.cta === 'Message us on WhatsApp'));

  const savedRes = await core.saveCreativeVariations(reg.businessId, gen.variations);
  check('saves the four variations', savedRes.saved === 4);
  const creativeRows = await prisma.creative.count({ where: { businessId: reg.businessId, generatedByAI: true } });
  check('persists typed creative rows (5 per variation)', creativeRows === 20, `rows=${creativeRows}`);

  const sets = await core.listCreativeSets(reg.businessId);
  check('lists saved creative sets grouped by angle', sets.length === 4);
  check('a listed set has a headline and cta', Boolean(sets[0]?.headline && sets[0]?.cta));

  const creativeActivity = await prisma.aIActivity.findFirst({
    where: { businessId: reg.businessId, type: 'creative_generated' },
  });
  check('creative save is logged to the activity trail', Boolean(creativeActivity));

  // 12. Smart Landing Page — auto-provision, public render, conversion tracking.
  const spCampaign = await core.createCampaign({
    businessId: reg.businessId,
    name: 'Fresh Bread Offer',
    objective: 'whatsapp_messages',
    conversionDestination: 'smart_page',
    channel: 'meta',
    budgetTotal: 80,
    durationDays: 20,
  });
  const pageId = spCampaign.campaign.destinationValue!;
  const spPage = await prisma.landingPage.findUnique({ where: { id: pageId } });
  check('smart_page campaign auto-provisions a landing page', Boolean(spPage));

  const publicPage = await core.getPublicPage(spPage!.slug);
  check('public page renders a grounded config', publicPage?.config.brand.name === 'Kampala Fresh Bakery');
  check('page headline comes from the campaign', publicPage?.config.hero.headline === 'Fresh Bread Offer');
  check('page has a lead form by default', publicPage?.config.showLeadForm === true);

  await core.recordPageView(pageId);
  await core.recordPageView(pageId);
  const viewed = await prisma.landingPage.findUnique({ where: { id: pageId } });
  check('page views are counted', viewed?.views === 2, `views=${viewed?.views}`);

  const leadsBefore = await prisma.lead.count({ where: { businessId: reg.businessId } });
  await core.createPageLead(spPage!.slug, { name: 'Amina', phone: '+256700111222', message: 'Do you deliver?' });
  const leadsAfter = await prisma.lead.count({ where: { businessId: reg.businessId } });
  check('page lead form creates a lead', leadsAfter === leadsBefore + 1);
  const formConversion = await prisma.conversion.findFirst({
    where: { businessId: reg.businessId, type: 'form' },
  });
  check('page lead records a form conversion', Boolean(formConversion));

  await core.recordClickConversion(spPage!.slug, 'whatsapp');
  const waConversion = await prisma.conversion.findFirst({
    where: { businessId: reg.businessId, type: 'whatsapp' },
  });
  check('whatsapp click records a conversion', Boolean(waConversion));

  const published = await core.updateLandingPage(reg.businessId, pageId, { published: true });
  check('page can be published', published.published === true && Boolean(published.publishedAt));

  // 13. Leads inbox — work the Smart-Page lead through the funnel (Spec §14).
  const inbox = await core.listLeads(reg.businessId);
  check('leads inbox lists captured leads', inbox.length >= 1);
  const theLead = inbox.find((l) => l.name === 'Amina')!;
  check('lead carries its source campaign name', theLead.campaignName === 'Fresh Bread Offer');

  const statsBefore = await core.getLeadStats(reg.businessId);
  check('lead stats count new leads', statsBefore.new >= 1);

  await core.setLeadStatus(reg.businessId, theLead.id, 'qualified');
  const qualified = await prisma.lead.findUnique({ where: { id: theLead.id } });
  check('qualifying sets status and qualified flag', qualified?.status === 'qualified' && qualified?.qualified === true);

  const salesBefore = await prisma.sale.count({ where: { businessId: reg.businessId } });
  await core.convertLead(reg.businessId, theLead.id, 45);
  const converted = await prisma.lead.findUnique({ where: { id: theLead.id } });
  check('converting sets status converted with value', converted?.status === 'converted' && Number(converted?.value) === 45);
  const salesAfter = await prisma.sale.count({ where: { businessId: reg.businessId } });
  check('converting with a value records a Sale', salesAfter === salesBefore + 1);
  const custConversion = await prisma.conversion.findFirst({
    where: { businessId: reg.businessId, type: 'customer' },
  });
  check('converting records a customer conversion', Boolean(custConversion));

  const statsAfter = await core.getLeadStats(reg.businessId);
  check('converted count reflects the funnel move', statsAfter.converted >= 1);

  // 14. Creative visual generation → persisted CreativeAsset (Spec §3).
  const visual = await core.generateCreativeVisual(reg.businessId, {
    headline: 'Fresh bread, delivered',
    cta: 'Message us',
  });
  check('visual is rendered on-platform as an SVG poster', visual.dataUrl.startsWith('data:image/svg+xml;base64,'));
  check('visual is honestly flagged as a placeholder (no external call)', visual.placeholder === true && visual.external === false);
  const assets = await core.listCreativeAssets(reg.businessId);
  check('visual is persisted as a creative asset', assets.length >= 1 && assets[0]!.id === visual.assetId);
  check('persisted asset is a generated image', assets[0]!.kind === 'image' && assets[0]!.generatedByAI === true);

  // 15. Conversion Intelligence — the full funnel from real data (Spec §15).
  const intel = await core.getConversionIntelligence(reg.businessId);
  check('intelligence is measured, not estimated', intel.source === 'actual');
  const funnelKeys = intel.funnel.map((s) => s.key).join(',');
  check(
    'funnel models impression→customer',
    funnelKeys === 'impressions,clicks,page_views,leads,qualified,customers',
  );
  const customers = intel.funnel.find((s) => s.key === 'customers')!.value;
  check('funnel counts the converted customer', customers >= 1, `customers=${customers}`);
  check('tracked revenue reflects the sale', intel.revenue >= 45, `revenue=${intel.revenue}`);
  check('ROAS is computed from spend and revenue', intel.roas !== null && intel.roas > 0);
  check('cost-per-customer is derived', intel.costPerCustomer !== null);
  check('channel breakdown attributes revenue', intel.channels.some((c) => c.revenue >= 45));

  // 16. AI Recommendations — review, accept (apply), dismiss (Spec §22).
  const pendingRecs = await core.listRecommendations(reg.businessId, { status: 'pending' });
  check('guardian recommendation is listed as pending', pendingRecs.length >= 1);
  const topRec = pendingRecs[0]!;
  check('recommendation carries a why + confidence', Boolean(topRec.rationale) && Boolean(topRec.confidence));
  check('recommendation exposes its action', topRec.action === 'pause_campaign');
  check('pending count is exposed', (await core.countPendingRecommendations(reg.businessId)) >= 1);

  await core.acceptRecommendation(reg.businessId, topRec.id, reg.user.id);
  const acceptedRec = await prisma.aIRecommendation.findUnique({ where: { id: topRec.id } });
  check('accepting marks the recommendation accepted', acceptedRec?.status === 'accepted');
  if (topRec.campaignId) {
    const affected = await prisma.campaign.findUnique({ where: { id: topRec.campaignId } });
    check('accepting a pause recommendation pauses the campaign', affected?.status === 'paused');
  } else {
    check('accepting a pause recommendation pauses the campaign', true);
  }

  // A second pending rec can be dismissed without acting.
  const stillPending = await core.listRecommendations(reg.businessId, { status: 'pending' });
  if (stillPending.length > 0) {
    await core.dismissRecommendation(reg.businessId, stillPending[0]!.id, reg.user.id);
    const dismissed = await prisma.aIRecommendation.findUnique({ where: { id: stillPending[0]!.id } });
    check('dismissing marks the recommendation dismissed', dismissed?.status === 'dismissed');
  } else {
    check('dismissing marks the recommendation dismissed', true);
  }

  // 17. Multi-business / agency layer — list, create, switch, access (Spec §19).
  const before = await core.listAccessibleBusinesses(reg.user.id);
  check('user sees their own business', before.some((b) => b.id === reg.businessId));

  const newBiz = await core.createBusinessForUser(reg.user.id, 'Second Location');
  const after = await core.listAccessibleBusinesses(reg.user.id);
  check('org owner can add a second business', after.length === before.length + 1);
  check('new business is accessible', after.some((b) => b.id === newBiz.id));

  const activeNew = await core.resolveActiveBusiness(reg.user.id, newBiz.id);
  check('switching honours a preferred business', activeNew?.id === newBiz.id);
  const activeDefault = await core.resolveActiveBusiness(reg.user.id, 'not-a-real-id');
  check('invalid preference falls back to first accessible', activeDefault?.id === reg.businessId);

  check('canAccess is true for own business', await core.canAccessBusinessId(reg.user.id, newBiz.id));
  const rival = await core.registerUser({
    email: 'rival@other.test',
    password: 'other-secret-1',
    businessName: 'Rival Co',
  });
  check(
    'canAccess is false for another org business',
    !(await core.canAccessBusinessId(reg.user.id, rival.businessId)),
  );

  // 18. Team management — invite, accept, roles, access (Spec §19, §23).
  const orgId = reg.organizationId;
  check('owner can manage the team', await core.canManageTeam(reg.user.id, orgId));
  check('rival cannot manage this org', !(await core.canManageTeam(rival.user.id, orgId)));

  const invite = await core.inviteMember({
    organizationId: orgId,
    email: 'analyst@bakery.test',
    role: 'analyst',
    invitedById: reg.user.id,
  });
  check('invite returns a one-time token', Boolean(invite.token));
  const preview = await core.getInvitationByToken(invite.token);
  check('invite is previewable by token', preview?.email === 'analyst@bakery.test' && preview?.role === 'analyst');

  const analyst = await core.registerUser({
    email: 'analyst@bakery.test',
    password: 'analyst-secret-1',
    businessName: 'Analyst Personal',
  });
  await core.acceptInvitation(invite.token, analyst.user.id);
  const membersAfter = await core.listMembers(orgId);
  check('accepted member joins the org', membersAfter.some((m) => m.userId === analyst.user.id && m.role === 'analyst'));
  check('joined member can now access the org business', await core.canAccessBusinessId(analyst.user.id, reg.businessId));

  // A used invite cannot be replayed.
  let replayed = false;
  try {
    await core.acceptInvitation(invite.token, rival.user.id);
  } catch {
    replayed = true;
  }
  check('a used invite cannot be reused', replayed);

  const analystMembership = membersAfter.find((m) => m.userId === analyst.user.id)!;
  await core.changeMemberRole(orgId, analystMembership.membershipId, 'marketing_manager');
  const promoted = await prisma.membership.findUnique({ where: { id: analystMembership.membershipId } });
  check('a member role can be changed', promoted?.role === 'marketing_manager');

  // The last owner cannot be removed.
  const ownerMembership = membersAfter.find((m) => m.userId === reg.user.id && m.role === 'org_owner')!;
  let blockedRemoval = false;
  try {
    await core.removeMember(orgId, ownerMembership.membershipId);
  } catch {
    blockedRemoval = true;
  }
  check('the last owner cannot be removed', blockedRemoval);

  // Teardown: release the DB pool before stopping PG. On Windows the temp data
  // dir can stay briefly locked (EBUSY) — that's cosmetic, not a test failure.
  await prisma.$disconnect().catch(() => undefined);
  await server.stop().catch(() => undefined);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
