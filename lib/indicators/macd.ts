import { MACD } from "technicalindicators";

export type MACDPoint = {
  MACD: number;
  signal: number;
  histogram: number;
};

export type MACDState = {
  value: number;
  signal: number;
  histogram: number;
  cross: "golden" | "dead" | null;
  trend: "rising" | "falling";
};

export function computeMACD(closes: number[]): MACDPoint[] {
  const raw = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  return raw
    .filter(
      (p) => p.MACD != null && p.signal != null && p.histogram != null,
    )
    .map((p) => ({
      MACD: p.MACD as number,
      signal: p.signal as number,
      histogram: p.histogram as number,
    }));
}

export function macdState(closes: number[]): MACDState | null {
  const points = computeMACD(closes);
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  const prev = points[points.length - 2];

  let cross: MACDState["cross"] = null;
  if (prev.MACD <= prev.signal && last.MACD > last.signal) cross = "golden";
  else if (prev.MACD >= prev.signal && last.MACD < last.signal) cross = "dead";

  return {
    value: last.MACD,
    signal: last.signal,
    histogram: last.histogram,
    cross,
    trend: last.histogram >= prev.histogram ? "rising" : "falling",
  };
}
