"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import type { ChartSeries } from "@/lib/indicators/series";

type Props = {
  series: ChartSeries;
};

export default function ChartView({ series }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 560,
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
    chartRef.current = chart;

    const toTime = (t: number): Time => t as UTCTimestamp;

    const candles = chart.addSeries(
      CandlestickSeries,
      {
        upColor: "#10b981",
        downColor: "#ef4444",
        borderUpColor: "#10b981",
        borderDownColor: "#ef4444",
        wickUpColor: "#10b981",
        wickDownColor: "#ef4444",
      },
      0,
    );
    candles.setData(series.candles.map((c) => ({ ...c, time: toTime(c.time) })));

    const ema20 = chart.addSeries(
      LineSeries,
      { color: "#fbbf24", lineWidth: 1, priceLineVisible: false, lastValueVisible: false },
      0,
    );
    ema20.setData(series.ema20.map((p) => ({ time: toTime(p.time), value: p.value })));

    const ema50 = chart.addSeries(
      LineSeries,
      { color: "#a78bfa", lineWidth: 1, priceLineVisible: false, lastValueVisible: false },
      0,
    );
    ema50.setData(series.ema50.map((p) => ({ time: toTime(p.time), value: p.value })));

    const bbU = chart.addSeries(
      LineSeries,
      { color: "rgba(96,165,250,0.5)", lineWidth: 1, priceLineVisible: false, lastValueVisible: false },
      0,
    );
    bbU.setData(series.bbUpper.map((p) => ({ time: toTime(p.time), value: p.value })));
    const bbL = chart.addSeries(
      LineSeries,
      { color: "rgba(96,165,250,0.5)", lineWidth: 1, priceLineVisible: false, lastValueVisible: false },
      0,
    );
    bbL.setData(series.bbLower.map((p) => ({ time: toTime(p.time), value: p.value })));

    const volume = chart.addSeries(
      HistogramSeries,
      { priceFormat: { type: "volume" }, priceScaleId: "vol", priceLineVisible: false, lastValueVisible: false },
      1,
    );
    volume.priceScale().applyOptions({
      scaleMargins: { top: 0.1, bottom: 0 },
    });
    volume.setData(
      series.volume.map((p) => ({ time: toTime(p.time), value: p.value, color: p.color })),
    );

    const rsi = chart.addSeries(
      LineSeries,
      { color: "#22d3ee", lineWidth: 1, priceLineVisible: false, lastValueVisible: true },
      2,
    );
    rsi.setData(series.rsi.map((p) => ({ time: toTime(p.time), value: p.value })));
    rsi.createPriceLine({
      price: 70,
      color: "rgba(239,68,68,0.4)",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "70",
    });
    rsi.createPriceLine({
      price: 30,
      color: "rgba(16,185,129,0.4)",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "30",
    });

    const macdHist = chart.addSeries(
      HistogramSeries,
      { priceLineVisible: false, lastValueVisible: false },
      3,
    );
    macdHist.setData(
      series.macdHist.map((p) => ({ time: toTime(p.time), value: p.value, color: p.color })),
    );
    const macdLine = chart.addSeries(
      LineSeries,
      { color: "#60a5fa", lineWidth: 1, priceLineVisible: false, lastValueVisible: false },
      3,
    );
    macdLine.setData(series.macd.map((p) => ({ time: toTime(p.time), value: p.value })));
    const macdSig = chart.addSeries(
      LineSeries,
      { color: "#fb923c", lineWidth: 1, priceLineVisible: false, lastValueVisible: false },
      3,
    );
    macdSig.setData(series.macdSignal.map((p) => ({ time: toTime(p.time), value: p.value })));

    chart.panes()[1]?.setHeight(80);
    chart.panes()[2]?.setHeight(100);
    chart.panes()[3]?.setHeight(100);

    chart.timeScale().fitContent();

    const onResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [series]);

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 mb-2">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 bg-amber-400" /> EMA20
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 bg-violet-400" /> EMA50
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 bg-blue-400/60" /> BB(20,2)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 bg-cyan-400" /> RSI(14)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 bg-blue-400" /> MACD
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 bg-orange-400" /> Signal
        </span>
      </div>
      <div ref={containerRef} className="w-full rounded border border-zinc-800" />
    </div>
  );
}
