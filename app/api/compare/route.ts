import { fetchCandles, type Market, type Timeframe } from "@/lib/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Item = { market: Market; symbol: string };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { items: Item[]; tf: Timeframe };
    if (!Array.isArray(body.items) || body.items.length < 2) {
      return Response.json({ error: "두 종목 필요" }, { status: 400 });
    }
    const tf = body.tf ?? "1d";

    const all = await Promise.all(
      body.items.map(async (it) => {
        const candles = await fetchCandles(it.market, it.symbol, tf, 200);
        return { ...it, candles };
      }),
    );

    const minLen = Math.min(...all.map((a) => a.candles.length));
    if (minLen === 0) {
      return Response.json({ error: "데이터 없음" }, { status: 500 });
    }

    const series = all.map((a) => {
      const tail = a.candles.slice(-minLen);
      const base = tail[0].close;
      return {
        market: a.market,
        symbol: a.symbol,
        points: tail.map((c) => ({
          time: c.time,
          value: ((c.close - base) / base) * 100,
        })),
      };
    });

    return Response.json({ tf, series });
  } catch (e) {
    const message = e instanceof Error ? e.message : "오류";
    return Response.json({ error: message }, { status: 500 });
  }
}
