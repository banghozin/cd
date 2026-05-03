import type { Candle } from "../data/binance";
import { detectSwings, type SwingPoint } from "./zigzag";
import { fibState, type FibState } from "./fibonacci";
import { detectTriangle, type TriangleState } from "./triangle";

export type { SwingPoint, FibState, TriangleState };
export { detectSwings, fibState, detectTriangle };

export type PatternSnapshot = {
  swings: SwingPoint[];
  fib: FibState | null;
  triangle: TriangleState;
};

export function patterns(candles: Candle[], threshold = 0.03): PatternSnapshot {
  const swings = detectSwings(candles, threshold);
  const price = candles[candles.length - 1].close;
  return {
    swings,
    fib: fibState(swings, price),
    triangle: detectTriangle(swings, price),
  };
}
