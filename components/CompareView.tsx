"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  LineSeries,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";

type Series = {
  market: string;
  symbol: string;
  points: { time: number; value: number }[];
};

type Props = {
  series: Series[];
  height?: number;
};

const COLORS = ["#fbbf24", "#60a5fa", "#a78bfa", "#34d399"];

export default function CompareView({ series, height = 480 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart: IChartApi = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { color: "#0a0a0a" },
        textColor: "#a1a1aa",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "#18181b" },
        horzLines: { color: "#18181b" },
      },
      rightPriceScale: { borderColor: "#27272a" },
      timeScale: {
        borderColor: "#27272a",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: { mode: 1 },
    });

    series.forEach((s, i) => {
      const line = chart.addSeries(LineSeries, {
        color: COLORS[i % COLORS.length],
        lineWidth: 2,
        priceLineVisible: false,
      });
      line.setData(
        s.points.map((p) => ({
          time: p.time as UTCTimestamp,
          value: p.value,
        })),
      );
    });

    chart.timeScale().fitContent();

    const onResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
    };
  }, [series, height]);

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 mb-2">
        {series.map((s, i) => (
          <span key={`${s.market}-${s.symbol}`} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-0.5"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            {s.symbol}
          </span>
        ))}
        <span className="text-zinc-500 ml-auto">시작점 0% 기준 상대 변동</span>
      </div>
      <div ref={containerRef} className="w-full rounded border border-zinc-800" />
    </div>
  );
}
