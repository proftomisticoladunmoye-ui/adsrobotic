import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Wallet,
  Users,
  UserPlus,
  BadgeCheck,
  TrendingUp,
  Sparkles,
  Plus,
} from 'lucide-react';
import {
  AIStatus,
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  MetricCard,
  PageHeader,
} from '@adsrobotic/ui';
import { getDashboardSummary, recentActivity } from '@adsrobotic/core';
import { getCurrentUser } from '@/lib/current-user';

export const metadata: Metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

const AUTONOMY_TO_LEVEL: Record<string, number> = {
  advisor: 1,
  assistant: 2,
  manager: 3,
  autonomous: 4,
};

function money(n: number, currency: string) {
  return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

export default async function DashboardPage() {
  const user = (await getCurrentUser())!;
  const business = user.activeBusiness!;
  const [summary, activity] = await Promise.all([
    getDashboardSummary(business.id),
    recentActivity(business.id, 6),
  ]);

  const hasData = summary.peopleReached > 0 || summary.adSpend > 0;
  const greetingName = user.name?.split(' ')[0] ?? business.name;
  const iconCls = 'h-[18px] w-[18px]';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow={new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
        title={`Good day, ${greetingName}`}
        description="Here's what your AI advertising employee has been doing."
        actions={
          <Button asChild variant="growth">
            <Link href="/campaigns/new">
              <Plus className="h-4 w-4" /> New campaign
            </Link>
          </Button>
        }
      />

      {/* AI Today — the flagship briefing card */}
      <Card elevation="pop" className="overflow-hidden">
        <div className="relative">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-ar-cyan-light blur-3xl" aria-hidden />
          <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ar-cyan-light text-ar-cyan-dark shadow-ai-glow">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-ar-cyan-dark">AI today</span>
                <Badge tone="ai">Live</Badge>
              </div>
              <p className="mt-1 text-[15px] text-ar-text">
                {hasData
                  ? 'Your search traffic is producing qualified leads noticeably cheaper than social — I can shift budget toward it and keep watching your limits.'
                  : 'Your Business Brain is ready. Launch your first campaign and I’ll start finding customers and reporting what your money achieves.'}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {hasData ? (
                <>
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/recommendations">Review</Link>
                  </Button>
                  <Button asChild variant="ai" size="sm">
                    <Link href="/intelligence">Let AI optimise</Link>
                  </Button>
                </>
              ) : (
                <Button asChild variant="growth" size="sm">
                  <Link href="/campaigns/new">Create campaign</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Headline outcomes */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Ad spend" value={money(summary.adSpend, summary.currency)} icon={<Wallet className={iconCls} />} />
        <MetricCard label="People reached" value={summary.peopleReached.toLocaleString()} icon={<Users className={iconCls} />} emphasis="blue" />
        <MetricCard label="Leads" value={summary.leads.toLocaleString()} icon={<UserPlus className={iconCls} />} />
        <MetricCard label="Qualified" value={summary.qualifiedLeads.toLocaleString()} icon={<BadgeCheck className={iconCls} />} emphasis="ai" />
        <MetricCard label="Tracked revenue" value={money(summary.trackedRevenue, summary.currency)} icon={<TrendingUp className={iconCls} />} emphasis="growth" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Activity timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Recent AI activity</CardTitle>
            <Link href="/recommendations" className="ml-auto text-xs font-medium text-ar-blue-bright hover:underline">
              View recommendations
            </Link>
          </CardHeader>
          <CardBody>
            {activity.length === 0 ? (
              <p className="py-6 text-center text-sm text-ar-muted">No activity yet.</p>
            ) : (
              <ol className="relative space-y-5 before:absolute before:left-[5px] before:top-1.5 before:h-[calc(100%-1rem)] before:w-px before:bg-ar-border">
                {activity.map((a) => (
                  <li key={a.id} className="relative pl-6">
                    <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-ar-white bg-ar-cyan" aria-hidden />
                    <p className="text-sm text-ar-text">{a.summary}</p>
                    <p className="mt-0.5 text-xs text-ar-muted">
                      {new Date(a.createdAt).toLocaleString()}
                      {a.moneyProtected ? ` · ${money(Number(a.moneyProtected), summary.currency)} protected` : ''}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>

        {/* Right rail */}
        <div className="space-y-6">
          <AIStatus
            state="working"
            currently={
              summary.activeCampaigns > 0
                ? `Monitoring ${summary.activeCampaigns} active campaign${summary.activeCampaigns > 1 ? 's' : ''} against your limits.`
                : 'Waiting for your first campaign.'
            }
            nextReview="In 2 hours"
            autonomyLevel={AUTONOMY_TO_LEVEL[business.autonomyLevel] ?? 2}
          />

          {summary.wallet ? (
            <Card>
              <CardHeader>
                <CardTitle>Ad wallet</CardTitle>
              </CardHeader>
              <CardBody>
                <WalletBar wallet={summary.wallet} currency={summary.currency} />
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Ledger label="Funded" value={money(summary.wallet.funded, summary.currency)} />
                  <Ledger label="Ad spend" value={money(summary.wallet.adSpend, summary.currency)} />
                  <Ledger label="Service fee" value={money(summary.wallet.serviceFee, summary.currency)} />
                  <Ledger label="Reserved" value={money(summary.wallet.reserved, summary.currency)} emphasis />
                </dl>
              </CardBody>
            </Card>
          ) : null}

          {summary.trackedRevenue === 0 && hasData ? (
            <Alert tone="ai" title="Early signal">
              Not enough data yet to attribute revenue with confidence. I&apos;ll flag it as soon as
              the numbers are meaningful.
            </Alert>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function WalletBar({
  wallet,
  currency,
}: {
  wallet: { funded: number; adSpend: number; serviceFee: number; reserved: number };
  currency: string;
}) {
  const total = Math.max(wallet.funded, wallet.adSpend + wallet.serviceFee + wallet.reserved, 1);
  const seg = (n: number) => `${(n / total) * 100}%`;
  void currency;
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-ar-background">
      <div className="bg-ar-blue" style={{ width: seg(wallet.adSpend) }} />
      <div className="bg-ar-blue-bright/60" style={{ width: seg(wallet.serviceFee) }} />
      <div className="bg-ar-orange" style={{ width: seg(wallet.reserved) }} />
    </div>
  );
}

function Ledger({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-ar-muted">{label}</dt>
      <dd className={emphasis ? 'font-semibold tabular-nums text-ar-orange-dark' : 'font-semibold tabular-nums text-ar-text'}>
        {value}
      </dd>
    </div>
  );
}
