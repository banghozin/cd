"use client";

import { useEffect, useState } from "react";
import type { Market } from "@/lib/data";

export type WatchItem = {
  market: Market;
  symbol: string;
  label: string;
};

const STORAGE_KEY = "chart.watchlist.v1";

const DEFAULTS: WatchItem[] = [
  { market: "crypto", symbol: "BTCUSDT", label: "BTC/USDT" },
  { market: "crypto", symbol: "ETHUSDT", label: "ETH/USDT" },
  { market: "stock", symbol: "AAPL", label: "AAPL" },
  { market: "stock", symbol: "NVDA", label: "NVDA" },
];

const MARKET_KO: Record<Market, string> = {
  crypto: "코인",
  stock: "주식",
};

function load(): WatchItem[] {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as WatchItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULTS;
    return parsed;
  } catch {
    return DEFAULTS;
  }
}

function save(items: WatchItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

type Props = {
  selected: WatchItem | null;
  onSelect: (item: WatchItem) => void;
};

export default function Watchlist({ selected, onSelect }: Props) {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [market, setMarket] = useState<Market>("crypto");
  const [symbol, setSymbol] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loaded = load();
    setItems(loaded);
    if (!selected && loaded.length > 0) onSelect(loaded[0]);
  }, [selected, onSelect]);

  const add = () => {
    setError(null);
    const sym = symbol.trim().toUpperCase();
    if (!sym) {
      setError("종목 코드를 입력하세요");
      return;
    }
    if (items.some((i) => i.market === market && i.symbol === sym)) {
      setError("이미 목록에 있습니다");
      return;
    }
    const next: WatchItem[] = [
      ...items,
      { market, symbol: sym, label: sym },
    ];
    setItems(next);
    save(next);
    setSymbol("");
  };

  const remove = (it: WatchItem) => {
    const next = items.filter(
      (i) => !(i.market === it.market && i.symbol === it.symbol),
    );
    setItems(next);
    save(next);
    if (selected && selected.market === it.market && selected.symbol === it.symbol) {
      onSelect(next[0] ?? DEFAULTS[0]);
    }
  };

  return (
    <aside className="w-full">
      <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
        관심 종목
      </h2>

      <ul className="space-y-1 mb-4">
        {items.map((it) => {
          const active =
            selected &&
            selected.market === it.market &&
            selected.symbol === it.symbol;
          return (
            <li key={`${it.market}-${it.symbol}`}>
              <div
                className={`flex items-center justify-between rounded border px-3 py-2 text-sm ${
                  active
                    ? "border-zinc-600 bg-zinc-800"
                    : "border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
                }`}
              >
                <button
                  className="flex-1 text-left"
                  onClick={() => onSelect(it)}
                >
                  <div className="font-medium">{it.label}</div>
                  <div className="text-xs text-zinc-500">
                    {MARKET_KO[it.market]}
                  </div>
                </button>
                <button
                  className="text-zinc-500 hover:text-red-400 text-xs px-2"
                  onClick={() => remove(it)}
                  aria-label={`${it.label} 삭제`}
                >
                  ✕
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="rounded border border-zinc-800 bg-zinc-900 p-3 space-y-2">
        <div className="flex gap-1">
          <button
            className={`flex-1 text-xs py-1.5 rounded ${
              market === "crypto"
                ? "bg-zinc-700 text-zinc-100"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
            onClick={() => setMarket("crypto")}
          >
            코인
          </button>
          <button
            className={`flex-1 text-xs py-1.5 rounded ${
              market === "stock"
                ? "bg-zinc-700 text-zinc-100"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
            onClick={() => setMarket("stock")}
          >
            주식
          </button>
        </div>
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder={market === "crypto" ? "BTCUSDT" : "AAPL"}
          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-zinc-600"
        />
        <button
          className="w-full text-xs py-1.5 rounded bg-zinc-700 hover:bg-zinc-600"
          onClick={add}
        >
          추가
        </button>
        {error && <div className="text-xs text-red-400">{error}</div>}
      </div>
    </aside>
  );
}
