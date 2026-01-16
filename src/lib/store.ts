import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Order, Settings, StoreShape, TableSession } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "pos.json");

function nowIso() {
  return new Date().toISOString();
}

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function defaultSettings(): Settings {
  return {
    shopName: "Crown Billiard",
    shopAddress: "",
    shopPhone: "",
    currency: "VND",
    tableCount: 10,
    hourlyRate: 50000,
    taxRatePct: 0,
    roundingMinutes: 15, // more profitable than per-minute
  };
}

function defaultStore(): StoreShape {
  return {
    version: 1,
    settings: defaultSettings(),
    sessions: [],
    orders: [],
  };
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readStore(): Promise<StoreShape> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as StoreShape;
    if (!parsed || parsed.version !== 1) return defaultStore();
    const merged = {
      ...defaultStore(),
      ...parsed,
      settings: { ...defaultSettings(), ...(parsed.settings ?? {}) },
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    };

    // Simple migration for older brand name (handle typos too).
    const currentName = String(merged.settings.shopName ?? "").trim();
    if (/^minipos\b/i.test(currentName) || currentName === "") {
      merged.settings.shopName = defaultSettings().shopName;
      // Persist migration so UI/receipt consistently updates.
      try {
        await writeStore(merged);
      } catch {
        // ignore
      }
    }

    return merged;
  } catch {
    return defaultStore();
  }
}

export async function writeStore(next: StoreShape) {
  await ensureDataDir();
  await fs.writeFile(STORE_FILE, JSON.stringify(next, null, 2), "utf8");
}

export async function updateStore<T>(fn: (store: StoreShape) => T | Promise<T>) {
  const store = await readStore();
  const result = await fn(store);
  await writeStore(store);
  return result;
}

export function getActiveSessionForTable(store: StoreShape, tableNo: number): TableSession | null {
  const s = store.sessions.find((x) => x.tableNo === tableNo && x.closedAt === null);
  return s ?? null;
}

export function isSessionPlaying(session: TableSession): boolean {
  const last = session.segments[session.segments.length - 1];
  return Boolean(last && last.endAt === null);
}

export function startSession(store: StoreShape, tableNo: number): TableSession {
  const existing = getActiveSessionForTable(store, tableNo);
  if (existing) return existing;

  const session: TableSession = {
    id: newId("sess"),
    tableNo,
    createdAt: nowIso(),
    segments: [{ startAt: nowIso(), endAt: null }],
    extras: [],
    closedAt: null,
  };
  store.sessions.unshift(session);
  return session;
}

export function stopSession(store: StoreShape, tableNo: number): TableSession {
  const session = getActiveSessionForTable(store, tableNo);
  if (!session) throw new Error("Session not found");
  const last = session.segments[session.segments.length - 1];
  if (last && last.endAt === null) last.endAt = nowIso();
  return session;
}

export function resumeSession(store: StoreShape, tableNo: number): TableSession {
  const session = getActiveSessionForTable(store, tableNo);
  if (!session) throw new Error("Session not found");
  if (isSessionPlaying(session)) return session;
  session.segments.push({ startAt: nowIso(), endAt: null });
  return session;
}

export function addExtra(store: StoreShape, sessionId: string, extra: { name: string; price: number; qty: number }) {
  const session = store.sessions.find((s) => s.id === sessionId);
  if (!session) throw new Error("Session not found");
  if (session.closedAt) throw new Error("Session is closed");
  const cleanName = String(extra.name ?? "").trim();
  if (!cleanName) throw new Error("Invalid extra name");
  const price = Math.max(0, Math.round(Number(extra.price) || 0));
  const qty = Math.max(1, Math.round(Number(extra.qty) || 1));
  session.extras.push({ id: newId("ex"), name: cleanName, price, qty });
  return session;
}

export function removeExtra(store: StoreShape, sessionId: string, extraId: string) {
  const session = store.sessions.find((s) => s.id === sessionId);
  if (!session) throw new Error("Session not found");
  if (session.closedAt) throw new Error("Session is closed");
  session.extras = session.extras.filter((e) => e.id !== extraId);
  return session;
}

export function closeSessionAndCreateOrder(store: StoreShape, input: {
  sessionId: string;
  payment: Order["payment"];
  totals: { playedMinutes: number; billableMinutes: number; timeCharge: number; extrasTotal: number; subtotal: number; tax: number; total: number };
}): Order {
  const session = store.sessions.find((s) => s.id === input.sessionId);
  if (!session) throw new Error("Session not found");
  if (session.closedAt) throw new Error("Session already closed");

  // Ensure not currently running segment
  const last = session.segments[session.segments.length - 1];
  if (last && last.endAt === null) last.endAt = nowIso();

  const order: Order = {
    id: newId("ord"),
    tableNo: session.tableNo,
    sessionId: session.id,
    createdAt: nowIso(),
    playedMinutes: input.totals.playedMinutes,
    billableMinutes: input.totals.billableMinutes,
    hourlyRate: store.settings.hourlyRate,
    roundingMinutes: store.settings.roundingMinutes,
    taxRatePct: store.settings.taxRatePct,
    lines: [
      {
        kind: "time",
        name: `Tiền giờ (${input.totals.billableMinutes} phút)`,
        qty: 1,
        unitPrice: input.totals.timeCharge,
        amount: input.totals.timeCharge,
      },
      ...session.extras.map((x) => ({
        kind: "extra" as const,
        name: x.name,
        qty: x.qty,
        unitPrice: x.price,
        amount: x.price * x.qty,
      })),
      ...(input.totals.tax > 0
        ? [
            {
              kind: "tax" as const,
              name: `Thuế (${store.settings.taxRatePct}%)`,
              qty: 1,
              unitPrice: input.totals.tax,
              amount: input.totals.tax,
            },
          ]
        : []),
    ],
    subtotal: input.totals.subtotal,
    tax: input.totals.tax,
    total: input.totals.total,
    payment: input.payment,
  };

  store.orders.unshift(order);
  session.closedAt = nowIso();
  return order;
}

