import { NextResponse } from "next/server";
import { calcSessionTotals } from "@/lib/money";
import { closeSessionAndCreateOrder, readStore, updateStore } from "@/lib/store";
import type { PaymentMethod } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    sessionId?: string;
    method?: PaymentMethod;
    cashGiven?: number;
  };
  const sessionId = String(body.sessionId ?? "");
  const method = body.method ?? "cash";
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  if (!["cash", "card", "qr"].includes(method)) return NextResponse.json({ error: "Invalid method" }, { status: 400 });

  try {
    const order = await updateStore(async (store) => {
      const session = store.sessions.find((s) => s.id === sessionId);
      if (!session) throw new Error("Session not found");
      if (session.closedAt) throw new Error("Session already closed");

      const totals = calcSessionTotals(session, store.settings, new Date());
      const payment: { method: PaymentMethod; cashGiven?: number; change?: number } = { method };
      if (method === "cash") {
        const cashGiven = Math.max(0, Math.round(Number(body.cashGiven) || 0));
        payment.cashGiven = cashGiven;
        payment.change = Math.max(0, cashGiven - totals.total);
      }

      return closeSessionAndCreateOrder(store, { sessionId, payment, totals });
    });

    // Return with settings for receipt
    const store = await readStore();
    return NextResponse.json({ order, settings: store.settings });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 400 });
  }
}

