import { prisma, type Prisma } from '@adsrobotic/db';
import { validationError, notFoundError } from './errors';
import { uniqueSlug } from './slug';

/**
 * Smart Landing Pages (Spec §5). AdsRobotic can auto-generate a conversion-
 * focused, mobile-first page as a campaign destination when a business has no
 * website — with a lead form, WhatsApp/call buttons, and real conversion
 * tracking. The page content is a typed config stored on LandingPage.config.
 */

export interface LandingPageConfig {
  brand: { name: string; logoUrl?: string };
  hero: { headline: string; subheadline?: string; ctaLabel: string };
  offer?: { title?: string; body?: string; bullets?: string[] };
  products?: Array<{ name: string; description?: string; price?: string; currency?: string }>;
  testimonials?: Array<{ quote: string; author?: string }>;
  contact?: { whatsapp?: string; phone?: string; website?: string; email?: string };
  location?: { label?: string; address?: string };
  showLeadForm: boolean;
}

/** Coerce arbitrary stored JSON into a safe, complete config. */
export function normalizePageConfig(raw: unknown, fallbackName = 'Your business'): LandingPageConfig {
  const c = (raw ?? {}) as Partial<LandingPageConfig> & Record<string, unknown>;
  const brand = (c.brand ?? {}) as LandingPageConfig['brand'];
  const hero = (c.hero ?? {}) as Partial<LandingPageConfig['hero']>;
  return {
    brand: { name: brand.name || fallbackName, ...(brand.logoUrl ? { logoUrl: brand.logoUrl } : {}) },
    hero: {
      headline: hero.headline || `Welcome to ${brand.name || fallbackName}`,
      ...(hero.subheadline ? { subheadline: hero.subheadline } : {}),
      ctaLabel: hero.ctaLabel || 'Get in touch',
    },
    ...(c.offer ? { offer: c.offer } : {}),
    ...(Array.isArray(c.products) ? { products: c.products } : {}),
    ...(Array.isArray(c.testimonials) ? { testimonials: c.testimonials } : {}),
    ...(c.contact ? { contact: c.contact } : {}),
    ...(c.location ? { location: c.location } : {}),
    showLeadForm: c.showLeadForm !== false,
  };
}

/** Build a sensible default page from what the Business Brain knows (Spec §5). */
export async function buildDefaultPageConfig(
  businessId: string,
  opts: { headline?: string; ctaLabel?: string } = {},
): Promise<LandingPageConfig> {
  const [business, profile, products] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId } }),
    prisma.businessProfile.findUnique({ where: { businessId } }),
    prisma.product.findMany({ where: { businessId }, take: 4, orderBy: { createdAt: 'asc' } }),
  ]);
  const name = business?.name ?? 'Your business';

  const config: LandingPageConfig = {
    brand: { name, ...(profile?.logoUrl ? { logoUrl: profile.logoUrl } : {}) },
    hero: {
      headline: opts.headline || (profile?.valueProposition ?? `Welcome to ${name}`),
      ...(profile?.description ? { subheadline: profile.description } : {}),
      ctaLabel: opts.ctaLabel || 'Get in touch',
    },
    showLeadForm: true,
  };
  if (products.length) {
    config.products = products.map((p) => ({
      name: p.name,
      ...(p.description ? { description: p.description } : {}),
      ...(p.price ? { price: String(p.price), currency: p.currency } : {}),
    }));
  }
  const contact: NonNullable<LandingPageConfig['contact']> = {};
  if (profile?.website) contact.website = profile.website;
  if (Object.keys(contact).length) config.contact = contact;
  return config;
}

/** Create a standalone Smart Page for a business. */
export async function createLandingPage(
  businessId: string,
  input: { title: string; config?: LandingPageConfig; campaignId?: string },
) {
  if (!input.title.trim()) throw validationError('Give the page a title');
  const config = input.config ?? (await buildDefaultPageConfig(businessId, { headline: input.title }));
  return prisma.landingPage.create({
    data: {
      businessId,
      slug: uniqueSlug(input.title),
      title: input.title.trim(),
      config: config as unknown as Prisma.InputJsonValue,
      ...(input.campaignId ? { campaignId: input.campaignId } : {}),
    },
  });
}

export async function listLandingPages(businessId: string) {
  return prisma.landingPage.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } });
}

export async function getLandingPage(businessId: string, id: string) {
  const page = await prisma.landingPage.findFirst({ where: { id, businessId } });
  if (!page) throw notFoundError('Page not found');
  return page;
}

export async function updateLandingPage(
  businessId: string,
  id: string,
  patch: { title?: string; config?: LandingPageConfig; published?: boolean },
) {
  const page = await prisma.landingPage.findFirst({ where: { id, businessId } });
  if (!page) throw notFoundError('Page not found');
  const data: Prisma.LandingPageUpdateInput = {};
  if (patch.title?.trim()) data.title = patch.title.trim();
  if (patch.config) data.config = patch.config as unknown as Prisma.InputJsonValue;
  if (typeof patch.published === 'boolean') {
    data.published = patch.published;
    data.publishedAt = patch.published ? new Date() : null;
  }
  return prisma.landingPage.update({ where: { id: page.id }, data });
}

// ── Public rendering + conversion tracking (no auth) ─────────────────────────

export interface PublicPage {
  id: string;
  slug: string;
  businessId: string;
  campaignId: string | null;
  published: boolean;
  config: LandingPageConfig;
}

/** Load a page for public rendering by slug. Returns null if it doesn't exist. */
export async function getPublicPage(slug: string): Promise<PublicPage | null> {
  const page = await prisma.landingPage.findUnique({ where: { slug } });
  if (!page) return null;
  return {
    id: page.id,
    slug: page.slug,
    businessId: page.businessId,
    campaignId: page.campaignId,
    published: page.published,
    config: normalizePageConfig(page.config),
  };
}

/** Count a visit. Best-effort — a failure must not break rendering. */
export async function recordPageView(id: string): Promise<void> {
  await prisma.landingPage.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => undefined);
}

/** Capture a lead from the page's form (Spec §5, Engine 5). */
export async function createPageLead(
  slug: string,
  input: { name?: string; email?: string; phone?: string; message?: string },
): Promise<{ ok: boolean }> {
  const page = await prisma.landingPage.findUnique({ where: { slug } });
  if (!page) throw notFoundError('Page not found');
  if (!input.name && !input.email && !input.phone) {
    throw validationError('Please provide a name, email, or phone number');
  }

  await prisma.$transaction([
    prisma.lead.create({
      data: {
        businessId: page.businessId,
        campaignId: page.campaignId,
        name: input.name ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        message: input.message ?? null,
        destination: 'form',
        status: 'new',
        source: { via: 'smart_page', slug },
      },
    }),
    prisma.conversion.create({
      data: {
        businessId: page.businessId,
        campaignId: page.campaignId,
        type: 'form',
        source: 'actual',
      },
    }),
  ]);
  return { ok: true };
}

/** Record a click-through conversion (WhatsApp / call) before redirecting. */
export async function recordClickConversion(slug: string, type: 'whatsapp' | 'call'): Promise<void> {
  const page = await prisma.landingPage.findUnique({ where: { slug } });
  if (!page) return;
  await prisma.conversion.create({
    data: { businessId: page.businessId, campaignId: page.campaignId, type, source: 'actual' },
  });
}
