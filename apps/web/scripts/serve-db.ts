/**
 * Dev convenience: boot a persistent embedded PostgreSQL, apply the migration,
 * and seed a demo account so the running app has data to show. Keeps running
 * until interrupted. Point the web app at the same DATABASE_URL.
 *
 *   pnpm --filter @adsrobotic/web serve-db
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');
const migrationsDir = join(repoRoot, 'packages', 'db', 'prisma', 'migrations');

const PORT = 55432;
const DB = 'adsrobotic';
const USER = 'adsrobotic';
const PASS = 'adsrobotic';
const dataDir = join(repoRoot, '.devdata', 'pg');

process.env.DATABASE_URL = `postgresql://${USER}:${PASS}@localhost:${PORT}/${DB}?schema=public`;
process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'dev-session-secret-'.padEnd(40, 'x');
process.env.TOKEN_ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY ?? Buffer.alloc(32, 7).toString('base64');
process.env.NODE_ENV = 'development';

function allMigrations(): string[] {
  return readdirSync(migrationsDir)
    .filter((d) => /^\d/.test(d))
    .sort()
    .map((d) => join(migrationsDir, d, 'migration.sql'));
}

async function main() {
  const server = new EmbeddedPostgres({ databaseDir: dataDir, user: USER, password: PASS, port: PORT, persistent: true });
  const fresh = !readdirSync(repoRoot + '/.devdata', { withFileTypes: true }).some((d) => d.name === 'pg') || readdirSync(dataDir).length === 0;

  if (fresh) {
    console.log('Initialising embedded PostgreSQL…');
    await server.initialise();
    await server.start();
    await server.createDatabase(DB);
    const client = new pg.Client({ host: 'localhost', port: PORT, user: USER, password: PASS, database: DB });
    await client.connect();
    for (const path of allMigrations()) await client.query(readFileSync(path, 'utf8'));
    await client.end();
    console.log('Migration applied. Seeding demo account…');
    await seed();
  } else {
    await server.start();
    console.log('PostgreSQL resumed.');
  }

  console.log(`\n✅ Database ready on ${process.env.DATABASE_URL}`);
  console.log('   Demo login →  demo@adsrobotic.test  /  demo-password-1');
  console.log('   Leave this running; start the web app in another terminal.\n');

  const stop = async () => {
    console.log('Stopping PostgreSQL…');
    await server.stop().catch(() => undefined);
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  setInterval(() => undefined, 1 << 30); // keep alive
}

async function seed() {
  const core = await import('@adsrobotic/core');
  const { prisma } = await import('@adsrobotic/db');

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

  // A Smart Page + a captured lead so the funnel and inbox show data.
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

  // A creative set + visual.
  const gen = await core.generateCreativeSet(reg.businessId, { objective: 'whatsapp_messages' });
  await core.saveCreativeVariations(reg.businessId, gen.variations);
  await core.generateCreativeVisual(reg.businessId, { headline: gen.variations[0]!.headline, cta: gen.variations[0]!.cta });

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
