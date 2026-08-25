import * as React from 'react';
import { cn } from '../utils/cn';

/** Structured surface. Prefer structure over decoration (Spec §8). */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-lg border border-ar-border bg-ar-surface', className)} {...props} />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-b border-ar-border px-5 py-4', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-base font-semibold text-ar-text', className)} {...props} />;
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4', className)} {...props} />;
}

/**
 * MetricCard — a key statistic on the dashboard (Spec §11). `emphasis="growth"`
 * is the sanctioned restrained use of Signal Orange for a headline outcome such
 * as tracked revenue; `emphasis="ai"` uses Electric Cyan for AI-derived figures.
 */
export function MetricCard({
  label,
  value,
  hint,
  emphasis = 'default',
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  emphasis?: 'default' | 'growth' | 'ai';
  className?: string;
}) {
  return (
    <Card className={cn('p-5', className)}>
      <p className="text-sm text-ar-muted">{label}</p>
      <p
        className={cn(
          'mt-1 text-3xl font-semibold tabular-nums',
          emphasis === 'growth' && 'text-ar-orange-dark',
          emphasis === 'ai' && 'text-ar-cyan-dark',
          emphasis === 'default' && 'text-ar-text',
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-ar-muted">{hint}</p> : null}
    </Card>
  );
}
