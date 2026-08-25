import type { Metadata } from 'next';
import { Badge, Card, CardBody, CardHeader, CardTitle, PageHeader } from '@adsrobotic/ui';
import { listCreativeSets, listCreativeAssets } from '@adsrobotic/core';
import { CreativeStudio } from '@/components/creative-studio';
import { getCurrentUser } from '@/lib/current-user';

export const metadata: Metadata = { title: 'Creative Studio' };
export const dynamic = 'force-dynamic';

const ANGLE_LABEL: Record<string, string> = {
  problem: 'Problem-focused',
  benefit: 'Benefit-focused',
  social_proof: 'Social-proof-focused',
  urgency: 'Urgency-focused',
};

export default async function CreativePage() {
  const business = (await getCurrentUser())!.activeBusiness!;
  const [saved, assets] = await Promise.all([
    listCreativeSets(business.id),
    listCreativeAssets(business.id),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="AI Creative Factory"
        title="Creative Studio"
        description="Generate testable ad variations across four angles — grounded in your business, never fabricated."
      />

      <CreativeStudio />

      {assets.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold text-ar-text">Visual library</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {assets.map((a) => (
              <img
                key={a.id}
                src={a.url}
                alt={a.prompt ?? 'Generated visual'}
                className="aspect-square w-full rounded-lg border border-ar-border object-cover"
              />
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <h2 className="text-lg font-semibold text-ar-text">Creative library</h2>
        {saved.length === 0 ? (
          <p className="mt-2 text-sm text-ar-muted">
            No saved creatives yet. Generate a set above and save the ones you like.
          </p>
        ) : (
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {saved.map((v) => (
              <Card key={v.angle}>
                <CardHeader className="flex items-center justify-between">
                  <CardTitle>{v.headline || '—'}</CardTitle>
                  <Badge tone="neutral">{ANGLE_LABEL[v.angle] ?? v.angle}</Badge>
                </CardHeader>
                <CardBody className="space-y-2 text-sm">
                  <p className="text-ar-text">{v.primaryText}</p>
                  <p className="text-xs text-ar-muted">{v.description}</p>
                  <span className="inline-block rounded bg-ar-blue-light px-2 py-0.5 text-xs font-medium text-ar-blue">
                    {v.cta}
                  </span>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
