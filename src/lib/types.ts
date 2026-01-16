export type MoneyVnd = number; // integer VND

export type PaymentMethod = "cash" | "card" | "qr";

export type ExtraItem = {
  id: string;
  name: string;
  price: MoneyVnd;
  qty: number;
};

export type SessionSegment = {
  startAt: string; // ISO
  endAt: string | null; // ISO
};

export type TableSession = {
  id: string;
  tableNo: number;
  createdAt: string; // ISO
  segments: SessionSegment[];
  extras: ExtraItem[];
  note?: string;
  closedAt: string | null; // ISO
};

export type Settings = {
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  currency: "VND";
  tableCount: number;
  hourlyRate: MoneyVnd; // 50k / hour
  taxRatePct: number; // 0..100
  roundingMinutes: 1 | 5 | 10 | 15 | 30 | 60;
};

export type OrderLine = {
  kind: "time" | "extra" | "tax";
  name: string;
  qty: number;
  unitPrice: MoneyVnd;
  amount: MoneyVnd;
};

export type Order = {
  id: string;
  tableNo: number;
  sessionId: string;
  createdAt: string; // ISO
  playedMinutes: number;
  billableMinutes: number;
  hourlyRate: MoneyVnd;
  roundingMinutes: number;
  taxRatePct: number;
  lines: OrderLine[];
  subtotal: MoneyVnd;
  tax: MoneyVnd;
  total: MoneyVnd;
  payment: {
    method: PaymentMethod;
    cashGiven?: MoneyVnd;
    change?: MoneyVnd;
  };
};

export type StoreShape = {
  version: 1;
  settings: Settings;
  sessions: TableSession[]; // active + closed (history)
  orders: Order[];
};

