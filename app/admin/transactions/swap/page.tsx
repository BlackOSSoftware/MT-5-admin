"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock3,
  DollarSign,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  User,
  Wallet,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import GlobalLoader from "@/app/admin/components/ui/GlobalLoader";
import Pagination from "@/app/admin/components/ui/pagination";
import DragScroll from "@/app/admin/components/ui/DragScroll";
import {
  type SwapDirection,
  type SwapTransaction,
} from "@/services/adminSwap.service";
import { useAdminSwapTransactions } from "@/hooks/swaps/useAdminSwapTransactions";

function formatDateTime(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNumber(value?: number, digits = 2) {
  if (value === undefined || value === null || Number.isNaN(value)) return "--";
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function getStatusMeta(status?: string) {
  const normalized = (status ?? "").toUpperCase();
  if (normalized === "SUCCESS") {
    return {
      Icon: CheckCircle2,
      className:
        "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
    };
  }
  if (normalized === "PENDING" || normalized === "PROCESSING") {
    return {
      Icon: Clock3,
      className:
        "border-amber-500/40 bg-amber-500/10 text-amber-700",
    };
  }
  if (normalized === "FAILED" || normalized === "REJECTED" || normalized === "CANCELLED") {
    return {
      Icon: XCircle,
      className:
        "border-rose-500/40 bg-rose-500/10 text-rose-700",
    };
  }
  return {
    Icon: RefreshCcw,
    className:
      "border-slate-500/40 bg-slate-500/10 text-slate-700",
  };
}

export default function SwapTransactionsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [draftDirection, setDraftDirection] = useState<SwapDirection>("all");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [direction, setDirection] = useState<SwapDirection>("all");

  const swapQuery = useAdminSwapTransactions({
    page,
    limit,
    fromDate,
    toDate,
    direction,
  });

  const rows = useMemo(
    () => swapQuery.data?.data ?? [],
    [swapQuery.data?.data]
  );
  const summary = swapQuery.data?.summary;
  const pagination = swapQuery.data?.pagination;
  const total = pagination?.total ?? rows.length;
  const totalPages =
    pagination?.totalPages ?? Math.max(1, Math.ceil(total / Math.max(limit, 1)));

  const applyFilters = () => {
    setFromDate(draftFrom);
    setToDate(draftTo);
    setDirection(draftDirection);
    setPage(1);
  };

  const resetFilters = () => {
    setDraftFrom("");
    setDraftTo("");
    setDraftDirection("all");
    setFromDate("");
    setToDate("");
    setDirection("all");
    setPage(1);
  };

  const goToUserView = (row: SwapTransaction) => {
    const userId = row.user?._id;
    if (!userId) return;
    router.push(`/admin/users/users/view/${userId}`);
  };

  return (
    <div className="container-pad max-w-full space-y-5 text-[var(--foreground)]">
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold sm:text-2xl">
            Swap Transactions
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Date-wise swap deductions with direction filters.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-4">
          <div className="relative lg:col-span-1">
            <Calendar
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="date"
              value={draftFrom}
              onChange={(event) => setDraftFrom(event.target.value)}
              className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>

          <div className="relative lg:col-span-1">
            <Calendar
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="date"
              value={draftTo}
              onChange={(event) => setDraftTo(event.target.value)}
              className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>

          <div className="relative lg:col-span-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <select
              value={draftDirection}
              onChange={(event) =>
                setDraftDirection(event.target.value as SwapDirection)
              }
              className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              <option value="all">Direction: all</option>
              <option value="credit">Direction: credit</option>
              <option value="debit">Direction: debit</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <button
              type="button"
              onClick={applyFilters}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] lg:flex-none"
            >
              <SlidersHorizontal size={14} />
              Apply
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold hover:bg-[var(--hover-bg)] lg:flex-none"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <SummaryCard label="Records" value={String(total)} />
        <SummaryCard
          label="Total Amount"
          value={formatNumber(summary?.totalAmount)}
        />
        <SummaryCard label="From" value={summary?.fromDate ?? "--"} />
        <SummaryCard label="To" value={summary?.toDate ?? "--"} />
        <SummaryCard label="Time Zone" value={summary?.timeZone ?? "--"} />
      </div>

      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>
            Showing <span className="font-semibold text-[var(--foreground)]">{rows.length}</span>{" "}
            entries
          </span>
          {swapQuery.isFetching && !swapQuery.isLoading && (
            <span className="inline-flex items-center gap-1 text-[var(--primary)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--primary)]" />
              Updating
            </span>
          )}
        </div>

        {swapQuery.isLoading ? (
          <div className="py-8">
            <GlobalLoader />
          </div>
        ) : swapQuery.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
            Failed to load swap transactions.
            <button
              type="button"
              onClick={() => swapQuery.refetch()}
              className="ml-3 rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-semibold hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--input-bg)] px-4 py-10 text-center text-sm text-[var(--text-muted)]">
            No swap transactions found for selected filters.
          </div>
        ) : (
          <>
            <DragScroll className="hidden overflow-x-auto md:block">
              <table className="min-w-[1300px] w-full text-left text-sm">
                <thead className="bg-[var(--input-bg)] text-xs uppercase text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <User size={12} /> User
                      </span>
                    </th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <Wallet size={12} /> Account
                      </span>
                    </th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <RefreshCcw size={12} /> Type
                      </span>
                    </th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <DollarSign size={12} /> Amount
                      </span>
                    </th>
                    <th className="px-4 py-3">Balance After</th>
                    <th className="px-4 py-3">Equity After</th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 size={12} /> Status
                      </span>
                    </th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <Search size={12} /> Remark
                      </span>
                    </th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={12} /> Created
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => (
                    <tr
                      key={item._id}
                      className="border-t border-[var(--card-border)] hover:bg-[var(--hover-bg)]/60 cursor-pointer"
                      onClick={() => goToUserView(item)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold">
                          {item.user?.name ?? "--"}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          {item.user?.email ?? "--"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs">
                          {item.account?.account_number ?? "--"}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          {item.account?.account_type ?? "--"}
                        </div>
                      </td>
                      <td className="px-4 py-3">{item.type ?? "--"}</td>
                      <td className="px-4 py-3 font-semibold text-rose-600">
                        {formatNumber(item.amount)}
                      </td>
                      <td className="px-4 py-3">
                        {formatNumber(item.balanceAfter)}
                      </td>
                      <td className="px-4 py-3">
                        {formatNumber(item.equityAfter)}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const meta = getStatusMeta(item.status);
                          const Icon = meta.Icon;
                          return (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.className}`}
                            >
                              <Icon size={11} />
                              {item.status ?? "--"}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {item.referenceType ?? "--"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {item.remark ?? "--"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {formatDateTime(item.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DragScroll>

            <div className="mt-3 grid grid-cols-1 gap-3 md:hidden">
              {rows.map((item) => (
                <MobileRowCard
                  key={`mobile-${item._id}`}
                  item={item}
                  onClick={() => goToUserView(item)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(nextLimit) => {
          setLimit(nextLimit);
          setPage(1);
        }}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function MobileRowCard({
  item,
  onClick,
}: {
  item: SwapTransaction;
  onClick: () => void;
}) {
  const statusMeta = getStatusMeta(item.status);
  const StatusIcon = statusMeta.Icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] p-3 text-left"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">
          {item.user?.name ?? "--"}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusMeta.className}`}
        >
          <StatusIcon size={11} />
          {item.status ?? "--"}
        </span>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        {item.user?.email ?? "--"}
      </p>

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <InfoField label="Account" value={item.account?.account_number ?? "--"} />
        <InfoField label="Type" value={item.type ?? "--"} />
        <InfoField label="Amount" value={formatNumber(item.amount)} />
        <InfoField label="Balance" value={formatNumber(item.balanceAfter)} />
        <InfoField label="Equity" value={formatNumber(item.equityAfter)} />
        <InfoField label="Created" value={formatDateTime(item.createdAt)} />
      </div>

      <p className="mt-2 text-[11px] text-[var(--text-muted)]">
        {item.remark ?? "--"}
      </p>
    </button>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}
