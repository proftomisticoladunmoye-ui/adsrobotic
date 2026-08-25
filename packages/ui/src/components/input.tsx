import * as React from 'react';
import { cn } from '../utils/cn';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'h-10 w-full rounded border border-ar-border bg-ar-white px-3 text-sm text-ar-text',
          'placeholder:text-ar-muted focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-ar-blue-bright focus-visible:ring-offset-1 disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

/** Labelled field wrapper with optional hint and error. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ar-text">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-ar-critical">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ar-muted">{hint}</p>
      ) : null}
    </div>
  );
}
