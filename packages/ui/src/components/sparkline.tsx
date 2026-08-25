/**
 * Sparkline — a tiny inline trend chart for metric cards. Pure SVG, no library.
 * Draws a smooth area under a line; colour follows the metric's accent.
 */
export function Sparkline({
  data,
  width = 96,
  height = 28,
  color = 'var(--ar-blue-bright)',
  fill = 'rgba(20, 108, 255, 0.10)',
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: string;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const stepX = width / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = i * stepX;
    const y = height - 2 - ((v - min) / span) * (height - 4);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="block">
      <path d={area} fill={fill} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1]![0]} cy={pts[pts.length - 1]![1]} r="2" fill={color} />
    </svg>
  );
}
