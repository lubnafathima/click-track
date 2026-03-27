"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import type { ClickLocation } from "@/types/tracker";

// ─── types ────────────────────────────────────────────────────────────────────

type View = "14d" | "24h";

interface DataPoint {
  label: string;
  clicks: number;
}

// ─── aggregation helpers ──────────────────────────────────────────────────────

function buildDailyData(
  locations: ClickLocation[],
  days: number
): DataPoint[] {
  const result: DataPoint[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const prefix = d.toISOString().slice(0, 10); // "2024-03-24"

    const clicks = locations.filter((l) =>
      l.timestamp.startsWith(prefix)
    ).length;

    result.push({
      label: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
      clicks,
    });
  }

  return result;
}

function buildHourlyData(locations: ClickLocation[]): DataPoint[] {
  const result: DataPoint[] = [];
  const now = new Date();

  for (let i = 23; i >= 0; i--) {
    const h = new Date(now.getTime() - i * 3_600_000);
    const prefix = h.toISOString().slice(0, 13); // "2024-03-24T14"

    const clicks = locations.filter((l) =>
      l.timestamp.startsWith(prefix)
    ).length;

    result.push({
      label: h.toLocaleTimeString("en", { hour: "numeric", hour12: true }),
      clicks,
    });
  }

  return result;
}

// ─── custom tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-lg border border-white/10">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="text-violet-300 font-semibold">
        {payload[0].value} {payload[0].value === 1 ? "click" : "clicks"}
      </p>
    </div>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

interface ClickChartProps {
  locations: ClickLocation[];
}

export default function ClickChart({ locations }: ClickChartProps) {
  const [view, setView] = useState<View>("14d");

  const data = useMemo(
    () =>
      view === "14d"
        ? buildDailyData(locations, 14)
        : buildHourlyData(locations),
    [locations, view]
  );

  const maxY = Math.max(...data.map((d) => d.clicks), 1);

  // Tick interval: show every 2nd label for 14d, every 6th for 24h
  const tickInterval = view === "14d" ? 1 : 5;

  return (
    <div className="flex flex-col gap-3">
      {/* View toggle */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          Click timeline
        </p>
        <div className="flex gap-1 glass rounded-lg p-0.5 text-xs">
          {(["14d", "24h"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                view === v
                  ? "bg-violet-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {v === "14d" ? "14 days" : "24 hours"}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#475569" }}
              tickLine={false}
              axisLine={false}
              interval={tickInterval}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#475569" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              domain={[0, maxY + 1]}
            />
            <Tooltip content={ChartTooltip} cursor={{ stroke: "rgba(139,92,246,0.2)" }} />
            <Line
              type="monotone"
              dataKey="clicks"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#8b5cf6", stroke: "#1e1b4b", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
