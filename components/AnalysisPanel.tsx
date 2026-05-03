"use client";

import type { Analysis } from "@/lib/analyze";
import type { Timeframe } from "@/lib/data";
import { biasKo, type SignalDir } from "@/lib/signals";

const TIMEFRAMES: Timeframe[] = ["1h", "4h", "1d"];

function biasTone(b: SignalDir): string {
  if (b === "buy") return "text-emerald-400";
  if (b === "sell") return "text-red-400";
  return "text-zinc-400";
}

function biasBg(b: SignalDir): string {
  if (b === "buy") return "bg-emerald-500/10 border-emerald-500/30";
  if (b === "sell") return "bg-red-500/10 border-red-500/30";
  return "bg-zinc-800/40 border-zinc-700";
}

function dirLabel(d: SignalDir): string {
  if (d === "buy") return "▲ 매수";
  if (d === "sell") return "▼ 매도";
  return "· 중립";
}

export default function AnalysisPanel({ analysis }: { analysis: Analysis }) {
  return (
    <div className="space-y-4">
      <div
        className={`rounded border p-4 ${biasBg(analysis.combined.bias)}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-zinc-400">
            다중 시간프레임 종합
          </span>
          <span className={`text-base font-semibold ${biasTone(analysis.combined.bias)}`}>
            {biasKo(analysis.combined.bias)} ({analysis.combined.weightedScore.toFixed(2)})
          </span>
        </div>
        <div className="text-xs text-zinc-400 mt-1">
          {analysis.combined.note}
        </div>
      </div>

      {TIMEFRAMES.map((tf) => {
        const a = analysis.timeframes[tf];
        return (
          <div
            key={tf}
            className="rounded border border-zinc-800 bg-zinc-900 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider text-zinc-500">
                {tf}
              </span>
              <span
                className={`text-xs font-semibold ${biasTone(a.signals.bias)}`}
              >
                {biasKo(a.signals.bias)} · ▲{a.signals.buy} ▼{a.signals.sell} ·{a.signals.neutral}
              </span>
            </div>
            <ul className="space-y-1">
              {a.signals.signals.map((s, i) => (
                <li
                  key={i}
                  className="flex items-baseline justify-between text-xs"
                >
                  <span className="flex items-baseline gap-2">
                    <span className={`inline-block w-12 ${biasTone(s.direction)}`}>
                      {dirLabel(s.direction)}
                    </span>
                    <span className="text-zinc-400">{s.source}</span>
                  </span>
                  <span className="text-zinc-500 text-right">{s.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
