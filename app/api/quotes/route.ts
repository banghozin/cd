import { fetchQuotes } from "@/lib/quote";
import type { Market } from "@/lib/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RequestItem = { market: Market; symbol: string };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { items: RequestItem[] };
    if (!Array.isArray(body.items)) {
      return Response.json({ error: "items 배열이 필요합니다" }, { status: 400 });
    }
    const quotes = await fetchQuotes(body.items);
    return Response.json({ quotes });
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return Response.json({ error: message }, { status: 500 });
  }
}
