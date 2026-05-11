"use client";

import { useCallback, useEffect, useState } from "react";
import Watchlist, { type WatchItem } from "./Watchlist";
import ChartView from "./ChartView";
import AnalysisPanel from "./AnalysisPanel";
import HistoryView from "./HistoryView";
import CompareView from "./CompareView";
import type { Analysis } from "@/lib/analyze";
import type { Timeframe } from "@/lib/data";
import type { ChartSeries } from "@/lib/indicators/series";

const TIMEFRAMES: Timeframe[] = ["1h", "4h", "1d"];

type ChartResponse = {
  market: string;
  symbol: string;
  tf: Timeframe;
  series: ChartSeries;
};

type CompareSeries = {
  market: string;
  symbol: string;
  points: { time: number; value: number }[];
};

type CompareResponse = {
  tf: Timeframe;
  series: CompareSeries[];
};

function useChartHeight(): number {
  const [h, setH] = useState(560);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setH(380);
      else if (w < 1024) setH(460);
      else setH(560);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return h;
}

const REFRESH_INTERVAL_MS = 60_000;

export default function Dashboard() {
  const [selected, setSelected] = useState<WatchItem | null>(null);
  const [tf, setTf] = useState<Timeframe>("1d");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [chart, setChart] = useState<ChartResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [compareTarget, setCompareTarget] = useState<WatchItem | null>(null);
  const [compareData, setCompareData] = useState<CompareResponse | null>(null);
  const [items, setItems] = useState<WatchItem[]>([]);
  const chartHeight = useChartHeight();

  const loadData = useCallback(
    async (item: WatchItem, timeframe: Timeframe) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          market: item.market,
          symbol: item.symbol,
        });
        const [aRes, cRes] = await Promise.all([
          fetch(`/api/analyze?${params}`, { cache: "no-store" }),
          fetch(`/api/chart?${params}&tf=${timeframe}`, { cache: "no-store" }),
        ]);
        const aRaw = (await aRes.json().catch(() => ({}))) as
          | Analysis
          | { error?: string };
        const cRaw = (await cRes.json().catch(() => ({}))) as
          | ChartResponse
          | { error?: string };
        if (!aRes.ok)
          throw new Error(
            `analyze ${aRes.status}: ${("error" in aRaw && aRaw.error) || "요청 실패"}`,
          );
        if (!cRes.ok)
          throw new Error(
            `chart ${cRes.status}: ${("error" in cRaw && cRaw.error) || "요청 실패"}`,
          );
        if ("error" in aRaw && aRaw.error) throw new Error(aRaw.error);
        if ("error" in cRaw && cRaw.error) throw new Error(cRaw.error);
        setAnalysis(aRaw as Analysis);
        setChart(cRaw as ChartResponse);
        setLastUpdated(new Date());
      } catch (e) {
        setError(e instanceof Error ? e.message : "unknown error");
        setAnalysis(null);
        setChart(null);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (selected) loadData(selected, tf);
  }, [selected, tf, loadData]);

  useEffect(() => {
    if (!selected || !compareTarget) {
      setCompareData(null);
      return;
    }
    let cancelled = false;
    fetch("/api/compare", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: [
          { market: selected.market, symbol: selected.symbol },
          { market: compareTarget.market, symbol: compareTarget.symbol },
        ],
        tf,
      }),
    })
      .then((r) => r.json())
      .then((d: CompareResponse | { error: string }) => {
        if (cancelled) return;
        if ("error" in d) setCompareData(null);
        else setCompareData(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selected, compareTarget, tf]);

  useEffect(() => {
    if (!autoRefresh || !selected) return;
    const id = setInterval(() => {
      if (!document.hidden) loadData(selected, tf);
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [autoRefresh, selected, tf, loadData]);

  const refreshNow = () => {
    if (selected) loadData(selected, tf);
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

  return (
    <div className="lg:grid lg:grid-cols-[260px_1fr_340px] lg:gap-6 max-w-[1600px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <details className="lg:hidden mb-4 rounded border border-zinc-800 bg-zinc-900 group">
            <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="text-zinc-500 text-xs uppercase tracking-wider">
                  관심 종목
                </span>
                <span className="text-zinc-200 font-medium">
                  {selected?.label ?? "—"}
                </span>
              </span>
              <span className="text-zinc-500 text-xs group-open:rotate-180 transition-transform">
                ▼
              </span>
            </summary>
            <div className="px-4 pb-4 pt-2 border-t border-zinc-800">
              <Watchlist
                selected={selected}
                onSelect={setSelected}
                onItemsChange={setItems}
              />
            </div>
          </details>

          <div className="hidden lg:block lg:sticky lg:top-20 lg:h-fit">
            <Watchlist selected={selected} onSelect={setSelected} />
          </div>

          <main className="min-w-0 mb-6 lg:mb-0">
            <header className="mb-4 flex items-baseline justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold truncate">
                  {selected?.label ?? "—"}
                </h1>
                <div className="text-xs text-zinc-500 mt-0.5 truncate">
                  {selected?.market} · {selected?.symbol}
                  {analysis && (
                    <span className="ml-3 tabular-nums text-zinc-200">
                      ${analysis.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
                {analysis && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs">
                    {(["24h", "7d", "30d"] as const).map((key) => {
                      const map = {
                        "24h": analysis.changes.change24h,
                        "7d": analysis.changes.change7d,
                        "30d": analysis.changes.change30d,
                      } as const;
                      const v = map[key];
                      if (v == null) return null;
                      const tone =
                        v > 0 ? "text-emerald-400" : v < 0 ? "text-red-400" : "text-zinc-400";
                      return (
                        <span key={key} className="tabular-nums">
                          <span className="text-zinc-500">{key}</span>
                          <span className={`ml-1 ${tone}`}>
                            {v > 0 ? "+" : ""}
                            {v.toFixed(2)}%
                          </span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <div className="flex gap-1">
                  {TIMEFRAMES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTf(t)}
                      className={`px-2.5 sm:px-3 py-1 text-xs rounded ${
                        tf === t
                          ? "bg-zinc-700 text-zinc-100"
                          : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                      }`}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-zinc-500">비교</span>
                  <select
                    value={
                      compareTarget
                        ? `${compareTarget.market}:${compareTarget.symbol}`
                        : ""
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) {
                        setCompareTarget(null);
                        return;
                      }
                      const [m, s] = v.split(":");
                      const found = items.find(
                        (i) => i.market === m && i.symbol === s,
                      );
                      setCompareTarget(found ?? null);
                    }}
                    className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded px-1.5 py-0.5"
                  >
                    <option value="">없음</option>
                    {items
                      .filter(
                        (i) =>
                          !selected ||
                          !(
                            i.market === selected.market &&
                            i.symbol === selected.symbol
                          ),
                      )
                      .map((i) => (
                        <option
                          key={`${i.market}-${i.symbol}`}
                          value={`${i.market}:${i.symbol}`}
                        >
                          {i.label}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 text-[10px] sm:text-xs text-zinc-500">
                  {lastUpdated && (
                    <span className="tabular-nums">
                      갱신 {formatTime(lastUpdated)}
                    </span>
                  )}
                  <button
                    onClick={refreshNow}
                    disabled={loading}
                    className="px-1.5 py-0.5 rounded hover:bg-zinc-800 disabled:opacity-50"
                    title="지금 새로고침"
                  >
                    {loading ? "⟳" : "↻"}
                  </button>
                  <button
                    onClick={() => setAutoRefresh((v) => !v)}
                    className={`px-1.5 py-0.5 rounded ${
                      autoRefresh
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-zinc-800 text-zinc-500"
                    }`}
                    title="1분마다 자동 갱신"
                  >
                    auto
                  </button>
                </div>
              </div>
            </header>

            {error && (
              <div className="rounded border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300 mb-4">
                오류: {error}
              </div>
            )}

            {loading && !chart && (
              <div
                className="rounded border border-zinc-800 bg-zinc-900 flex items-center justify-center text-sm text-zinc-500"
                style={{ height: chartHeight }}
              >
                불러오는 중…
              </div>
            )}

            {chart && !compareData && (
              <ChartView series={chart.series} height={chartHeight} />
            )}
            {compareData && (
              <CompareView series={compareData.series} height={chartHeight} />
            )}
          </main>

          <aside className="min-w-0 space-y-4">
            {selected && (
              <HistoryView market={selected.market} symbol={selected.symbol} />
            )}
            {analysis ? (
              <AnalysisPanel analysis={analysis} />
            ) : (
              <div className="rounded border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-500">
                {loading ? "분석 중…" : "종목을 선택하세요"}
              </div>
            )}
          </aside>
    </div>
  );
}
