"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { COLORS } from "./colors";


type Series = { key: string; label: string; color: string };

const axisProps = {
  tick: { fill: COLORS.axis, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: COLORS.grid },
} as const;

const fmt = (n: number) => n.toLocaleString("es-AR");

function ChartTooltip({ active, payload, label, series }: TooltipContentProps & { series: Series[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as Record<string, number>;
  return (
    <div className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 text-neutral-500">{String(label ?? "")}</p>
      {series.map((s) => (
        <p key={s.key} className="flex items-center gap-2">
          <span className="h-0.5 w-3 rounded" style={{ background: s.color }} aria-hidden />
          <b className="tabular-nums text-neutral-900">{fmt(row[s.key] ?? 0)}</b>
          <span className="text-neutral-500">{s.label}</span>
        </p>
      ))}
    </div>
  );
}

export function Legend({ series, totals }: { series: Series[]; totals?: Record<string, number> }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600">
      {series.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
          {s.label}
          {totals && <b className="font-medium text-neutral-900 tabular-nums">{fmt(totals[s.key] ?? 0)}</b>}
        </span>
      ))}
    </div>
  );
}

// Columnas apiladas en el tiempo (ventas por canal).
export function StackedColumns({ data, series }: { data: Record<string, string | number>[]; series: Series[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
        <CartesianGrid vertical={false} stroke={COLORS.grid} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={16} />
        <YAxis {...axisProps} allowDecimals={false} width={48} />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
          content={(p) => <ChartTooltip {...p} series={series} />}
        />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            stackId="a"
            fill={s.color}
            maxBarSize={24}
            stroke={COLORS.surface}
            strokeWidth={1}
            radius={i === series.length - 1 ? [4, 4, 0, 0] : 0}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// Dos líneas en el tiempo con cursor vertical (ingresos vs egresos).
export function Lines({ data, series }: { data: Record<string, string | number>[]; series: Series[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid vertical={false} stroke={COLORS.grid} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={16} />
        <YAxis {...axisProps} allowDecimals={false} width={48} />
        <Tooltip
          cursor={{ stroke: COLORS.axis, strokeWidth: 1 }}
          content={(p) => <ChartTooltip {...p} series={series} />}
        />
        {series.map((s) => (
          <Line
            key={s.key}
            dataKey={s.key}
            stroke={s.color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={{ r: 4, stroke: COLORS.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// Barras horizontales (ranking). Con una serie, el valor va en la punta de la barra;
// con varias apiladas, en la punta va el total.
export function HorizontalBars({
  data,
  series,
  labelKey,
  totalKey,
}: {
  data: Record<string, string | number>[];
  series: Series[];
  labelKey: string;
  totalKey: string;
}) {
  const height = Math.max(120, data.length * 32 + 16);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey={labelKey}
          {...axisProps}
          axisLine={false}
          width={96}
          tick={{ fill: "#525252", fontSize: 11 }}
        />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
          content={(p) => <ChartTooltip {...p} series={series} />}
        />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            stackId="a"
            fill={s.color}
            maxBarSize={20}
            stroke={COLORS.surface}
            strokeWidth={1}
            radius={i === series.length - 1 ? [0, 4, 4, 0] : 0}
            isAnimationActive={false}
          >
            {i === series.length - 1 && (
              <LabelList
                dataKey={totalKey}
                position="right"
                fill="#262626"
                fontSize={11}
                formatter={(v) => fmt(Number(v))}
              />
            )}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
