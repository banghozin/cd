import type { SwingPoint } from "./zigzag";

export type TriangleShape =
  | "ascending"
  | "descending"
  | "symmetrical"
  | "expanding"
  | "none";

export type TriangleState = {
  shape: TriangleShape;
  upperSlope: number;
  lowerSlope: number;
  apexBars: number | null;
  description: string;
};

function linearFit(points: { x: number; y: number }[]): {
  slope: number;
  intercept: number;
} {
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export function detectTriangle(
  swings: SwingPoint[],
  refPrice: number,
): TriangleState {
  const highs = swings.filter((s) => s.type === "high").slice(-4);
  const lows = swings.filter((s) => s.type === "low").slice(-4);

  if (highs.length < 2 || lows.length < 2) {
    return {
      shape: "none",
      upperSlope: 0,
      lowerSlope: 0,
      apexBars: null,
      description: "insufficient swings",
    };
  }

  const upper = linearFit(highs.map((s) => ({ x: s.index, y: s.price })));
  const lower = linearFit(lows.map((s) => ({ x: s.index, y: s.price })));

  const upperSlopeRel = upper.slope / refPrice;
  const lowerSlopeRel = lower.slope / refPrice;
  const FLAT = 0.0005;

  let shape: TriangleShape = "none";
  if (Math.abs(upperSlopeRel) < FLAT && lowerSlopeRel > FLAT) shape = "ascending";
  else if (upperSlopeRel < -FLAT && Math.abs(lowerSlopeRel) < FLAT) shape = "descending";
  else if (upperSlopeRel < -FLAT && lowerSlopeRel > FLAT) shape = "symmetrical";
  else if (upperSlopeRel > FLAT && lowerSlopeRel < -FLAT) shape = "expanding";

  let apexBars: number | null = null;
  if (shape !== "none" && shape !== "expanding") {
    const denom = upper.slope - lower.slope;
    if (denom !== 0) {
      const apexX = (lower.intercept - upper.intercept) / denom;
      const lastIdx = Math.max(
        highs[highs.length - 1].index,
        lows[lows.length - 1].index,
      );
      apexBars = Math.round(apexX - lastIdx);
    }
  }

  const descriptions: Record<TriangleShape, string> = {
    ascending: "ascending triangle (bullish bias)",
    descending: "descending triangle (bearish bias)",
    symmetrical: "symmetrical triangle (breakout pending)",
    expanding: "expanding (broadening) — volatile, no clear bias",
    none: "no triangle pattern",
  };

  return {
    shape,
    upperSlope: upper.slope,
    lowerSlope: lower.slope,
    apexBars,
    description: descriptions[shape],
  };
}
