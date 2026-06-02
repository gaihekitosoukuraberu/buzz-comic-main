"use client";

/**
 * 純 SVG / CSS ベースの収益チャート（外部ライブラリ不要）
 */

import { cn } from "@/lib/utils";

export interface ChartDataPoint {
  label: string; // 横軸ラベル（漫画タイトル / 月 など）
  value: number;
}

interface RevenueChartProps {
  data: ChartDataPoint[];
  title?: string;
  className?: string;
  /** バーの色（Tailwind クラスではなく hex/rgba を使用） */
  barColor?: string;
  /** 最大値を指定しない場合はデータの最大値 */
  maxValue?: number;
}

function formatCurrency(n: number): string {
  if (n >= 10000) return `¥${(n / 10000).toFixed(1)}万`;
  return `¥${n.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}`;
}

export function RevenueChart({
  data,
  title,
  className,
  barColor = "#6366f1",
  maxValue,
}: RevenueChartProps) {
  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex h-48 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900",
          className
        )}
      >
        データがありません
      </div>
    );
  }

  const chartMax = maxValue ?? Math.max(...data.map((d) => d.value), 1);
  // SVG dimensions
  const svgWidth = 600;
  const svgHeight = 200;
  const paddingTop = 16;
  const paddingBottom = 48;
  const paddingLeft = 60;
  const paddingRight = 16;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const barGap = 8;
  const barWidth = Math.max(
    8,
    (chartWidth - barGap * (data.length - 1)) / data.length
  );

  // Y axis ticks (4 levels)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    value: chartMax * f,
    y: paddingTop + chartHeight * (1 - f),
  }));

  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900",
        className
      )}
    >
      {title && (
        <h3 className="mb-4 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          {title}
        </h3>
      )}

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full min-w-[320px]"
          aria-label={title ?? "収益チャート"}
        >
          {/* Y axis grid lines and labels */}
          {yTicks.map((tick) => (
            <g key={tick.value}>
              <line
                x1={paddingLeft}
                y1={tick.y}
                x2={svgWidth - paddingRight}
                y2={tick.y}
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeWidth={1}
              />
              <text
                x={paddingLeft - 6}
                y={tick.y + 4}
                textAnchor="end"
                fontSize={10}
                fill="currentColor"
                fillOpacity={0.5}
              >
                {formatCurrency(tick.value)}
              </text>
            </g>
          ))}

          {/* Bars */}
          {data.map((d, i) => {
            const barHeight = Math.max(
              2,
              (d.value / chartMax) * chartHeight
            );
            const x =
              paddingLeft + i * (barWidth + barGap);
            const y = paddingTop + chartHeight - barHeight;

            return (
              <g key={d.label}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={4}
                  fill={barColor}
                  fillOpacity={0.85}
                >
                  <title>
                    {d.label}: {formatCurrency(d.value)}
                  </title>
                </rect>
                {/* X axis label */}
                <text
                  x={x + barWidth / 2}
                  y={svgHeight - 8}
                  textAnchor="middle"
                  fontSize={10}
                  fill="currentColor"
                  fillOpacity={0.6}
                >
                  {d.label.length > 6 ? d.label.slice(0, 6) + "…" : d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
