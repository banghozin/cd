import { SMA } from "technicalindicators";
import type { Candle } from "../data/binance";

export type VolumeState = {
  current: number;
  avg20: number;
  ratio: number;
  status: "very-high" | "high" | "normal" | "low";
};

export function volumeState(candles: Candle[]): VolumeState | null {
  if (candles.length < 20) return null;
  const volumes = candles.map((c) => c.volume);
  const sma = SMA.calculate({ period: 20, values: volumes });
  if (sma.length === 0) return null;

  const avg20 = sma[sma.length - 1];
  const current = volumes[volumes.length - 1];
  const ratio = avg20 > 0 ? current / avg20 : 0;

  let status: VolumeState["status"];
  if (ratio >= 2) status = "very-high";
  else if (ratio >= 1.3) status = "high";
  else if (ratio >= 0.7) status = "normal";
  else status = "low";

  return { current, avg20, ratio, status };
}
