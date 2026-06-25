"use client";

import { useState } from "react";
import { TrajectoryChart } from "./trajectory-chart";
import { cn } from "@/lib/cn";
import type { TrajectoryMetric, TrajectoryPoint } from "@/lib/stats";

export interface TrajectoryMetricOption {
  key: TrajectoryMetric;
  label: string;
  format: "count" | "percent";
}

export interface TrajectoryPanelProps {
  mode: "season" | "rolling";
  xCaption: string;
  /** Pre-computed point arrays keyed by metric (built on the server). */
  series: Record<string, TrajectoryPoint[]>;
  metrics: TrajectoryMetricOption[];
  note?: string;
}

/** Metric switcher + the chart. Client-side because the toggle is interactive. */
export function TrajectoryPanel({ mode, xCaption, series, metrics, note }: TrajectoryPanelProps) {
  const [metric, setMetric] = useState<TrajectoryMetric>(metrics[0]?.key ?? "pts");
  const current = metrics.find((m) => m.key === metric) ?? metrics[0];
  const data = series[metric] ?? [];

  return (
    <div>
      <div role="tablist" aria-label="Trajectory metric" className="flex flex-wrap gap-1.5">
        {metrics.map((m) => {
          const active = m.key === current.key;
          return (
            <button
              key={m.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMetric(m.key)}
              className={cn(
                "rounded-md px-2.5 py-1 font-mono text-xs uppercase tracking-[0.08em] transition-colors duration-150 cursor-pointer",
                active
                  ? "bg-accent-soft text-accent-text"
                  : "text-dim hover:bg-card-2 hover:text-fg",
              )}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <figure
        className="mt-4"
        aria-label={`${current.label} ${
          mode === "season" ? "by season" : "as a 10-game rolling average"
        }`}
      >
        <TrajectoryChart
          data={data}
          metricLabel={current.label}
          xCaption={xCaption}
          format={current.format}
        />
        {note ? <figcaption className="mt-3 text-xs text-dim">{note}</figcaption> : null}
      </figure>
    </div>
  );
}
