import { NextResponse } from "next/server";
import { updateStore, startSession } from "@/lib/store";

export async function POST(_: Request, ctx: { params: Promise<{ tableNo: string }> }) {
  const { tableNo } = await ctx.params;
  const no = Number(tableNo);
  if (!Number.isFinite(no) || no <= 0) return NextResponse.json({ error: "Invalid tableNo" }, { status: 400 });

  const session = await updateStore((store) => startSession(store, Math.round(no)));
  return NextResponse.json({ session });
}

