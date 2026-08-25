import { cn } from '../utils/cn';

const LABELS: Record<number, string> = {
  1: 'Advisor',
  2: 'Assistant',
  3: 'Manager',
  4: 'Autonomous Employee',
};

/**
 * AutonomyBadge — always-visible indicator of the AI's current authority level
 * (Spec §6). Higher levels lean on the AI-accent cyan; the label keeps the user
 * oriented on how much AdsRobotic may do without asking.
 */
export function AutonomyBadge({ level, className }: { level: 1 | 2 | 3 | 4; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        level >= 3
          ? 'border-ar-cyan/40 bg-ar-cyan-light text-ar-cyan-dark'
          : 'border-ar-border bg-ar-blue-light text-ar-blue',
        className,
      )}
    >
      <span className="font-semibold tabular-nums">L{level}</span>
      <span aria-hidden>·</span>
      {LABELS[level]}
    </span>
  );
}
