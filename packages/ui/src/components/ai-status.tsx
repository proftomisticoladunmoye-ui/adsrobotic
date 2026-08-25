import { cn } from '../utils/cn';

/**
 * AIStatus — the persistent but non-intrusive "AI Employee is working"
 * indicator (Spec §12). Gives the psychological signal that AdsRobotic is
 * actively at work. Cyan pulse = live AI activity (Spec §9).
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
    <div className={cn('rounded-lg border border-ar-border bg-ar-surface p-4', className)}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ar-muted">
          AdsRobotic Status
        </span>
        <span className={cn('ml-auto h-2.5 w-2.5 rounded-full', dot)} aria-hidden />
        <span className="text-xs font-medium capitalize text-ar-text">{state}</span>
      </div>

      {currently ? (
        <p className="mt-3 text-sm text-ar-text">
          <span className="text-ar-muted">Currently: </span>
          {currently}
        </p>
      ) : null}

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        {nextReview ? (
          <div>
            <dt className="text-ar-muted">Next review</dt>
            <dd className="font-medium text-ar-text">{nextReview}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-ar-muted">Budget protection</dt>
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
