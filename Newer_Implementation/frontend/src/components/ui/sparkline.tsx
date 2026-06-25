import { cn } from "@/lib/cn";

export interface SparklineProps {
  /** Series values, oldest → newest. */
  data: number[];
  width?: number;
  height?: number;
  /** Stroke colour — defaults to the primary chart token (amber). */
  color?: string;
  strokeWidth?: number;
  /** Fill the area under the line with a fading gradient. */
  fill?: boolean;
  className?: string;
  "aria-label"?: string;
}

/**
 * Dependency-free inline sparkline. Pure SVG, renders on the server. Uses the
 * design-system chart tokens by default so it themes automatically.
 */
export function Sparkline({
  data,
  width = 160,
  height = 44,
  color = "var(--chart-1)",
  strokeWidth = 2,
  fill = true,
  className,
  "aria-label": ariaLabel,
}: SparklineProps) {
  if (data.length < 2) {
    return <svg width={width} height={height} className={className} aria-hidden role="presentation" />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pad = strokeWidth + 1;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const points = data.map((value, i) => {
    const x = pad + (i / (data.length - 1)) * innerW;
    const y = pad + (1 - (value - min) / span) * innerH;
    return [x, y] as const;
  });

  const line = points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const gradientId = `spark-${Math.abs(hashPoints(line))}`;
  const area = `${line} ${(pad + innerW).toFixed(2)},${(height - pad).toFixed(2)} ${pad.toFixed(2)},${(height - pad).toFixed(2)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      role={ariaLabel ? "img" : "presentation"}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {fill ? (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <polygon points={area} fill={`url(#${gradientId})`} />
        </>
      ) : null}
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Tiny deterministic hash so gradient ids are stable (no Math.random in SSR). */
function hashPoints(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
