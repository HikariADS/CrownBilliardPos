"use client";

import { useEffect, useMemo, useState } from "react";
import type { Order, Settings, TableSession } from "@/lib/types";
import { formatVnd } from "@/lib/money";

type TablesResponse = {
  settings: Settings;
  tables: Array<{
    tableNo: number;
    status: "idle" | "playing" | "stopped";
    session: TableSession | null;
    totals: {
      playedMinutes: number;
      billableMinutes: number;
      timeCharge: number;
      extrasTotal: number;
      subtotal: number;
      tax: number;
      total: number;
    } | null;
  }>;
};

function minutesToHhMm(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function Receipt({ order, settings }: { order: Order; settings: Settings }) {
  return (
    <div className="font-sans text-[12px] leading-5">
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

        <div className="mt-2 text-center text-[11px] text-zinc-700">
          {new Date(order.createdAt).toLocaleString("vi-VN")}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<TablesResponse | null>(null);
  const [selectedTable, setSelectedTable] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [extraModal, setExtraModal] = useState<{ open: boolean; sessionId: string | null }>({
    open: false,
    sessionId: null,
  });
  const [extraForm, setExtraForm] = useState({ name: "Nước", price: 10000, qty: 1 });

  const [checkoutModal, setCheckoutModal] = useState<{ open: boolean; sessionId: string | null }>({
    open: false,
    sessionId: null,
  });
  const [payment, setPayment] = useState<{ method: "cash" | "card" | "qr"; cashGiven: number }>({
    method: "cash",
    cashGiven: 0,
  });

  const [lastReceipt, setLastReceipt] = useState<{ order: Order; settings: Settings } | null>(null);
  const [printState, setPrintState] = useState<"idle" | "printing">("idle");

  const selected = useMemo(() => {
    const tables = data?.tables ?? [];
    return tables.find((t) => t.tableNo === selectedTable) ?? null;
  }, [data, selectedTable]);

  async function refresh() {
    setErr(null);
    const res = await fetch("/api/tables", { cache: "no-store" });
    if (!res.ok) throw new Error("Không tải được danh sách bàn");
    const json = (await res.json()) as TablesResponse;
    setData(json);
    if (selectedTable > json.settings.tableCount) setSelectedTable(json.settings.tableCount);
  }

  useEffect(() => {
    refresh().catch((e) => setErr(e instanceof Error ? e.message : "Unknown error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const hasPlaying = (data?.tables ?? []).some((t) => t.status === "playing");
    if (!hasPlaying) return;
    const id = window.setInterval(() => {
      refresh().catch(() => {});
    }, 3000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.tables]);

  async function post(url: string, body?: unknown) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any).error || "Thao tác thất bại");
      await refresh();
      return json;
    } finally {
      setBusy(false);
    }
  }

  async function del(url: string) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(url, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any).error || "Thao tác thất bại");
      await refresh();
      return json;
    } finally {
      setBusy(false);
    }
  }

  async function doCheckout() {
    if (!selected?.session?.id) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: selected.session.id,
          method: payment.method,
          cashGiven: payment.method === "cash" ? payment.cashGiven : undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(json.error || "Checkout thất bại");
      setLastReceipt({ order: json.order as Order, settings: json.settings as Settings });
      setCheckoutModal({ open: false, sessionId: null });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  function printReceipt() {
    if (!lastReceipt) return;
    setPrintState("printing");
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintState("idle"), 200);
    }, 50);
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_.8fr]">
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 text-zinc-950">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Bàn billiard</div>
            <div className="text-xs text-zinc-700">
              Giá: {formatVnd(data?.settings.hourlyRate ?? 50000)}/giờ · Làm tròn lên{" "}
              {data?.settings.roundingMinutes ?? 15} phút · Thuế {data?.settings.taxRatePct ?? 0}%
            </div>
          </div>
          <button
            onClick={() => refresh().catch((e) => setErr(e instanceof Error ? e.message : "Unknown error"))}
            className="rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50"
            disabled={busy}
          >
            Tải lại
          </button>
        </div>

        {err && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {(data?.tables ?? []).map((t) => {
            const active = t.tableNo === selectedTable;
            const badge =
              t.status === "playing"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : t.status === "stopped"
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-zinc-50 text-zinc-800 border-zinc-200";
            return (
              <button
                key={t.tableNo}
                onClick={() => setSelectedTable(t.tableNo)}
                className={[
                  "rounded-2xl border p-3 text-left transition",
                  active ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white hover:bg-zinc-50",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">Bàn #{t.tableNo}</div>
                  <div className={["rounded-full border px-2 py-0.5 text-[11px]", active ? "border-white/30" : badge].join(" ")}>
                    {t.status === "playing" ? "Đang chơi" : t.status === "stopped" ? "Đã dừng" : "Nhàn"}
                  </div>
                </div>
                <div className={["mt-2 text-xs", active ? "text-white/80" : "text-zinc-700"].join(" ")}>
                  {t.totals ? (
                    <>
                      {minutesToHhMm(t.totals.playedMinutes)} · {formatVnd(t.totals.total)}
                    </>
                  ) : (
                    "Chưa mở phiên"
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="rounded-2xl border border-zinc-200 bg-white p-4 text-zinc-950">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Bàn #{selectedTable}</div>
            <div className="text-xs text-zinc-700">Điều khiển phiên chơi & thanh toán</div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-200 p-3">
          {selected?.session ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {selected.status === "playing" ? (
                  <button
                    className="rounded-xl bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                    disabled={busy}
                    onClick={() => post(`/api/tables/${selectedTable}/stop`)}
                  >
                    Dừng chơi
                  </button>
                ) : (
                  <button
                    className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                    disabled={busy}
                    onClick={() => post(`/api/tables/${selectedTable}/resume`)}
                  >
                    Tiếp tục
                  </button>
                )}

                <button
                  className="rounded-xl border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
                  disabled={busy}
                  onClick={() => setExtraModal({ open: true, sessionId: selected.session!.id })}
                >
                  + Phụ thu / Nước
                </button>

                <button
                  className="rounded-xl bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                  disabled={busy}
                  onClick={() => {
                    setPayment((p) => ({ ...p, cashGiven: selected.totals?.total ?? 0 }));
                    setCheckoutModal({ open: true, sessionId: selected.session!.id });
                  }}
                >
                  Checkout
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-zinc-50 p-3">
                  <div className="text-xs text-zinc-700">Thời gian chơi</div>
                  <div className="mt-1 font-semibold text-zinc-950">
                    {minutesToHhMm(selected.totals?.playedMinutes ?? 0)}{" "}
                    <span className="text-xs font-normal text-zinc-700">
                      (tính {selected.totals?.billableMinutes ?? 0}p)
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-zinc-50 p-3">
                  <div className="text-xs text-zinc-700">Tổng tiền</div>
                  <div className="mt-1 font-semibold tabular-nums text-zinc-950">{formatVnd(selected.totals?.total ?? 0)}</div>
                </div>
              </div>

              <div className="mt-3">
                <div className="text-xs font-semibold text-zinc-700">Phụ thu</div>
                {selected.session.extras.length === 0 ? (
                  <div className="mt-2 text-sm text-zinc-700">Chưa có phụ thu.</div>
                ) : (
                  <div className="mt-2 divide-y divide-zinc-100 rounded-xl border border-zinc-200">
                    {selected.session.extras.map((x) => (
                      <div key={x.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        <div className="min-w-0 flex-1 truncate">
                          {x.name} <span className="text-zinc-600">x{x.qty}</span>
                        </div>
                        <div className="shrink-0 tabular-nums">{formatVnd(x.price * x.qty)}</div>
                        <button
                          className="shrink-0 rounded-lg px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                          onClick={() => del(`/api/sessions/${selected.session!.id}/extras?extraId=${encodeURIComponent(x.id)}`)}
                          disabled={busy}
                        >
                          Xoá
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="text-sm text-zinc-700">Bàn đang nhàn. Bấm mở phiên để bắt đầu tính giờ.</div>
              <button
                className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                disabled={busy}
                onClick={() => post(`/api/tables/${selectedTable}/start`)}
              >
                Mở phiên (Start)
              </button>
            </div>
          )}
        </div>

        {lastReceipt && (
          <div className="mt-4 rounded-2xl border border-zinc-200 p-3">
            <div className="text-sm font-semibold">Hoá đơn vừa tạo</div>
            <div className="mt-2 flex items-center justify-between gap-3 text-sm">
              <div className="text-zinc-700">
                Bàn #{lastReceipt.order.tableNo} · {formatVnd(lastReceipt.order.total)}
              </div>
              <button
                onClick={printReceipt}
                className="rounded-xl bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                disabled={printState === "printing"}
              >
                In hoá đơn
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Extra modal */}
      {extraModal.open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 text-zinc-950 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Thêm phụ thu</div>
              <button
                className="rounded-lg px-2 py-1 text-sm hover:bg-zinc-100"
                onClick={() => setExtraModal({ open: false, sessionId: null })}
              >
                Đóng
              </button>
            </div>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1 text-sm">
                <div className="text-xs text-zinc-700">Tên</div>
                <input
                  className="h-10 rounded-xl border border-zinc-200 px-3"
                  value={extraForm.name}
                  onChange={(e) => setExtraForm((s) => ({ ...s, name: e.target.value }))}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-sm">
                  <div className="text-xs text-zinc-700">Giá (VND)</div>
                  <input
                    className="h-10 rounded-xl border border-zinc-200 px-3"
                    type="number"
                    value={extraForm.price}
                    onChange={(e) => setExtraForm((s) => ({ ...s, price: Number(e.target.value) }))}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <div className="text-xs text-zinc-700">Số lượng</div>
                  <input
                    className="h-10 rounded-xl border border-zinc-200 px-3"
                    type="number"
                    value={extraForm.qty}
                    onChange={(e) => setExtraForm((s) => ({ ...s, qty: Number(e.target.value) }))}
                  />
                </label>
              </div>
              <button
                className="mt-1 rounded-xl bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                disabled={busy || !extraModal.sessionId}
                onClick={async () => {
                  if (!extraModal.sessionId) return;
                  await post(`/api/sessions/${extraModal.sessionId}/extras`, extraForm);
                  setExtraModal({ open: false, sessionId: null });
                }}
              >
                Thêm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout modal */}
      {checkoutModal.open && selected?.totals && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 text-zinc-950 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Checkout bàn #{selectedTable}</div>
              <button
                className="rounded-lg px-2 py-1 text-sm hover:bg-zinc-100"
                onClick={() => setCheckoutModal({ open: false, sessionId: null })}
              >
                Đóng
              </button>
            </div>

            <div className="mt-3 rounded-2xl border border-zinc-200 p-3 text-sm">
              <div className="flex justify-between">
                <div className="text-zinc-700">Tổng</div>
                <div className="font-semibold tabular-nums">{formatVnd(selected.totals.total)}</div>
              </div>
              <div className="mt-1 flex justify-between text-xs text-zinc-700">
                <div>
                  {minutesToHhMm(selected.totals.playedMinutes)} (tính {selected.totals.billableMinutes}p)
                </div>
                <div>Phụ thu: {formatVnd(selected.totals.extrasTotal)}</div>
              </div>
            </div>

            <div className="mt-3 grid gap-3">
              <label className="grid gap-1 text-sm">
                <div className="text-xs text-zinc-700">Phương thức</div>
                <select
                  className="h-10 rounded-xl border border-zinc-200 px-3"
                  value={payment.method}
                  onChange={(e) => setPayment((p) => ({ ...p, method: e.target.value as any }))}
                >
                  <option value="cash">Tiền mặt</option>
                  <option value="card">Thẻ</option>
                  <option value="qr">QR</option>
                </select>
              </label>

              {payment.method === "cash" && (
                <label className="grid gap-1 text-sm">
                  <div className="text-xs text-zinc-700">Khách đưa (VND)</div>
                  <input
                    className="h-10 rounded-xl border border-zinc-200 px-3"
                    type="number"
                    value={payment.cashGiven}
                    onChange={(e) => setPayment((p) => ({ ...p, cashGiven: Number(e.target.value) }))}
                  />
                  <div className="text-xs text-zinc-700">
                    Tiền thối:{" "}
                    <span className="font-medium text-zinc-900">
                      {formatVnd(Math.max(0, Math.round(payment.cashGiven || 0) - selected.totals.total))}
                    </span>
                  </div>
                </label>
              )}

              <button
                className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                disabled={busy}
                onClick={doCheckout}
              >
                Xác nhận Checkout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt render target (kept in DOM for print CSS) */}
      {lastReceipt && (
        <div
          className="receipt-print"
          style={{
            position: "fixed",
            left: "-10000px",
            top: 0,
            width: 420,
          }}
        >
          <Receipt order={lastReceipt.order} settings={lastReceipt.settings} />
        </div>
      )}
    </div>
  );
}
