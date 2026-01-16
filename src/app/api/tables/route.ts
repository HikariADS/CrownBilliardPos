import { NextResponse } from "next/server";
import { readStore, getActiveSessionForTable, isSessionPlaying } from "@/lib/store";
import { calcSessionTotals } from "@/lib/money";

export async function GET() {
  const store = await readStore();
  const now = new Date();

  const tables = Array.from({ length: store.settings.tableCount }, (_, idx) => {
    const tableNo = idx + 1;
    const session = getActiveSessionForTable(store, tableNo);
    if (!session) {
      return { tableNo, status: "idle" as const, session: null, totals: null };
    }
    const totals = calcSessionTotals(session, store.settings, now);
    return {
      tableNo,
      status: isSessionPlaying(session) ? ("playing" as const) : ("stopped" as const),
      session,
      totals,
    };
  });

  return NextResponse.json({ settings: store.settings, tables });
}

