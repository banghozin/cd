import fs from "node:fs/promises";
import path from "node:path";
import type { Market } from "@/lib/data";
import type { SignalDir } from "@/lib/signals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type HistoryEntry = {
  ts: string;
  market: Market;
  symbol: string;
  bias: SignalDir;
  score: number;
  price: number;
  alerted?: "bias-flip" | "strong-signal";
};

const HISTORY_PATH = path.join(process.cwd(), "data", "history.jsonl");

export async function GET(request: Request) {
  const url = new URL(request.url);
  const market = url.searchParams.get("market") as Market | null;
  const symbol = url.searchParams.get("symbol");

  if (!market || !symbol) {
    return Response.json({ error: "market, symbol 필요" }, { status: 400 });
  }

  let raw = "";
  try {
    raw = await fs.readFile(HISTORY_PATH, "utf8");
  } catch {
    return Response.json({ entries: [] });
  }

  const entries: HistoryEntry[] = [];
  for (const line of raw.split("\n")) {
    if (!line) continue;
    try {
      const e = JSON.parse(line) as HistoryEntry;
      if (e.market === market && e.symbol === symbol) {
        entries.push(e);
      }
    } catch {}
  }

  return Response.json({ entries: entries.slice(-200) });
}
