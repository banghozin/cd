import { fetchCandles, type Market } from "./data";

export type Quote = {
  market: Market;
  symbol: string;
  price: number;
  change24h: number | null;
  change7d: number | null;
  change30d: number | null;
};

function pctChange(now: number, then: number | undefined): number | null {
  if (then == null || then === 0 || !Number.isFinite(then)) return null;
  return ((now - then) / then) * 100;
}

export async function fetchQuote(
  market: Market,
  symbol: string,
): Promise<Quote> {
  const [hourly, daily] = await Promise.all([
    fetchCandles(market, symbol, "1h", 30),
    fetchCandles(market, symbol, "1d", 35),
  ]);

  if (daily.length === 0) {
    throw new Error(`${symbol}: 데이터 없음`);
  }

  const price = daily[daily.length - 1].close;
  const closed24h = hourly.length >= 25 ? hourly[hourly.length - 25].close : undefined;
  const closed7d = daily.length >= 8 ? daily[daily.length - 8].close : undefined;
  const closed30d = daily.length >= 31 ? daily[daily.length - 31].close : undefined;

  return {
    market,
    symbol,
    price,
    change24h: pctChange(price, closed24h),
    change7d: pctChange(price, closed7d),
    change30d: pctChange(price, closed30d),
  };
}

export async function fetchQuotes(
  items: { market: Market; symbol: string }[],
): Promise<(Quote | { market: Market; symbol: string; error: string })[]> {
  return Promise.all(
    items.map(async (it) => {
      try {
        return await fetchQuote(it.market, it.symbol);
      } catch (e) {
        return {
          market: it.market,
          symbol: it.symbol,
          error: e instanceof Error ? e.message : "알 수 없는 오류",
        };
      }
    }),
  );
}
