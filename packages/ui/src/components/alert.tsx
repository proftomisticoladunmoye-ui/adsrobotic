import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const alertVariants = cva('rounded-lg border p-4 text-sm', {
  variants: {
    tone: {
      info: 'border-ar-border bg-ar-blue-light text-ar-blue',
      ai: 'border-ar-cyan/40 bg-ar-cyan-light text-ar-cyan-dark',
      growth: 'border-ar-orange/40 bg-ar-orange-light text-ar-orange-dark',
      success: 'border-[color:var(--ar-success)]/30 bg-[color:var(--ar-success)]/10 text-ar-success',
      warning: 'border-[color:var(--ar-warning)]/30 bg-[color:var(--ar-warning)]/10 text-ar-warning',
      critical:
        'border-[color:var(--ar-critical)]/30 bg-[color:var(--ar-critical)]/10 text-ar-critical',
    },
  },
  defaultVariants: { tone: 'info' },
});

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
}

export function Alert({ className, tone, title, children, ...props }: AlertProps) {
  return (
    <div role="status" className={cn(alertVariants({ tone }), className)} {...props}>
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      {children}
    </div>
  );
}
