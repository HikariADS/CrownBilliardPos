import { NextResponse } from "next/server";
import { resumeSession, updateStore } from "@/lib/store";

export async function POST(_: Request, ctx: { params: Promise<{ tableNo: string }> }) {
  const { tableNo } = await ctx.params;
  const no = Number(tableNo);
  if (!Number.isFinite(no) || no <= 0) return NextResponse.json({ error: "Invalid tableNo" }, { status: 400 });

  try {
    const session = await updateStore((store) => resumeSession(store, Math.round(no)));
    return NextResponse.json({ session });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 400 });
  }
}

