import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AIStatus,
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  MetricCard,
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
  return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
    n,
  );
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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-sm text-ar-muted">Good day,</p>
        <h1 className="text-2xl font-semibold tracking-tight text-ar-blue">{greetingName}</h1>
      </div>

      {/* Headline outcomes */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Ad spend" value={money(summary.adSpend, summary.currency)} />
        <MetricCard label="People reached" value={summary.peopleReached.toLocaleString()} />
        <MetricCard label="Leads" value={summary.leads.toLocaleString()} />
        <MetricCard label="Qualified leads" value={summary.qualifiedLeads.toLocaleString()} emphasis="ai" />
        <MetricCard
          label="Tracked revenue"
          value={money(summary.trackedRevenue, summary.currency)}
          emphasis="growth"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {/* AI Today */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>AI today</CardTitle>
              <span className="text-xs font-medium text-ar-cyan-dark">AdsRobotic</span>
            </CardHeader>
            <CardBody>
              {hasData ? (
                <>
                  <p className="text-sm text-ar-text">
                    I found an opportunity. Your search campaign is generating qualified leads
                    noticeably cheaper than social — I recommend shifting budget toward it.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button variant="secondary" size="sm">
                      Review recommendation
                    </Button>
                    <Button variant="ai" size="sm">
                      Let AI optimise
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-ar-text">
                    Your Business Brain is ready. Launch your first campaign and I&apos;ll start
                    finding customers and reporting what your money achieves.
                  </p>
                  <div className="mt-4">
                    <Button asChild variant="growth" size="sm">
                      <Link href="/campaigns/new">Create your first campaign</Link>
                    </Button>
                  </div>
                </>
              )}
            </CardBody>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent AI activity</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {activity.length === 0 ? (
                <p className="text-sm text-ar-muted">No activity yet.</p>
              ) : (
                activity.map((a) => (
                  <div key={a.id} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ar-cyan" aria-hidden />
                    <div>
                      <p className="text-sm text-ar-text">{a.summary}</p>
                      <p className="text-xs text-ar-muted">
                        {new Date(a.createdAt).toLocaleString()}
                        {a.moneyProtected ? ` · ${money(Number(a.moneyProtected), summary.currency)} protected` : ''}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <AIStatus
            state="working"
            currently={
              summary.activeCampaigns > 0
                ? `Monitoring ${summary.activeCampaigns} active campaign${summary.activeCampaigns > 1 ? 's' : ''}`
                : 'Waiting for your first campaign'
            }
            nextReview="In 2 hours"
            autonomyLevel={AUTONOMY_TO_LEVEL[business.autonomyLevel] ?? 2}
          />

          {summary.wallet ? (
            <Card>
              <CardHeader>
                <CardTitle>Ad wallet</CardTitle>
              </CardHeader>
              <CardBody className="grid grid-cols-2 gap-4 text-sm">
                <Ledger label="Funded" value={money(summary.wallet.funded, summary.currency)} />
                <Ledger label="Ad spend" value={money(summary.wallet.adSpend, summary.currency)} />
                <Ledger label="Service fee" value={money(summary.wallet.serviceFee, summary.currency)} />
                <Ledger
                  label="Reserved"
                  value={money(summary.wallet.reserved, summary.currency)}
                  emphasis
                />
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

function Ledger({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div>
      <p className="text-xs text-ar-muted">{label}</p>
      <p
        className={
          emphasis
            ? 'text-lg font-semibold tabular-nums text-ar-orange-dark'
            : 'text-lg font-semibold tabular-nums text-ar-text'
        }
      >
        {value}
      </p>
    </div>
  );
}
