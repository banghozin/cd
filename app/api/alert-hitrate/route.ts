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

type SymbolStats = {
  market: Market;
  symbol: string;
  alertCount: number;
  windows: { window: number; hits: number; total: number; rate: number | null }[];
};

const HISTORY_PATH = path.join(process.cwd(), "data", "history.jsonl");
const WINDOWS_DAYS = [1, 7, 30];

async function loadHistory(): Promise<HistoryEntry[]> {
  let raw = "";
  try {
    raw = await fs.readFile(HISTORY_PATH, "utf8");
  } catch {
    return [];
  }
  const entries: HistoryEntry[] = [];
  for (const line of raw.split("\n")) {
    if (!line) continue;
    try {
      entries.push(JSON.parse(line) as HistoryEntry);
    } catch {}
  }
  return entries;
}

function findFuturePrice(
  entries: HistoryEntry[],
  startIdx: number,
  market: Market,
  symbol: string,
  windowDays: number,
): number | null {
  const startTs = new Date(entries[startIdx].ts).getTime();
  const targetTs = startTs + windowDays * 24 * 60 * 60 * 1000;
  for (let i = startIdx + 1; i < entries.length; i++) {
    const e = entries[i];
    if (e.market !== market || e.symbol !== symbol) continue;
    const t = new Date(e.ts).getTime();
    if (t >= targetTs) return e.price;
  }
  return null;
}

export async function GET() {
  const entries = await loadHistory();
  const bySymbol = new Map<
    string,
    { market: Market; symbol: string; indices: number[] }
  >();

  entries.forEach((e, i) => {
    const key = `${e.market}:${e.symbol}`;
    if (!bySymbol.has(key)) {
      bySymbol.set(key, { market: e.market, symbol: e.symbol, indices: [] });
    }
    bySymbol.get(key)!.indices.push(i);
  });

  const symbols: SymbolStats[] = [];

  for (const { market, symbol, indices } of bySymbol.values()) {
    const alertIdxs = indices.filter((i) => entries[i].alerted);
    const windowStats: SymbolStats["windows"] = WINDOWS_DAYS.map((w) => ({
      window: w,
      hits: 0,
      total: 0,
      rate: null,
    }));

    for (const idx of alertIdxs) {
      const e = entries[idx];
      if (e.bias === "neutral") continue;
      for (const wsRef of windowStats) {
        const future = findFuturePrice(entries, idx, market, symbol, wsRef.window);
        if (future == null) continue;
        wsRef.total++;
        const wentUp = future > e.price;
        const wentDown = future < e.price;
        const hit =
          (e.bias === "buy" && wentUp) || (e.bias === "sell" && wentDown);
        if (hit) wsRef.hits++;
      }
    }

    for (const w of windowStats) {
      w.rate = w.total > 0 ? w.hits / w.total : null;
    }

    symbols.push({
      market,
      symbol,
      alertCount: alertIdxs.length,
      windows: windowStats,
    });
  }

  return Response.json({
    totalEntries: entries.length,
    symbolCount: symbols.length,
    symbols,
  });
}
