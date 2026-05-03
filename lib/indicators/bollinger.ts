import { BollingerBands } from "technicalindicators";

export type BBState = {
  upper: number;
  middle: number;
  lower: number;
  width: number;
  position: "above-upper" | "near-upper" | "middle" | "near-lower" | "below-lower";
  percentB: number;
};

export function bbState(closes: number[], period = 20, stdDev = 2): BBState | null {
  const raw = BollingerBands.calculate({
    period,
    values: closes,
    stdDev,
  });
  if (raw.length === 0) return null;

  const last = raw[raw.length - 1];
  const price = closes[closes.length - 1];
  const range = last.upper - last.lower;
  const percentB = range > 0 ? (price - last.lower) / range : 0.5;

  let position: BBState["position"];
  if (price > last.upper) position = "above-upper";
  else if (percentB > 0.8) position = "near-upper";
  else if (percentB < 0.2) position = "near-lower";
  else if (price < last.lower) position = "below-lower";
  else position = "middle";

  return {
    upper: last.upper,
    middle: last.middle,
    lower: last.lower,
    width: range / last.middle,
    position,
    percentB,
  };
}
