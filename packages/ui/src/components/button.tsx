import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

/**
 * Button — brand-tokened, accessible (Spec §8, §9).
 * Blue is dominant. `growth` (Signal Orange) is reserved for important CTAs,
 * growth opportunities, and attention-demanding business actions — used
 * sparingly. `ai` (Electric Cyan) marks AI-driven actions.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ar-blue-bright focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-ar-blue text-ar-white hover:bg-ar-blue-dark',
        secondary: 'border border-ar-border bg-ar-white text-ar-text hover:bg-ar-blue-light',
        ghost: 'text-ar-blue hover:bg-ar-blue-light',
        // Signal Orange — growth / high-intent CTA only (Spec §9). Do not overuse.
        growth: 'bg-ar-orange text-ar-white hover:bg-ar-orange-dark',
        // Electric Cyan — AI-driven action (Spec §9).
        ai: 'bg-ar-cyan text-ar-blue-dark hover:bg-ar-cyan-dark hover:text-ar-white',
        danger: 'bg-ar-critical text-ar-white hover:opacity-90',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
