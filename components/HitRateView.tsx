"use client";

import { useEffect, useState } from "react";
import type { Market } from "@/lib/data";

type WatchItem = { market: Market; symbol: string; label: string };

type BacktestWindow = {
  window: number;
  hitRate: { hits: number; total: number; rate: number | null };
};

type BacktestResult = {
  market: Market;
  symbol: string;
  windows: BacktestWindow[];
  evaluations: number;
};

type BacktestError = { market: Market; symbol: string; error: string };

type AlertSymbolStats = {
  market: Market;
  symbol: string;
  alertCount: number;
  windows: { window: number; hits: number; total: number; rate: number | null }[];
};

type AlertHitRateResponse = {
  totalEntries: number;
  symbolCount: number;
  symbols: AlertSymbolStats[];
};

const STORAGE_KEY = "chart.watchlist.v1";
const CACHE_KEY = "chart.backtest.cache.v1";
const CACHE_TTL_MS = 60 * 60 * 1000;

function loadWatchlist(): WatchItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WatchItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function loadCache(): {
  results: (BacktestResult | BacktestError)[];
  cachedAt: number;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.cachedAt || Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(results: (BacktestResult | BacktestError)[]) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ results, cachedAt: Date.now() }),
    );
  } catch {}
}

function rateTone(rate: number | null): string {
  if (rate == null) return "text-zinc-500";
  if (rate >= 0.6) return "text-emerald-400";
  if (rate >= 0.5) return "text-amber-400";
  return "text-red-400";
}

function fmtRate(rate: number | null): string {
  if (rate == null) return "—";
  return `${Math.round(rate * 100)}%`;
}

function fmtTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function average(rates: (number | null)[]): number | null {
  const valid = rates.filter((r): r is number => r != null);
  if (valid.length === 0) return null;
  return valid.reduce((s, r) => s + r, 0) / valid.length;
}

export default function HitRateView() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [backtest, setBacktest] = useState<
    (BacktestResult | BacktestError)[] | null
  >(null);
  const [alertStats, setAlertStats] = useState<AlertHitRateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(loadWatchlist());
  }, []);

  useEffect(() => {
    fetch("/api/alert-hitrate")
      .then((r) => r.json())
      .then((d: AlertHitRateResponse | { error: string }) => {
        if ("error" in d) return;
        setAlertStats(d);
      })
      .catch(() => {});
  }, []);

  const runBacktest = async (force = false) => {
    if (items.length === 0) return;
    if (!force) {
      const cached = loadCache();
      if (cached) {
        setBacktest(cached.results);
        setCachedAt(cached.cachedAt);
        return;
      }
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ market: i.market, symbol: i.symbol })),
        }),
      });
      const data = (await res.json()) as
        | { results: (BacktestResult | BacktestError)[] }
        | { error: string };
      if (!res.ok || "error" in data) {
        throw new Error("error" in data ? data.error : `HTTP ${res.status}`);
      }
      setBacktest(data.results);
      setCachedAt(Date.now());
      saveCache(data.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (items.length === 0) return;
    const cached = loadCache();
    if (cached) {
      setBacktest(cached.results);
      setCachedAt(cached.cachedAt);
    } else {
      runBacktest(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const successRows = backtest?.filter(
    (r): r is BacktestResult => !("error" in r),
  );

  const avgs1 = successRows
    ? average(
        successRows.map(
          (r) => r.windows.find((w) => w.window === 1)?.hitRate.rate ?? null,
        ),
      )
    : null;
  const avgs7 = successRows
    ? average(
        successRows.map(
          (r) => r.windows.find((w) => w.window === 7)?.hitRate.rate ?? null,
        ),
      )
    : null;
  const avgs30 = successRows
    ? average(
        successRows.map(
          (r) => r.windows.find((w) => w.window === 30)?.hitRate.rate ?? null,
        ),
      )
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">적중률</h1>
        <p className="text-sm text-zinc-400 mt-1">
          관심 종목의 백테스트 적중률과 디스코드 봇 실제 알림 적중률.
        </p>
      </header>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold">백테스트 적중률</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              브라우저 관심 종목 · 200일 1일봉 기준 · 1일/7일/30일 후 가격 방향
              일치율
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {cachedAt && (
              <span className="text-zinc-500 tabular-nums">
                {fmtTime(cachedAt)}
              </span>
            )}
            <button
              onClick={() => runBacktest(true)}
              disabled={loading || items.length === 0}
              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
            >
              {loading ? "계산 중…" : "다시 계산"}
            </button>
          </div>
        </div>

        {items.length === 0 && (
          <div className="rounded border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-500">
            관심 종목이 없어요. 분석 페이지에서 종목을 먼저 추가하세요.
          </div>
        )}

        {error && (
          <div className="rounded border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300 mb-3">
            오류: {error}
          </div>
        )}

        {items.length > 0 && backtest && (
          <div className="rounded border border-zinc-800 bg-zinc-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/50 text-xs text-zinc-500 uppercase">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">종목</th>
                  <th className="text-right px-4 py-2 font-medium">1일</th>
                  <th className="text-right px-4 py-2 font-medium">1주</th>
                  <th className="text-right px-4 py-2 font-medium">1달</th>
                  <th className="text-right px-4 py-2 font-medium">평가수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {backtest.map((row) => {
                  const key = `${row.market}:${row.symbol}`;
                  if ("error" in row) {
                    return (
                      <tr key={key}>
                        <td className="px-4 py-2.5">
                          <div className="font-medium">{row.symbol}</div>
                          <div className="text-xs text-zinc-500">
                            {row.market}
                          </div>
                        </td>
                        <td
                          colSpan={4}
                          className="px-4 py-2.5 text-right text-xs text-red-400"
                        >
                          {row.error}
                        </td>
                      </tr>
                    );
                  }
                  const w1 = row.windows.find((w) => w.window === 1)!;
                  const w7 = row.windows.find((w) => w.window === 7)!;
                  const w30 = row.windows.find((w) => w.window === 30)!;
                  return (
                    <tr key={key} className="hover:bg-zinc-800/30">
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{row.symbol}</div>
                        <div className="text-xs text-zinc-500">
                          {row.market === "crypto" ? "코인" : "주식"}
                        </div>
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right tabular-nums ${rateTone(w1.hitRate.rate)}`}
                      >
                        {fmtRate(w1.hitRate.rate)}
                        <span className="text-zinc-600 text-xs ml-1.5">
                          ({w1.hitRate.total})
                        </span>
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right tabular-nums ${rateTone(w7.hitRate.rate)}`}
                      >
                        {fmtRate(w7.hitRate.rate)}
                        <span className="text-zinc-600 text-xs ml-1.5">
                          ({w7.hitRate.total})
                        </span>
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right tabular-nums ${rateTone(w30.hitRate.rate)}`}
                      >
                        {fmtRate(w30.hitRate.rate)}
                        <span className="text-zinc-600 text-xs ml-1.5">
                          ({w30.hitRate.total})
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-zinc-500 tabular-nums">
                        {row.evaluations}
                      </td>
                    </tr>
                  );
                })}
                {successRows && successRows.length > 1 && (
                  <tr className="bg-zinc-900/70 font-semibold">
                    <td className="px-4 py-2.5 text-zinc-300">평균</td>
                    <td
                      className={`px-4 py-2.5 text-right tabular-nums ${rateTone(avgs1)}`}
                    >
                      {fmtRate(avgs1)}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right tabular-nums ${rateTone(avgs7)}`}
                    >
                      {fmtRate(avgs7)}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right tabular-nums ${rateTone(avgs30)}`}
                    >
                      {fmtRate(avgs30)}
                    </td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {items.length > 0 && !backtest && !error && (
          <div className="rounded border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-500">
            백테스트 실행 중… (종목당 1~2초)
          </div>
        )}
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-semibold">디스코드 봇 실제 적중률</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            매시간 cron이 보낸 알림의 사후 적중률 · 데이터 누적되는 만큼만 표시
          </p>
        </div>

        {!alertStats && (
          <div className="rounded border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-500">
            불러오는 중…
          </div>
        )}

        {alertStats && alertStats.totalEntries === 0 && (
          <div className="rounded border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-500">
            아직 알림 이력이 없어요. cron이 돌면서 점점 쌓입니다.
          </div>
        )}

        {alertStats && alertStats.symbols.length > 0 && (
          <div className="rounded border border-zinc-800 bg-zinc-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/50 text-xs text-zinc-500 uppercase">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">종목</th>
                  <th className="text-right px-4 py-2 font-medium">알림수</th>
                  <th className="text-right px-4 py-2 font-medium">1일</th>
                  <th className="text-right px-4 py-2 font-medium">1주</th>
                  <th className="text-right px-4 py-2 font-medium">1달</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {alertStats.symbols.map((s) => {
                  const w1 = s.windows.find((w) => w.window === 1)!;
                  const w7 = s.windows.find((w) => w.window === 7)!;
                  const w30 = s.windows.find((w) => w.window === 30)!;
                  return (
                    <tr
                      key={`${s.market}:${s.symbol}`}
                      className="hover:bg-zinc-800/30"
                    >
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{s.symbol}</div>
                        <div className="text-xs text-zinc-500">
                          {s.market === "crypto" ? "코인" : "주식"}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-zinc-400 tabular-nums">
                        {s.alertCount}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right tabular-nums ${rateTone(w1.rate)}`}
                      >
                        {fmtRate(w1.rate)}
                        <span className="text-zinc-600 text-xs ml-1.5">
                          ({w1.total})
                        </span>
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right tabular-nums ${rateTone(w7.rate)}`}
                      >
                        {fmtRate(w7.rate)}
                        <span className="text-zinc-600 text-xs ml-1.5">
                          ({w7.total})
                        </span>
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right tabular-nums ${rateTone(w30.rate)}`}
                      >
                        {fmtRate(w30.rate)}
                        <span className="text-zinc-600 text-xs ml-1.5">
                          ({w30.total})
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-900 p-5 text-xs text-zinc-400 space-y-2">
        <p>
          <strong className="text-zinc-300">백테스트 적중률</strong>: 거래소 과거
          캔들 데이터로 "그 시점에 분석했더라면" 시뮬레이션한 결과. 즉시 측정
          가능하지만 1일봉만 사용하므로 실제 봇(MTF)과 미세 차이가 있을 수 있어요.
        </p>
        <p>
          <strong className="text-zinc-300">실제 알림 적중률</strong>: 디스코드로
          실제 발송된 알림의 사후 검증. 정확한 봇 성능 측정이지만, history.jsonl
          누적량에 따라 표본이 적을 수 있어요.
        </p>
        <p>
          숫자 옆 괄호는 평가된 표본 수. 표본이 작을수록 신뢰도 낮음.
        </p>
      </section>
    </div>
  );
}
