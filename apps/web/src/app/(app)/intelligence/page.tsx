import type { Metadata } from 'next';
import { Alert, Card, CardBody, CardHeader, CardTitle, MetricCard } from '@adsrobotic/ui';
import { getConversionIntelligence } from '@adsrobotic/core';
import { getCurrentUser } from '@/lib/current-user';

export const metadata: Metadata = { title: 'Conversion Intelligence' };
export const dynamic = 'force-dynamic';

function pct(n: number | null): string {
  return n === null ? '—' : `${(n * 100).toFixed(n < 0.01 ? 2 : 1)}%`;
}

export default async function IntelligencePage() {
  const business = (await getCurrentUser())!.activeBusiness!;
  const data = await getConversionIntelligence(business.id);
  const money = (n: number) =>
    new Intl.NumberFormat('en', { style: 'currency', currency: data.currency, maximumFractionDigits: 0 }).format(n);
  const money2 = (n: number | null) =>
    n === null ? '—' : new Intl.NumberFormat('en', { style: 'currency', currency: data.currency }).format(n);

  const maxValue = Math.max(...data.funnel.map((s) => s.value), 1);
  const hasData = data.funnel.some((s) => s.value > 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ar-blue">Conversion Intelligence</h1>
        <p className="mt-1 text-ar-muted">What your advertising money actually achieved — impression to customer.</p>
      </div>

      {!hasData ? (
        <Alert tone="ai" title="No outcomes to measure yet">
          Once campaigns run and Smart Pages capture leads, the full funnel and its economics appear
          here — measured, never estimated.
        </Alert>
      ) : null}

      {/* Return economics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Ad spend" value={money(data.spend)} />
        <MetricCard label="Tracked revenue" value={money(data.revenue)} emphasis="growth" />
        <MetricCard label="Return on ad spend" value={data.roas === null ? '—' : `${data.roas.toFixed(2)}×`} emphasis="ai" />
        <MetricCard label="Cost / customer" value={money2(data.costPerCustomer)} />
      </div>

      {/* Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Customer journey funnel</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2.5">
          {data.funnel.map((stage) => {
            const width = Math.max(6, Math.round((stage.value / maxValue) ** 0.5 * 100));
            return (
              <div key={stage.key} className="flex items-center gap-3">
                <div className="w-36 shrink-0 text-sm text-ar-text">{stage.label}</div>
                <div className="h-9 flex-1 rounded bg-ar-background">
                  <div
                    className="flex h-9 items-center rounded bg-ar-blue px-3 text-sm font-semibold text-ar-white"
                    style={{ width: `${width}%` }}
                  >
                    {stage.value.toLocaleString()}
                  </div>
                </div>
                <div className="w-16 shrink-0 text-right text-xs text-ar-muted">
                  {stage.fromPrevious === null ? '' : pct(stage.fromPrevious)}
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>

      {/* Cost per stage */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Cost / lead" value={money2(data.costPerLead)} />
        <MetricCard label="Cost / qualified lead" value={money2(data.costPerQualifiedLead)} />
        <MetricCard label="Cost / customer" value={money2(data.costPerCustomer)} />
        <MetricCard label="Repeat customers" value={data.repeatCustomers} />
      </div>

      {/* Channel breakdown */}
      {data.channels.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>By channel</CardTitle>
          </CardHeader>
          <CardBody className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-ar-border text-left text-xs uppercase tracking-wide text-ar-muted">
                  <th className="py-2 pr-3 font-medium">Channel</th>
                  <th className="py-2 pr-3 text-right font-medium">Spend</th>
                  <th className="py-2 pr-3 text-right font-medium">Clicks</th>
                  <th className="py-2 pr-3 text-right font-medium">Leads</th>
                  <th className="py-2 pr-3 text-right font-medium">Customers</th>
                  <th className="py-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.channels.map((ch) => (
                  <tr key={ch.channel} className="border-b border-ar-border/60">
                    <td className="py-2 pr-3 capitalize text-ar-text">{ch.channel.replace(/_/g, ' ')}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-ar-text">{money(ch.spend)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-ar-muted">{ch.clicks.toLocaleString()}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-ar-text">{ch.leads}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-ar-text">{ch.customers}</td>
                    <td className="py-2 text-right tabular-nums font-medium text-ar-blue">{money(ch.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : null}

      <p className="text-xs text-ar-muted">
        Reach and spend are channel-reported; leads, customers, and revenue are your first-party
        records. All figures are measured (actual) — never estimated.
      </p>
    </div>
  );
}
