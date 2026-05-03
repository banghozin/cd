import type { Candle } from "../data/binance";

export type SwingType = "high" | "low";

export type SwingPoint = {
  index: number;
  time: number;
  price: number;
  type: SwingType;
};

export function detectSwings(
  candles: Candle[],
  threshold = 0.03,
): SwingPoint[] {
  if (candles.length < 3) return [];

  const swings: SwingPoint[] = [];
  let lastExtremeIdx = 0;
  let lastExtremePrice = candles[0].close;
  let direction: SwingType | null = null;

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const upMove = (c.high - lastExtremePrice) / lastExtremePrice;
    const downMove = (lastExtremePrice - c.low) / lastExtremePrice;

    if (direction === null) {
      if (upMove >= threshold) {
        swings.push({
          index: lastExtremeIdx,
          time: candles[lastExtremeIdx].time,
          price: candles[lastExtremeIdx].low,
          type: "low",
        });
        direction = "high";
        lastExtremeIdx = i;
        lastExtremePrice = c.high;
      } else if (downMove >= threshold) {
        swings.push({
          index: lastExtremeIdx,
          time: candles[lastExtremeIdx].time,
          price: candles[lastExtremeIdx].high,
          type: "high",
        });
        direction = "low";
        lastExtremeIdx = i;
        lastExtremePrice = c.low;
      }
      continue;
    }

    if (direction === "high") {
      if (c.high > lastExtremePrice) {
        lastExtremeIdx = i;
        lastExtremePrice = c.high;
      } else if ((lastExtremePrice - c.low) / lastExtremePrice >= threshold) {
        swings.push({
          index: lastExtremeIdx,
          time: candles[lastExtremeIdx].time,
          price: lastExtremePrice,
          type: "high",
        });
        direction = "low";
        lastExtremeIdx = i;
        lastExtremePrice = c.low;
      }
    } else {
      if (c.low < lastExtremePrice) {
        lastExtremeIdx = i;
        lastExtremePrice = c.low;
      } else if ((c.high - lastExtremePrice) / lastExtremePrice >= threshold) {
        swings.push({
          index: lastExtremeIdx,
          time: candles[lastExtremeIdx].time,
          price: lastExtremePrice,
          type: "low",
        });
        direction = "high";
        lastExtremeIdx = i;
        lastExtremePrice = c.high;
      }
    }
  }

  return swings;
}
