import Link from "next/link";
import { headers } from "next/headers";
import { formatVnd } from "@/lib/money";
import type { Order, Settings } from "@/lib/types";

async function getBaseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

function minutesToHhMm(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

async function getOrder(id: string): Promise<{ order: Order; settings: Settings } | null> {
  const baseUrl = await getBaseUrl();
  const res = await fetch(`${baseUrl}/api/orders/${encodeURIComponent(id)}`, { cache: "no-store" }).catch(() => null);
  if (!res || !res.ok) return null;
  return (await res.json()) as { order: Order; settings: Settings };
}

export default async function OrderDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const data = await getOrder(id);
  if (!data) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-zinc-950">
        <div className="text-sm font-semibold">Không tìm thấy hoá đơn</div>
        <div className="mt-3">
          <Link href="/orders" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50">
            Quay lại
          </Link>
        </div>
      </div>
    );
  }

  const { order, settings } = data;

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-zinc-950">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Hoá đơn</div>
            <div className="text-xs text-zinc-700">Bàn #{order.tableNo}</div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/orders" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50">
              Danh sách
            </Link>
          </div>
        </div>
        <div className="mt-2 text-xs text-zinc-700">In: dùng Ctrl+P (chỉ phần hoá đơn sẽ được in).</div>
      </div>

      <div className="receipt-print rounded-2xl border border-zinc-200 bg-white p-4 font-sans text-[12px] leading-5">
        <div className="mx-auto max-w-[420px]">
          <div className="text-center">
            <div className="text-[14px] font-bold">{settings.shopName || "Crown Billiard"}</div>
            {(settings.shopAddress || settings.shopPhone) && (
              <div className="text-[11px] text-zinc-700">
                {settings.shopAddress}
                {settings.shopAddress && settings.shopPhone ? " · " : ""}
                {settings.shopPhone}
              </div>
            )}
            <div className="mt-2 border-t border-dashed border-zinc-400" />
          </div>

          <div className="mt-2">
            <div className="flex justify-between">
              <div>Bàn</div>
              <div className="font-bold">#{order.tableNo}</div>
            </div>
            <div className="flex justify-between">
              <div>Thời gian</div>
              <div>
                {minutesToHhMm(order.playedMinutes)} (tính {order.billableMinutes}p)
              </div>
            </div>
            <div className="flex justify-between">
              <div>Giá/giờ</div>
              <div>{formatVnd(order.hourlyRate)}</div>
            </div>
            <div className="flex justify-between">
              <div>Làm tròn</div>
              <div>+{order.roundingMinutes} phút</div>
            </div>
          </div>

          <div className="mt-2 border-t border-dashed border-zinc-400" />

          <div className="mt-2">
            {order.lines.map((l, idx) => (
              <div key={`${l.kind}-${idx}`} className="flex justify-between gap-3">
                <div className="min-w-0 flex-1 truncate">
                  {l.name}
                  {l.qty !== 1 ? ` x${l.qty}` : ""}
                </div>
                <div className="shrink-0 tabular-nums">{formatVnd(l.amount)}</div>
              </div>
            ))}
          </div>

          <div className="mt-2 border-t border-dashed border-zinc-400" />

          <div className="mt-2">
            <div className="flex justify-between">
              <div>Tạm tính</div>
              <div className="tabular-nums">{formatVnd(order.subtotal)}</div>
            </div>
            {order.tax > 0 && (
              <div className="flex justify-between">
                <div>Thuế</div>
                <div className="tabular-nums">{formatVnd(order.tax)}</div>
              </div>
            )}
            <div className="flex justify-between text-[14px] font-bold">
              <div>Tổng</div>
              <div className="tabular-nums">{formatVnd(order.total)}</div>
            </div>
          </div>

          <div className="mt-2 border-t border-dashed border-zinc-400" />

          <div className="mt-2 text-center text-[11px] text-zinc-700">{new Date(order.createdAt).toLocaleString("vi-VN")}</div>
        </div>
      </div>
    </div>
  );
}

