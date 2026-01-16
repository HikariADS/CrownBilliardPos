import type { ExtraItem, MoneyVnd, Settings, TableSession } from "./types";

export function formatVnd(amount: MoneyVnd): string {
  const n = Number.isFinite(amount) ? Math.round(amount) : 0;
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
}

export function clampNumber(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function roundUpToStep(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.ceil(value / step) * step;
}

export function calcPlayedMinutes(session: TableSession, now = new Date()): number {
  let totalMs = 0;
  for (const seg of session.segments) {
    const start = new Date(seg.startAt).getTime();
    const end = seg.endAt ? new Date(seg.endAt).getTime() : now.getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      totalMs += end - start;
    }
  }
  return Math.floor(totalMs / 60000);
}

export function calcBillableMinutes(playedMinutes: number, roundingMinutes: number): number {
  if (playedMinutes <= 0) return 0;
  return roundUpToStep(playedMinutes, roundingMinutes);
}

export function calcTimeChargeVnd(billableMinutes: number, hourlyRate: MoneyVnd): MoneyVnd {
  // VND is integer; we round to nearest VND.
  const perMinute = hourlyRate / 60;
  return Math.round(billableMinutes * perMinute);
}

export function calcExtrasTotal(extras: ExtraItem[]): MoneyVnd {
  return extras.reduce((sum, it) => sum + Math.round(it.price) * Math.round(it.qty), 0);
}

export function calcTax(subtotal: MoneyVnd, taxRatePct: number): MoneyVnd {
  const r = clampNumber(taxRatePct, 0, 100);
  return Math.round((subtotal * r) / 100);
}

export function calcSessionTotals(session: TableSession, settings: Settings, now = new Date()) {
  const playedMinutes = calcPlayedMinutes(session, now);
  const billableMinutes = calcBillableMinutes(playedMinutes, settings.roundingMinutes);
  const timeCharge = calcTimeChargeVnd(billableMinutes, settings.hourlyRate);
  const extrasTotal = calcExtrasTotal(session.extras);
  const subtotal = timeCharge + extrasTotal;
  const tax = calcTax(subtotal, settings.taxRatePct);
  const total = subtotal + tax;

  return {
    playedMinutes,
    billableMinutes,
    timeCharge,
    extrasTotal,
    subtotal,
    tax,
    total,
  };
}

