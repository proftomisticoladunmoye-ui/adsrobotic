import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      tone: {
        neutral: 'bg-ar-blue-light text-ar-blue',
        ai: 'bg-ar-cyan-light text-ar-cyan-dark',
        growth: 'bg-ar-orange-light text-ar-orange-dark',
        success: 'bg-[color:var(--ar-success)]/10 text-ar-success',
        warning: 'bg-[color:var(--ar-warning)]/10 text-ar-warning',
        critical: 'bg-[color:var(--ar-critical)]/10 text-ar-critical',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
