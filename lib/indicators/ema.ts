import { EMA } from "technicalindicators";

export function computeEMA(closes: number[], period: number): number[] {
  return EMA.calculate({ values: closes, period });
}

export function latestEMA(closes: number[], period: number): number | null {
  const values = computeEMA(closes, period);
  return values.length > 0 ? values[values.length - 1] : null;
}

export type EMABundle = {
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  alignment: "bull" | "bear" | "mixed";
};

export function emaBundle(closes: number[]): EMABundle {
  const ema20 = latestEMA(closes, 20);
  const ema50 = latestEMA(closes, 50);
  const ema200 = latestEMA(closes, 200);

  let alignment: EMABundle["alignment"] = "mixed";
  if (ema20 != null && ema50 != null && ema200 != null) {
    if (ema20 > ema50 && ema50 > ema200) alignment = "bull";
    else if (ema20 < ema50 && ema50 < ema200) alignment = "bear";
  }

  return { ema20, ema50, ema200, alignment };
}
