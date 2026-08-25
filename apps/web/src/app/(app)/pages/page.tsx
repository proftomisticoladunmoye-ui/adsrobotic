import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, Button, Card, CardBody } from '@adsrobotic/ui';
import { listLandingPages } from '@adsrobotic/core';
import { createPageAction } from '@/app/actions/pages';
import { getCurrentUser } from '@/lib/current-user';

export const metadata: Metadata = { title: 'Smart Pages' };
export const dynamic = 'force-dynamic';

export default async function PagesPage() {
  const business = (await getCurrentUser())!.activeBusiness!;
  const pages = await listLandingPages(business.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ar-blue">Smart Pages</h1>
          <p className="mt-1 text-ar-muted">Mobile-first conversion pages — no website needed.</p>
        </div>
        <form action={createPageAction}>
          <Button type="submit" variant="growth">
            New page
          </Button>
        </form>
      </div>

      {pages.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center text-ar-muted">
            No pages yet. Create one, or a Smart Page is made automatically when you choose it as a
            campaign destination.
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {pages.map((p) => (
            <Card key={p.id}>
              <CardBody className="flex items-center gap-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ar-text">{p.title}</p>
                  <p className="text-xs text-ar-muted">
                    /p/{p.slug} · {p.views} view{p.views === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <Badge tone={p.published ? 'success' : 'neutral'}>
                    {p.published ? 'published' : 'draft'}
                  </Badge>
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/pages/${p.id}`}>Edit</Link>
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
