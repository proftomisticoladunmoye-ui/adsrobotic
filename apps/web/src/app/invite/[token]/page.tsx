import type { Metadata } from 'next';
import Link from 'next/link';
import { Button, Card, CardBody, Logo } from '@adsrobotic/ui';
import { getInvitationByToken, roleLabel } from '@adsrobotic/core';
import { getCurrentUser } from '@/lib/current-user';
import { acceptInviteAction } from '@/app/actions/team';

export const metadata: Metadata = { title: 'Team invitation' };
export const dynamic = 'force-dynamic';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [invite, user] = await Promise.all([getInvitationByToken(token), getCurrentUser()]);

  return (
    <div className="min-h-screen bg-ar-background">
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center sm:px-6">
        <Logo markOnly size="lg" />
        {!invite ? (
          <>
            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ar-blue">
              Invitation not found
            </h1>
            <p className="mt-2 text-ar-muted">This invite link is invalid, revoked, or expired.</p>
            <Button asChild variant="secondary" className="mt-6">
              <Link href="/">Back to home</Link>
            </Button>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ar-blue">
              Join {invite.organizationName}
            </h1>
            <p className="mt-2 text-ar-muted">
              You&apos;ve been invited as <span className="font-medium text-ar-text">{roleLabel(invite.role)}</span>
              {invite.businessName ? ` for ${invite.businessName}` : ' (all businesses)'}.
            </p>
            <Card className="mt-8 w-full">
              <CardBody>
                {user ? (
                  <form action={acceptInviteAction}>
                    <input type="hidden" name="token" value={token} />
                    <p className="mb-4 text-sm text-ar-muted">
                      Signed in as {user.email}. Accept to join the team.
                    </p>
                    <Button type="submit" variant="growth" size="lg" className="w-full">
                      Accept invitation
                    </Button>
                  </form>
                ) : (
                  <>
                    <p className="mb-4 text-sm text-ar-muted">
                      Log in or create an account with <span className="font-medium">{invite.email}</span>,
                      then reopen this link to accept.
                    </p>
                    <div className="flex gap-2">
                      <Button asChild variant="primary" className="flex-1">
                        <Link href="/login">Log in</Link>
                      </Button>
                      <Button asChild variant="secondary" className="flex-1">
                        <Link href="/signup">Sign up</Link>
                      </Button>
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
