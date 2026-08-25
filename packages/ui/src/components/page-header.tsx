import * as React from 'react';
import { cn } from '../utils/cn';

/**
 * PageHeader — consistent title block for every app screen. Optional eyebrow,
 * description, and a right-aligned actions slot. Establishes the vertical rhythm
 * so pages feel like one system (Spec §8).
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: string;
  description?: string;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ar-cyan-dark">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-ar-blue">
          {title}
        </h1>
        {description ? <p className="mt-1 text-sm text-ar-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
