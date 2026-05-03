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

export type Analysis = {
  market: Market;
  symbol: string;
  timestamp: string;
  price: number;
  timeframes: Record<Timeframe, TimeframeAnalysis>;
  combined: MultiTimeframeSummary["combined"];
};

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
    timeframes: { "1h": a1h, "4h": a4h, "1d": a1d },
    combined,
  };
}
