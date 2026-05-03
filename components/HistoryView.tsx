"use client";

import { useEffect, useState } from "react";
import type { Market } from "@/lib/data";
import type { SignalDir } from "@/lib/signals";

type Entry = {
  ts: string;
  bias: SignalDir;
  score: number;
  price: number;
  alerted?: "bias-flip" | "strong-signal";
};

type Props = {
  market: Market;
  symbol: string;
};

const W = 320;
const H = 90;
const PAD_X = 4;
const PAD_Y = 6;

export default function HistoryView({ market, symbol }: Props) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEntries(null);
    setError(null);
    const params = new URLSearchParams({ market, symbol });
    fetch(`/api/history?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { entries?: Entry[]; error?: string }) => {
        if (cancelled) return;
        if (data.error) setError(data.error);
        else setEntries(data.entries ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "오류");
      });
    return () => {
      cancelled = true;
    };
  }, [market, symbol]);

  if (error) {
    return (
      <div className="rounded border border-zinc-800 bg-zinc-900 p-4 text-xs text-red-300">
        {error}
      </div>
    );
  }

  if (entries === null) {
    return (
      <div className="rounded border border-zinc-800 bg-zinc-900 p-4 text-xs text-zinc-500">
        이력 불러오는 중…
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded border border-zinc-800 bg-zinc-900 p-4 text-xs text-zinc-500">
        아직 이력이 없어요. 시간이 지나면 매시간 자동으로 쌓입니다.
      </div>
    );
  }

  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;
  const xOf = (i: number) =>
    entries.length === 1
      ? PAD_X + innerW / 2
      : PAD_X + (i / (entries.length - 1)) * innerW;
  const yOf = (score: number) => PAD_Y + ((1 - score) / 2) * innerH;

  const linePath = entries
    .map((e, i) => `${i === 0 ? "M" : "L"} ${xOf(i).toFixed(2)} ${yOf(e.score).toFixed(2)}`)
    .join(" ");

  const last = entries[entries.length - 1];
  const alertCount = entries.filter((e) => e.alerted).length;
  const buyCount = entries.filter((e) => e.bias === "buy").length;
  const sellCount = entries.filter((e) => e.bias === "sell").length;

  return (
    <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-zinc-500">
          최근 점수 추이
        </span>
        <span className="text-xs text-zinc-500">
          {entries.length}회 · 알림 {alertCount}회
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-[90px]"
        preserveAspectRatio="none"
      >
        <line
          x1={PAD_X}
          y1={yOf(0)}
          x2={W - PAD_X}
          y2={yOf(0)}
          stroke="#3f3f46"
          strokeWidth="1"
          strokeDasharray="2,3"
        />
        <line
          x1={PAD_X}
          y1={yOf(0.3)}
          x2={W - PAD_X}
          y2={yOf(0.3)}
          stroke="#10b98133"
          strokeWidth="1"
          strokeDasharray="2,3"
        />
        <line
          x1={PAD_X}
          y1={yOf(-0.3)}
          x2={W - PAD_X}
          y2={yOf(-0.3)}
          stroke="#ef444433"
          strokeWidth="1"
          strokeDasharray="2,3"
        />
        <path d={linePath} stroke="#a1a1aa" strokeWidth="1.5" fill="none" />
        {entries.map(
          (e, i) =>
            e.alerted && (
              <circle
                key={i}
                cx={xOf(i)}
                cy={yOf(e.score)}
                r="3"
                fill={e.bias === "buy" ? "#10b981" : e.bias === "sell" ? "#ef4444" : "#71717a"}
                stroke="#0a0a0a"
                strokeWidth="1"
              />
            ),
        )}
      </svg>

      <div className="flex items-center justify-between text-xs mt-2 text-zinc-400">
        <span>
          최근:{" "}
          <span
            className={
              last.bias === "buy"
                ? "text-emerald-400"
                : last.bias === "sell"
                  ? "text-red-400"
                  : "text-zinc-300"
            }
          >
            {last.score.toFixed(2)}
          </span>
        </span>
        <span className="text-zinc-500">
          매수 {buyCount} · 매도 {sellCount}
        </span>
      </div>
    </div>
  );
}
