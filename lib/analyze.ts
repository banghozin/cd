import { fetchAllTimeframes, type Market, type Timeframe, type Candle } from "./data";
import { snapshot, type IndicatorSnapshot } from "./indicators";
import { patterns, type PatternSnapshot } from "./patterns";
import {
  aggregate,
  combineMTF,
  type SignalSummary,
  type MultiTimeframeSummary,
} from "./signals";

export type TimeframeAnalysis = {
  candleCount: number;
  indicators: IndicatorSnapshot;
  patterns: PatternSnapshot;
  signals: SignalSummary;
};

export type PriceChanges = {
  change24h: number | null;
  change7d: number | null;
  change30d: number | null;
};

export type Analysis = {
  market: Market;
  symbol: string;
  timestamp: string;
  price: number;
  changes: PriceChanges;
  timeframes: Record<Timeframe, TimeframeAnalysis>;
  combined: MultiTimeframeSummary["combined"];
};

function pctChange(now: number, then: number | undefined): number | null {
  if (then == null || then === 0 || !Number.isFinite(then)) return null;
  return ((now - then) / then) * 100;
}

function analyzeFrame(candles: Candle[]): TimeframeAnalysis {
  const ind = snapshot(candles);
  const pat = patterns(candles);
  const sig = aggregate(ind, pat);
  return {
    candleCount: candles.length,
    indicators: ind,
    patterns: pat,
    signals: sig,
  };
}

function computeChanges(h1: Candle[], d1: Candle[]): PriceChanges {
  const price = d1[d1.length - 1]?.close;
  if (price == null) {
    return { change24h: null, change7d: null, change30d: null };
  }
  return {
    change24h:
      h1.length >= 25 ? pctChange(price, h1[h1.length - 25].close) : null,
    change7d:
      d1.length >= 8 ? pctChange(price, d1[d1.length - 8].close) : null,
    change30d:
      d1.length >= 31 ? pctChange(price, d1[d1.length - 31].close) : null,
  };
}

export async function analyzeSymbol(
  market: Market,
  symbol: string,
): Promise<Analysis> {
  const tf = await fetchAllTimeframes(market, symbol, 300);
  const a1h = analyzeFrame(tf["1h"]);
  const a4h = analyzeFrame(tf["4h"]);
  const a1d = analyzeFrame(tf["1d"]);
  const combined = combineMTF(a1h.signals, a4h.signals, a1d.signals);

  return {
    market,
    symbol,
    timestamp: new Date().toISOString(),
    price: a1d.indicators.price,
    changes: computeChanges(tf["1h"], tf["1d"]),
    timeframes: { "1h": a1h, "4h": a4h, "1d": a1d },
    combined,
  };
}
