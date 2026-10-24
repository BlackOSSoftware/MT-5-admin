"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Search, Sparkles, Trash2 } from "lucide-react";
import GlobalLoader from "@/app/admin/components/ui/GlobalLoader";
import Pagination from "@/app/admin/components/ui/pagination";
import DragScroll from "@/app/admin/components/ui/DragScroll";
import { useTradeAdminDeletedTrades } from "@/hooks/useTradeAdminDeletedTrades";
import { useTradeAdminRestoreTrade } from "@/hooks/useTradeAdminOrderActions";
import type { TradeAdminDeleteKind } from "@/services/tradeAdmin.service";
import {
  displayAccountLabel,
  displayTicket,
  displayUserLabel,
} from "@/utils/displayIds";

function formatNumber(value?: number | null, digits = 2) {
  if (value === undefined || value === null || !Number.isFinite(Number(value))) {
    return "--";
  }
  return Number(value).toFixed(digits);
}

function formatDateTime(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString();
}

export default function DeletedTradesPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [kind, setKind] = useState<"ALL" | TradeAdminDeleteKind>("ALL");
  const [symbol, setSymbol] = useState("");
  const [appliedSymbol, setAppliedSymbol] = useState("");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const query = useTradeAdminDeletedTrades({
    page,
    limit,
    kind,
    symbol: appliedSymbol || undefined,
  });
  const restoreMutation = useTradeAdminRestoreTrade();

  const rows = useMemo(() => query.data?.data ?? [], [query.data?.data]);
  const pagination = query.data?.pagination;
  const totalPages =
    pagination?.totalPages ??
    Math.max(1, Math.ceil((pagination?.total ?? rows.length) / Math.max(limit, 1)));

  const handleRestore = (row: (typeof rows)[number]) => {
    setError("");
    restoreMutation.mutate(
      {
        kind: row.kind,
        accountId: row.accountId,
        userId: row.userId,
        tradeId: row.source === "TRADE" ? row._id : undefined,
        positionId: row.positionId,
        orderId: row.orderId,
      },
      {
        onSuccess: () => {
          setToast("Trade restored.");
          setTimeout(() => setToast(""), 2000);
          query.refetch();
        },
        onError: (err: unknown) => {
          const msg =
            typeof err === "object" && err !== null
              ? ((err as { response?: { data?: { message?: string } } }).response
                  ?.data?.message ??
                (err as { message?: string }).message)
              : undefined;
          setError(msg || "Restore failed.");
        },
      }
    );
  };

  return (
    <div className="container-pad max-w-full space-y-4 text-[var(--foreground)] sm:space-y-5">
      <div className="rounded-2xl border border-[var(--card-border)] bg-gradient-to-br from-[var(--card-bg)] via-[var(--card-bg)] to-rose-500/5 p-4 sm:p-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-rose-700">
          <Trash2 size={12} />
          Soft Deleted
        </div>
        <h1 className="mt-2 text-xl font-semibold sm:text-2xl">Deleted Trades</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Live, pending, and closed trades soft-deleted by admin. Account
          balance is never changed — restore only brings the trade back into
          history / engine.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-[var(--text-muted)]">Kind</label>
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as typeof kind);
                setPage(1);
              }}
              className="mt-1 block rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm"
            >
              <option value="ALL">All</option>
              <option value="LIVE">Live</option>
              <option value="PENDING">Pending</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)]">Symbol</label>
            <div className="relative mt-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="XAUUSD"
                className="rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] py-2 pl-9 pr-3 text-sm"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setAppliedSymbol(symbol.trim().toUpperCase());
              setPage(1);
            }}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            Apply
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-2 sm:p-3">
        {query.isLoading ? (
          <GlobalLoader />
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-sm text-[var(--text-muted)]">
            <Sparkles size={18} />
            No deleted trades found.
          </div>
        ) : (
          <DragScroll className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead className="bg-[var(--input-bg)] text-xs uppercase text-[var(--text-muted)]">
                <tr>
                  <th className="px-4 py-3">Kind</th>
                  <th className="px-4 py-3">Symbol</th>
                  <th className="px-4 py-3">Side</th>
                  <th className="px-4 py-3">Volume</th>
                  <th className="px-4 py-3">PnL / Price</th>
                  <th className="px-4 py-3">Balance Δ</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Position / Order</th>
                  <th className="px-4 py-3">Deleted</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.kind}-${row._id}`}
                    className="border-t border-[var(--card-border)]"
                  >
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-[var(--card-border)] px-2 py-0.5 text-[10px] font-semibold uppercase">
                        {row.kind}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{row.symbol || "--"}</td>
                    <td className="px-4 py-3">{row.side || "--"}</td>
                    <td className="px-4 py-3">{formatNumber(row.volume, 4)}</td>
                    <td className="px-4 py-3">
                      {row.kind === "CLOSED"
                        ? formatNumber(row.realizedPnL)
                        : row.kind === "PENDING"
                          ? formatNumber(row.price, 5)
                          : formatNumber(row.openPrice, 5)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {formatNumber(row.deleteBalanceDelta)}
                    </td>
                    <td className="px-4 py-3 text-xs">{displayUserLabel(row)}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {displayAccountLabel(row)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {displayTicket(row)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {formatDateTime(row.deletedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={restoreMutation.isPending}
                        onClick={() => handleRestore(row)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/20 disabled:opacity-60"
                      >
                        <RotateCcw size={12} />
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DragScroll>
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(next) => {
          setLimit(next);
          setPage(1);
        }}
      />

      {toast ? (
        <div className="fixed bottom-5 right-5 z-50 rounded-md bg-[var(--foreground)] px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
