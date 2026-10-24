"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  FileText,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useRouter } from "next/navigation";
import GlobalLoader from "@/app/admin/components/ui/GlobalLoader";
import Pagination from "@/app/admin/components/ui/pagination";
import DragScroll from "@/app/admin/components/ui/DragScroll";
import { useTradeAdminBrokerage } from "@/hooks/useTradeAdminBrokerage";
import type { TradeAdminBrokerageItem } from "@/services/tradeAdmin.service";
import {
  displayAccountLabel,
  displayUserLabel,
} from "@/utils/displayIds";

function getDefaultFromDate() {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().slice(0, 10);
}

function getDefaultToDate() {
  return new Date().toISOString().slice(0, 10);
}

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

export default function BrokerageCommissionPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [draftSymbol, setDraftSymbol] = useState("");
  const [draftFrom, setDraftFrom] = useState(getDefaultFromDate);
  const [draftTo, setDraftTo] = useState(getDefaultToDate);

  const [symbol, setSymbol] = useState("");
  const [from, setFrom] = useState(getDefaultFromDate);
  const [to, setTo] = useState(getDefaultToDate);

  const brokerageQuery = useTradeAdminBrokerage({
    symbol: symbol || undefined,
    from: from || undefined,
    to: to || undefined,
    page,
    limit,
  });

  const rows = useMemo(
    () => brokerageQuery.data?.data ?? [],
    [brokerageQuery.data?.data]
  );
  const pagination = brokerageQuery.data?.pagination;
  const total = pagination?.total ?? rows.length;
  const totalPages =
    pagination?.totalPages ?? Math.max(1, Math.ceil(total / Math.max(limit, 1)));

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => ({
        spread: acc.spread + (row.spread ?? 0),
        commission: acc.commission + (row.commission ?? 0),
        swap: acc.swap + (row.swap ?? 0),
        pnl: acc.pnl + (row.pnl ?? 0),
      }),
      { spread: 0, commission: 0, swap: 0, pnl: 0 }
    );
  }, [rows]);

  const applyFilters = () => {
    setSymbol(draftSymbol.trim().toUpperCase());
    setFrom(draftFrom);
    setTo(draftTo);
    setPage(1);
  };

  const resetFilters = () => {
    const nextFrom = getDefaultFromDate();
    const nextTo = getDefaultToDate();
    setDraftSymbol("");
    setDraftFrom(nextFrom);
    setDraftTo(nextTo);
    setSymbol("");
    setFrom(nextFrom);
    setTo(nextTo);
    setPage(1);
  };

  return (
    <div className="container-pad max-w-full space-y-5 text-[var(--foreground)]">
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold sm:text-2xl">
            Brokerage & Commission
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Review spread, commission, swap, and PnL from trade-admin brokerage
            entries.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-4">
          <div className="relative lg:col-span-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              value={draftSymbol}
              onChange={(event) => setDraftSymbol(event.target.value)}
              placeholder="Symbol (e.g. BTCUSD)"
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
        <SummaryCard label="Spread Total" value={formatNumber(summary.spread)} />
        <SummaryCard
          label="Commission Total"
          value={formatNumber(summary.commission)}
        />
        <SummaryCard label="Swap Total" value={formatNumber(summary.swap)} />
        <SummaryCard
          label="PnL Total"
          value={formatNumber(summary.pnl)}
          valueClassName={summary.pnl >= 0 ? "text-emerald-600" : "text-rose-600"}
        />
      </div>

      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>
            Showing <span className="font-semibold text-[var(--foreground)]">{rows.length}</span>{" "}
            entries
          </span>
          {brokerageQuery.isFetching && !brokerageQuery.isLoading && (
            <span className="inline-flex items-center gap-1 text-[var(--primary)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--primary)]" />
              Updating
            </span>
          )}
        </div>

        {brokerageQuery.isLoading ? (
          <div className="py-8">
            <GlobalLoader />
          </div>
        ) : brokerageQuery.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
            Failed to load brokerage records.
            <button
              type="button"
              onClick={() => brokerageQuery.refetch()}
              className="ml-3 rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-semibold hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--input-bg)] px-4 py-10 text-center text-sm text-[var(--text-muted)]">
            No brokerage data found for selected filters.
          </div>
        ) : (
          <>
            <DragScroll className="hidden overflow-x-auto md:block">
              <table className="min-w-[1000px] w-full text-left text-sm">
                <thead className="bg-[var(--input-bg)] text-xs uppercase text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-3">Symbol</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Account</th>
                    <th className="px-4 py-3">Spread</th>
                    <th className="px-4 py-3">Commission</th>
                    <th className="px-4 py-3">Swap</th>
                    <th className="px-4 py-3">PnL</th>
                    <th className="px-4 py-3">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => (
                    <tr
                      key={item._id}
                      className="border-t border-[var(--card-border)] hover:bg-[var(--hover-bg)]/60 cursor-pointer"
                      onClick={() => {
                        if (!item.user_id) return;
                        router.push(`/admin/users/users/view/${item.user_id}`);
                      }}
                    >
                      <td className="px-4 py-3 font-semibold">{item.symbol || "--"}</td>
                      <td className="px-4 py-3 text-xs">
                        {displayUserLabel({
                          userId: item.user_id,
                          userName: item.userName || item.user_name,
                          userEmail: item.userEmail || item.user_email,
                        })}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {displayAccountLabel({
                          accountId: item.account_id,
                          accountNumber: item.accountNumber || item.account_number,
                        })}
                      </td>
                      <td className="px-4 py-3">{formatNumber(item.spread, 4)}</td>
                      <td className="px-4 py-3">{formatNumber(item.commission, 4)}</td>
                      <td className="px-4 py-3">{formatNumber(item.swap, 4)}</td>
                      <td
                        className={`px-4 py-3 font-semibold ${
                          (item.pnl ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {formatNumber(item.pnl)}
                      </td>
                      <td className="px-4 py-3 text-xs">{formatDateTime(item.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DragScroll>

            <div className="mt-3 grid grid-cols-1 gap-3 md:hidden">
              {rows.map((item) => (
                <MobileRowCard key={`mobile-${item._id}`} item={item} />
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
  valueClassName = "",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p className={`mt-1 text-lg font-semibold text-[var(--foreground)] ${valueClassName}`}>
        {value}
      </p>
    </div>
  );
}

function MobileRowCard({ item }: { item: TradeAdminBrokerageItem }) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] p-3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
          <FileText size={11} />
          {item.symbol || "--"}
        </span>
        <span
          className={`text-sm font-semibold ${
            (item.pnl ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          {formatNumber(item.pnl)}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <InfoField label="Spread" value={formatNumber(item.spread, 4)} />
        <InfoField label="Commission" value={formatNumber(item.commission, 4)} />
        <InfoField label="Swap" value={formatNumber(item.swap, 4)} />
        <InfoField label="Created" value={formatDateTime(item.createdAt)} />
      </div>

      <p className="mt-2 truncate text-[11px] text-[var(--text-muted)]">
        User:{" "}
        {displayUserLabel({
          userId: item.user_id,
          userName: item.userName || item.user_name,
          userEmail: item.userEmail || item.user_email,
        })}
      </p>
      <p className="truncate text-[11px] text-[var(--text-muted)]">
        Account:{" "}
        {displayAccountLabel({
          accountId: item.account_id,
          accountNumber: item.accountNumber || item.account_number,
        })}
      </p>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}
