"use client";

import { useEffect, useState } from "react";
import type { Settings } from "@/lib/types";
import { formatVnd } from "@/lib/money";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    const res = await fetch("/api/settings", { cache: "no-store" });
    if (!res.ok) throw new Error("Không tải được cài đặt");
    const json = (await res.json()) as Settings;
    setSettings(json);
  }

  useEffect(() => {
    load().catch((e) => setErr(e instanceof Error ? e.message : "Unknown error"));
  }, []);

  async function save() {
    if (!settings) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(json.error || "Lưu thất bại");
      setSettings(json as Settings);
      setMsg("Đã lưu");
      setTimeout(() => setMsg(null), 1500);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-zinc-950">
      <div>
        <div className="text-sm font-semibold">Cài đặt</div>
        <div className="text-xs text-zinc-700">Giá giờ, thuế, số bàn, thông tin cửa hàng</div>
      </div>

      {err && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
      {msg && <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</div>}

      {!settings ? (
        <div className="mt-4 text-sm text-zinc-700">Đang tải...</div>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="grid gap-3 rounded-2xl border border-zinc-200 p-4">
            <div className="text-xs font-semibold text-zinc-700">Cửa hàng</div>

            <label className="grid gap-1 text-sm">
              <div className="text-xs text-zinc-700">Tên</div>
              <input
                className="h-10 rounded-xl border border-zinc-200 px-3"
                value={settings.shopName}
                onChange={(e) => setSettings((s) => (s ? { ...s, shopName: e.target.value } : s))}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <div className="text-xs text-zinc-700">Địa chỉ</div>
              <input
                className="h-10 rounded-xl border border-zinc-200 px-3"
                value={settings.shopAddress}
                onChange={(e) => setSettings((s) => (s ? { ...s, shopAddress: e.target.value } : s))}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <div className="text-xs text-zinc-700">SĐT</div>
              <input
                className="h-10 rounded-xl border border-zinc-200 px-3"
                value={settings.shopPhone}
                onChange={(e) => setSettings((s) => (s ? { ...s, shopPhone: e.target.value } : s))}
              />
            </label>
          </div>

          <div className="grid gap-3 rounded-2xl border border-zinc-200 p-4">
            <div className="text-xs font-semibold text-zinc-700">Tính tiền</div>

            <label className="grid gap-1 text-sm">
              <div className="text-xs text-zinc-700">Giá giờ (VND)</div>
              <input
                className="h-10 rounded-xl border border-zinc-200 px-3"
                type="number"
                value={settings.hourlyRate}
                onChange={(e) => setSettings((s) => (s ? { ...s, hourlyRate: Number(e.target.value) } : s))}
              />
              <div className="text-xs text-zinc-700">Hiện tại: {formatVnd(Math.round(settings.hourlyRate || 0))}/giờ</div>
            </label>

            <label className="grid gap-1 text-sm">
              <div className="text-xs text-zinc-700">Thuế (%)</div>
              <input
                className="h-10 rounded-xl border border-zinc-200 px-3"
                type="number"
                value={settings.taxRatePct}
                onChange={(e) => setSettings((s) => (s ? { ...s, taxRatePct: Number(e.target.value) } : s))}
              />
            </label>

            <label className="grid gap-1 text-sm">
              <div className="text-xs text-zinc-700">Làm tròn phút (lợi nhuận cao hơn khi làm tròn lớn)</div>
              <select
                className="h-10 rounded-xl border border-zinc-200 px-3"
                value={settings.roundingMinutes}
                onChange={(e) => setSettings((s) => (s ? { ...s, roundingMinutes: Number(e.target.value) as any } : s))}
              >
                {[1, 5, 10, 15, 30, 60].map((m) => (
                  <option key={m} value={m}>
                    {m} phút
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <div className="text-xs text-zinc-700">Số bàn</div>
              <input
                className="h-10 rounded-xl border border-zinc-200 px-3"
                type="number"
                value={settings.tableCount}
                onChange={(e) => setSettings((s) => (s ? { ...s, tableCount: Number(e.target.value) } : s))}
              />
            </label>
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-2">
            <button
              className="rounded-xl border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
              disabled={busy}
              onClick={() => load().catch((e) => setErr(e instanceof Error ? e.message : "Unknown error"))}
            >
              Hoàn tác
            </button>
            <button
              className="rounded-xl bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              disabled={busy}
              onClick={save}
            >
              Lưu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

