import Link from 'next/link';
import { AutonomyBadge, Logo } from '@adsrobotic/ui';
import { logoutAction } from '@/app/actions/auth';
import { SidebarNav, MobileNav } from '@/components/sidebar-nav';
import type { CurrentUser } from '@/lib/current-user';

const AUTONOMY_TO_LEVEL: Record<string, 1 | 2 | 3 | 4> = {
  advisor: 1,
  assistant: 2,
  manager: 3,
  autonomous: 4,
};

const BRAIN_STAGE_LABEL: Record<string, string> = {
  new: 'New business',
  profile_established: 'Profile established',
  patterns_detected: 'Patterns detected',
  campaign_intelligence: 'Campaign intelligence',
  predictive: 'Predictive intelligence',
};

export function AppShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  const business = user.activeBusiness!;
  const level = AUTONOMY_TO_LEVEL[business.autonomyLevel] ?? 2;
  const initial = (user.name ?? business.name).charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-ar-background md:grid md:grid-cols-[256px_1fr]">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-ar-border bg-ar-white md:flex">
        <div className="px-5 py-5">
          <Link href="/dashboard" aria-label="AdsRobotic dashboard">
            <Logo size="md" />
          </Link>
        </div>
        <SidebarNav />
        <div className="border-t border-ar-border p-3">
          <div className="rounded-xl border border-ar-border/70 bg-ar-background p-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ar-blue text-sm font-semibold text-ar-white">
                {initial}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ar-text">{business.name}</p>
                <p className="truncate text-xs text-ar-muted">
                  {BRAIN_STAGE_LABEL[business.brainStage] ?? business.brainStage}
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between">
              <AutonomyBadge level={level} />
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-md px-2 py-1 text-xs font-medium text-ar-muted transition-colors hover:bg-ar-blue-light hover:text-ar-blue"
                >
                  Log out
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-ar-border bg-ar-white/85 px-4 backdrop-blur md:px-8">
          <div className="md:hidden">
            <Logo size="sm" />
          </div>
          <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-ar-cyan/25 bg-ar-cyan-light px-3 py-1 text-xs font-medium text-ar-cyan-dark">
            <span className="h-1.5 w-1.5 rounded-full bg-ar-cyan animate-ar-pulse" aria-hidden />
            Employee active
          </span>
        </header>
        <div className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</div>
        <MobileNav />
      </div>
    </div>
  );
}
