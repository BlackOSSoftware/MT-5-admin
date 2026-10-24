"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock3,
  Copy,
  DollarSign,
  Hash,
  Pencil,
  Search,
  Trash2,
  SlidersHorizontal,
  Sparkles,
  Timer,
  User,
  Wallet,
  XCircle,
} from "lucide-react";
import GlobalLoader from "@/app/admin/components/ui/GlobalLoader";
import Pagination from "@/app/admin/components/ui/pagination";
import DragScroll from "@/app/admin/components/ui/DragScroll";
import { useTradeAdminPendingOrders } from "@/hooks/useTradeAdminPendingOrders";
import {
  useTradeAdminDeleteTrade,
  useTradeAdminModifyPendingOrder,
} from "@/hooks/useTradeAdminOrderActions";
import {
  displayAccountLabel,
  displayTicket,
  displayUserLabel,
} from "@/utils/displayIds";
import TradeEditModal from "@/app/admin/components/trades/TradeEditModal";
import type {
  TradeAdminPendingOrder,
  TradeAdminPendingOrderStatus,
  TradeOrderKind,
  TradeOrderType,
  TradeSide,
  TradeSortDir,
} from "@/services/tradeAdmin.service";

type PendingOrderFilters = {
  status: "ALL" | TradeAdminPendingOrderStatus;
  userId: string;
  accountId: string;
  orderId: string;
  executedPositionId: string;
  symbol: string;
  side: "" | TradeSide;
  orderType: "" | TradeOrderType;
  orderKind: "" | TradeOrderKind;
  timeField: "" | "createdAt" | "executedAt" | "cancelledAt" | "expireAt";
  from: string;
  to: string;
  sortBy: "" | "createdAt" | "executedAt" | "cancelledAt" | "expireAt";
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

function getDefaultFilters(): PendingOrderFilters {
  return {
    status: "ALL",
    userId: "",
    accountId: "",
    orderId: "",
    executedPositionId: "",
    symbol: "",
    side: "",
    orderType: "",
    orderKind: "",
    timeField: "createdAt",
    from: getDefaultFromDate(),
    to: getDefaultToDate(),
    sortBy: "createdAt",
    sortDir: "desc",
  };
}

function formatDateTime(value?: string | null) {
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

function formatNumber(value?: number | null, digits = 2) {
  if (value === undefined || value === null || Number.isNaN(value)) return "--";
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatCompactNumber(value?: number | null, maxDigits = 4) {
  if (value === undefined || value === null || Number.isNaN(value)) return "--";
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDigits,
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

function getStatusClass(status?: string) {
  const normalized = (status ?? "").toUpperCase();
  if (normalized === "EXECUTED")
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700";
  if (normalized === "CANCELLED")
    return "border-rose-500/40 bg-rose-500/10 text-rose-700";
  if (normalized === "EXPIRED")
    return "border-amber-500/40 bg-amber-500/10 text-amber-700";
  if (normalized === "REJECTED")
    return "border-slate-500/40 bg-slate-500/10 text-slate-700";
  return "border-slate-500/40 bg-slate-500/10 text-slate-700";
}

export default function PendingOrdersPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [copyToast, setCopyToast] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [draftFilters, setDraftFilters] = useState<PendingOrderFilters>(
    getDefaultFilters
  );
  const [filters, setFilters] = useState<PendingOrderFilters>(getDefaultFilters);
  const [editOpen, setEditOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<TradeAdminPendingOrder | null>(
    null
  );
  const [editError, setEditError] = useState("");
  const modifyPendingMutation = useTradeAdminModifyPendingOrder();
  const deleteTradeMutation = useTradeAdminDeleteTrade();

  const pendingOrdersQuery = useTradeAdminPendingOrders({
    page,
    limit,
    status: filters.status || undefined,
    symbol: filters.symbol || undefined,
    userId: filters.userId || undefined,
    accountId: filters.accountId || undefined,
    orderId: filters.orderId || undefined,
    executedPositionId: filters.executedPositionId || undefined,
    side: filters.side || undefined,
    orderType: filters.orderType || undefined,
    orderKind: filters.orderType ? undefined : filters.orderKind || undefined,
    from: filters.from ? normalizeDateTime(filters.from, "start") : undefined,
    to: filters.to ? normalizeDateTime(filters.to, "end") : undefined,
    timeField: filters.timeField || undefined,
    sortBy: filters.sortBy || undefined,
    sortDir: filters.sortDir || undefined,
  });

  const rows = useMemo(
    () => pendingOrdersQuery.data?.data ?? [],
    [pendingOrdersQuery.data?.data]
  );
  const pagination = pendingOrdersQuery.data?.pagination;
  const total = pagination?.total ?? rows.length;
  const totalPages =
    pagination?.totalPages ?? Math.max(1, Math.ceil(total / Math.max(limit, 1)));

  const summary = useMemo(
    () =>
      rows.reduce(
        (acc, row) => {
          const status = (row.status ?? "").toUpperCase();
          if (status === "EXECUTED") acc.executed += 1;
          else if (status === "CANCELLED") acc.cancelled += 1;
          else if (status === "EXPIRED") acc.expired += 1;
          else if (status === "REJECTED") acc.rejected += 1;
          return acc;
        },
        { executed: 0, cancelled: 0, expired: 0, rejected: 0 }
      ),
    [rows]
  );

  const applyFilters = () => {
    setFilters({
      ...draftFilters,
      symbol: draftFilters.symbol.trim().toUpperCase(),
      userId: draftFilters.userId.trim(),
      accountId: draftFilters.accountId.trim(),
      orderId: draftFilters.orderId.trim(),
      executedPositionId: draftFilters.executedPositionId.trim(),
      from: normalizeDateTime(draftFilters.from, "start"),
      to: normalizeDateTime(draftFilters.to, "end"),
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

  const isEditablePending = (order: TradeAdminPendingOrder) => {
    const status = (order.status ?? "").toUpperCase();
    return status === "PENDING" || status === "OPEN" || status === "";
  };

  const openEdit = (order: TradeAdminPendingOrder) => {
    setEditOrder(order);
    setEditError("");
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditOrder(null);
    setEditError("");
  };

  const handleDeletePending = (order: TradeAdminPendingOrder) => {
    if (!window.confirm(`Delete pending order ${displayTicket(order)}?`)) return;
    deleteTradeMutation.mutate(
      {
        kind: "PENDING",
        accountId: order.accountId,
        userId: order.userId,
        orderId: order.orderId,
      },
      {
        onSuccess: () => {
          setCopyToast("Pending order deleted.");
          setTimeout(() => setCopyToast(""), 1800);
          pendingOrdersQuery.refetch();
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

  const handlePendingEditSubmit = (payload: Record<string, unknown>) => {
    modifyPendingMutation.mutate(
      {
        accountId: String(payload.accountId),
        orderId: String(payload.orderId),
        userId: String(payload.userId),
        volume:
          typeof payload.volume === "number" ? payload.volume : undefined,
        price: typeof payload.price === "number" ? payload.price : undefined,
        stopLoss:
          payload.stopLoss === undefined
            ? undefined
            : (payload.stopLoss as number | null),
        takeProfit:
          payload.takeProfit === undefined
            ? undefined
            : (payload.takeProfit as number | null),
      },
      {
        onSuccess: () => {
          setCopyToast("Pending order updated.");
          setTimeout(() => setCopyToast(""), 1800);
          closeEdit();
          pendingOrdersQuery.refetch();
        },
        onError: (err: unknown) => {
          const msg =
            typeof err === "object" && err !== null
              ? ((err as { response?: { data?: { message?: string } } }).response
                  ?.data?.message ??
                (err as { message?: string }).message)
              : undefined;
          setEditError(msg || "Pending order update failed.");
        },
      }
    );
  };

  return (
    <div className="container-pad max-w-full space-y-4 text-[var(--foreground)] sm:space-y-5">
      <div className="rounded-2xl border border-[var(--card-border)] bg-gradient-to-br from-[var(--card-bg)] via-[var(--card-bg)] to-sky-500/5 p-4 sm:p-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-700">
          <Sparkles size={12} />
          Pending Order Analytics
        </div>
        <h1 className="mt-2 text-xl font-semibold sm:text-2xl">
          Pending Orders History
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Filter by user, account, symbol, status, side, order type, and date
          range.
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
            placeholder="Order ID"
            value={draftFilters.orderId}
            onChange={(value) =>
              setDraftFilters((prev) => ({ ...prev, orderId: value }))
            }
          />
          <InputField
            icon={<Hash size={14} />}
            placeholder="Executed Position ID"
            value={draftFilters.executedPositionId}
            onChange={(value) =>
              setDraftFilters((prev) => ({ ...prev, executedPositionId: value }))
            }
          />
          <SelectField
            icon={<CheckCircle2 size={13} />}
            value={draftFilters.status}
            onChange={(value) =>
              setDraftFilters((prev) => ({
                ...prev,
                status: value as PendingOrderFilters["status"],
              }))
            }
            options={[
              { value: "ALL", label: "Status: ALL" },
              { value: "EXECUTED", label: "Status: EXECUTED" },
              { value: "CANCELLED", label: "Status: CANCELLED" },
              { value: "EXPIRED", label: "Status: EXPIRED" },
              { value: "REJECTED", label: "Status: REJECTED" },
            ]}
          />
          <SelectField
            icon={<ArrowUpRight size={13} />}
            value={draftFilters.side}
            onChange={(value) =>
              setDraftFilters((prev) => ({
                ...prev,
                side: value as PendingOrderFilters["side"],
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
                orderType: value as PendingOrderFilters["orderType"],
              }))
            }
            options={[
              { value: "", label: "All Order Type" },
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
                orderKind: value as PendingOrderFilters["orderKind"],
              }))
            }
            options={[
              { value: "", label: "All Order Kind" },
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
                timeField: value as PendingOrderFilters["timeField"],
              }))
            }
            options={[
              { value: "createdAt", label: "timeField: createdAt" },
              { value: "executedAt", label: "timeField: executedAt" },
              { value: "cancelledAt", label: "timeField: cancelledAt" },
              { value: "expireAt", label: "timeField: expireAt" },
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
                sortBy: value as PendingOrderFilters["sortBy"],
              }))
            }
            options={[
              { value: "createdAt", label: "sortBy: createdAt" },
              { value: "executedAt", label: "sortBy: executedAt" },
              { value: "cancelledAt", label: "sortBy: cancelledAt" },
              { value: "expireAt", label: "sortBy: expireAt" },
            ]}
          />
          <SelectField
            icon={<SlidersHorizontal size={13} />}
            value={draftFilters.sortDir}
            onChange={(value) =>
              setDraftFilters((prev) => ({
                ...prev,
                sortDir: value as PendingOrderFilters["sortDir"],
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
          label="Executed"
          value={String(summary.executed)}
          icon={<CheckCircle2 size={13} />}
          tone="emerald"
        />
        <MetricCard
          label="Cancelled"
          value={String(summary.cancelled)}
          icon={<XCircle size={13} />}
          tone="rose"
        />
        <MetricCard
          label="Expired"
          value={String(summary.expired)}
          icon={<Clock3 size={13} />}
          tone="amber"
        />
        <MetricCard
          label="Rejected"
          value={String(summary.rejected)}
          icon={<XCircle size={13} />}
          tone="violet"
        />
      </div>

      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
        {pendingOrdersQuery.isLoading ? (
          <div className="py-8">
            <GlobalLoader />
          </div>
        ) : pendingOrdersQuery.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
            Failed to load pending orders history.
            <button
              type="button"
              onClick={() => pendingOrdersQuery.refetch()}
              className="ml-3 rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-semibold hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--input-bg)] px-4 py-10 text-center text-sm text-[var(--text-muted)]">
            No pending orders found for selected filters.
          </div>
        ) : (
          <>
            <DragScroll className="hidden overflow-x-auto md:block">
              <table className="min-w-[1600px] w-full text-left text-sm">
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
                        <DollarSign size={12} /> Price
                      </span>
                    </th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <Hash size={12} /> Volume
                      </span>
                    </th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 size={12} /> Status
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
                        <Hash size={12} /> Order ID
                      </span>
                    </th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <Hash size={12} /> Position ID
                      </span>
                    </th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={12} /> Created
                      </span>
                    </th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 size={12} /> Executed
                      </span>
                    </th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <XCircle size={12} /> Cancelled
                      </span>
                    </th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 size={12} /> Expire
                      </span>
                    </th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((order) => (
                    <tr
                      key={order._id}
                      className="border-t border-[var(--card-border)] hover:bg-[var(--hover-bg)]/60"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-semibold">
                        {order.symbol || "--"}
                      </td>
                      <td className="px-4 py-3">
                        <SideBadge side={order.side} />
                      </td>
                      <td className="px-4 py-3">
                        <OrderTypeBadge orderType={order.orderType} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {formatNumber(order.price, 5)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {formatCompactNumber(order.volume, 4)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        <CopyableValue
                          value={displayUserLabel(order)}
                          label="User"
                          onCopy={handleCopy}
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                        <CopyableValue
                          value={displayAccountLabel(order)}
                          label="Account"
                          onCopy={handleCopy}
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                        <CopyableValue
                          value={displayTicket(order)}
                          label="Order ID"
                          onCopy={handleCopy}
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                        <CopyableValue
                          value={order.executedPositionId || "--"}
                          label="Position ID"
                          onCopy={handleCopy}
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        {formatDateTime(order.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        {formatDateTime(order.executedAt ?? undefined)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        {formatDateTime(order.cancelledAt ?? undefined)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        {formatDateTime(order.expireAt ?? undefined)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          {isEditablePending(order) ? (
                            <button
                              type="button"
                              onClick={() => openEdit(order)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1 text-xs font-semibold hover:bg-[var(--hover-bg)]"
                            >
                              <Pencil size={12} />
                              Modify
                            </button>
                          ) : null}
                          {isEditablePending(order) ? (
                            <button
                              type="button"
                              onClick={() => handleDeletePending(order)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-500/20"
                            >
                              <Trash2 size={12} />
                              Delete
                            </button>
                          ) : (
                            <span className="text-xs text-[var(--text-muted)]">
                              —
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DragScroll>

            <div className="space-y-3 md:hidden">
              {rows.map((order) => (
                <MobileOrderCard
                  key={`mobile-${order._id}`}
                  order={order}
                  onCopy={handleCopy}
                  onEdit={
                    isEditablePending(order) ? () => openEdit(order) : undefined
                  }
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
        mode="pending"
        trade={
          editOrder
            ? {
                accountId: editOrder.accountId,
                userId: editOrder.userId,
                orderId: editOrder.orderId,
                ticket: editOrder.ticket,
                accountNumber: editOrder.accountNumber,
                symbol: editOrder.symbol,
                side: String(editOrder.side),
                volume: editOrder.volume,
                price: editOrder.price,
                stopLoss: editOrder.stopLoss,
                takeProfit: editOrder.takeProfit,
              }
            : null
        }
        saving={modifyPendingMutation.isPending}
        error={editError}
        onClose={closeEdit}
        onSubmit={handlePendingEditSubmit}
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

function MobileOrderCard({
  order,
  onCopy,
  onEdit,
}: {
  order: TradeAdminPendingOrder;
  onCopy: (value: string, label: string) => void;
  onEdit?: () => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-gradient-to-br from-[var(--input-bg)] via-[var(--input-bg)] to-sky-500/[0.04] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1 text-sm font-semibold">
          <Timer size={14} className="text-sky-600" />
          {order.symbol || "--"}
        </p>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1 text-[10px] font-semibold hover:bg-[var(--hover-bg)]"
            >
              <Pencil size={11} />
              Modify
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <SideBadge side={order.side} />
        <OrderTypeBadge orderType={order.orderType} />
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <SmallField label="Price" value={formatNumber(order.price, 5)} />
        <SmallField label="Volume" value={formatCompactNumber(order.volume, 4)} />
        <SmallField label="Stop Loss" value={formatNumber(order.stopLoss, 5)} />
        <SmallField
          label="Take Profit"
          value={formatNumber(order.takeProfit, 5)}
        />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <SmallField label="Created" value={formatDateTime(order.createdAt)} />
        <SmallField
          label="Executed"
          value={formatDateTime(order.executedAt ?? undefined)}
        />
        <SmallField
          label="Cancelled"
          value={formatDateTime(order.cancelledAt ?? undefined)}
        />
        <SmallField label="Expire" value={formatDateTime(order.expireAt ?? undefined)} />
      </div>

      <MobileIdRow
        label="User"
        value={displayUserLabel(order)}
        onCopy={onCopy}
      />
      <MobileIdRow
        label="Account"
        value={displayAccountLabel(order)}
        onCopy={onCopy}
      />
      <MobileIdRow
        label="Order ID"
        value={displayTicket(order)}
        onCopy={onCopy}
      />
      <MobileIdRow
        label="Position ID"
        value={order.executedPositionId || ""}
        onCopy={onCopy}
      />
    </div>
  );
}

function SmallField({ label, value }: { label: string; value: string }) {
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

function StatusBadge({ status }: { status?: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getStatusClass(
        status
      )}`}
    >
      {status || "--"}
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

function CopyableValue({
  value,
  label,
  onCopy,
}: {
  value?: string | null;
  label: string;
  onCopy: (value: string, label: string) => void;
}) {
  if (!value) return <span className="text-[var(--text-muted)]">--</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      {value}
      <CopyBtn onClick={() => onCopy(value, label)} />
    </span>
  );
}

function MobileIdRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value?: string;
  onCopy: (value: string, label: string) => void;
}) {
  const displayValue = value || "--";
  return (
    <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] min-w-0">
      <span className="min-w-0 truncate" title={`${label}: ${displayValue}`}>
        {label}: {displayValue}
      </span>
      {value ? <CopyBtn onClick={() => onCopy(value, `${label} ID`)} /> : null}
    </div>
  );
}
