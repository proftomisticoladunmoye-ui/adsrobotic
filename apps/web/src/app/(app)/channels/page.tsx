import type { Metadata } from 'next';
import { Alert, Badge, Button, Card, CardBody, CardHeader, CardTitle } from '@adsrobotic/ui';
import { availableChannels, listConnections } from '@adsrobotic/core';
import { getCurrentUser } from '@/lib/current-user';

export const metadata: Metadata = { title: 'Channels' };
export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'critical' | 'neutral'> = {
  connected: 'success',
  pending: 'warning',
  error: 'critical',
  disconnected: 'neutral',
};

export default async function ChannelsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const business = (await getCurrentUser())!.activeBusiness!;
  const [connections, sp] = await Promise.all([listConnections(business.id), searchParams]);
  const available = availableChannels();
  const byChannel = new Map(connections.map((c) => [c.channel, c]));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ar-blue">Channel connections</h1>
        <p className="mt-1 text-ar-muted">
          Connect an advertising account so AdsRobotic can launch and manage campaigns for you.
        </p>
      </div>

      {sp.connected ? (
        <Alert tone="success" title="Connected">
          Your {sp.connected} account is connected. AdsRobotic can now launch campaigns on it.
        </Alert>
      ) : null}
      {sp.error ? (
        <Alert tone="critical" title="Couldn’t connect">
          {sp.error === 'not_configured'
            ? 'Meta app credentials are not configured on this deployment yet.'
            : decodeURIComponent(sp.error)}
        </Alert>
      ) : null}

      <div className="space-y-3">
        {available.map((ch) => {
          const conn = byChannel.get(ch.channel);
          const connected = conn?.status === 'connected';
          return (
            <Card key={ch.channel}>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>{ch.label}</CardTitle>
                {conn ? (
                  <Badge tone={STATUS_TONE[conn.status] ?? 'neutral'}>{conn.status}</Badge>
                ) : (
                  <Badge tone="neutral">not connected</Badge>
                )}
              </CardHeader>
              <CardBody className="flex items-center justify-between gap-4">
                <p className="text-sm text-ar-muted">
                  {connected
                    ? `Ad account ${conn?.externalAccountId ?? ''} · scopes: ${conn?.scopes.join(', ') || '—'}`
                    : ch.configured
                      ? 'Facebook & Instagram campaigns, audiences, and insights.'
                      : 'Not configured on this deployment — add Meta app credentials to enable.'}
                </p>
                <Button
                  asChild
                  variant={connected ? 'secondary' : 'primary'}
                  size="sm"
                  className={ch.configured ? '' : 'pointer-events-none opacity-50'}
                >
                  <a href={`/api/v1/channels/${ch.channel}/connect`}>
                    {connected ? 'Reconnect' : 'Connect'}
                  </a>
                </Button>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-ar-muted">
        Tokens are encrypted at rest and never shown here. More channels (Google, TikTok, LinkedIn)
        plug into the same interface.
      </p>
    </div>
  );
}
