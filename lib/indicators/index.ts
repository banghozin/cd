import type { Candle } from "../data/binance";
import { latestRSI } from "./rsi";
import { emaBundle, type EMABundle } from "./ema";
import { macdState, type MACDState } from "./macd";
import { bbState, type BBState } from "./bollinger";
import { volumeState, type VolumeState } from "./volume";

export { computeRSI, latestRSI } from "./rsi";
export { computeEMA, emaBundle } from "./ema";
export { computeMACD, macdState } from "./macd";
export { bbState } from "./bollinger";
export { volumeState } from "./volume";

export type IndicatorSnapshot = {
  price: number;
  rsi14: number | null;
  ema: EMABundle;
  macd: MACDState | null;
  bb: BBState | null;
  volume: VolumeState | null;
};

export function snapshot(candles: Candle[]): IndicatorSnapshot {
  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1];
  return {
    price,
    rsi14: latestRSI(closes, 14),
    ema: emaBundle(closes),
    macd: macdState(closes),
    bb: bbState(closes),
    volume: volumeState(candles),
  };
}
