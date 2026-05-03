import type { IndicatorSnapshot } from "../indicators";
import type { PatternSnapshot } from "../patterns";

export type SignalDir = "buy" | "sell" | "neutral";

export type Signal = {
  source: string;
  direction: SignalDir;
  detail: string;
};

export type SignalSummary = {
  signals: Signal[];
  buy: number;
  sell: number;
  neutral: number;
  bias: SignalDir;
  score: number;
};

const BB_POSITION_KO: Record<string, string> = {
  "above-upper": "상단 돌파",
  "near-upper": "상단 근접",
  middle: "중앙",
  "near-lower": "하단 근접",
  "below-lower": "하단 이탈",
};

const VOLUME_STATUS_KO: Record<string, string> = {
  "very-high": "매우 높음",
  high: "높음",
  normal: "정상",
  low: "낮음",
};

const TRIANGLE_KO: Record<string, string> = {
  ascending: "상승 삼각형",
  descending: "하락 삼각형",
  symmetrical: "대칭 삼각형",
  expanding: "확장형",
  none: "없음",
};

export function aggregate(
  ind: IndicatorSnapshot,
  pat: PatternSnapshot,
): SignalSummary {
  const signals: Signal[] = [];

  if (ind.rsi14 != null) {
    if (ind.rsi14 < 30)
      signals.push({ source: "RSI", direction: "buy", detail: `과매도 (${ind.rsi14.toFixed(1)})` });
    else if (ind.rsi14 > 70)
      signals.push({ source: "RSI", direction: "sell", detail: `과매수 (${ind.rsi14.toFixed(1)})` });
    else
      signals.push({ source: "RSI", direction: "neutral", detail: `${ind.rsi14.toFixed(1)} (중립)` });
  }

  if (ind.ema.alignment === "bull")
    signals.push({ source: "EMA", direction: "buy", detail: "상승 정배열 (20>50>200)" });
  else if (ind.ema.alignment === "bear")
    signals.push({ source: "EMA", direction: "sell", detail: "하락 정배열 (20<50<200)" });
  else
    signals.push({ source: "EMA", direction: "neutral", detail: "혼조" });

  if (ind.macd) {
    if (ind.macd.cross === "golden")
      signals.push({ source: "MACD", direction: "buy", detail: "골든크로스" });
    else if (ind.macd.cross === "dead")
      signals.push({ source: "MACD", direction: "sell", detail: "데드크로스" });
    else if (ind.macd.histogram > 0 && ind.macd.trend === "rising")
      signals.push({ source: "MACD", direction: "buy", detail: "히스토그램 상승 (>0)" });
    else if (ind.macd.histogram < 0 && ind.macd.trend === "falling")
      signals.push({ source: "MACD", direction: "sell", detail: "히스토그램 하락 (<0)" });
    else
      signals.push({
        source: "MACD",
        direction: "neutral",
        detail: ind.macd.trend === "rising" ? "상승 중" : "하락 중",
      });
  }

  if (ind.bb) {
    const ko = BB_POSITION_KO[ind.bb.position] ?? ind.bb.position;
    if (ind.bb.position === "below-lower" || ind.bb.position === "near-lower")
      signals.push({ source: "BB", direction: "buy", detail: ko });
    else if (ind.bb.position === "above-upper" || ind.bb.position === "near-upper")
      signals.push({ source: "BB", direction: "sell", detail: ko });
    else
      signals.push({ source: "BB", direction: "neutral", detail: ko });
  }

  if (ind.volume) {
    const ko = VOLUME_STATUS_KO[ind.volume.status] ?? ind.volume.status;
    signals.push({
      source: "거래량",
      direction: "neutral",
      detail: `${ko} (${ind.volume.ratio.toFixed(2)}배)`,
    });
  }

  if (pat.fib?.nearest && pat.fib.zone !== "neutral") {
    if (pat.fib.zone === "support")
      signals.push({
        source: "피보나치",
        direction: "buy",
        detail: `${(pat.fib.nearest.ratio * 100).toFixed(1)}% 지지선 근처`,
      });
    else
      signals.push({
        source: "피보나치",
        direction: "sell",
        detail: `${(pat.fib.nearest.ratio * 100).toFixed(1)}% 저항선 근처`,
      });
  } else if (pat.fib?.nearest) {
    signals.push({
      source: "피보나치",
      direction: "neutral",
      detail: `${(pat.fib.nearest.ratio * 100).toFixed(1)}% 부근 (${(pat.fib.nearest.distancePct * 100).toFixed(2)}% 거리)`,
    });
  }

  if (pat.triangle.shape === "ascending")
    signals.push({ source: "패턴", direction: "buy", detail: TRIANGLE_KO.ascending });
  else if (pat.triangle.shape === "descending")
    signals.push({ source: "패턴", direction: "sell", detail: TRIANGLE_KO.descending });
  else if (pat.triangle.shape !== "none")
    signals.push({
      source: "패턴",
      direction: "neutral",
      detail: TRIANGLE_KO[pat.triangle.shape] ?? pat.triangle.shape,
    });

  let buy = 0,
    sell = 0,
    neutral = 0;
  for (const s of signals) {
    if (s.direction === "buy") buy++;
    else if (s.direction === "sell") sell++;
    else neutral++;
  }
  const decisive = buy + sell;
  const score = decisive === 0 ? 0 : (buy - sell) / decisive;

  let bias: SignalDir = "neutral";
  if (score >= 0.4) bias = "buy";
  else if (score <= -0.4) bias = "sell";

  return { signals, buy, sell, neutral, bias, score };
}

export type MultiTimeframeSummary = {
  "1h": SignalSummary;
  "4h": SignalSummary;
  "1d": SignalSummary;
  combined: {
    bias: SignalDir;
    weightedScore: number;
    note: string;
  };
};

const BIAS_KO: Record<SignalDir, string> = {
  buy: "매수",
  sell: "매도",
  neutral: "중립",
};

export function biasKo(b: SignalDir): string {
  return BIAS_KO[b];
}

export function combineMTF(
  h1: SignalSummary,
  h4: SignalSummary,
  d1: SignalSummary,
): MultiTimeframeSummary["combined"] {
  const weightedScore = h1.score * 0.2 + h4.score * 0.3 + d1.score * 0.5;
  let bias: SignalDir = "neutral";
  if (weightedScore >= 0.3) bias = "buy";
  else if (weightedScore <= -0.3) bias = "sell";

  const aligned =
    h1.bias === d1.bias && h4.bias === d1.bias && d1.bias !== "neutral";
  const note = aligned
    ? `모든 시간프레임 일치 (${BIAS_KO[d1.bias]})`
    : `엇갈림 (1H:${BIAS_KO[h1.bias]} / 4H:${BIAS_KO[h4.bias]} / 1D:${BIAS_KO[d1.bias]})`;

  return { bias, weightedScore, note };
}
