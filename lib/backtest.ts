import { fetchCandles, type Market } from "./data";
import { analyzeFrame } from "./analyze";

export type HitRate = {
  hits: number;
  total: number;
  rate: number | null;
};

export type BacktestResult = {
  market: Market;
  symbol: string;
  windows: { window: number; hitRate: HitRate }[];
  evaluations: number;
};

const WINDOWS_DAYS = [1, 7, 30];
const WARMUP = 30;
const TOTAL_DAYS = 200;

function emptyHit(): HitRate {
  return { hits: 0, total: 0, rate: null };
}

function finalizeRate(h: HitRate): HitRate {
  return {
    hits: h.hits,
    total: h.total,
    rate: h.total > 0 ? h.hits / h.total : null,
  };
}

export async function backtestSymbol(
  market: Market,
  symbol: string,
): Promise<BacktestResult> {
  const candles = await fetchCandles(market, symbol, "1d", TOTAL_DAYS);
  const len = candles.length;

  const buckets: Record<number, HitRate> = {};
  for (const w of WINDOWS_DAYS) buckets[w] = emptyHit();

  let evaluations = 0;
  for (let i = WARMUP; i < len; i++) {
    const slice = candles.slice(0, i + 1);
    const frame = analyzeFrame(slice);
    const bias = frame.signals.bias;
    if (bias === "neutral") continue;

    evaluations++;
    const basePrice = candles[i].close;
    for (const w of WINDOWS_DAYS) {
      const target = i + w;
      if (target >= len) continue;
      const futurePrice = candles[target].close;
      buckets[w].total++;
      const wentUp = futurePrice > basePrice;
      const wentDown = futurePrice < basePrice;
      const hit = (bias === "buy" && wentUp) || (bias === "sell" && wentDown);
      if (hit) buckets[w].hits++;
    }
  }

  return {
    market,
    symbol,
    windows: WINDOWS_DAYS.map((w) => ({
      window: w,
      hitRate: finalizeRate(buckets[w]),
    })),
    evaluations,
  };
}

export async function backtestMany(
  items: { market: Market; symbol: string }[],
): Promise<
  (BacktestResult | { market: Market; symbol: string; error: string })[]
> {
  return Promise.all(
    items.map(async (it) => {
      try {
        return await backtestSymbol(it.market, it.symbol);
      } catch (e) {
        return {
          market: it.market,
          symbol: it.symbol,
          error: e instanceof Error ? e.message : "오류",
        };
      }
    }),
  );
}
