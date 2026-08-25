import type { Metadata } from 'next';
import Link from 'next/link';
import { LayoutTemplate, Plus, ExternalLink } from 'lucide-react';
import { Badge, Button, Card, CardBody, EmptyState, PageHeader } from '@adsrobotic/ui';
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
      <PageHeader
        title="Smart Pages"
        description="Mobile-first conversion pages — no website needed."
        actions={
          <form action={createPageAction}>
            <Button type="submit" variant="growth">
              <Plus className="h-4 w-4" /> New page
            </Button>
          </form>
        }
      />

      {pages.length === 0 ? (
        <EmptyState
          icon={<LayoutTemplate className="h-6 w-6" />}
          title="No Smart Pages yet"
          description="Create one, or a Smart Page is generated automatically when you pick it as a campaign destination."
        />
      ) : (
        <div className="space-y-3">
          {pages.map((p) => (
            <Card key={p.id} elevation="flat" className="border-ar-border">
              <CardBody className="flex items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ar-blue-light text-ar-blue">
                  <LayoutTemplate className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-ar-text">{p.title}</p>
                  <p className="text-xs text-ar-muted">
                    /p/{p.slug} · {p.views} view{p.views === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Badge tone={p.published ? 'success' : 'neutral'}>
                    {p.published ? 'published' : 'draft'}
                  </Badge>
                  {p.published ? (
                    <a
                      href={`/p/${p.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md p-2 text-ar-muted transition-colors hover:bg-ar-blue-light hover:text-ar-blue"
                      aria-label="View live"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}
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
