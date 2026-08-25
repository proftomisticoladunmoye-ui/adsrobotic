import { prisma, type MembershipRole } from '@adsrobotic/db';

/** A user's role within one organisation (and optionally one business). */
export interface ActorMembership {
  organizationId: string;
  businessId: string | null;
  role: MembershipRole;
}

export interface Actor {
  userId: string;
  memberships: ActorMembership[];
}

export async function loadActor(userId: string): Promise<Actor> {
  const rows = await prisma.membership.findMany({ where: { userId } });
  return {
    userId,
    memberships: rows.map((m) => ({
      organizationId: m.organizationId,
      businessId: m.businessId,
      role: m.role,
    })),
  };
}

/** True when the actor can act on the given business (org-wide or business role). */
export function canAccessBusiness(actor: Actor, organizationId: string, businessId: string): boolean {
  return actor.memberships.some(
    (m) =>
      m.organizationId === organizationId && (m.businessId === null || m.businessId === businessId),
  );
}

export interface ActiveBusiness {
  id: string;
  name: string;
  slug: string;
  organizationId: string;
  brainStage: string;
  autonomyLevel: string;
}

/**
 * Resolve the business a user is currently working in. MVP heuristic: the first
 * (oldest) non-deleted business in the organisations they belong to. A later
 * phase adds an explicit business switcher persisted per session.
 */
export async function resolveActiveBusiness(userId: string): Promise<ActiveBusiness | null> {
  const orgIds = (await prisma.membership.findMany({ where: { userId } })).map(
    (m) => m.organizationId,
  );
  if (orgIds.length === 0) return null;

  const business = await prisma.business.findFirst({
    where: { organizationId: { in: orgIds }, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  if (!business) return null;

  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    organizationId: business.organizationId,
    brainStage: business.brainStage,
    autonomyLevel: business.autonomyLevel,
  };
}
