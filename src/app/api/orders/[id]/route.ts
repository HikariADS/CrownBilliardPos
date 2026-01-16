import { NextResponse } from "next/server";
import { readStore } from "@/lib/store";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const store = await readStore();
  const order = store.orders.find((o) => o.id === id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ order, settings: store.settings });
}

