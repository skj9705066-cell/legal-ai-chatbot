"use client";

interface Props {
  data: number[];
  color?: string;
  fill?: string;
  className?: string;
  height?: number;
}

/**
 * Minimal SVG sparkline. No external libs.
 * Renders a smoothed area + line for compact stat trends.
 */
export default function Sparkline({
  data,
  color = "#0f172a",
  fill = "rgba(15, 23, 42, 0.08)",
  className = "sparkline",
  height = 36,
}: Props) {
  if (data.length < 2) return null;
  const width = 100; // viewBox width, scaled by SVG width:100%
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return { x, y };
  });

  const linePath = points
    .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
    .join(" ");
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden
    >
      <path d={areaPath} fill={fill} />
      <path
        d={linePath}
        stroke={color}
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last.x} cy={last.y} r="2" fill={color} />
    </svg>
  );
}
