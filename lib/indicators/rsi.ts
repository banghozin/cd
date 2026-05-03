import { RSI } from "technicalindicators";

export function computeRSI(closes: number[], period = 14): number[] {
  return RSI.calculate({ values: closes, period });
}

export function latestRSI(closes: number[], period = 14): number | null {
  const values = computeRSI(closes, period);
  return values.length > 0 ? values[values.length - 1] : null;
}
