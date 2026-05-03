import { EMA, RSI, MACD, BollingerBands } from "technicalindicators";
import type { Candle } from "../data/binance";
import { detectSwings } from "../patterns/zigzag";
import { fibState } from "../patterns/fibonacci";

export type LinePoint = { time: number; value: number };
export type HistPoint = { time: number; value: number; color: string };
export type CandlePoint = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type FibLine = { ratio: number; price: number; label: string };
export type SwingMarker = { time: number; price: number; type: "high" | "low" };

export type ChartSeries = {
  candles: CandlePoint[];
  volume: HistPoint[];
  ema20: LinePoint[];
  ema50: LinePoint[];
  bbUpper: LinePoint[];
  bbLower: LinePoint[];
  bbMiddle: LinePoint[];
  rsi: LinePoint[];
  macd: LinePoint[];
  macdSignal: LinePoint[];
  macdHist: HistPoint[];
  fibLines: FibLine[];
  swings: SwingMarker[];
};

function alignTail<T>(times: number[], values: T[]): { time: number; value: T }[] {
  const offset = times.length - values.length;
  return values.map((v, i) => ({ time: times[offset + i], value: v }));
}

export function chartSeries(candles: Candle[]): ChartSeries {
  const times = candles.map((c) => c.time);
  const closes = candles.map((c) => c.close);

  const ema20raw = EMA.calculate({ values: closes, period: 20 });
  const ema50raw = EMA.calculate({ values: closes, period: 50 });
  const bbRaw = BollingerBands.calculate({ values: closes, period: 20, stdDev: 2 });
  const rsiRaw = RSI.calculate({ values: closes, period: 14 });
  const macdRaw = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  const candleSeries: CandlePoint[] = candles.map((c) => ({
    time: c.time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));

  const volume: HistPoint[] = candles.map((c) => ({
    time: c.time,
    value: c.volume,
    color: c.close >= c.open ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)",
  }));

  const ema20 = alignTail(times, ema20raw).map((p) => ({ time: p.time, value: p.value }));
  const ema50 = alignTail(times, ema50raw).map((p) => ({ time: p.time, value: p.value }));

  const bbUpper: LinePoint[] = [];
  const bbMiddle: LinePoint[] = [];
  const bbLower: LinePoint[] = [];
  const bbAligned = alignTail(times, bbRaw);
  for (const { time, value } of bbAligned) {
    bbUpper.push({ time, value: value.upper });
    bbMiddle.push({ time, value: value.middle });
    bbLower.push({ time, value: value.lower });
  }

  const rsi = alignTail(times, rsiRaw).map((p) => ({ time: p.time, value: p.value }));

  const macdValid = macdRaw.filter(
    (p) => p.MACD != null && p.signal != null && p.histogram != null,
  );
  const macdAligned = alignTail(times, macdValid);
  const macd: LinePoint[] = [];
  const macdSignal: LinePoint[] = [];
  const macdHist: HistPoint[] = [];
  for (const { time, value } of macdAligned) {
    macd.push({ time, value: value.MACD as number });
    macdSignal.push({ time, value: value.signal as number });
    const h = value.histogram as number;
    macdHist.push({
      time,
      value: h,
      color: h >= 0 ? "rgba(16,185,129,0.6)" : "rgba(239,68,68,0.6)",
    });
  }

  const swings = detectSwings(candles, 0.03).slice(-12);
  const swingMarkers: SwingMarker[] = swings.map((s) => ({
    time: s.time,
    price: s.price,
    type: s.type,
  }));

  const lastPrice = closes[closes.length - 1];
  const fib = fibState(swings, lastPrice);
  const fibLines: FibLine[] = fib
    ? [...fib.retracements, ...fib.extensions]
        .filter((l) => l.ratio > 0 && l.ratio < 2)
        .map((l) => ({
          ratio: l.ratio,
          price: l.price,
          label: `${(l.ratio * 100).toFixed(1)}%`,
        }))
    : [];

  return {
    candles: candleSeries,
    volume,
    ema20,
    ema50,
    bbUpper,
    bbLower,
    bbMiddle,
    rsi,
    macd,
    macdSignal,
    macdHist,
    fibLines,
    swings: swingMarkers,
  };
}
