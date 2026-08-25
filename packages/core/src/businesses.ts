import { prisma } from '@adsrobotic/db';
import { forbiddenError, validationError } from './errors';
import { uniqueSlug } from './slug';
import { audit } from './activity';

/**
 * Multi-business / agency layer (Spec §19). A user may work across several
 * businesses: an org owner with an org-wide membership sees every business in
 * that organisation (the agency case), while a business-scoped member sees only
 * theirs. The active business is chosen via the switcher and persisted per
 * session (a cookie), validated against access on every request.
 */

export interface AccessibleBusiness {
  id: string;
  name: string;
  slug: string;
  organizationId: string;
  organizationName: string;
  brainStage: string;
  autonomyLevel: string;
}

/** Roles that may add/manage businesses within an organisation. */
const MANAGER_ROLES = ['super_admin', 'org_owner', 'agency', 'business_owner'] as const;

/** Every business the user can access, oldest first. */
export async function listAccessibleBusinesses(userId: string): Promise<AccessibleBusiness[]> {
  const memberships = await prisma.membership.findMany({ where: { userId } });
  const orgWide = memberships.filter((m) => m.businessId === null).map((m) => m.organizationId);
  const scopedIds = memberships
    .filter((m) => m.businessId !== null)
    .map((m) => m.businessId as string);

  if (orgWide.length === 0 && scopedIds.length === 0) return [];

  const businesses = await prisma.business.findMany({
    where: {
      deletedAt: null,
      OR: [{ organizationId: { in: orgWide } }, { id: { in: scopedIds } }],
    },
    orderBy: { createdAt: 'asc' },
    include: { organization: { select: { name: true } } },
  });

  return businesses.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    organizationId: b.organizationId,
    organizationName: b.organization.name,
    brainStage: b.brainStage,
    autonomyLevel: b.autonomyLevel,
  }));
}

/** True when the user can add a business to the given organisation. */
async function canManageOrg(userId: string, organizationId: string): Promise<boolean> {
  const rows = await prisma.membership.findMany({ where: { userId, organizationId } });
  return rows.some(
    (m) => m.businessId === null && (MANAGER_ROLES as readonly string[]).includes(m.role),
  );
}

/**
 * Create an additional business under an organisation the user manages. New
 * businesses start with an empty Business Brain and a zeroed ad wallet, ready
 * for onboarding (Spec §1, §19).
 */
export async function createBusinessForUser(
  userId: string,
  name: string,
  organizationId?: string,
): Promise<{ id: string; slug: string }> {
  if (!name.trim()) throw validationError('Give the business a name');

  const memberships = await prisma.membership.findMany({ where: { userId } });
  const orgId =
    organizationId ??
    memberships.find(
      (m) => m.businessId === null && (MANAGER_ROLES as readonly string[]).includes(m.role),
    )?.organizationId;
  if (!orgId) throw forbiddenError('You cannot add a business here');
  if (!(await canManageOrg(userId, orgId))) throw forbiddenError('You cannot add a business here');

  const business = await prisma.business.create({
    data: {
      organizationId: orgId,
      name: name.trim(),
      slug: uniqueSlug(name),
      profile: { create: {} },
      wallet: { create: {} },
    },
  });

  await audit({
    organizationId: orgId,
    businessId: business.id,
    userId,
    action: 'business.created',
    entityType: 'Business',
    entityId: business.id,
  });

  return { id: business.id, slug: business.slug };
}

/** Whether the user may switch to (access) a specific business. */
export async function canAccessBusinessId(userId: string, businessId: string): Promise<boolean> {
  const list = await listAccessibleBusinesses(userId);
  return list.some((b) => b.id === businessId);
}
