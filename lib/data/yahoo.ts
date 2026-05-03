import YahooFinance from "yahoo-finance2";
import type { Candle } from "./binance";

const yf = new YahooFinance();

export type YahooInterval = "1h" | "1d";

const PERIOD_DAYS: Record<YahooInterval, number> = {
  "1h": 60,
  "1d": 730,
};

export async function fetchYahooCandles(
  symbol: string,
  interval: YahooInterval,
  limit = 300,
): Promise<Candle[]> {
  const days = PERIOD_DAYS[interval];
  const period2 = new Date();
  const period1 = new Date(period2.getTime() - days * 24 * 60 * 60 * 1000);

  const result = await yf.chart(symbol, {
    period1,
    period2,
    interval,
    return: "array",
  });

  const candles: Candle[] = result.quotes
    .filter(
      (q): q is typeof q & {
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
      } =>
        q.open != null &&
        q.high != null &&
        q.low != null &&
        q.close != null &&
        q.volume != null,
    )
    .map((q) => ({
      time: Math.floor(q.date.getTime() / 1000),
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume,
    }));

  return candles.slice(-limit);
}

export function aggregateCandles(candles: Candle[], factor: number): Candle[] {
  if (factor <= 1) return candles;
  const out: Candle[] = [];
  for (let i = 0; i < candles.length; i += factor) {
    const chunk = candles.slice(i, i + factor);
    if (chunk.length < factor) break;
    out.push({
      time: chunk[0].time,
      open: chunk[0].open,
      high: Math.max(...chunk.map((c) => c.high)),
      low: Math.min(...chunk.map((c) => c.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.reduce((s, c) => s + c.volume, 0),
    });
  }
  return out;
}
