import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, Button, Card, CardBody } from '@adsrobotic/ui';
import { listCampaigns } from '@adsrobotic/core';
import { getCurrentUser } from '@/lib/current-user';

export const metadata: Metadata = { title: 'Campaigns' };
export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, 'neutral' | 'ai' | 'growth' | 'success' | 'warning' | 'critical'> =
  {
    draft: 'neutral',
    pending_approval: 'warning',
    scheduled: 'ai',
    active: 'success',
    paused: 'warning',
    completed: 'neutral',
    archived: 'neutral',
  };

export default async function CampaignsPage() {
  const business = (await getCurrentUser())!.activeBusiness!;
  const campaigns = await listCampaigns(business.id);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-ar-blue">Campaigns</h1>
        <Button asChild variant="growth">
          <Link href="/campaigns/new">New campaign</Link>
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <p className="text-ar-muted">No campaigns yet.</p>
            <div className="mt-4">
              <Button asChild variant="growth">
                <Link href="/campaigns/new">Create your first campaign</Link>
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <Link key={c.id} href={`/campaigns/${c.id}`}>
              <Card className="transition-colors hover:border-ar-blue-bright">
                <CardBody className="flex items-center gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ar-text">{c.name}</p>
                    <p className="text-xs text-ar-muted">
                      {c.objective.replace(/_/g, ' ')} · {c.conversionDestination.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-4">
                    <span className="text-sm font-semibold tabular-nums text-ar-text">
                      {new Intl.NumberFormat('en', {
                        style: 'currency',
                        currency: c.currency,
                        maximumFractionDigits: 0,
                      }).format(Number(c.budgetTotal))}
                    </span>
                    <Badge tone={STATUS_TONE[c.status] ?? 'neutral'}>
                      {c.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
