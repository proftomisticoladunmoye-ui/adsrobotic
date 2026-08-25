import { prisma, type MembershipRole } from '@adsrobotic/db';
import { listAccessibleBusinesses } from './businesses';

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
 * Resolve the business a user is currently working in. Honours `preferredId`
 * from the session's business switcher when the user can access it; otherwise
 * falls back to the first (oldest) accessible business (Spec §19).
 */
export async function resolveActiveBusiness(
  userId: string,
  preferredId?: string,
): Promise<ActiveBusiness | null> {
  const list = await listAccessibleBusinesses(userId);
  if (list.length === 0) return null;
  const chosen = (preferredId && list.find((b) => b.id === preferredId)) || list[0]!;
  return {
    id: chosen.id,
    name: chosen.name,
    slug: chosen.slug,
    organizationId: chosen.organizationId,
    brainStage: chosen.brainStage,
    autonomyLevel: chosen.autonomyLevel,
  };
}
