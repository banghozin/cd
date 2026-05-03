export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type BinanceInterval = "1h" | "4h" | "1d";

export async function fetchBinanceKlines(
  symbol: string,
  interval: BinanceInterval,
  limit = 300,
): Promise<Candle[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    throw new Error(`Binance API error: ${res.status} ${res.statusText}`);
  }
  const raw = (await res.json()) as unknown[][];
  return raw.map((k) => ({
    time: Math.floor((k[0] as number) / 1000),
    open: parseFloat(k[1] as string),
    high: parseFloat(k[2] as string),
    low: parseFloat(k[3] as string),
    close: parseFloat(k[4] as string),
    volume: parseFloat(k[5] as string),
  }));
}
