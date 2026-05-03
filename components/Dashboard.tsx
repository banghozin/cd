"use client";

import { useCallback, useEffect, useState } from "react";
import Watchlist, { type WatchItem } from "./Watchlist";
import ChartView from "./ChartView";
import AnalysisPanel from "./AnalysisPanel";
import HelpView from "./HelpView";
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

type Tab = "analysis" | "help";

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

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("analysis");
  const [selected, setSelected] = useState<WatchItem | null>(null);
  const [tf, setTf] = useState<Timeframe>("1d");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [chart, setChart] = useState<ChartResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        if (!aRes.ok) throw new Error(`analyze: ${aRes.status}`);
        if (!cRes.ok) throw new Error(`chart: ${cRes.status}`);
        const aJson = (await aRes.json()) as Analysis | { error: string };
        const cJson = (await cRes.json()) as ChartResponse | { error: string };
        if ("error" in aJson) throw new Error(aJson.error);
        if ("error" in cJson) throw new Error(cJson.error);
        setAnalysis(aJson);
        setChart(cJson);
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
    if (tab === "analysis" && selected) loadData(selected, tf);
  }, [tab, selected, tf, loadData]);

  return (
    <div>
      <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-zinc-200 truncate">
            <span>우크당거스</span>
            <span className="hidden sm:inline"> 차트 분석기</span>
          </div>
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => setTab("analysis")}
              className={`px-3 sm:px-4 py-1.5 text-sm rounded ${
                tab === "analysis"
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              분석
            </button>
            <button
              onClick={() => setTab("help")}
              className={`px-3 sm:px-4 py-1.5 text-sm rounded ${
                tab === "help"
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              사용법
            </button>
          </div>
        </div>
      </nav>

      {tab === "help" ? (
        <HelpView />
      ) : (
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
              <Watchlist selected={selected} onSelect={setSelected} />
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
                    <span className="ml-3 tabular-nums">
                      ${analysis.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
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

            {chart && <ChartView series={chart.series} height={chartHeight} />}
          </main>

          <aside className="min-w-0">
            {analysis ? (
              <AnalysisPanel analysis={analysis} />
            ) : (
              <div className="rounded border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-500">
                {loading ? "분석 중…" : "종목을 선택하세요"}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
