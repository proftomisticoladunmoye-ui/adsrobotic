import { cn } from '../utils/cn';

/**
 * Logo — the official AdsRobotic brand mark (Spec §10). Renders the raster logo
 * served from the app's `public/` directory:
 *   - full wordmark  → `/logo.png`
 *   - square mark     → `/logo-mark.png` (markOnly)
 *
 * Plain <img> (not next/image) keeps this component usable from any React tree
 * without coupling the shared UI package to Next.
 */
export interface LogoProps {
  className?: string;
  /** Show only the square AR mark, no wordmark. */
  markOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const HEIGHT: Record<NonNullable<LogoProps['size']>, number> = { sm: 22, md: 30, lg: 40 };

export function Logo({ className, markOnly = false, size = 'md' }: LogoProps) {
  const height = HEIGHT[size];
  return (
    <img
      src={markOnly ? '/logo-mark.png' : '/logo.png'}
      alt="AdsRobotic"
      height={height}
      style={{ height, width: 'auto' }}
      className={cn('block select-none', className)}
    />
  );
}
