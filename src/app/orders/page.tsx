import Link from "next/link";
import { headers } from "next/headers";
import { formatVnd } from "@/lib/money";
import type { Order } from "@/lib/types";

async function getBaseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

async function getOrders(): Promise<Order[]> {
  const baseUrl = await getBaseUrl();
  const res = await fetch(`${baseUrl}/api/orders`, { cache: "no-store" }).catch(() => null);
  if (!res || !res.ok) return [];
  const json = (await res.json()) as { orders: Order[] };
  return json.orders ?? [];
}

export default async function OrdersPage() {
  const orders = await getOrders();

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-zinc-950">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Lịch sử</div>
          <div className="text-xs text-zinc-700">Lịch sử hoá đơn đã checkout</div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="mt-4 text-sm text-zinc-700">Chưa có đơn hàng.</div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-700">
              <tr>
                <th className="px-3 py-2">Thời gian</th>
                <th className="px-3 py-2">Bàn</th>
                <th className="px-3 py-2">Tổng</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2 text-zinc-700">{new Date(o.createdAt).toLocaleString("vi-VN")}</td>
                  <td className="px-3 py-2 font-medium">#{o.tableNo}</td>
                  <td className="px-3 py-2 tabular-nums">{formatVnd(o.total)}</td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/orders/${o.id}`}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-900 hover:bg-zinc-100"
                    >
                      Xem / In
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

