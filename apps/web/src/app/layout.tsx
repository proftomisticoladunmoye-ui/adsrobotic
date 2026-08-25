import type { Metadata, Viewport } from 'next';
import './globals.css';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'AdsRobotic — Your Autonomous AI Advertising Employee',
    template: '%s · AdsRobotic',
  },
  description:
    'AdsRobotic learns your business, creates your campaigns, watches your budget, and helps you find more customers. Hire an AI advertising employee.',
  applicationName: 'AdsRobotic',
  openGraph: {
    type: 'website',
    siteName: 'AdsRobotic',
    title: 'AdsRobotic — Your Autonomous AI Advertising Employee',
    description: "Don't manage ads. Employ AdsRobotic.",
    url: appUrl,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0A2463',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-ar-blue focus:px-3 focus:py-2 focus:text-ar-white"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
