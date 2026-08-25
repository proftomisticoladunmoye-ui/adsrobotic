import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ar-background">
      <div className="mx-auto flex max-w-6xl items-center px-4 py-4 sm:px-6">
        <Link href="/" className="text-sm font-medium text-ar-muted hover:text-ar-blue">
          ← Back to home
        </Link>
      </div>
      <main id="main">{children}</main>
    </div>
  );
}
