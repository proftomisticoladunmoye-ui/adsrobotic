import {
  prisma,
  type CampaignObjective,
  type CreativeAngle,
  type CreativeType,
} from '@adsrobotic/db';
import { loadServerEnv } from '@adsrobotic/config';
import { createImageProvider } from '@adsrobotic/image';
import { validationError, notFoundError } from './errors';
import { recordActivity } from './activity';

/**
 * AI Creative Factory (Spec §3, Engine 3). Generates a set of testable ad
 * creatives across four angles — problem, benefit, social proof, urgency — so
 * every campaign ships with variations to experiment on.
 *
 * Grounding & honesty (Spec §28): copy is built only from the business's own
 * verified profile. It never invents statistics, testimonials, awards, or
 * claims. Visual/video outputs are *concepts* (briefs + prompts) until an image
 * generator is connected — labelled as such, never presented as rendered media.
 */

export const CREATIVE_ANGLES: CreativeAngle[] = ['problem', 'benefit', 'social_proof', 'urgency'];

export interface CreativeVariation {
  angle: CreativeAngle;
  headline: string;
  primaryText: string;
  description: string;
  cta: string;
  /** A prompt/brief for a visual — a concept until an image generator is wired. */
  imageConcept: string;
}

const CTA_BY_OBJECTIVE: Record<CampaignObjective, string> = {
  get_customers: 'Get started',
  get_leads: 'Get a quote',
  increase_sales: 'Shop now',
  website_traffic: 'Learn more',
  whatsapp_messages: 'Message us on WhatsApp',
  promote_event: 'Register now',
  promote_app: 'Get the app',
  build_awareness: 'Discover more',
  recruit_participants: 'Join the study',
};

const ANGLE_LABEL: Record<CreativeAngle, string> = {
  problem: 'Problem-focused',
  benefit: 'Benefit-focused',
  social_proof: 'Social-proof-focused',
  urgency: 'Urgency-focused',
};

export function angleLabel(angle: CreativeAngle): string {
  return ANGLE_LABEL[angle];
}

export interface BrandInputs {
  name: string;
  valueProposition?: string | undefined;
  industry?: string | undefined;
  product?: string | undefined;
}

/** Pure: compose the full 4-angle set from brand inputs + objective. */
export function composeVariations(
  brand: BrandInputs,
  objective: CampaignObjective,
): CreativeVariation[] {
  const cta = CTA_BY_OBJECTIVE[objective];
  return CREATIVE_ANGLES.map((angle) => variationFor(angle, brand, cta));
}

/** Build one variation for an angle from verified brand inputs only. */
function variationFor(angle: CreativeAngle, b: BrandInputs, cta: string): CreativeVariation {
  const offer = b.product ?? b.name;
  const value = b.valueProposition?.trim();
  const category = b.industry ? b.industry.toLowerCase() : 'what you need';

  const base = {
    angle,
    cta,
    imageConcept: `Clean, modern, mobile-first ad visual for ${b.name}${
      b.product ? ` featuring ${b.product}` : ''
    }${b.industry ? ` in the ${b.industry} category` : ''}. Brand-forward, uncluttered. (Concept — connect an image generator to render.)`,
  };

  switch (angle) {
    case 'problem':
      return {
        ...base,
        headline: `Looking for ${offer}?`,
        primaryText: value
          ? `${b.name} makes it simple. ${value}`
          : `${b.name} can help you with ${offer}.`,
        description: `Find ${offer} with ${b.name}.`,
      };
    case 'benefit':
      return {
        ...base,
        headline: value ? capFirst(value) : `${offer}, done right`,
        primaryText: value
          ? `${value} That's ${b.name}.`
          : `Discover ${offer} with ${b.name}.`,
        description: `${b.name} — ${value ?? `great ${category}`}.`,
      };
    case 'social_proof':
      return {
        ...base,
        headline: `Why people choose ${b.name}`,
        primaryText: value
          ? `See why customers pick ${b.name}. ${value}`
          : `Customers choose ${b.name} for ${offer}.`,
        description: `Trusted for ${offer}.`,
      };
    case 'urgency':
      return {
        ...base,
        headline: `Start with ${b.name} today`,
        primaryText: value
          ? `${value} ${cta} today.`
          : `Get ${offer} from ${b.name}. ${cta} today.`,
        description: `${cta} — start today.`,
      };
    default:
      return { ...base, headline: b.name, primaryText: b.name, description: b.name };
  }
}

function capFirst(s: string): string {
  return s.length ? s[0]!.toUpperCase() + s.slice(1) : s;
}

/**
 * Generate a full 4-angle creative set for a business. Does not persist — the
 * user reviews first, then saves the ones they want.
 */
export async function generateCreativeSet(
  businessId: string,
  opts: { objective?: CampaignObjective } = {},
): Promise<{ objective: CampaignObjective; variations: CreativeVariation[] }> {
  const [business, profile, product] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId } }),
    prisma.businessProfile.findUnique({ where: { businessId } }),
    prisma.product.findFirst({ where: { businessId }, orderBy: { createdAt: 'asc' } }),
  ]);
  if (!business) throw validationError('Business not found');

  const objective = opts.objective ?? 'get_leads';
  const brand: BrandInputs = {
    name: business.name,
    valueProposition: profile?.valueProposition ?? undefined,
    industry: profile?.industry ?? undefined,
    product: product?.name ?? undefined,
  };

  return { objective, variations: composeVariations(brand, objective) };
}

/**
 * Persist chosen variations. Each variation is stored as several typed Creative
 * rows sharing the angle (headline, primary_text, description, cta, plus an
 * image concept), all flagged as AI-generated (Spec §21 provenance).
 */
export async function saveCreativeVariations(
  businessId: string,
  variations: CreativeVariation[],
  campaignId?: string,
): Promise<{ saved: number }> {
  if (!variations.length) throw validationError('Nothing to save');

  const rows = variations.flatMap((v) => {
    const common = { businessId, campaignId: campaignId ?? null, angle: v.angle, generatedByAI: true };
    const fields: Array<[CreativeType, string]> = [
      ['headline', v.headline],
      ['primary_text', v.primaryText],
      ['description', v.description],
      ['cta', v.cta],
      ['image', v.imageConcept],
    ];
    return fields.map(([type, content]) => ({ ...common, type, content }));
  });

  await prisma.creative.createMany({ data: rows });

  await recordActivity({
    businessId,
    campaignId,
    type: 'creative_generated',
    summary: `Saved ${variations.length} creative variation${variations.length > 1 ? 's' : ''} (${variations
      .map((v) => angleLabel(v.angle))
      .join(', ')}).`,
  });

  return { saved: variations.length };
}

/**
 * Return saved creatives grouped into per-angle sets (latest field of each type
 * per angle), for the Creative Studio list.
 */
export async function listCreativeSets(
  businessId: string,
  campaignId?: string,
): Promise<CreativeVariation[]> {
  const rows = await prisma.creative.findMany({
    where: { businessId, ...(campaignId ? { campaignId } : {}), angle: { not: null } },
    orderBy: { createdAt: 'desc' },
  });

  const byAngle = new Map<CreativeAngle, Partial<CreativeVariation> & { angle: CreativeAngle }>();
  for (const row of rows) {
    if (!row.angle) continue;
    const entry = byAngle.get(row.angle) ?? { angle: row.angle };
    // rows are newest-first; only fill a field once (keeps the latest).
    const map: Record<string, keyof CreativeVariation> = {
      headline: 'headline',
      primary_text: 'primaryText',
      description: 'description',
      cta: 'cta',
      image: 'imageConcept',
    };
    const key = map[row.type];
    if (key && entry[key] === undefined && row.content) {
      (entry as Record<string, unknown>)[key] = row.content;
    }
    byAngle.set(row.angle, entry);
  }

  return CREATIVE_ANGLES.filter((a) => byAngle.has(a)).map((a) => {
    const e = byAngle.get(a)!;
    return {
      angle: a,
      headline: e.headline ?? '',
      primaryText: e.primaryText ?? '',
      description: e.description ?? '',
      cta: e.cta ?? '',
      imageConcept: e.imageConcept ?? '',
    };
  });
}

// ── Visual generation (Spec §3) ──────────────────────────────────────────────

export interface GeneratedVisual {
  assetId: string;
  dataUrl: string;
  mimeType: string;
  provider: string;
  external: boolean;
  /** True for the on-platform SVG template render (not a photoreal AI image). */
  placeholder: boolean;
  /** True if an external provider was requested but no key was configured. */
  fellBack: boolean;
}

/**
 * Generate a visual for a creative and persist it as a CreativeAsset (Spec §3).
 * Uses the configured image provider — the on-platform SVG poster by default,
 * or a real image API when one is configured. Output is stored as a
 * self-contained data URL. Honesty is preserved end-to-end via the
 * `placeholder`/`external` flags (Spec §28).
 */
export async function generateCreativeVisual(
  businessId: string,
  opts: { prompt?: string; headline?: string; cta?: string; angle?: CreativeAngle } = {},
): Promise<GeneratedVisual> {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw notFoundError('Business not found');
  const profile = await prisma.businessProfile.findUnique({ where: { businessId } });

  const env = loadServerEnv();
  const { provider, fellBack } = createImageProvider({
    provider: env.IMAGE_PROVIDER,
    apiKey: env.IMAGE_API_KEY,
    model: env.IMAGE_MODEL,
    baseUrl: env.IMAGE_BASE_URL,
  });

  const brandColors = Array.isArray(profile?.brandColors)
    ? (profile?.brandColors as string[])
    : [];
  const img = await provider.generate({
    prompt: opts.prompt?.trim() || `Advertising visual for ${business.name}`,
    ...(opts.headline ? { headline: opts.headline } : {}),
    ...(opts.cta ? { cta: opts.cta } : {}),
    brand: {
      name: business.name,
      ...(brandColors[0] ? { primary: brandColors[0] } : {}),
      ...(brandColors[1] ? { accent: brandColors[1] } : {}),
    },
    size: 1024,
  });

  const asset = await prisma.creativeAsset.create({
    data: {
      businessId,
      kind: 'image',
      url: img.dataUrl,
      mimeType: img.mimeType,
      width: 1024,
      height: 1024,
      generatedByAI: true,
      prompt: img.prompt,
    },
  });

  return {
    assetId: asset.id,
    dataUrl: img.dataUrl,
    mimeType: img.mimeType,
    provider: img.provider,
    external: img.external,
    placeholder: img.placeholder,
    fellBack,
  };
}

export async function listCreativeAssets(businessId: string, take = 12) {
  return prisma.creativeAsset.findMany({
    where: { businessId, kind: 'image' },
    orderBy: { createdAt: 'desc' },
    take,
  });
}
