import { NextResponse } from "next/server";
import { readStore, updateStore } from "@/lib/store";
import { clampNumber } from "@/lib/money";

export async function GET() {
  const store = await readStore();
  return NextResponse.json(store.settings);
}

export async function PUT(req: Request) {
  const patch = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const settings = await updateStore((store) => {
    const next = { ...store.settings };
    if (typeof patch.shopName === "string") next.shopName = patch.shopName.trim();
    if (typeof patch.shopAddress === "string") next.shopAddress = patch.shopAddress.trim();
    if (typeof patch.shopPhone === "string") next.shopPhone = patch.shopPhone.trim();
    if (typeof patch.tableCount === "number") next.tableCount = clampNumber(Math.round(patch.tableCount), 1, 60);
    if (typeof patch.hourlyRate === "number") next.hourlyRate = Math.max(0, Math.round(patch.hourlyRate));
    if (typeof patch.taxRatePct === "number") next.taxRatePct = clampNumber(patch.taxRatePct, 0, 100);
    if (typeof patch.roundingMinutes === "number") {
      const rm = Math.round(patch.roundingMinutes);
      if ([1, 5, 10, 15, 30, 60].includes(rm)) next.roundingMinutes = rm as 1 | 5 | 10 | 15 | 30 | 60;
    }
    store.settings = next;
    return store.settings;
  });

  return NextResponse.json(settings);
}

