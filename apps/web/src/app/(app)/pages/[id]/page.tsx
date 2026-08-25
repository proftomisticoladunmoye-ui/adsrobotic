import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Badge, Button, Card, CardBody, CardHeader, CardTitle } from '@adsrobotic/ui';
import { getLandingPage, normalizePageConfig } from '@adsrobotic/core';
import { PageEditor } from '@/components/page-editor';
import { savePageAction, togglePublishAction } from '@/app/actions/pages';
import { getCurrentUser } from '@/lib/current-user';

export const metadata: Metadata = { title: 'Edit Smart Page' };
export const dynamic = 'force-dynamic';

export default async function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = (await getCurrentUser())!.activeBusiness!;
  let page;
  try {
    page = await getLandingPage(business.id, id);
  } catch {
    notFound();
  }
  const config = normalizePageConfig(page.config, business.name);

  const values = {
    id: page.id,
    title: page.title,
    brandName: config.brand.name,
    headline: config.hero.headline,
    subheadline: config.hero.subheadline ?? '',
    ctaLabel: config.hero.ctaLabel,
    offerTitle: config.offer?.title ?? '',
    offerBody: config.offer?.body ?? '',
    whatsapp: config.contact?.whatsapp ?? '',
    phone: config.contact?.phone ?? '',
    website: config.contact?.website ?? '',
    showLeadForm: config.showLeadForm,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ar-blue">{page.title}</h1>
          <p className="mt-1 text-sm text-ar-muted">
            /p/{page.slug} · {page.views} view{page.views === 1 ? '' : 's'}
          </p>
        </div>
        <Badge tone={page.published ? 'success' : 'neutral'} className="ml-auto">
          {page.published ? 'published' : 'draft'}
        </Badge>
        <Button asChild variant="secondary" size="sm">
          <a href={`/p/${page.slug}`} target="_blank" rel="noreferrer">
            {page.published ? 'View live' : 'Preview'}
          </a>
        </Button>
        <form action={togglePublishAction}>
          <input type="hidden" name="id" value={page.id} />
          <input type="hidden" name="publish" value={String(!page.published)} />
          <Button type="submit" variant={page.published ? 'secondary' : 'growth'} size="sm">
            {page.published ? 'Unpublish' : 'Publish'}
          </Button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Page content</CardTitle>
        </CardHeader>
        <CardBody>
          <PageEditor action={savePageAction} values={values} />
        </CardBody>
      </Card>
    </div>
  );
}
