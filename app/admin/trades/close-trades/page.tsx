"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Clock3,
  Coins,
  Copy,
  DollarSign,
  Hash,
  Pencil,
  Search,
  Trash2,
  SlidersHorizontal,
  Sparkles,
  User,
  Wallet,
} from "lucide-react";
import GlobalLoader from "@/app/admin/components/ui/GlobalLoader";
import Pagination from "@/app/admin/components/ui/pagination";
import DragScroll from "@/app/admin/components/ui/DragScroll";
import { useTradeAdminClosedTrades } from "@/hooks/useTradeAdminClosedTrades";
import {
  useTradeAdminDeleteTrade,
  useTradeAdminModifyClosedTrade,
} from "@/hooks/useTradeAdminOrderActions";
import type {
  TradeAdminClosedTrade,
  TradeOrderKind,
  TradeOrderType,
  TradeSide,
  TradeSortDir,
  TradeTimeField,
} from "@/services/tradeAdmin.service";
import {
  displayAccountLabel,
  displayTicket,
  displayUserLabel,
} from "@/utils/displayIds";
import TradeEditModal from "@/app/admin/components/trades/TradeEditModal";

type ClosedTradeFilters = {
  userId: string;
  accountId: string;
  symbol: string;
  positionId: string;
  side: "" | TradeSide;
  orderType: "" | TradeOrderType;
  orderKind: "" | TradeOrderKind;
  from: string;
  to: string;
  timeField: TradeTimeField;
  sortBy: TradeTimeField;
  sortDir: TradeSortDir;
};

function getDefaultFromDate() {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().slice(0, 10);
}

function getDefaultToDate() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultFilters(): ClosedTradeFilters {
  return {
    userId: "",
    accountId: "",
    symbol: "",
    positionId: "",
    side: "",
    orderType: "",
    orderKind: "",
    from: getDefaultFromDate(),
    to: getDefaultToDate(),
    timeField: "closeTime",
    sortBy: "closeTime",
    sortDir: "desc",
  };
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
    second: "2-digit",
    hour12: false,
  });
}

function normalizeDateTime(value: string, kind: "start" | "end") {
  if (!value) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return kind === "start"
      ? `${value}T00:00:00.000Z`
      : `${value}T23:59:59.999Z`;
  }
  return value;
}

function formatNumber(value?: number, digits = 2) {
  if (value === undefined || value === null || Number.isNaN(value)) return "--";
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatTradeDuration(openTime?: string, closeTime?: string) {
  if (!openTime || !closeTime) return "--";
  const openedAt = new Date(openTime).getTime();
  const closedAt = new Date(closeTime).getTime();
  if (Number.isNaN(openedAt) || Number.isNaN(closedAt) || closedAt < openedAt) {
    return "--";
  }

  let totalSeconds = Math.floor((closedAt - openedAt) / 1000);
  const days = Math.floor(totalSeconds / 86400);
  totalSeconds %= 86400;
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(" ");
}

function getSideMeta(side?: string) {
  const normalizedSide = (side ?? "").toUpperCase();

  if (normalizedSide === "BUY") {
    return {
      label: "BUY",
      Icon: ArrowUpRight,
      className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
    };
  }

  if (normalizedSide === "SELL") {
    return {
      label: "SELL",
      Icon: ArrowDownRight,
      className: "border-rose-500/40 bg-rose-500/10 text-rose-700",
    };
  }

  return {
    label: normalizedSide || "--",
    Icon: Hash,
    className: "border-slate-500/40 bg-slate-500/10 text-slate-700",
  };
}

function getOrderTypeClass(orderType?: string) {
  const normalized = (orderType ?? "").toUpperCase();
  if (normalized === "MARKET")
    return "border-violet-500/40 bg-violet-500/10 text-violet-700";
  if (normalized.includes("LIMIT"))
    return "border-sky-500/40 bg-sky-500/10 text-sky-700";
  if (normalized.includes("STOP"))
    return "border-amber-500/40 bg-amber-500/10 text-amber-700";
  return "border-slate-500/40 bg-slate-500/10 text-slate-700";
}

export default function ClosedTradesPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [copyToast, setCopyToast] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [draftFilters, setDraftFilters] = useState<ClosedTradeFilters>(
    getDefaultFilters
  );
  const [filters, setFilters] = useState<ClosedTradeFilters>(getDefaultFilters);
  const [editOpen, setEditOpen] = useState(false);
  const [editTrade, setEditTrade] = useState<TradeAdminClosedTrade | null>(null);
  const [editError, setEditError] = useState("");
  const modifyClosedMutation = useTradeAdminModifyClosedTrade();
  const deleteTradeMutation = useTradeAdminDeleteTrade();

  const closedTradesQuery = useTradeAdminClosedTrades({
    page,
    limit,
    userId: filters.userId || undefined,
    accountId: filters.accountId || undefined,
    symbol: filters.symbol || undefined,
    positionId: filters.positionId || undefined,
    side: filters.side || undefined,
    orderType: filters.orderType || undefined,
    orderKind: filters.orderType ? undefined : filters.orderKind || undefined,
    from: filters.from ? normalizeDateTime(filters.from, "start") : undefined,
    to: filters.to ? normalizeDateTime(filters.to, "end") : undefined,
    timeField: filters.timeField || undefined,
    sortBy: filters.sortBy || filters.timeField || undefined,
    sortDir: filters.sortDir || undefined,
  });

  const rows = useMemo(
    () => closedTradesQuery.data?.data ?? [],
    [closedTradesQuery.data?.data]
  );
  const pagination = closedTradesQuery.data?.pagination;
  const total = pagination?.total ?? rows.length;
  const totalPages =
    pagination?.totalPages ?? Math.max(1, Math.ceil(total / Math.max(limit, 1)));

  const summary = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          spread: acc.spread + (row.spread ?? 0),
          commission: acc.commission + (row.commission ?? 0),
          swap: acc.swap + (row.swap ?? 0),
          realizedPnL: acc.realizedPnL + (row.realizedPnL ?? 0),
        }),
        { spread: 0, commission: 0, swap: 0, realizedPnL: 0 }
      ),
    [rows]
  );

  const applyFilters = () => {
    setFilters({
      ...draftFilters,
      symbol: draftFilters.symbol.trim().toUpperCase(),
      userId: draftFilters.userId.trim(),
      accountId: draftFilters.accountId.trim(),
      positionId: draftFilters.positionId.trim(),
    });
    setPage(1);
  };

  const resetFilters = () => {
    const next = getDefaultFilters();
    setDraftFilters(next);
    setFilters(next);
    setPage(1);
  };

  const handleCopy = async (value: string, label: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopyToast(`${label} copied`);
      setTimeout(() => setCopyToast(""), 1800);
    } catch {
      setCopyToast("Copy failed");
      setTimeout(() => setCopyToast(""), 1800);
    }
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditTrade(null);
    setEditError("");
  };

  const handleDeleteClosed = (trade: TradeAdminClosedTrade) => {
    if (!window.confirm(`Delete closed trade ${displayTicket(trade)}?`)) {
      return;
    }
    deleteTradeMutation.mutate(
      {
        kind: "CLOSED",
        accountId: trade.accountId,
        userId: trade.userId,
        tradeId: trade._id,
        positionId: trade.positionId,
      },
      {
        onSuccess: () => {
          setCopyToast("Closed trade deleted.");
          setTimeout(() => setCopyToast(""), 2000);
          closedTradesQuery.refetch();
        },
        onError: (err: unknown) => {
          const msg =
            typeof err === "object" && err !== null
              ? ((err as { response?: { data?: { message?: string } } }).response
                  ?.data?.message ??
                (err as { message?: string }).message)
              : undefined;
          setCopyToast(msg || "Delete failed.");
          setTimeout(() => setCopyToast(""), 2200);
        },
      }
    );
  };

  const handleClosedEditSubmit = (payload: Record<string, unknown>) => {
    modifyClosedMutation.mutate(
      {
        tradeId: String(payload.tradeId),
        accountId: String(payload.accountId),
        userId: String(payload.userId),
        volume:
          typeof payload.volume === "number" ? payload.volume : undefined,
        openPrice:
          typeof payload.openPrice === "number" ? payload.openPrice : undefined,
        closePrice:
          typeof payload.closePrice === "number"
            ? payload.closePrice
            : undefined,
        stopLoss:
          payload.stopLoss === undefined
            ? undefined
            : (payload.stopLoss as number | null),
        takeProfit:
          payload.takeProfit === undefined
            ? undefined
            : (payload.takeProfit as number | null),
        commission:
          typeof payload.commission === "number"
            ? payload.commission
            : undefined,
        spread:
          typeof payload.spread === "number" ? payload.spread : undefined,
        swap: typeof payload.swap === "number" ? payload.swap : undefined,
        realizedPnL:
          typeof payload.realizedPnL === "number"
            ? payload.realizedPnL
            : undefined,
        closeReason:
          payload.closeReason === undefined
            ? undefined
            : (payload.closeReason as string | null),
      },
      {
        onSuccess: () => {
          setCopyToast("Closed trade updated.");
          setTimeout(() => setCopyToast(""), 1800);
          closeEdit();
          closedTradesQuery.refetch();
        },
        onError: (err: unknown) => {
          const msg =
            typeof err === "object" && err !== null
              ? ((err as { response?: { data?: { message?: string } } }).response
                  ?.data?.message ??
                (err as { message?: string }).message)
              : undefined;
          setEditError(msg || "Closed trade update failed.");
        },
      }
    );
  };

  return (
    <div className="container-pad max-w-full space-y-4 text-[var(--foreground)] sm:space-y-5">
      <div className="rounded-2xl border border-[var(--card-border)] bg-gradient-to-br from-[var(--card-bg)] via-[var(--card-bg)] to-sky-500/5 p-4 sm:p-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-700">
          <Sparkles size={12} />
          Trade Analytics
        </div>
        <h1 className="mt-2 text-xl font-semibold sm:text-2xl">Closed Trades</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Filter by user, account, symbol, side, order type, and date range.
        </p>

        <button
          type="button"
          onClick={() => setMobileFiltersOpen((prev) => !prev)}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-semibold hover:bg-[var(--hover-bg)] md:hidden"
        >
          <SlidersHorizontal size={14} />
          {mobileFiltersOpen ? "Hide Filters" : "Show Filters"}
        </button>

        <div
          className={`mt-4 grid grid-cols-1 gap-3 md:grid md:grid-cols-2 xl:grid-cols-4 ${
            mobileFiltersOpen ? "grid" : "hidden md:grid"
          }`}
        >
          <InputField
            icon={<User size={14} />}
            placeholder="User ID"
            value={draftFilters.userId}
            onChange={(value) =>
              setDraftFilters((prev) => ({ ...prev, userId: value }))
            }
          />
          <InputField
            icon={<Wallet size={14} />}
            placeholder="Account ID"
            value={draftFilters.accountId}
            onChange={(value) =>
              setDraftFilters((prev) => ({ ...prev, accountId: value }))
            }
          />
          <InputField
            icon={<Search size={14} />}
            placeholder="Symbol (e.g. BTCUSD)"
            value={draftFilters.symbol}
            onChange={(value) =>
              setDraftFilters((prev) => ({ ...prev, symbol: value }))
            }
          />
          <InputField
            icon={<Hash size={14} />}
            placeholder="Position ID"
            value={draftFilters.positionId}
            onChange={(value) =>
              setDraftFilters((prev) => ({ ...prev, positionId: value }))
            }
          />

          <SelectField
            icon={<ArrowUpRight size={13} />}
            value={draftFilters.side}
            onChange={(value) =>
              setDraftFilters((prev) => ({
                ...prev,
                side: value as ClosedTradeFilters["side"],
              }))
            }
            options={[
              { value: "", label: "All Side" },
              { value: "BUY", label: "BUY" },
              { value: "SELL", label: "SELL" },
            ]}
          />
          <SelectField
            icon={<BarChart3 size={13} />}
            value={draftFilters.orderType}
            onChange={(value) =>
              setDraftFilters((prev) => ({
                ...prev,
                orderType: value as ClosedTradeFilters["orderType"],
              }))
            }
            options={[
              { value: "", label: "All Order Type" },
              { value: "MARKET", label: "MARKET" },
              { value: "BUY_LIMIT", label: "BUY_LIMIT" },
              { value: "SELL_LIMIT", label: "SELL_LIMIT" },
              { value: "BUY_STOP", label: "BUY_STOP" },
              { value: "SELL_STOP", label: "SELL_STOP" },
            ]}
          />
          <SelectField
            icon={<SlidersHorizontal size={13} />}
            value={draftFilters.orderKind}
            disabled={Boolean(draftFilters.orderType)}
            onChange={(value) =>
              setDraftFilters((prev) => ({
                ...prev,
                orderKind: value as ClosedTradeFilters["orderKind"],
              }))
            }
            options={[
              { value: "", label: "All Order Kind" },
              { value: "MARKET", label: "MARKET" },
              { value: "LIMIT", label: "LIMIT" },
              { value: "STOP", label: "STOP" },
            ]}
          />
          <SelectField
            icon={<Calendar size={13} />}
            value={draftFilters.timeField}
            onChange={(value) =>
              setDraftFilters((prev) => ({
                ...prev,
                timeField: value as ClosedTradeFilters["timeField"],
              }))
            }
            options={[
              { value: "closeTime", label: "timeField: closeTime" },
              { value: "openTime", label: "timeField: openTime" },
              { value: "createdAt", label: "timeField: createdAt" },
            ]}
          />

          <InputField
            icon={<Calendar size={14} />}
            type="date"
            value={draftFilters.from}
            onChange={(value) =>
              setDraftFilters((prev) => ({ ...prev, from: value }))
            }
          />
          <InputField
            icon={<Calendar size={14} />}
            type="date"
            value={draftFilters.to}
            onChange={(value) =>
              setDraftFilters((prev) => ({ ...prev, to: value }))
            }
          />
          <SelectField
            icon={<Calendar size={13} />}
            value={draftFilters.sortBy}
            onChange={(value) =>
              setDraftFilters((prev) => ({
                ...prev,
                sortBy: value as ClosedTradeFilters["sortBy"],
              }))
            }
            options={[
              { value: "closeTime", label: "sortBy: closeTime" },
              { value: "openTime", label: "sortBy: openTime" },
              { value: "createdAt", label: "sortBy: createdAt" },
            ]}
          />
          <SelectField
            icon={<SlidersHorizontal size={13} />}
            value={draftFilters.sortDir}
            onChange={(value) =>
              setDraftFilters((prev) => ({
                ...prev,
                sortDir: value as ClosedTradeFilters["sortDir"],
              }))
            }
            options={[
              { value: "desc", label: "sortDir: desc" },
              { value: "asc", label: "sortDir: asc" },
            ]}
          />
        </div>

        <div
          className={`mt-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center ${
            mobileFiltersOpen ? "grid" : "hidden md:flex"
          }`}
        >
          <button
            type="button"
            onClick={applyFilters}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-1)] hover:bg-[var(--primary-dark)] sm:w-auto"
          >
            <SlidersHorizontal size={14} />
            Apply Filters
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold hover:bg-[var(--hover-bg)] sm:w-auto"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          label="Records"
          value={String(total)}
          icon={<Hash size={13} />}
          tone="slate"
        />
        <MetricCard
          label="Spread Total"
          value={formatNumber(summary.spread, 4)}
          icon={<BarChart3 size={13} />}
          tone="sky"
        />
        <MetricCard
          label="Commission Total"
          value={formatNumber(summary.commission, 4)}
          icon={<DollarSign size={13} />}
          tone="violet"
        />
        <MetricCard
          label="Swap Total"
          value={formatNumber(summary.swap, 4)}
          icon={<Coins size={13} />}
          tone="amber"
        />
        <MetricCard
          label="Realized PnL"
          value={formatNumber(summary.realizedPnL)}
          icon={<DollarSign size={13} />}
          tone={summary.realizedPnL >= 0 ? "emerald" : "rose"}
          valueClassName={
            summary.realizedPnL >= 0 ? "text-emerald-600" : "text-rose-600"
          }
        />
      </div>

      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
        {closedTradesQuery.isLoading ? (
          <div className="py-8">
            <GlobalLoader />
          </div>
        ) : closedTradesQuery.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
            Failed to load closed trades.
            <button
              type="button"
              onClick={() => closedTradesQuery.refetch()}
              className="ml-3 rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-semibold hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--input-bg)] px-4 py-10 text-center text-sm text-[var(--text-muted)]">
            No closed trades found for selected filters.
          </div>
        ) : (
          <>
            <DragScroll className="hidden overflow-x-auto md:block">
              <table className="min-w-[1500px] w-full text-left text-sm">
                <thead className="bg-[var(--input-bg)] text-xs uppercase text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <BarChart3 size={12} /> Symbol
                      </span>
                    </th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <ArrowUpRight size={12} /> Side
                      </span>
                    </th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <SlidersHorizontal size={12} /> Order Type
                      </span>
                    </th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <Hash size={12} /> Volume
                      </span>
                    </th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <DollarSign size={12} /> Open Price
                      </span>
                    </th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <DollarSign size={12} /> Close Price
                      </span>
                    </th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <Coins size={12} /> Spread
                      </span>
                    </th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <Coins size={12} /> Commission
                      </span>
                    </th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <Coins size={12} /> Swap
                      </span>
                    </th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <DollarSign size={12} /> Realized PnL
                      </span>
                    </th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={12} /> Open Time
                      </span>
                    </th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={12} /> Close Time
                      </span>
                    </th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 size={12} /> Duration
                      </span>
                    </th>
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
                        <Hash size={12} /> Position ID
                      </span>
                    </th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((trade) => (
                    <tr
                      key={trade._id}
                      className="border-t border-[var(--card-border)] hover:bg-[var(--hover-bg)]/60"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-semibold">{trade.symbol || "--"}</td>
                      <td className="px-4 py-3">
                        <SideBadge side={trade.side} />
                      </td>
                      <td className="px-4 py-3">
                        <OrderTypeBadge orderType={trade.orderType} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">{formatNumber(trade.volume, 4)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatNumber(trade.openPrice, 5)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatNumber(trade.closePrice, 5)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatNumber(trade.spread, 4)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatNumber(trade.commission, 4)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatNumber(trade.swap, 4)}</td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 font-semibold ${
                          (trade.realizedPnL ?? 0) >= 0
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        {formatNumber(trade.realizedPnL)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        {formatDateTime(trade.openTime)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        {formatDateTime(trade.closeTime)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-sky-700">
                        {formatTradeDuration(trade.openTime, trade.closeTime)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        <div className="inline-flex items-center gap-1.5">
                          {displayUserLabel(trade)}
                          <CopyBtn
                            onClick={() =>
                              handleCopy(
                                trade.userEmail || trade.userId,
                                "User"
                              )
                            }
                          />
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                        <div className="inline-flex items-center gap-1.5">
                          {displayAccountLabel(trade)}
                          <CopyBtn
                            onClick={() =>
                              handleCopy(
                                trade.accountNumber || trade.accountId,
                                "Account"
                              )
                            }
                          />
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                        <div className="inline-flex items-center gap-1.5">
                          {displayTicket(trade)}
                          <CopyBtn
                            onClick={() =>
                              handleCopy(displayTicket(trade), "Position ID")
                            }
                          />
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditTrade(trade);
                              setEditError("");
                              setEditOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1 text-xs font-semibold hover:bg-[var(--hover-bg)]"
                          >
                            <Pencil size={12} />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClosed(trade)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-500/20"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DragScroll>

            <div className="space-y-3 md:hidden">
              {rows.map((trade) => (
                <MobileTradeCard
                  key={`mobile-${trade._id}`}
                  trade={trade}
                  onCopy={handleCopy}
                  onEdit={() => {
                    setEditTrade(trade);
                    setEditError("");
                    setEditOpen(true);
                  }}
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

      {copyToast ? (
        <div className="fixed bottom-5 right-5 z-50 rounded-md bg-[var(--foreground)] px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
          {copyToast}
        </div>
      ) : null}

      <TradeEditModal
        open={editOpen}
        mode="closed"
        trade={
          editTrade
            ? {
                accountId: editTrade.accountId,
                userId: editTrade.userId,
                tradeId: editTrade._id,
                positionId: editTrade.positionId,
                ticket: editTrade.ticket,
                accountNumber: editTrade.accountNumber,
                symbol: editTrade.symbol,
                side: String(editTrade.side),
                volume: editTrade.volume,
                openPrice: editTrade.openPrice,
                closePrice: editTrade.closePrice,
                contractSize: editTrade.contractSize,
                stopLoss: editTrade.stopLoss,
                takeProfit: editTrade.takeProfit,
                commission: editTrade.commission,
                spread: editTrade.spread,
                swap: editTrade.swap,
                realizedPnL: editTrade.realizedPnL,
                closeReason: editTrade.closeReason,
              }
            : null
        }
        saving={modifyClosedMutation.isPending}
        error={editError}
        onClose={closeEdit}
        onSubmit={handleClosedEditSubmit}
      />
    </div>
  );
}

function InputField({
  value,
  onChange,
  placeholder = "",
  type = "text",
  icon,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "date";
  icon?: ReactNode;
}) {
  return (
    <div className="relative">
      {icon ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
          {icon}
        </span>
      ) : null}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] py-2 pr-3 text-[13px] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 sm:text-sm ${
          icon ? "pl-9" : "pl-3"
        }`}
      />
    </div>
  );
}

function SelectField({
  value,
  onChange,
  options,
  disabled = false,
  icon,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className="relative">
      {icon ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
          {icon}
        </span>
      ) : null}
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] py-2 pr-3 text-[13px] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm ${
          icon ? "pl-9" : "pl-3"
        }`}
      >
        {options.map((option) => (
          <option key={option.value || option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone,
  valueClassName = "",
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone: "slate" | "sky" | "violet" | "amber" | "emerald" | "rose";
  valueClassName?: string;
}) {
  const toneClasses: Record<typeof tone, string> = {
    slate: "border-slate-400/30 bg-slate-500/[0.04]",
    sky: "border-sky-400/30 bg-sky-500/[0.05]",
    violet: "border-violet-400/30 bg-violet-500/[0.05]",
    amber: "border-amber-400/30 bg-amber-500/[0.05]",
    emerald: "border-emerald-400/30 bg-emerald-500/[0.05]",
    rose: "border-rose-400/30 bg-rose-500/[0.05]",
  };

  return (
    <div className={`rounded-xl border p-3 ${toneClasses[tone]}`}>
      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <div className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-md bg-[var(--card-bg)] text-[var(--text-muted)]">
        {icon}
      </div>
      <p className={`mt-1 text-lg font-semibold text-[var(--foreground)] ${valueClassName}`}>
        {value}
      </p>
    </div>
  );
}

function MobileTradeCard({
  trade,
  onCopy,
  onEdit,
}: {
  trade: TradeAdminClosedTrade;
  onCopy: (value: string, label: string) => void;
  onEdit: () => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-gradient-to-br from-[var(--input-bg)] via-[var(--input-bg)] to-sky-500/[0.04] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1 text-sm font-semibold">
          <BarChart3 size={14} className="text-sky-600" />
          {trade.symbol || "--"}
        </p>
        <div className="flex items-center gap-2">
          <SideBadge side={trade.side} />
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1 text-[10px] font-semibold hover:bg-[var(--hover-bg)]"
          >
            <Pencil size={11} />
            Edit
          </button>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <SmallField label="Order" value={trade.orderType || "--"} />
        <SmallField label="Volume" value={formatNumber(trade.volume, 4)} />
        <SmallField label="Open" value={formatNumber(trade.openPrice, 5)} />
        <SmallField label="Close" value={formatNumber(trade.closePrice, 5)} />
        <SmallField label="Spread" value={formatNumber(trade.spread, 4)} />
        <SmallField label="Commission" value={formatNumber(trade.commission, 4)} />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-[var(--text-muted)]">Realized PnL</span>
        <span
          className={`font-semibold ${
            (trade.realizedPnL ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          {formatNumber(trade.realizedPnL)}
        </span>
      </div>

      <p className="mt-2 flex items-start gap-1 text-[11px] text-[var(--text-muted)]">
        <span className="break-all">User: {displayUserLabel(trade)}</span>
        <CopyBtn
          onClick={() => onCopy(trade.userEmail || trade.userId, "User")}
        />
      </p>
      <p className="flex items-start gap-1 text-[11px] text-[var(--text-muted)]">
        <span className="break-all">
          Account: {displayAccountLabel(trade)}
        </span>
        <CopyBtn
          onClick={() =>
            onCopy(trade.accountNumber || trade.accountId, "Account")
          }
        />
      </p>
      <p className="flex items-start gap-1 text-[11px] text-[var(--text-muted)]">
        <span className="break-all">
          Position ID: {displayTicket(trade)}
        </span>
        <CopyBtn
          onClick={() => onCopy(displayTicket(trade), "Position ID")}
        />
      </p>
      <p className="mt-1 text-[11px] text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1">
          <Calendar size={11} />
          Open: {formatDateTime(trade.openTime)}
        </span>
      </p>
      <p className="mt-1 text-[11px] text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1">
          <Calendar size={11} />
          Close: {formatDateTime(trade.closeTime)}
        </span>
      </p>
      <p className="mt-1 text-[11px] font-semibold text-sky-700">
        <span className="inline-flex items-center gap-1">
          <Clock3 size={11} />
          Duration: {formatTradeDuration(trade.openTime, trade.closeTime)}
        </span>
      </p>
    </div>
  );
}

function SmallField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function SideBadge({ side }: { side?: string }) {
  const meta = getSideMeta(side);
  const Icon = meta.Icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.className}`}
    >
      <Icon size={11} />
      {meta.label}
    </span>
  );
}

function OrderTypeBadge({ orderType }: { orderType?: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getOrderTypeClass(
        orderType
      )}`}
    >
      {orderType || "--"}
    </span>
  );
}

function CopyBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="inline-flex h-5 w-5 items-center justify-center rounded border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-muted)] hover:text-[var(--foreground)]"
      aria-label="Copy value"
      title="Copy"
    >
      <Copy size={10} />
    </button>
  );
}
