import { NextResponse } from "next/server";
import { addExtra, removeExtra, updateStore } from "@/lib/store";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    price?: number;
    qty?: number;
  };

  try {
    const session = await updateStore((store) =>
      addExtra(store, id, { name: body.name ?? "", price: body.price ?? 0, qty: body.qty ?? 1 }),
    );
    return NextResponse.json({ session });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 400 });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const extraId = url.searchParams.get("extraId") ?? "";
  if (!extraId) return NextResponse.json({ error: "Missing extraId" }, { status: 400 });

  try {
    const session = await updateStore((store) => removeExtra(store, id, extraId));
    return NextResponse.json({ session });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 400 });
  }
}

