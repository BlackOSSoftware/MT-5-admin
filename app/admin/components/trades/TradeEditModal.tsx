"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Hash, Pencil } from "lucide-react";
import Modal from "@/app/admin/components/ui/Modal";
import { displayAccountLabel, displayTicket } from "@/utils/displayIds";

export type TradeEditMode = "live" | "pending" | "closed";

export type TradeEditValues = {
  accountId: string;
  userId: string;
  positionId?: string;
  orderId?: string;
  tradeId?: string;
  ticket?: number | string | null;
  accountNumber?: string | null;
  symbol?: string;
  side?: string;
  volume?: number | null;
  openPrice?: number | null;
  price?: number | null;
  closePrice?: number | null;
  contractSize?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  commission?: number | null;
  spread?: number | null;
  swap?: number | null;
  realizedPnL?: number | null;
  closeReason?: string | null;
};

type FieldKey =
  | "volume"
  | "openPrice"
  | "price"
  | "closePrice"
  | "stopLoss"
  | "takeProfit"
  | "commission"
  | "spread"
  | "swap"
  | "realizedPnL"
  | "closeReason";

const LIVE_FIELDS: FieldKey[] = [
  "volume",
  "openPrice",
  "stopLoss",
  "takeProfit",
];
const PENDING_FIELDS: FieldKey[] = [
  "volume",
  "price",
  "stopLoss",
  "takeProfit",
];
const CLOSED_FIELDS: FieldKey[] = [
  "volume",
  "openPrice",
  "closePrice",
  "stopLoss",
  "takeProfit",
  "commission",
  "spread",
  "swap",
  "realizedPnL",
  "closeReason",
];

const REQUIRED_NUMERIC: FieldKey[] = [
  "volume",
  "openPrice",
  "price",
  "closePrice",
];

const CLOSE_REASON_OPTIONS = [
  { value: "MANUAL", label: "MANUAL" },
  { value: "STOP_LOSS", label: "STOP_LOSS" },
  { value: "TAKE_PROFIT", label: "TAKE_PROFIT" },
  { value: "STOP_OUT", label: "STOP_OUT" },
  { value: "SYSTEM", label: "SYSTEM" },
  { value: "TRADE", label: "TRADE" },
];

const LABELS: Record<FieldKey, string> = {
  volume: "Volume",
  openPrice: "Open Price",
  price: "Trigger Price",
  closePrice: "Close Price",
  stopLoss: "Stop Loss",
  takeProfit: "Take Profit",
  commission: "Commission",
  spread: "Spread",
  swap: "Swap",
  realizedPnL: "Realized PnL",
  closeReason: "Close Reason",
};

function toInput(value: unknown) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function normalizeCloseReasonForForm(value: unknown) {
  if (value === undefined || value === null || value === "") return "";
  const raw = String(value).trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (raw === "MANUAL_CLOSE" || raw === "CLOSE" || raw === "USER") return "MANUAL";
  return CLOSE_REASON_OPTIONS.some((o) => o.value === raw) ? raw : "MANUAL";
}

function parseField(key: FieldKey, raw: string): number | null | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") {
    if (key === "stopLoss" || key === "takeProfit") return null;
    if (REQUIRED_NUMERIC.includes(key)) {
      throw new Error(`${LABELS[key]} is required (cannot be cleared)`);
    }
    return undefined;
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n)) throw new Error(`Invalid ${LABELS[key]}`);
  if (REQUIRED_NUMERIC.includes(key) && !(n > 0)) {
    throw new Error(`${LABELS[key]} must be greater than 0`);
  }
  return n;
}

function computeClosedPnLPreview(args: {
  side?: string;
  volume: string;
  openPrice: string;
  closePrice: string;
  contractSize?: number | null;
}) {
  const volume = Number(args.volume);
  const openPrice = Number(args.openPrice);
  const closePrice = Number(args.closePrice);
  const csRaw = Number(args.contractSize);
  const contractSize = Number.isFinite(csRaw) && csRaw > 0 ? csRaw : 1;
  if (
    !Number.isFinite(volume) ||
    !Number.isFinite(openPrice) ||
    !Number.isFinite(closePrice)
  ) {
    return null;
  }
  const side = (args.side ?? "").toUpperCase();
  const diff = side === "SELL" ? openPrice - closePrice : closePrice - openPrice;
  return Number((diff * volume * contractSize).toFixed(8));
}

export default function TradeEditModal({
  open,
  mode,
  title,
  trade,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: TradeEditMode;
  title?: string;
  trade: TradeEditValues | null;
  saving?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const fields = useMemo(() => {
    if (mode === "live") return LIVE_FIELDS;
    if (mode === "pending") return PENDING_FIELDS;
    return CLOSED_FIELDS;
  }, [mode]);

  const [form, setForm] = useState<Record<FieldKey, string>>({
    volume: "",
    openPrice: "",
    price: "",
    closePrice: "",
    stopLoss: "",
    takeProfit: "",
    commission: "",
    spread: "",
    swap: "",
    realizedPnL: "",
    closeReason: "",
  });
  const [localError, setLocalError] = useState("");

  // Stable id so parent re-renders (live quotes) don't wipe in-progress edits.
  const tradeKey = trade
    ? `${mode}:${trade.positionId || ""}:${trade.orderId || ""}:${trade.tradeId || ""}:${trade.ticket ?? ""}`
    : "";

  useEffect(() => {
    if (!trade || !open) return;
    setLocalError("");
    setForm({
      volume: toInput(trade.volume),
      openPrice: toInput(trade.openPrice),
      price: toInput(trade.price),
      closePrice: toInput(trade.closePrice),
      stopLoss: toInput(trade.stopLoss),
      takeProfit: toInput(trade.takeProfit),
      commission: toInput(trade.commission),
      spread: toInput(trade.spread),
      swap: toInput(trade.swap),
      realizedPnL: toInput(trade.realizedPnL),
      closeReason: normalizeCloseReasonForForm(trade.closeReason),
    });
    // Only re-seed when modal opens or a different trade is selected.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tradeKey captures identity
  }, [open, tradeKey]);

  // Closed mode: keep realized PnL in sync when volume / prices change.
  useEffect(() => {
    if (!open || mode !== "closed" || !trade) return;
    const preview = computeClosedPnLPreview({
      side: trade.side,
      volume: form.volume,
      openPrice: form.openPrice,
      closePrice: form.closePrice,
      contractSize: trade.contractSize,
    });
    if (preview === null) return;
    const next = String(preview);
    setForm((prev) =>
      prev.realizedPnL === next ? prev : { ...prev, realizedPnL: next }
    );
  }, [
    open,
    mode,
    trade?.side,
    trade?.contractSize,
    form.volume,
    form.openPrice,
    form.closePrice,
  ]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!trade) return;
    setLocalError("");

    try {
      const payload: Record<string, unknown> = {
        accountId: trade.accountId,
        userId: trade.userId,
      };
      if (trade.positionId) payload.positionId = trade.positionId;
      if (trade.orderId) payload.orderId = trade.orderId;
      if (trade.tradeId) payload.tradeId = trade.tradeId;

      for (const key of fields) {
        if (key === "closeReason") {
          const trimmed = form.closeReason.trim();
          payload.closeReason = trimmed === "" ? null : trimmed;
          continue;
        }
        const parsed = parseField(key, form[key]);
        if (parsed === undefined) continue;
        payload[key] = parsed;
      }

      onSubmit(payload);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Invalid form");
    }
  };

  const modalTitle =
    title ||
    (mode === "live"
      ? "Edit Live Position"
      : mode === "pending"
        ? "Edit Pending Order"
        : "Edit Closed Trade");

  return (
    <Modal
      title={modalTitle}
      open={open}
      onClose={onClose}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold hover:bg-[var(--hover-bg)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="trade-edit-form"
            disabled={saving || !trade}
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] disabled:opacity-60"
          >
            <Pencil size={14} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      }
    >
      <form id="trade-edit-form" onSubmit={handleSubmit} className="space-y-4">
        {(error || localError) && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error || localError}
          </div>
        )}

        {!trade ? (
          <p className="text-sm text-[var(--text-muted)]">No trade selected.</p>
        ) : (
          <>
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">
                  {trade.symbol || "--"}
                </span>
                <span className="rounded-full border border-[var(--card-border)] px-2 py-0.5 text-[10px] font-semibold uppercase">
                  {trade.side || "--"}
                </span>
              </div>
              <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">
                Position ID: {displayTicket(trade)}
              </p>
              <p className="font-mono text-xs text-[var(--text-muted)]">
                Account:{" "}
                {displayAccountLabel({
                  accountId: trade.accountId,
                  accountNumber: trade.accountNumber,
                })}
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                Symbol/side are read-only. Change Open Price by typing a new
                value (it cannot be cleared). Leave SL/TP empty to clear.
                {mode === "closed"
                  ? " Realized PnL auto-updates when volume / open / close price change."
                  : ""}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map((key) => (
                <div
                  key={key}
                  className={key === "closeReason" ? "sm:col-span-2" : undefined}
                >
                  <label className="text-xs font-medium text-[var(--text-muted)]">
                    {LABELS[key]}
                  </label>
                  <div className="mt-1 flex items-center gap-2 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2">
                    <Hash size={14} className="text-[var(--text-muted)]" />
                    {key === "closeReason" ? (
                      <select
                        value={form.closeReason}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            closeReason: e.target.value,
                          }))
                        }
                        className="w-full bg-transparent text-sm outline-none"
                      >
                        <option value="">— keep / clear —</option>
                        {CLOSE_REASON_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        step="any"
                        value={form[key]}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        className="w-full bg-transparent text-sm outline-none"
                        placeholder={
                          key === "stopLoss" || key === "takeProfit"
                            ? "Empty = clear"
                            : REQUIRED_NUMERIC.includes(key)
                              ? "Required"
                              : undefined
                        }
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
