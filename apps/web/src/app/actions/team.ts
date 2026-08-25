'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import {
  acceptInvitation,
  canManageTeam,
  changeMemberRole,
  inviteMember,
  removeMember,
  revokeInvitation,
  toErrorPayload,
  type MembershipRole,
} from '@adsrobotic/core';
import { ACTIVE_BUSINESS_COOKIE } from '@/lib/session-cookie';
import { getCurrentUser } from '@/lib/current-user';

export interface TeamActionState {
  error?: string;
  inviteUrl?: string;
}

async function requireManager() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.activeBusiness) redirect('/onboarding');
  const orgId = user.activeBusiness.organizationId;
  if (!(await canManageTeam(user.id, orgId))) {
    throw new Error('Only organisation owners can manage the team');
  }
  return { user, orgId };
}

export async function inviteMemberAction(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  try {
    const { user, orgId } = await requireManager();
    const businessId = String(formData.get('businessId') ?? '');
    const { token } = await inviteMember({
      organizationId: orgId,
      email: String(formData.get('email') ?? ''),
      role: String(formData.get('role') ?? 'viewer') as MembershipRole,
      ...(businessId && businessId !== 'org' ? { businessId } : {}),
      invitedById: user.id,
    });
    revalidatePath('/team');
    const base = process.env.NEXT_PUBLIC_APP_URL ?? '';
    return { inviteUrl: `${base}/invite/${token}` };
  } catch (err) {
    return { error: toErrorPayload(err).message };
  }
}

export async function revokeInviteAction(formData: FormData): Promise<void> {
  const { orgId } = await requireManager();
  await revokeInvitation(orgId, String(formData.get('id') ?? ''));
  revalidatePath('/team');
}

export async function changeRoleAction(formData: FormData): Promise<void> {
  const { orgId } = await requireManager();
  await changeMemberRole(
    orgId,
    String(formData.get('membershipId') ?? ''),
    String(formData.get('role') ?? 'viewer') as MembershipRole,
  );
  revalidatePath('/team');
}

export async function removeMemberAction(formData: FormData): Promise<void> {
  const { orgId } = await requireManager();
  await removeMember(orgId, String(formData.get('membershipId') ?? ''));
  revalidatePath('/team');
}

/** Accept an invitation (any logged-in user). Clears the active-business cookie
 *  so the newly joined org's business is resolved. */
export async function acceptInviteAction(formData: FormData): Promise<void> {
  const token = String(formData.get('token') ?? '');
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  await acceptInvitation(token, user.id);
  (await cookies()).delete(ACTIVE_BUSINESS_COOKIE);
  redirect('/dashboard');
}
