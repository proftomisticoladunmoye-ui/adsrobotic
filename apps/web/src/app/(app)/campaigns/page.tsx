import type { Metadata } from 'next';
import Link from 'next/link';
import { Megaphone, Plus, ChevronRight } from 'lucide-react';
import { Badge, Button, Card, CardBody, EmptyState, PageHeader } from '@adsrobotic/ui';
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
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Campaigns"
        description="Everything AdsRobotic is running or drafting for you."
        actions={
          <Button asChild variant="growth">
            <Link href="/campaigns/new">
              <Plus className="h-4 w-4" /> New campaign
            </Link>
          </Button>
        }
      />

      {campaigns.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-6 w-6" />}
          title="No campaigns yet"
          description="Describe a goal and AdsRobotic builds the strategy, creatives, and safety rules for you."
          action={
            <Button asChild variant="growth">
              <Link href="/campaigns/new">Create your first campaign</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <Link key={c.id} href={`/campaigns/${c.id}`} className="block">
              <Card interactive elevation="flat" className="border-ar-border">
                <CardBody className="flex items-center gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ar-blue-light text-ar-blue">
                    <Megaphone className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ar-text">{c.name}</p>
                    <p className="text-xs capitalize text-ar-muted">
                      {c.objective.replace(/_/g, ' ')} · {c.conversionDestination.replace(/_/g, ' ')}
                      {c.channel ? ` · ${c.channel}` : ''}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-4">
                    <span className="hidden text-sm font-semibold tabular-nums text-ar-text sm:block">
                      {new Intl.NumberFormat('en', {
                        style: 'currency',
                        currency: c.currency,
                        maximumFractionDigits: 0,
                      }).format(Number(c.budgetTotal))}
                    </span>
                    <Badge tone={STATUS_TONE[c.status] ?? 'neutral'}>
                      {c.status.replace(/_/g, ' ')}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-ar-muted" />
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
