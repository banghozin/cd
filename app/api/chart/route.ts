import { fetchCandles, type Market, type Timeframe } from "@/lib/data";
import { chartSeries } from "@/lib/indicators/series";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const market = (url.searchParams.get("market") ?? "crypto") as Market;
  const symbol = url.searchParams.get("symbol") ?? "BTCUSDT";
  const tf = (url.searchParams.get("tf") ?? "1d") as Timeframe;

  try {
    const candles = await fetchCandles(market, symbol, tf, 300);
    const series = chartSeries(candles);
    return Response.json({ market, symbol, tf, series });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
