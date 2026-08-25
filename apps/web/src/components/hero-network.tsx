/**
 * HeroNetwork — the sophisticated intelligence network for the marketing hero
 * (Spec §24): AdsRobotic AI at the centre, connected to advertising channels,
 * the website/WhatsApp destinations, and the business outcomes (leads,
 * customers). Abstract, not a cartoon robot. Connection lines animate subtly.
 */
const NODES = [
  { label: 'Google', angle: -90 },
  { label: 'Meta', angle: -45 },
  { label: 'Video', angle: 0 },
  { label: 'Search', angle: 45 },
  { label: 'WhatsApp', angle: 90 },
  { label: 'Website', angle: 135 },
  { label: 'Leads', angle: 180 },
  { label: 'Customers', angle: 225 },
];

export function HeroNetwork() {
  const cx = 200;
  const cy = 200;
  const r = 150;

  const points = NODES.map((n) => {
    const rad = (n.angle * Math.PI) / 180;
    return { ...n, x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  });

  return (
    <svg
      viewBox="0 0 400 400"
      className="h-full w-full"
      role="img"
      aria-label="AdsRobotic AI connected to advertising channels, destinations, and business outcomes"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Connection lines */}
      <g stroke="var(--ar-cyan)" strokeWidth="1.5" opacity="0.5">
        {points.map((p, i) => (
          <line
            key={p.label}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            strokeDasharray="5 6"
            className="animate-ar-flow"
            style={{ animationDelay: `${(i % 4) * 0.25}s` }}
          />
        ))}
      </g>

      {/* Outer channel / outcome nodes */}
      {points.map((p) => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r="6" fill="var(--ar-blue)" />
          <text
            x={p.x}
            y={p.y - 12}
            textAnchor="middle"
            className="fill-[color:var(--ar-muted)]"
            style={{ fontSize: 11, fontWeight: 600 }}
          >
            {p.label}
          </text>
        </g>
      ))}

      {/* Central AdsRobotic AI node */}
      <circle cx={cx} cy={cy} r="46" fill="var(--ar-blue)" />
      <circle
        cx={cx}
        cy={cy}
        r="46"
        fill="none"
        stroke="var(--ar-cyan)"
        strokeWidth="2.5"
        className="animate-ar-pulse"
      />
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        className="fill-[color:var(--ar-white)]"
        style={{ fontSize: 13, fontWeight: 700 }}
      >
        AdsRobotic
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        className="fill-[color:var(--ar-cyan)]"
        style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1 }}
      >
        AI
      </text>
    </svg>
  );
}
