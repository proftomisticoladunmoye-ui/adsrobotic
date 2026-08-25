import Link from 'next/link';
import { Button, Logo } from '@adsrobotic/ui';

const NAV = [
  { href: '#how', label: 'How it works' },
  { href: '#engines', label: 'What it does' },
  { href: '#autonomy', label: 'Autonomy' },
  { href: '#score', label: 'Free audit' },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ar-border bg-ar-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="AdsRobotic home">
          <Logo size="md" />
        </Link>
        <nav className="ml-auto hidden items-center gap-6 md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-ar-muted transition-colors hover:text-ar-blue"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild variant="growth" size="sm">
            <Link href="/signup">Hire AdsRobotic</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
