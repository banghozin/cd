import { backtestMany } from "@/lib/backtest";
import type { Market } from "@/lib/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type Item = { market: Market; symbol: string };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { items: Item[] };
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return Response.json({ error: "items 필요" }, { status: 400 });
    }
    if (body.items.length > 20) {
      return Response.json({ error: "최대 20개" }, { status: 400 });
    }
    const results = await backtestMany(body.items);
    return Response.json({ results });
  } catch (e) {
    const message = e instanceof Error ? e.message : "오류";
    return Response.json({ error: message }, { status: 500 });
  }
}
