import * as React from 'react';
import { cn } from '../utils/cn';

/**
 * EmptyState — a designed "nothing here yet" moment rather than plain grey text.
 * A soft branded icon medallion, a clear headline, supporting copy, and an
 * optional action (Spec §8, §80).
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  tone = 'blue',
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  tone?: 'blue' | 'ai';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-xl border border-dashed border-ar-border bg-ar-surface px-6 py-14 text-center',
        className,
      )}
    >
      {icon ? (
        <span
          className={cn(
            'mb-4 flex h-14 w-14 items-center justify-center rounded-2xl',
            tone === 'ai' ? 'bg-ar-cyan-light text-ar-cyan-dark' : 'bg-ar-blue-light text-ar-blue',
          )}
        >
          {icon}
        </span>
      ) : null}
      <h3 className="text-base font-semibold text-ar-text">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-ar-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
