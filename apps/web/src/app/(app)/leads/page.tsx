import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, Button, Card, CardBody, Input, MetricCard } from '@adsrobotic/ui';
import { getLeadStats, listLeads, type LeadStatus } from '@adsrobotic/core';
import { getCurrentUser } from '@/lib/current-user';
import { convertLeadAction, setLeadStatusAction } from '@/app/actions/leads';

export const metadata: Metadata = { title: 'Leads' };
export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, 'neutral' | 'ai' | 'growth' | 'success' | 'warning' | 'critical'> =
  {
    new: 'ai',
    contacted: 'neutral',
    qualified: 'growth',
    converted: 'success',
    disqualified: 'critical',
  };

const FILTERS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'converted', label: 'Converted' },
  { key: 'disqualified', label: 'Disqualified' },
];

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const business = (await getCurrentUser())!.activeBusiness!;
  const sp = await searchParams;
  const active = sp.status && sp.status !== 'all' ? (sp.status as LeadStatus) : undefined;
  const [stats, leads] = await Promise.all([
    getLeadStats(business.id),
    listLeads(business.id, active ? { status: active } : {}),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ar-blue">Leads</h1>
        <p className="mt-1 text-ar-muted">Everyone your advertising brought in — work them through the funnel.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="New" value={stats.new} />
        <MetricCard label="Qualified" value={stats.qualified} emphasis="ai" />
        <MetricCard label="Converted" value={stats.converted} emphasis="growth" />
        <MetricCard label="Total" value={stats.total} />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const isActive = (sp.status ?? 'all') === f.key;
          return (
            <Link
              key={f.key}
              href={f.key === 'all' ? '/leads' : `/leads?status=${f.key}`}
              className={
                isActive
                  ? 'rounded-full bg-ar-blue px-3 py-1.5 text-xs font-medium text-ar-white'
                  : 'rounded-full border border-ar-border px-3 py-1.5 text-xs font-medium text-ar-text hover:border-ar-blue-bright'
              }
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {leads.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center text-ar-muted">
            No leads {active ? `with status "${active}"` : 'yet'}. Launch a campaign or publish a
            Smart Page to start capturing them.
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <Card key={lead.id}>
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ar-text">
                      {lead.name ?? lead.phone ?? lead.email ?? 'Anonymous lead'}
                    </p>
                    <p className="text-xs text-ar-muted">
                      {[lead.phone, lead.email].filter(Boolean).join(' · ') || '—'}
                      {lead.campaignName ? ` · ${lead.campaignName}` : ''} · via {lead.destination}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[lead.status] ?? 'neutral'} className="ml-auto">
                    {lead.status}
                  </Badge>
                </div>

                {lead.message ? <p className="text-sm text-ar-text">“{lead.message}”</p> : null}

                <div className="flex flex-wrap items-center gap-2">
                  {lead.status !== 'contacted' && lead.status !== 'converted' ? (
                    <StatusButton leadId={lead.id} status="contacted" label="Contacted" />
                  ) : null}
                  {!lead.qualified ? (
                    <StatusButton leadId={lead.id} status="qualified" label="Qualify" variant="ai" />
                  ) : null}
                  {lead.status !== 'disqualified' && lead.status !== 'converted' ? (
                    <StatusButton leadId={lead.id} status="disqualified" label="Disqualify" variant="secondary" />
                  ) : null}
                  {lead.status !== 'converted' ? (
                    <form action={convertLeadAction} className="flex items-center gap-1.5">
                      <input type="hidden" name="leadId" value={lead.id} />
                      <Input
                        name="value"
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Value"
                        className="h-8 w-24"
                      />
                      <Button type="submit" variant="growth" size="sm">
                        Mark converted
                      </Button>
                    </form>
                  ) : lead.value ? (
                    <span className="text-sm font-medium text-ar-success">
                      Converted · {new Intl.NumberFormat('en', { style: 'currency', currency: 'USD' }).format(lead.value)}
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-ar-success">Converted</span>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusButton({
  leadId,
  status,
  label,
  variant = 'secondary',
}: {
  leadId: string;
  status: string;
  label: string;
  variant?: 'secondary' | 'ai';
}) {
  return (
    <form action={setLeadStatusAction}>
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" variant={variant} size="sm">
        {label}
      </Button>
    </form>
  );
}
