import fs from "node:fs/promises";
import path from "node:path";
import { analyzeSymbol, type Analysis } from "../lib/analyze";
import type { Market } from "../lib/data";
import { biasKo, type SignalDir } from "../lib/signals";

type WatchItem = { market: Market; symbol: string };

type StoredState = Record<
  string,
  { bias: SignalDir; score: number; ts: string }
>;

type Alert = {
  analysis: Analysis;
  reason: "bias-flip" | "strong-signal";
  prevBias?: SignalDir;
};

const WATCHLIST_PATH = "data/watchlist.json";
const STATE_PATH = "data/state.json";
const HISTORY_PATH = "data/history.jsonl";
const BOT_NAME = "우크당거스 알림 봇";
const HISTORY_MAX_LINES = 5000;

const STRONG_SCORE = 0.5;

async function loadJSON<T>(p: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(p, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function saveJSON(p: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(data, null, 2) + "\n", "utf8");
}

type HistoryEntry = {
  ts: string;
  market: Market;
  symbol: string;
  bias: SignalDir;
  score: number;
  price: number;
  alerted?: "bias-flip" | "strong-signal";
};

async function appendHistory(entries: HistoryEntry[]): Promise<void> {
  if (entries.length === 0) return;
  await fs.mkdir(path.dirname(HISTORY_PATH), { recursive: true });
  const newLines = entries.map((e) => JSON.stringify(e)).join("\n") + "\n";

  let existing = "";
  try {
    existing = await fs.readFile(HISTORY_PATH, "utf8");
  } catch {}

  const all = existing + newLines;
  const lines = all.split("\n").filter((l) => l.length > 0);
  const trimmed =
    lines.length > HISTORY_MAX_LINES ? lines.slice(-HISTORY_MAX_LINES) : lines;
  await fs.writeFile(HISTORY_PATH, trimmed.join("\n") + "\n", "utf8");
}

function biasEmoji(b: SignalDir): string {
  if (b === "buy") return "🟢";
  if (b === "sell") return "🔴";
  return "⚪";
}

function biasColor(b: SignalDir): number {
  if (b === "buy") return 0x10b981;
  if (b === "sell") return 0xef4444;
  return 0x71717a;
}

function reasonLabel(r: Alert["reason"]): string {
  return r === "bias-flip" ? "방향 전환" : "강한 신호";
}

function marketKo(m: Market): string {
  return m === "crypto" ? "코인" : "주식";
}

function buildEmbed(alert: Alert) {
  const a = alert.analysis;
  const tfLines = (["1h", "4h", "1d"] as const).map((tf) => {
    const s = a.timeframes[tf].signals;
    return `**${tf.toUpperCase()}** ${biasEmoji(s.bias)} ${biasKo(s.bias)} (매수 ${s.buy} / 매도 ${s.sell} / 중립 ${s.neutral})`;
  });

  const top1d = a.timeframes["1d"].signals.signals
    .filter((s) => s.direction !== "neutral")
    .slice(0, 5)
    .map((s) => `• ${biasEmoji(s.direction)} ${s.source}: ${s.detail}`)
    .join("\n");

  const flipNote =
    alert.reason === "bias-flip" && alert.prevBias
      ? ` (이전: ${biasKo(alert.prevBias)})`
      : "";

  return {
    title: `${biasEmoji(a.combined.bias)} ${a.symbol} → ${biasKo(a.combined.bias)}${flipNote}`,
    description: a.combined.note,
    color: biasColor(a.combined.bias),
    fields: [
      {
        name: `${reasonLabel(alert.reason)} · 종합 점수 ${a.combined.weightedScore.toFixed(2)}`,
        value: tfLines.join("\n"),
      },
      ...(top1d
        ? [
            {
              name: "1D 주요 신호",
              value: top1d,
            },
          ]
        : []),
    ],
    footer: {
      text: `${marketKo(a.market)} · 가격 $${a.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    },
    timestamp: a.timestamp,
  };
}

async function postDiscord(webhook: string, alerts: Alert[]): Promise<void> {
  const embeds = alerts.slice(0, 10).map(buildEmbed);
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: BOT_NAME,
      embeds,
    }),
  });
  if (!res.ok) {
    throw new Error(`디스코드 웹훅 실패: ${res.status} ${await res.text()}`);
  }
}

async function main(): Promise<void> {
  const webhook = process.env.DISCORD_WEBHOOK;
  if (!webhook) {
    console.error("DISCORD_WEBHOOK 환경변수 미설정");
    process.exit(1);
  }

  const watchlist = await loadJSON<WatchItem[]>(WATCHLIST_PATH, [
    { market: "crypto", symbol: "BTCUSDT" },
    { market: "crypto", symbol: "ETHUSDT" },
    { market: "stock", symbol: "AAPL" },
    { market: "stock", symbol: "NVDA" },
  ]);
  const prevState = await loadJSON<StoredState>(STATE_PATH, {});
  const nextState: StoredState = {};
  const alerts: Alert[] = [];
  const historyEntries: HistoryEntry[] = [];

  for (const { market, symbol } of watchlist) {
    const key = `${market}:${symbol}`;
    try {
      const analysis = await analyzeSymbol(market, symbol);
      const cur = analysis.combined.bias;
      const score = analysis.combined.weightedScore;
      nextState[key] = { bias: cur, score, ts: analysis.timestamp };

      const prev = prevState[key]?.bias;
      const flipped =
        prev != null && prev !== cur && cur !== "neutral" && prev !== "neutral";
      const strong = Math.abs(score) >= STRONG_SCORE && cur !== "neutral";

      let alertReason: HistoryEntry["alerted"];
      if (flipped) {
        alerts.push({ analysis, reason: "bias-flip", prevBias: prev });
        alertReason = "bias-flip";
      } else if (strong && (!prev || prev === "neutral")) {
        alerts.push({ analysis, reason: "strong-signal" });
        alertReason = "strong-signal";
      }

      historyEntries.push({
        ts: analysis.timestamp,
        market,
        symbol,
        bias: cur,
        score,
        price: analysis.price,
        ...(alertReason ? { alerted: alertReason } : {}),
      });

      console.log(
        `${key}: ${cur} (${score.toFixed(2)})${flipped ? " [전환]" : strong ? " [강함]" : ""}`,
      );
    } catch (e) {
      console.error(`${key} 실패:`, e instanceof Error ? e.message : e);
    }
  }

  if (alerts.length > 0) {
    console.log(`디스코드로 ${alerts.length}건 발송`);
    await postDiscord(webhook, alerts);
  } else {
    console.log("발송할 알림 없음");
  }

  await saveJSON(STATE_PATH, nextState);
  await appendHistory(historyEntries);
}

main().catch((e) => {
  console.error("치명적 오류:", e);
  process.exit(1);
});
