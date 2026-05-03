import { fetchBinanceKlines, type Candle, type BinanceInterval } from "./binance";
import { fetchYahooCandles, aggregateCandles } from "./yahoo";

export type Market = "crypto" | "stock";
export type Timeframe = "1h" | "4h" | "1d";

export type { Candle };

export async function fetchCandles(
  market: Market,
  symbol: string,
  timeframe: Timeframe,
  limit = 300,
): Promise<Candle[]> {
  if (market === "crypto") {
    return fetchBinanceKlines(symbol, timeframe as BinanceInterval, limit);
  }

  if (timeframe === "4h") {
    const hourly = await fetchYahooCandles(symbol, "1h", limit * 4);
    return aggregateCandles(hourly, 4).slice(-limit);
  }
  return fetchYahooCandles(symbol, timeframe, limit);
}

export async function fetchAllTimeframes(
  market: Market,
  symbol: string,
  limit = 300,
): Promise<Record<Timeframe, Candle[]>> {
  const [h1, h4, d1] = await Promise.all([
    fetchCandles(market, symbol, "1h", limit),
    fetchCandles(market, symbol, "4h", limit),
    fetchCandles(market, symbol, "1d", limit),
  ]);
  return { "1h": h1, "4h": h4, "1d": d1 };
}
