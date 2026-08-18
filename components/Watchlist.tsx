"use client";

import { useEffect, useState } from "react";
import type { Market } from "@/lib/data";

export type WatchItem = {
  market: Market;
  symbol: string;
  label: string;
};

type Quote = {
  market: Market;
  symbol: string;
  price: number;
  change24h: number | null;
};

const STORAGE_KEY = "chart.watchlist.v1";
const QUOTES_CACHE_KEY = "chart.quotes.cache.v1";
const QUOTES_TTL_MS = 30 * 60 * 1000;

type QuotesCache = { at: number; map: Record<string, Quote> };

function loadQuotesCache(items: WatchItem[]): Record<string, Quote> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(QUOTES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuotesCache;
    if (Date.now() - parsed.at > QUOTES_TTL_MS) return null;
    for (const it of items) {
      if (!parsed.map[`${it.market}:${it.symbol}`]) return null;
    }
    return parsed.map;
  } catch {
    return null;
  }
}

function saveQuotesCache(map: Record<string, Quote>) {
  try {
    localStorage.setItem(
      QUOTES_CACHE_KEY,
      JSON.stringify({ at: Date.now(), map }),
    );
  } catch {}
}

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
  onItemsChange?: (items: WatchItem[]) => void;
};

export default function Watchlist({ selected, onSelect, onItemsChange }: Props) {
  const [items, setItems] = useState<WatchItem[]>([]);

  useEffect(() => {
    onItemsChange?.(items);
  }, [items, onItemsChange]);
  const [market, setMarket] = useState<Market>("crypto");
  const [symbol, setSymbol] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});

  useEffect(() => {
    if (items.length === 0) return;
    const cached = loadQuotesCache(items);
    if (cached) {
      setQuotes(cached);
      return;
    }
    let cancelled = false;
    fetch("/api/quotes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({ market: i.market, symbol: i.symbol })),
      }),
    })
      .then((r) => r.json())
      .then((data: { quotes?: (Quote & { error?: string })[] }) => {
        if (cancelled || !data.quotes) return;
        const map: Record<string, Quote> = {};
        for (const q of data.quotes) {
          if (!q.error) map[`${q.market}:${q.symbol}`] = q;
        }
        setQuotes(map);
        saveQuotesCache(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [items]);

  const visibleItems = search.trim()
    ? items.filter((i) => {
        const q = search.trim().toUpperCase();
        return i.symbol.toUpperCase().includes(q) || i.label.toUpperCase().includes(q);
      })
    : items;

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

      {items.length > 4 && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="검색…"
          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs mb-2 focus:outline-none focus:border-zinc-600"
        />
      )}

      <ul className="space-y-1 mb-4">
        {visibleItems.length === 0 && search.trim() && (
          <li className="text-xs text-zinc-500 px-2 py-1">검색 결과 없음</li>
        )}
        {visibleItems.map((it) => {
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
                  className="flex-1 text-left min-w-0"
                  onClick={() => onSelect(it)}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium truncate">{it.label}</span>
                    {(() => {
                      const q = quotes[`${it.market}:${it.symbol}`];
                      if (!q || q.change24h == null) return null;
                      const tone =
                        q.change24h > 0
                          ? "text-emerald-400"
                          : q.change24h < 0
                            ? "text-red-400"
                            : "text-zinc-400";
                      return (
                        <span className={`text-xs tabular-nums shrink-0 ${tone}`}>
                          {q.change24h > 0 ? "+" : ""}
                          {q.change24h.toFixed(2)}%
                        </span>
                      );
                    })()}
                  </div>
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
