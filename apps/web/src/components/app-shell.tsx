import Link from 'next/link';
import { AutonomyBadge, Badge, Logo } from '@adsrobotic/ui';
import { logoutAction } from '@/app/actions/auth';
import type { CurrentUser } from '@/lib/current-user';

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/campaigns', label: 'Campaigns' },
  { href: '/leads', label: 'Leads' },
  { href: '/recommendations', label: 'Recommendations' },
  { href: '/intelligence', label: 'Intelligence' },
  { href: '/creative', label: 'Creative' },
  { href: '/pages', label: 'Smart Pages' },
  { href: '/channels', label: 'Channels' },
  { href: '/assistant', label: 'Assistant' },
];

// The mobile bottom bar shows five core destinations; the rest live in the
// sidebar to keep the bar readable on small screens.
const MOBILE_NAV = NAV.filter(
  (n) => !['/pages', '/channels', '/intelligence', '/recommendations'].includes(n.href),
);

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

  return (
    <div className="min-h-screen bg-ar-background md:grid md:grid-cols-[240px_1fr]">
      {/* Sidebar */}
      <aside className="hidden border-r border-ar-border bg-ar-white md:flex md:flex-col">
        <div className="border-b border-ar-border px-5 py-4">
          <Link href="/dashboard">
            <Logo size="md" />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded px-3 py-2 text-sm font-medium text-ar-text hover:bg-ar-blue-light hover:text-ar-blue"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-ar-border p-3">
          <div className="rounded-lg bg-ar-background p-3">
            <p className="truncate text-sm font-medium text-ar-text">{business.name}</p>
            <p className="mt-0.5 text-xs text-ar-muted">
              {BRAIN_STAGE_LABEL[business.brainStage] ?? business.brainStage}
            </p>
            <div className="mt-2">
              <AutonomyBadge level={level} />
            </div>
          </div>
          <form action={logoutAction} className="mt-3">
            <button
              type="submit"
              className="w-full rounded px-3 py-2 text-left text-sm text-ar-muted hover:bg-ar-blue-light hover:text-ar-blue"
            >
              Log out
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-col">
        <header className="flex items-center gap-3 border-b border-ar-border bg-ar-white px-4 py-3 md:px-6">
          <div className="md:hidden">
            <Logo size="sm" />
          </div>
          <Badge tone="ai" className="ml-auto">
            <span className="h-1.5 w-1.5 rounded-full bg-ar-cyan animate-ar-pulse" aria-hidden />
            Employee active
          </Badge>
        </header>
        <div className="min-w-0 flex-1 p-4 md:p-6">{children}</div>

        {/* Mobile nav */}
        <nav className="sticky bottom-0 grid grid-cols-5 border-t border-ar-border bg-ar-white md:hidden">
          {MOBILE_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="py-3 text-center text-xs font-medium text-ar-muted"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
