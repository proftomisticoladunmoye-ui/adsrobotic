'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Megaphone,
  Users2,
  Lightbulb,
  TrendingUp,
  Wand2,
  LayoutTemplate,
  Cable,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@adsrobotic/ui';

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
}

const ICONS = {
  dashboard: LayoutDashboard,
  campaigns: Megaphone,
  leads: Users2,
  recommendations: Lightbulb,
  intelligence: TrendingUp,
  creative: Wand2,
  pages: LayoutTemplate,
  channels: Cable,
  assistant: MessageSquare,
} satisfies Record<string, LucideIcon>;

export const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/campaigns', label: 'Campaigns', icon: 'campaigns' },
  { href: '/leads', label: 'Leads', icon: 'leads' },
  { href: '/recommendations', label: 'Recommendations', icon: 'recommendations' },
  { href: '/intelligence', label: 'Intelligence', icon: 'intelligence' },
  { href: '/creative', label: 'Creative', icon: 'creative' },
  { href: '/pages', label: 'Smart Pages', icon: 'pages' },
  { href: '/channels', label: 'Channels', icon: 'channels' },
  { href: '/assistant', label: 'Assistant', icon: 'assistant' },
];

/** Desktop sidebar navigation with icons + active state. */
export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-0.5 p-3">
      {NAV.map((item) => {
        const Icon = ICONS[item.icon];
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-ar-blue-light text-ar-blue'
                : 'text-ar-muted hover:bg-ar-background hover:text-ar-text',
            )}
          >
            {active ? (
              <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-ar-blue-bright" />
            ) : null}
            <Icon
              className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-ar-blue-bright' : 'text-ar-muted group-hover:text-ar-text')}
              strokeWidth={2}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Mobile bottom bar — the five core destinations. */
const MOBILE: NavItem[] = NAV.filter((n) =>
  ['/dashboard', '/campaigns', '/leads', '/creative', '/assistant'].includes(n.href),
);

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-20 grid grid-cols-5 border-t border-ar-border bg-ar-white/95 backdrop-blur md:hidden">
      {MOBILE.map((item) => {
        const Icon = ICONS[item.icon];
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium',
              active ? 'text-ar-blue' : 'text-ar-muted',
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
