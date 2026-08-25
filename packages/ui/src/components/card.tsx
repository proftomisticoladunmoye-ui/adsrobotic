import * as React from 'react';
import { cn } from '../utils/cn';

/**
 * Card — the primary surface. Elevation and interactivity are explicit so
 * importance reads visually (Spec §8): a flagship card sits higher than a
 * routine one. Premium and restrained — soft blue-tinted shadows, no heavy
 * borders.
 */
export function Card({
  className,
  elevation = 'card',
  interactive = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  elevation?: 'flat' | 'card' | 'pop';
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-ar-border/70 bg-ar-surface',
        elevation === 'card' && 'shadow-card',
        elevation === 'pop' && 'shadow-pop',
        interactive &&
          'transition-all duration-200 hover:-translate-y-0.5 hover:border-ar-blue-bright/40 hover:shadow-card-hover',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center gap-3 border-b border-ar-border/60 px-6 py-4', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-[15px] font-semibold tracking-tight text-ar-text', className)} {...props} />
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-5', className)} {...props} />;
}

type Emphasis = 'default' | 'growth' | 'ai' | 'blue';

const EMPHASIS_VALUE: Record<Emphasis, string> = {
  default: 'text-ar-text',
  growth: 'text-ar-orange-dark',
  ai: 'text-ar-cyan-dark',
  blue: 'text-ar-blue',
};
const EMPHASIS_ICON: Record<Emphasis, string> = {
  default: 'bg-ar-blue-light text-ar-blue',
  growth: 'bg-ar-orange-light text-ar-orange-dark',
  ai: 'bg-ar-cyan-light text-ar-cyan-dark',
  blue: 'bg-ar-blue-light text-ar-blue',
};

/**
 * MetricCard — a key statistic (Spec §11). Optional icon, and a delta chip that
 * turns green/red with a direction arrow. `emphasis` reserves the restrained
 * accent colours for headline outcomes (growth = orange, ai = cyan).
 */
export function MetricCard({
  label,
  value,
  hint,
  icon,
  delta,
  emphasis = 'default',
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  /** e.g. { value: '+24%', direction: 'up' } */
  delta?: { value: string; direction: 'up' | 'down' | 'flat' };
  emphasis?: Emphasis;
  className?: string;
}) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-ar-muted">{label}</p>
        {icon ? (
          <span
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              EMPHASIS_ICON[emphasis],
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className={cn('mt-2 text-[28px] font-semibold leading-none tracking-tight tabular-nums', EMPHASIS_VALUE[emphasis])}>
        {value}
      </p>
      <div className="mt-2 flex items-center gap-2">
        {delta ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
              delta.direction === 'up' && 'bg-[color:var(--ar-success)]/10 text-ar-success',
              delta.direction === 'down' && 'bg-[color:var(--ar-critical)]/10 text-ar-critical',
              delta.direction === 'flat' && 'bg-ar-blue-light text-ar-muted',
            )}
          >
            {delta.direction === 'up' ? '↗' : delta.direction === 'down' ? '↘' : '→'} {delta.value}
          </span>
        ) : null}
        {hint ? <p className="text-xs text-ar-muted">{hint}</p> : null}
      </div>
    </Card>
  );
}
