import { cn } from '../utils/cn';

/**
 * AIStatus — the persistent, premium "AI Employee is working" panel (Spec §12).
 * A live cyan pulse signals activity; the layout reads like a small operations
 * readout. Non-intrusive but always reassuring the user their employee is on.
 */
export function AIStatus({
  state = 'working',
  currently,
  nextReview,
  autonomyLevel,
  budgetProtection = true,
  className,
}: {
  state?: 'working' | 'idle' | 'paused';
  currently?: string;
  nextReview?: string;
  autonomyLevel?: number;
  budgetProtection?: boolean;
  className?: string;
}) {
  const dot =
    state === 'working'
      ? 'bg-ar-cyan animate-ar-pulse'
      : state === 'paused'
        ? 'bg-ar-warning'
        : 'bg-ar-muted';

  return (
    <div
      className={cn(
        'rounded-xl border border-ar-cyan/20 bg-ar-surface p-4 shadow-ai-glow',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn('h-2.5 w-2.5 rounded-full', dot)} aria-hidden />
        <span className="text-xs font-semibold uppercase tracking-wide text-ar-blue">
          AdsRobotic
        </span>
        <span className="ml-auto text-xs font-medium capitalize text-ar-cyan-dark">{state}</span>
      </div>

      {currently ? (
        <p className="mt-3 text-sm leading-snug text-ar-text">{currently}</p>
      ) : null}

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-ar-border/60 pt-3 text-xs">
        {nextReview ? (
          <div>
            <dt className="text-ar-muted">Next review</dt>
            <dd className="font-medium text-ar-text">{nextReview}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-ar-muted">Budget guard</dt>
          <dd className={cn('font-medium', budgetProtection ? 'text-ar-success' : 'text-ar-muted')}>
            {budgetProtection ? 'Active' : 'Off'}
          </dd>
        </div>
        {typeof autonomyLevel === 'number' ? (
          <div>
            <dt className="text-ar-muted">Autonomy</dt>
            <dd className="font-medium text-ar-text">Level {autonomyLevel}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
