import { cn } from '../utils/cn';

/**
 * NetworkSignature — AdsRobotic's abstract "robotic intelligence signature"
 * (Spec §10, §24). A 3×3 node lattice with a bright central node (AdsRobotic AI)
 * connected out to advertising channels, customers, campaigns, and outcomes.
 *
 * Deliberately NOT a cartoon robot. Connection lines animate subtly to signal
 * that the AI is working. Set `animated={false}` for static / print contexts.
 */
export function NetworkSignature({
  className,
  animated = true,
  title = 'AdsRobotic intelligence network',
}: {
  className?: string;
  animated?: boolean;
  title?: string;
}) {
  // 3×3 grid of nodes in a 120×120 viewBox.
  const coords = [24, 60, 96];
  const nodes = coords.flatMap((y) => coords.map((x) => ({ x, y })));
  const center = { x: 60, y: 60 };

  return (
    <svg
      viewBox="0 0 120 120"
      className={cn('block', className)}
      role="img"
      aria-label={title}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      {/* Connection lines from every outer node to the centre */}
      <g stroke="var(--ar-cyan)" strokeWidth="1.25" opacity="0.55">
        {nodes.map((n, i) => {
          if (n.x === center.x && n.y === center.y) return null;
          return (
            <line
              key={i}
              x1={n.x}
              y1={n.y}
              x2={center.x}
              y2={center.y}
              strokeDasharray="4 4"
              className={animated ? 'animate-ar-flow' : undefined}
              style={animated ? { animationDelay: `${(i % 4) * 0.2}s` } : undefined}
            />
          );
        })}
      </g>
      {/* Outer nodes */}
      <g fill="var(--ar-blue)">
        {nodes.map((n, i) => {
          if (n.x === center.x && n.y === center.y) return null;
          return <circle key={i} cx={n.x} cy={n.y} r="4" />;
        })}
      </g>
      {/* Central node — AdsRobotic AI */}
      <circle cx={center.x} cy={center.y} r="9" fill="var(--ar-blue)" />
      <circle
        cx={center.x}
        cy={center.y}
        r="9"
        fill="none"
        stroke="var(--ar-cyan)"
        strokeWidth="2"
        className={animated ? 'animate-ar-pulse' : undefined}
      />
      <circle cx={center.x} cy={center.y} r="3.5" fill="var(--ar-cyan)" />
    </svg>
  );
}
