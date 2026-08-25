import type { Metadata } from 'next';
import { Users2, Mail, Trash2 } from 'lucide-react';
import { Alert, Badge, Button, Card, CardBody, CardHeader, CardTitle, PageHeader } from '@adsrobotic/ui';
import {
  ASSIGNABLE_ROLES,
  canManageTeam,
  listAccessibleBusinesses,
  listMembers,
  listPendingInvitations,
  roleLabel,
} from '@adsrobotic/core';
import { getCurrentUser } from '@/lib/current-user';
import { InviteForm } from '@/components/invite-form';
import { changeRoleAction, inviteMemberAction, removeMemberAction, revokeInviteAction } from '@/app/actions/team';

export const metadata: Metadata = { title: 'Team' };
export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const user = (await getCurrentUser())!;
  const orgId = user.activeBusiness!.organizationId;
  const [isManager, members, invites, businesses] = await Promise.all([
    canManageTeam(user.id, orgId),
    listMembers(orgId),
    listPendingInvitations(orgId),
    listAccessibleBusinesses(user.id),
  ]);
  const orgBusinesses = businesses.filter((b) => b.organizationId === orgId);
  const roleOptions = ASSIGNABLE_ROLES.map((r) => ({ value: r, label: roleLabel(r) }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Team"
        description="Invite teammates and manage who can access your businesses."
      />

      {!isManager ? (
        <Alert tone="info">Only organisation owners can invite or manage teammates.</Alert>
      ) : null}

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <span className="ml-auto text-xs text-ar-muted">{members.length} total</span>
        </CardHeader>
        <CardBody className="space-y-3">
          {members.map((m) => (
            <div key={m.membershipId} className="flex flex-wrap items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ar-blue-light text-sm font-semibold text-ar-blue">
                {(m.name ?? m.email).charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ar-text">{m.name ?? m.email}</p>
                <p className="truncate text-xs text-ar-muted">
                  {m.email} · {m.businessName ? m.businessName : 'All businesses'}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {isManager && m.userId !== user.id ? (
                  <>
                    <form action={changeRoleAction} className="flex items-center gap-1.5">
                      <input type="hidden" name="membershipId" value={m.membershipId} />
                      <select
                        name="role"
                        defaultValue={m.role}
                        className="h-8 rounded border border-ar-border bg-ar-white px-2 text-xs text-ar-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ar-blue-bright"
                      >
                        {[m.role, ...ASSIGNABLE_ROLES.filter((r) => r !== m.role)].map((r) => (
                          <option key={r} value={r}>
                            {roleLabel(r)}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" variant="secondary" size="sm">
                        Save
                      </Button>
                    </form>
                    <form action={removeMemberAction}>
                      <input type="hidden" name="membershipId" value={m.membershipId} />
                      <button
                        type="submit"
                        aria-label="Remove member"
                        className="rounded-md p-2 text-ar-muted transition-colors hover:bg-[color:var(--ar-critical)]/10 hover:text-ar-critical"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </>
                ) : (
                  <Badge tone="neutral">{roleLabel(m.role)}</Badge>
                )}
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      {/* Pending invites */}
      {invites.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Pending invites</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-ar-muted" />
                <div className="min-w-0">
                  <p className="truncate text-sm text-ar-text">{inv.email}</p>
                  <p className="text-xs text-ar-muted">
                    {roleLabel(inv.role)} · {inv.businessName ?? 'All businesses'}
                  </p>
                </div>
                {isManager ? (
                  <form action={revokeInviteAction} className="ml-auto">
                    <input type="hidden" name="id" value={inv.id} />
                    <Button type="submit" variant="secondary" size="sm">
                      Revoke
                    </Button>
                  </form>
                ) : null}
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}

      {/* Invite form */}
      {isManager ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite a teammate</CardTitle>
          </CardHeader>
          <CardBody>
            <InviteForm action={inviteMemberAction} roles={roleOptions} businesses={orgBusinesses} />
          </CardBody>
        </Card>
      ) : null}
      <p className="flex items-center gap-1.5 text-xs text-ar-muted">
        <Users2 className="h-3.5 w-3.5" /> Invites are single-use links you share directly — no email
        is sent from AdsRobotic.
      </p>
    </div>
  );
}
