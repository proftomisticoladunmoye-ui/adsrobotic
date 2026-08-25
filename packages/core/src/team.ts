import { prisma, type MembershipRole } from '@adsrobotic/db';
import { notFoundError, validationError, conflictError } from './errors';
import { generateSessionToken, hashToken } from './crypto';
import { audit } from './activity';

/**
 * Team management (Spec §19, §23). Organisation owners invite teammates with a
 * role — org-wide or scoped to one business — via a single-use invite link
 * (the raw token is shown once; only its hash is stored, like a session). No
 * email is sent from here; the inviter shares the link. Accepting creates a
 * Membership. Role changes and removals are guarded so an org always keeps an
 * owner.
 */

const OWNER_ROLES: MembershipRole[] = ['super_admin', 'org_owner'];
const MANAGER_ROLES: MembershipRole[] = ['super_admin', 'org_owner', 'agency'];

/** Roles an owner may assign when inviting (not the platform-super roles). */
export const ASSIGNABLE_ROLES: MembershipRole[] = [
  'business_owner',
  'marketing_manager',
  'analyst',
  'team_member',
  'viewer',
];

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export async function canManageTeam(userId: string, organizationId: string): Promise<boolean> {
  const rows = await prisma.membership.findMany({ where: { userId, organizationId } });
  return rows.some((m) => m.businessId === null && MANAGER_ROLES.includes(m.role));
}

export interface TeamMember {
  membershipId: string;
  userId: string;
  name: string | null;
  email: string;
  role: MembershipRole;
  businessId: string | null;
  businessName: string | null;
  createdAt: Date;
}

export async function listMembers(organizationId: string): Promise<TeamMember[]> {
  const rows = await prisma.membership.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { name: true, email: true } }, business: { select: { name: true } } },
  });
  return rows.map((m) => ({
    membershipId: m.id,
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    businessId: m.businessId,
    businessName: m.business?.name ?? null,
    createdAt: m.createdAt,
  }));
}

export interface PendingInvite {
  id: string;
  email: string;
  role: MembershipRole;
  businessName: string | null;
  expiresAt: Date;
}

export async function listPendingInvitations(organizationId: string): Promise<PendingInvite[]> {
  const rows = await prisma.invitation.findMany({
    where: { organizationId, status: 'pending', expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  const bizIds = rows.map((r) => r.businessId).filter((b): b is string => Boolean(b));
  const businesses = bizIds.length
    ? await prisma.business.findMany({ where: { id: { in: bizIds } }, select: { id: true, name: true } })
    : [];
  const nameById = new Map(businesses.map((b) => [b.id, b.name]));
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    businessName: r.businessId ? (nameById.get(r.businessId) ?? null) : null,
    expiresAt: r.expiresAt,
  }));
}

export interface CreatedInvite {
  id: string;
  token: string;
}

export async function inviteMember(input: {
  organizationId: string;
  email: string;
  role: MembershipRole;
  businessId?: string;
  invitedById?: string;
}): Promise<CreatedInvite> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes('@')) throw validationError('A valid email is required');
  if (!ASSIGNABLE_ROLES.includes(input.role)) throw validationError('Unknown role');
  if (input.businessId) {
    const biz = await prisma.business.findFirst({
      where: { id: input.businessId, organizationId: input.organizationId },
    });
    if (!biz) throw validationError('That business is not in this organisation');
  }

  const token = generateSessionToken();
  const invite = await prisma.invitation.create({
    data: {
      organizationId: input.organizationId,
      email,
      role: input.role,
      businessId: input.businessId ?? null,
      tokenHash: hashToken(token),
      invitedById: input.invitedById ?? null,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });

  await audit({
    organizationId: input.organizationId,
    userId: input.invitedById,
    action: 'team.invited',
    entityType: 'Invitation',
    entityId: invite.id,
    metadata: { email, role: input.role },
  });

  return { id: invite.id, token };
}

export interface InvitePreview {
  organizationName: string;
  email: string;
  role: MembershipRole;
  businessName: string | null;
}

/** Look up a pending invite by its raw token (for the accept page). */
export async function getInvitationByToken(token: string): Promise<InvitePreview | null> {
  const invite = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { organization: { select: { name: true } } },
  });
  if (!invite || invite.status !== 'pending' || invite.expiresAt.getTime() < Date.now()) return null;
  const business = invite.businessId
    ? await prisma.business.findUnique({ where: { id: invite.businessId }, select: { name: true } })
    : null;
  return {
    organizationName: invite.organization.name,
    email: invite.email,
    role: invite.role,
    businessName: business?.name ?? null,
  };
}

/** Accept an invite: create the membership and mark it accepted. */
export async function acceptInvitation(token: string, userId: string): Promise<{ organizationId: string }> {
  const invite = await prisma.invitation.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!invite || invite.status !== 'pending' || invite.expiresAt.getTime() < Date.now()) {
    throw notFoundError('This invitation is no longer valid');
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.membership.findFirst({
      where: { userId, organizationId: invite.organizationId, businessId: invite.businessId },
    });
    if (!existing) {
      await tx.membership.create({
        data: {
          userId,
          organizationId: invite.organizationId,
          businessId: invite.businessId,
          role: invite.role,
        },
      });
    }
    await tx.invitation.update({
      where: { id: invite.id },
      data: { status: 'accepted', acceptedAt: new Date() },
    });
  });

  await audit({
    organizationId: invite.organizationId,
    userId,
    action: 'team.joined',
    entityType: 'Membership',
    metadata: { role: invite.role },
  });

  return { organizationId: invite.organizationId };
}

export async function revokeInvitation(organizationId: string, invitationId: string): Promise<void> {
  const invite = await prisma.invitation.findFirst({ where: { id: invitationId, organizationId } });
  if (!invite) throw notFoundError('Invitation not found');
  await prisma.invitation.update({ where: { id: invite.id }, data: { status: 'revoked' } });
}

async function ownerCount(organizationId: string): Promise<number> {
  return prisma.membership.count({
    where: { organizationId, businessId: null, role: { in: OWNER_ROLES } },
  });
}

export async function changeMemberRole(
  organizationId: string,
  membershipId: string,
  role: MembershipRole,
): Promise<void> {
  const m = await prisma.membership.findFirst({ where: { id: membershipId, organizationId } });
  if (!m) throw notFoundError('Member not found');
  // Don't allow demoting the last remaining org owner.
  if (OWNER_ROLES.includes(m.role) && !OWNER_ROLES.includes(role) && (await ownerCount(organizationId)) <= 1) {
    throw conflictError('An organisation must keep at least one owner');
  }
  await prisma.membership.update({ where: { id: m.id }, data: { role } });
}

export async function removeMember(organizationId: string, membershipId: string): Promise<void> {
  const m = await prisma.membership.findFirst({ where: { id: membershipId, organizationId } });
  if (!m) throw notFoundError('Member not found');
  if (OWNER_ROLES.includes(m.role) && m.businessId === null && (await ownerCount(organizationId)) <= 1) {
    throw conflictError('An organisation must keep at least one owner');
  }
  await prisma.membership.delete({ where: { id: m.id } });
}

/** Friendly role label. */
export function roleLabel(role: MembershipRole): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
