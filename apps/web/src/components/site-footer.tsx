import Link from 'next/link';
import { Logo } from '@adsrobotic/ui';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { href: '#engines', label: 'What it does' },
      { href: '#autonomy', label: 'Autonomy levels' },
      { href: '#score', label: 'Free AI ad audit' },
      { href: '/signup', label: 'Get started' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '#', label: 'About' },
      { href: '#', label: 'Careers' },
      { href: '#', label: 'Contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '#', label: 'Privacy' },
      { href: '#', label: 'Terms' },
      { href: '#', label: 'Security' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-ar-border bg-ar-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <Logo size="md" />
          <p className="mt-3 max-w-xs text-sm text-ar-muted">
            Your Business. Your Budget. Your AI Advertising Employee.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h4 className="text-sm font-semibold text-ar-text">{col.title}</h4>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-ar-muted hover:text-ar-blue">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-ar-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-ar-muted sm:flex-row sm:items-center sm:px-6">
          <p>© {new Date().getFullYear()} AdsRobotic. All rights reserved.</p>
          <p className="sm:ml-auto">Autonomous AI Advertising Employee</p>
        </div>
      </div>
    </footer>
  );
}
