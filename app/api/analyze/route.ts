import { analyzeSymbol } from "@/lib/analyze";
import type { Market } from "@/lib/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const market = (url.searchParams.get("market") ?? "crypto") as Market;
  const symbol = url.searchParams.get("symbol") ?? "BTCUSDT";

  try {
    const analysis = await analyzeSymbol(market, symbol);
    return Response.json(analysis);
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return Response.json({ error: message, market, symbol }, { status: 500 });
  }
}
