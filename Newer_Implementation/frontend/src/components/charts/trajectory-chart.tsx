"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "@/components/theme/theme-store";
import { CHART_AXIS_HEX, CHART_GRID_HEX, chartColor } from "@/lib/design-tokens";
import type { TrajectoryPoint } from "@/lib/stats";

export interface TrajectoryChartProps {
  data: TrajectoryPoint[];
  metricLabel: string;
  /** X-axis noun, e.g. "Season" or "Game". */
  xCaption: string;
  format?: "count" | "percent";
  /** Chart palette index (0 = amber primary). */
  colorIndex?: number;
  height?: number;
}

function fmtValue(value: number | null | undefined, format: "count" | "percent"): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return format === "percent" ? `${(value * 100).toFixed(1)}%` : value.toFixed(1);
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: TrajectoryPoint }>;
  format: "count" | "percent";
  metricLabel: string;
  xCaption: string;
}

function TrajectoryTooltip({ active, payload, format, metricLabel, xCaption }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-border-strong bg-card px-3 py-2 shadow-pop">
      <p className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-dim">
        {xCaption} {point.label}
      </p>
      <p className="mt-0.5 font-mono text-sm tabular-nums text-fg">
        {metricLabel}{" "}
        <span className="font-medium text-accent-text">{fmtValue(point.value, format)}</span>
      </p>
      {point.sub ? <p className="mt-0.5 text-xs text-muted">{point.sub}</p> : null}
    </div>
  );
}

export function TrajectoryChart({
  data,
  metricLabel,
  xCaption,
  format = "count",
  colorIndex = 0,
  height = 300,
}: TrajectoryChartProps) {
  const { theme } = useTheme();
  const stroke = chartColor(theme, colorIndex);
  const grid = CHART_GRID_HEX[theme];
  const axis = CHART_AXIS_HEX[theme];
  const dotEdge = theme === "light" ? "#ffffff" : "#151a25";
  const [reduceMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const gradientId = `traj-${colorIndex}-${theme}`;
  const tick = { fill: axis, fontSize: 11, fontFamily: "ui-monospace, SFMono-Regular, monospace" };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis
          dataKey="label"
          tick={tick}
          tickLine={false}
          axisLine={{ stroke: grid }}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          tick={tick}
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(v: number) => (format === "percent" ? `${Math.round(v * 100)}%` : `${v}`)}
        />
        <Tooltip
          content={
            <TrajectoryTooltip format={format} metricLabel={metricLabel} xCaption={xCaption} />
          }
          cursor={{ stroke: axis, strokeDasharray: "3 3" }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={stroke}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4, fill: stroke, stroke: dotEdge, strokeWidth: 1.5 }}
          connectNulls
          isAnimationActive={!reduceMotion}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
