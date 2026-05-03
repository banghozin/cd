import type { SwingPoint } from "./zigzag";

const LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] as const;
const EXT_LEVELS = [1.272, 1.618, 2.618] as const;

export type FibLevel = {
  ratio: number;
  price: number;
};

export type FibState = {
  swingHigh: number;
  swingLow: number;
  direction: "up" | "down";
  retracements: FibLevel[];
  extensions: FibLevel[];
  nearest: { ratio: number; price: number; distancePct: number } | null;
  zone: "support" | "resistance" | "neutral";
};

export function fibState(swings: SwingPoint[], price: number): FibState | null {
  if (swings.length < 2) return null;

  const last = swings[swings.length - 1];
  const prev = swings[swings.length - 2];
  if (last.type === prev.type) return null;

  const high = Math.max(last.price, prev.price);
  const low = Math.min(last.price, prev.price);
  const range = high - low;
  if (range <= 0) return null;

  const direction: "up" | "down" = last.type === "high" ? "up" : "down";

  const retracements: FibLevel[] = LEVELS.map((r) => ({
    ratio: r,
    price: direction === "up" ? high - range * r : low + range * r,
  }));

  const extensions: FibLevel[] = EXT_LEVELS.map((r) => ({
    ratio: r,
    price: direction === "up" ? high + range * (r - 1) : low - range * (r - 1),
  }));

  const all = [...retracements, ...extensions];
  let nearest: FibState["nearest"] = null;
  for (const lvl of all) {
    const dist = Math.abs(price - lvl.price) / price;
    if (!nearest || dist < nearest.distancePct) {
      nearest = { ratio: lvl.ratio, price: lvl.price, distancePct: dist };
    }
  }

  let zone: FibState["zone"] = "neutral";
  if (nearest && nearest.distancePct < 0.01) {
    if (direction === "up") {
      zone = nearest.ratio > 0 && nearest.ratio < 1 ? "support" : "neutral";
    } else {
      zone = nearest.ratio > 0 && nearest.ratio < 1 ? "resistance" : "neutral";
    }
  }

  return {
    swingHigh: high,
    swingLow: low,
    direction,
    retracements,
    extensions,
    nearest,
    zone,
  };
}
