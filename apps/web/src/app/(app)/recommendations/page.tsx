import type { Metadata } from 'next';
import { Alert, Badge, Button, Card, CardBody } from '@adsrobotic/ui';
import { listRecommendations } from '@adsrobotic/core';
import { getCurrentUser } from '@/lib/current-user';
import {
  acceptRecommendationAction,
  dismissRecommendationAction,
} from '@/app/actions/recommendations';

export const metadata: Metadata = { title: 'AI Recommendations' };
export const dynamic = 'force-dynamic';

const CONFIDENCE_LABEL: Record<string, string> = {
  high: 'High confidence',
  moderate: 'Moderate confidence',
  early_signal: 'Early signal',
  more_data_needed: 'More data needed',
};
const STATUS_TONE: Record<string, 'neutral' | 'success' | 'warning'> = {
  pending: 'warning',
  accepted: 'success',
  dismissed: 'neutral',
  auto_applied: 'success',
};

export default async function RecommendationsPage() {
  const business = (await getCurrentUser())!.activeBusiness!;
  const recs = await listRecommendations(business.id);
  const pending = recs.filter((r) => r.status === 'pending');
  const decided = recs.filter((r) => r.status !== 'pending');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ar-blue">AI Recommendations</h1>
        <p className="mt-1 text-ar-muted">
          Actions AdsRobotic proposes — with the reasoning behind each. You decide.
        </p>
      </div>

      {pending.length === 0 ? (
        <Alert tone="ai" title="Nothing needs your decision">
          When AdsRobotic spots something worth acting on that&apos;s above its current authority, it
          appears here for you to approve.
        </Alert>
      ) : (
        <div className="space-y-3">
          {pending.map((r) => (
            <Card key={r.id}>
              <CardBody className="space-y-3">
                <div className="flex items-start gap-3">
                  <div>
                    <p className="font-semibold text-ar-text">{r.title}</p>
                    {r.campaignName ? <p className="text-xs text-ar-muted">{r.campaignName}</p> : null}
                  </div>
                  <Badge tone="ai" className="ml-auto">
                    {CONFIDENCE_LABEL[r.confidence] ?? r.confidence}
                  </Badge>
                </div>

                <p className="text-sm text-ar-text">{r.body}</p>

                {/* The "Why did the AI do this?" detail (Spec §22) */}
                <div className="rounded-lg bg-ar-blue-light p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ar-blue">Why</p>
                  <p className="mt-1 text-sm text-ar-text">{r.rationale}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ar-muted">
                    {r.moneyProtected !== null ? (
                      <span>
                        Estimated money protected:{' '}
                        <span className="font-medium text-ar-text">
                          {new Intl.NumberFormat('en', { style: 'currency', currency: 'USD' }).format(r.moneyProtected)}
                        </span>
                      </span>
                    ) : null}
                    <span>{r.reversible ? 'Reversible' : 'Not easily reversible'}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <form action={acceptRecommendationAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <Button type="submit" variant="growth" size="sm">
                      Accept &amp; apply
                    </Button>
                  </form>
                  <form action={dismissRecommendationAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <Button type="submit" variant="secondary" size="sm">
                      Dismiss
                    </Button>
                  </form>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {decided.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold text-ar-text">Decided</h2>
          <div className="mt-3 space-y-2">
            {decided.map((r) => (
              <Card key={r.id}>
                <CardBody className="flex items-center gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ar-text">{r.title}</p>
                    <p className="text-xs text-ar-muted">
                      {r.decidedAt ? new Date(r.decidedAt).toLocaleString() : ''}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[r.status] ?? 'neutral'} className="ml-auto">
                    {r.status.replace(/_/g, ' ')}
                  </Badge>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
