import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Alert, Badge, Button, Card, CardBody, CardHeader, CardTitle } from '@adsrobotic/ui';
import { prisma } from '@adsrobotic/db';
import type { CampaignStrategy } from '@adsrobotic/core';
import { listConnections } from '@adsrobotic/core';
import { getCurrentUser } from '@/lib/current-user';
import { approveCampaignAction, launchCampaignAction } from '@/app/actions/business';

export const metadata: Metadata = { title: 'Campaign' };
export const dynamic = 'force-dynamic';

export default async function CampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ launched?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const business = (await getCurrentUser())!.activeBusiness!;
  const [campaign, connections] = await Promise.all([
    prisma.campaign.findFirst({ where: { id, businessId: business.id, deletedAt: null } }),
    listConnections(business.id),
  ]);
  if (!campaign) notFound();

  const channelConnected =
    !!campaign.channel &&
    connections.some((c) => c.channel === campaign.channel && c.status === 'connected');

  const strategy = campaign.strategy as unknown as CampaignStrategy | null;
  const money = (n: number) =>
    new Intl.NumberFormat('en', { style: 'currency', currency: campaign.currency }).format(n);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ar-blue">{campaign.name}</h1>
          <p className="mt-1 text-sm text-ar-muted">
            {campaign.objective.replace(/_/g, ' ')} ·{' '}
            {campaign.conversionDestination.replace(/_/g, ' ')}
          </p>
        </div>
        <Badge tone={campaign.status === 'active' ? 'success' : 'warning'}>
          {campaign.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      {sp.launched ? (
        <Alert tone="success" title="Launched">
          This campaign is live on {campaign.channel} and its status was verified.
        </Alert>
      ) : null}
      {sp.error ? (
        <Alert tone="critical" title="Launch failed">
          {decodeURIComponent(sp.error)}
        </Alert>
      ) : null}

      {campaign.status === 'pending_approval' ? (
        <Alert tone="growth" title="Awaiting your approval">
          <p className="mb-3">
            AdsRobotic has drafted this campaign. Nothing goes live until you approve it.
          </p>
          <form action={approveCampaignAction}>
            <input type="hidden" name="campaignId" value={campaign.id} />
            <Button type="submit" variant="growth" size="sm">
              Approve &amp; schedule
            </Button>
          </form>
        </Alert>
      ) : null}

      {campaign.status === 'scheduled' && !campaign.externalId ? (
        <Alert tone="ai" title="Ready to launch">
          {channelConnected ? (
            <>
              <p className="mb-3">
                Approved. Launch it on {campaign.channel} — AdsRobotic creates it paused and only
                marks it active once the channel confirms.
              </p>
              <form action={launchCampaignAction}>
                <input type="hidden" name="campaignId" value={campaign.id} />
                <Button type="submit" variant="ai" size="sm">
                  Launch on {campaign.channel}
                </Button>
              </form>
            </>
          ) : (
            <p>
              Connect your {campaign.channel ?? 'advertising'} account on the{' '}
              <a href="/channels" className="font-medium underline">
                Channels
              </a>{' '}
              page to launch this campaign.
            </p>
          )}
        </Alert>
      ) : null}

      {campaign.externalId ? (
        <Alert tone="success" title="Live">
          Running on {campaign.channel} · external id{' '}
          <code className="font-mono text-xs">{campaign.externalId}</code>
        </Alert>
      ) : null}

      {strategy ? (
        <Card>
          <CardHeader>
            <CardTitle>AI strategy</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <Row label="Target market" value={strategy.targetMarket} />
              <Row label="Primary audience" value={strategy.primaryAudience} />
              <Row label="Budget" value={`${money(strategy.budget.total)} · ${money(strategy.budget.daily)}/day`} />
              <Row label="Duration" value={`${strategy.durationDays} days`} />
              <Row label="Channel strategy" value={strategy.channelStrategy} />
              <Row label="Success metric" value={strategy.successMetric} />
            </dl>
            <div className="rounded-lg bg-ar-blue-light p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ar-blue">Why this plan</p>
              <p className="mt-1 text-sm text-ar-text">{strategy.reasoning}</p>
            </div>
            <Alert tone="ai">{strategy.automationRule}</Alert>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ar-muted">{label}</dt>
      <dd className="font-medium text-ar-text">{value}</dd>
    </div>
  );
}
