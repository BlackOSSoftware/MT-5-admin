"use client";

import {
  useCallback,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ClipboardCopy,
  Coins,
  DollarSign,
  Hash,
  Pencil,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  User,
  Wallet,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import GlobalLoader from "@/app/admin/components/ui/GlobalLoader";
import Modal from "@/app/admin/components/ui/Modal";
import Pagination from "@/app/admin/components/ui/pagination";
import DragScroll from "@/app/admin/components/ui/DragScroll";
import { useLiveQuotesBySymbols } from "@/hooks/useLiveQuotesBySymbols";
import { useTradeAdminOpenTrades } from "@/hooks/useTradeAdminOpenTrades";
import {
  useTradeAdminClosePosition,
  useTradeAdminDeleteTrade,
  useTradeAdminModifyPosition,
} from "@/hooks/useTradeAdminOrderActions";
import { getAccessTokenFromCookie } from "@/services/marketSocket.service";
import type {
  TradeAdminOpenTrade,
  TradeOrderKind,
  TradeOrderType,
  TradeSide,
  TradeSortDir,
} from "@/services/tradeAdmin.service";
import {
  displayAccountLabel,
  displayTicket,
  displayUserLabel,
} from "@/utils/displayIds";
import TradeEditModal from "@/app/admin/components/trades/TradeEditModal";

type OpenTradeFilters = {
  userId: string;
  accountId: string;
  symbol: string;
  positionId: string;
  side: "" | TradeSide;
  orderType: "" | TradeOrderType;
  orderKind: "" | TradeOrderKind;
  from: string;
  to: string;
  timeField: "openTime" | "createdAt" | "updatedAt";
  sortBy: "openTime" | "createdAt" | "updatedAt";
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

function getDefaultFilters(): OpenTradeFilters {
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
    timeField: "openTime",
    sortBy: "openTime",
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

function formatPrice(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) return "--";
  const digits = Math.abs(value) >= 100 ? 2 : 5;
  return formatNumber(value, digits);
}

function parseNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return null;
  return num;
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
  if (normalized === "OPEN")
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700";
  if (normalized === "CLOSE" || normalized === "CLOSED")
    return "border-rose-500/40 bg-rose-500/10 text-rose-700";
  return "border-slate-500/40 bg-slate-500/10 text-slate-700";
}

function getPnlClass(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value))
    return "text-[var(--text-muted)]";
  if (value > 0) return "text-emerald-600";
  if (value < 0) return "text-rose-600";
  return "text-[var(--text-muted)]";
}

export default function ActivePositionsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [copyToast, setCopyToast] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [draftFilters, setDraftFilters] = useState<OpenTradeFilters>(
    getDefaultFilters
  );
  const [filters, setFilters] = useState<OpenTradeFilters>(getDefaultFilters);

  const [positionActionOpen, setPositionActionOpen] = useState(false);
  const [positionAction, setPositionAction] = useState<TradeAdminOpenTrade | null>(
    null
  );
  const [positionActionError, setPositionActionError] = useState("");

  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [closeTarget, setCloseTarget] = useState<TradeAdminOpenTrade | null>(null);
  const [closeError, setCloseError] = useState("");

  const openTradesQuery = useTradeAdminOpenTrades({
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

  const modifyPositionMutation = useTradeAdminModifyPosition();
  const deleteTradeMutation = useTradeAdminDeleteTrade();
  const closePositionMutation = useTradeAdminClosePosition();

  const rows = useMemo(
    () => openTradesQuery.data?.data ?? [],
    [openTradesQuery.data?.data]
  );
  const pagination = openTradesQuery.data?.pagination;
  const total = pagination?.total ?? rows.length;
  const totalPages =
    pagination?.totalPages ?? Math.max(1, Math.ceil(total / Math.max(limit, 1)));

  const marketToken = getAccessTokenFromCookie();
  const symbols = useMemo(() => {
    const next = new Set<string>();
    rows.forEach((row) => {
      const symbol = (row.symbol ?? "").trim().toUpperCase();
      if (symbol) next.add(symbol);
    });
    return Array.from(next);
  }, [rows]);
  const liveQuotes = useLiveQuotesBySymbols(marketToken, symbols);

  const getLivePrice = useCallback(
    (trade: TradeAdminOpenTrade) => {
      const symbol = (trade.symbol ?? "").trim().toUpperCase();
      if (!symbol) return undefined;
      const quote = liveQuotes[symbol];
      if (!quote) return undefined;
      const bid = Number(quote.bid);
      const ask = Number(quote.ask);
      const side = (trade.side ?? "").toUpperCase();
      if (side === "BUY" && Number.isFinite(bid)) return bid;
      if (side === "SELL" && Number.isFinite(ask)) return ask;
      if (Number.isFinite(ask)) return ask;
      if (Number.isFinite(bid)) return bid;
      return undefined;
    },
    [liveQuotes]
  );

  const getLivePnl = useCallback(
    (trade: TradeAdminOpenTrade, livePrice?: number) => {
      const price = livePrice ?? getLivePrice(trade);
      if (price === undefined || !Number.isFinite(price)) return undefined;
      const openPrice = Number(trade.openPrice ?? trade.entryPrice);
      if (!Number.isFinite(openPrice)) return undefined;
      const volume = Number(trade.volume ?? 0);
      const contractSize = Number(trade.contractSize ?? 1);
      if (!Number.isFinite(volume) || !Number.isFinite(contractSize))
        return undefined;
      const side = (trade.side ?? "").toUpperCase();
      const diff = side === "SELL" ? openPrice - price : price - openPrice;
      return diff * volume * contractSize;
    },
    [getLivePrice]
  );

  const summary = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          volume: acc.volume + (row.volume ?? 0),
          margin: acc.margin + (row.marginUsed ?? 0),
          grossPnL: acc.grossPnL + (row.grossPnL ?? 0),
          commission: acc.commission + (row.commission ?? 0),
          swap: acc.swap + (row.swap ?? 0),
        }),
        { volume: 0, margin: 0, grossPnL: 0, commission: 0, swap: 0 }
      ),
    [rows]
  );

  const livePnlTotal = useMemo(
    () =>
      rows.reduce((acc, row) => {
        const livePnl = getLivePnl(row);
        if (!Number.isFinite(livePnl ?? NaN)) return acc;
        return acc + (livePnl ?? 0);
      }, 0),
    [rows, getLivePnl]
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

  const openPositionAction = (trade: TradeAdminOpenTrade) => {
    setPositionAction(trade);
    setPositionActionError("");
    setPositionActionOpen(true);
  };

  const closePositionAction = () => {
    setPositionActionOpen(false);
    setPositionAction(null);
    setPositionActionError("");
  };

  const handleDeleteLive = (trade: TradeAdminOpenTrade) => {
    if (!window.confirm(`Delete live position ${displayTicket(trade)}?`)) return;
    deleteTradeMutation.mutate(
      {
        kind: "LIVE",
        accountId: trade.accountId,
        userId: trade.userId,
        positionId: trade.positionId,
        tradeId: trade._id,
      },
      {
        onSuccess: () => {
          setCopyToast("Live position deleted.");
          setTimeout(() => setCopyToast(""), 1800);
          openTradesQuery.refetch();
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

  const handlePositionModifySubmit = (payload: Record<string, unknown>) => {
    modifyPositionMutation.mutate(
      {
        accountId: String(payload.accountId),
        positionId: String(payload.positionId),
        userId: String(payload.userId),
        volume:
          typeof payload.volume === "number" ? payload.volume : undefined,
        openPrice:
          typeof payload.openPrice === "number" ? payload.openPrice : undefined,
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
          setCopyToast("Position updated.");
          setTimeout(() => setCopyToast(""), 1800);
          closePositionAction();
          openTradesQuery.refetch();
        },
        onError: (err: unknown) => {
          const msg =
            typeof err === "object" && err !== null
              ? ((err as { response?: { data?: { message?: string } } }).response
                  ?.data?.message ??
                (err as { message?: string }).message)
              : undefined;
          setPositionActionError(msg || "Position update failed.");
        },
      }
    );
  };

  const openCloseConfirm = (trade: TradeAdminOpenTrade) => {
    setCloseTarget(trade);
    setCloseError("");
    setCloseConfirmOpen(true);
  };

  const closeCloseConfirm = () => {
    setCloseConfirmOpen(false);
    setCloseTarget(null);
    setCloseError("");
  };

  const handleClosePosition = () => {
    if (!closeTarget) return;
    closePositionMutation.mutate(
      {
        accountId: closeTarget.accountId,
        positionId: closeTarget.positionId,
        userId: closeTarget.userId,
      },
      {
        onSuccess: () => {
          setCopyToast("Position closed.");
          setTimeout(() => setCopyToast(""), 1800);
          closeCloseConfirm();
          openTradesQuery.refetch();
        },
        onError: (err: unknown) => {
          const msg =
            typeof err === "object" && err !== null
              ? ((err as { response?: { data?: { message?: string } } }).response
                  ?.data?.message ??
                (err as { message?: string }).message)
              : undefined;
          setCloseError(msg || "Close failed.");
        },
      }
    );
  };

  return (
    <div className="container-pad max-w-full space-y-4 text-[var(--foreground)] sm:space-y-5">
      <div className="rounded-2xl border border-[var(--card-border)] bg-gradient-to-br from-[var(--card-bg)] via-[var(--card-bg)] to-emerald-500/5 p-4 sm:p-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
          <Sparkles size={12} />
          Live Positions
        </div>
        <h1 className="mt-2 text-xl font-semibold sm:text-2xl">
          Active Positions
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Monitor open trades with filters and quick actions.
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
                side: value as OpenTradeFilters["side"],
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
                orderType: value as OpenTradeFilters["orderType"],
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
                orderKind: value as OpenTradeFilters["orderKind"],
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
                timeField: value as OpenTradeFilters["timeField"],
              }))
            }
            options={[
              { value: "openTime", label: "timeField: openTime" },
              { value: "createdAt", label: "timeField: createdAt" },
              { value: "updatedAt", label: "timeField: updatedAt" },
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
                sortBy: value as OpenTradeFilters["sortBy"],
              }))
            }
            options={[
              { value: "openTime", label: "sortBy: openTime" },
              { value: "createdAt", label: "sortBy: createdAt" },
              { value: "updatedAt", label: "sortBy: updatedAt" },
            ]}
          />
          <SelectField
            icon={<SlidersHorizontal size={13} />}
            value={draftFilters.sortDir}
            onChange={(value) =>
              setDraftFilters((prev) => ({
                ...prev,
                sortDir: value as OpenTradeFilters["sortDir"],
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <MetricCard
          label="Positions"
          value={String(total)}
          icon={<Hash size={13} />}
          tone="slate"
        />
        <MetricCard
          label="Total Volume"
          value={formatNumber(summary.volume, 4)}
          icon={<BarChart3 size={13} />}
          tone="sky"
        />
        <MetricCard
          label="Margin Used"
          value={formatNumber(summary.margin, 4)}
          icon={<ShieldCheck size={13} />}
          tone="amber"
        />
        <MetricCard
          label="Live PnL"
          value={formatNumber(livePnlTotal, 4)}
          icon={<DollarSign size={13} />}
          tone={livePnlTotal >= 0 ? "emerald" : "rose"}
          valueClassName={
            livePnlTotal >= 0 ? "text-emerald-600" : "text-rose-600"
          }
        />
        <MetricCard
          label="Commission"
          value={formatNumber(summary.commission, 4)}
          icon={<Coins size={13} />}
          tone="violet"
        />
        <MetricCard
          label="Swap"
          value={formatNumber(summary.swap, 4)}
          icon={<Coins size={13} />}
          tone="amber"
        />
      </div>

      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
        {openTradesQuery.isLoading ? (
          <div className="py-8">
            <GlobalLoader />
          </div>
        ) : openTradesQuery.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
            Failed to load active positions.
            <button
              type="button"
              onClick={() => openTradesQuery.refetch()}
              className="ml-3 rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-semibold hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--input-bg)] px-4 py-10 text-center text-sm text-[var(--text-muted)]">
            No open positions found for selected filters.
          </div>
        ) : (
          <>
            <DragScroll className="hidden overflow-x-auto md:block">
              <table className="min-w-[1700px] w-full text-left text-sm">
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
                        <DollarSign size={12} /> Live Price
                      </span>
                    </th>
                    <th className="px-4 py-3">SL</th>
                    <th className="px-4 py-3">TP</th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <DollarSign size={12} /> Live PnL
                      </span>
                    </th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck size={12} /> Margin
                      </span>
                    </th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={12} /> Open Time
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
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((trade) => {
                    const livePrice = getLivePrice(trade);
                    const livePnl = getLivePnl(trade, livePrice);

                    return (
                    <tr
                      key={trade._id}
                      className="border-t border-[var(--card-border)] hover:bg-[var(--hover-bg)]/60 cursor-pointer"
                      onClick={() => {
                        if (!trade.userId) return;
                        router.push(`/admin/users/users/view/${trade.userId}`);
                      }}
                    >
                        <td className="whitespace-nowrap px-4 py-3 font-semibold">
                          {trade.symbol || "--"}
                        </td>
                        <td className="px-4 py-3">
                          <SideBadge side={trade.side} />
                        </td>
                        <td className="px-4 py-3">
                          <OrderTypeBadge orderType={trade.orderType} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {formatNumber(trade.volume, 4)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {formatPrice(trade.openPrice)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {formatPrice(livePrice)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {formatPrice(trade.stopLoss ?? undefined)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {formatPrice(trade.takeProfit ?? undefined)}
                        </td>
                        <td
                          className={`whitespace-nowrap px-4 py-3 font-semibold ${getPnlClass(
                            livePnl
                          )}`}
                        >
                          {formatNumber(livePnl, 4)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {formatNumber(trade.marginUsed, 4)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs">
                          {formatDateTime(trade.openTime)}
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
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getStatusClass(
                              trade.status
                            )}`}
                          >
                            <CheckCircle2 size={11} />
                            {trade.status || "OPEN"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openPositionAction(trade);
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1 text-xs font-semibold hover:bg-[var(--hover-bg)]"
                            >
                              <Pencil size={12} />
                              Modify
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openCloseConfirm(trade);
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                            >
                              <XCircle size={12} />
                              Close
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLive(trade);
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-500/20"
                            >
                              <Trash2 size={12} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </DragScroll>

            <div className="space-y-3 md:hidden">
              {rows.map((trade) => {
                const livePrice = getLivePrice(trade);
                const livePnl = getLivePnl(trade, livePrice);

                return (
                  <MobileTradeCard
                    key={`mobile-${trade._id}`}
                    trade={trade}
                    livePrice={livePrice}
                    livePnl={livePnl}
                    onCopy={handleCopy}
                    onModify={openPositionAction}
                    onClose={openCloseConfirm}
                  />
                );
              })}
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
        open={positionActionOpen}
        mode="live"
        trade={
          positionAction
            ? {
                accountId: positionAction.accountId,
                userId: positionAction.userId,
                positionId: positionAction.positionId,
                ticket: positionAction.ticket,
                accountNumber: positionAction.accountNumber,
                symbol: positionAction.symbol,
                side: String(positionAction.side),
                volume: positionAction.volume,
                openPrice: positionAction.openPrice,
                stopLoss: positionAction.stopLoss,
                takeProfit: positionAction.takeProfit,
              }
            : null
        }
        saving={modifyPositionMutation.isPending}
        error={positionActionError}
        onClose={closePositionAction}
        onSubmit={handlePositionModifySubmit}
      />
      <Modal
        title="Close Position"
        open={closeConfirmOpen}
        onClose={closeCloseConfirm}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeCloseConfirm}
              className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold hover:bg-[var(--hover-bg)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleClosePosition}
              disabled={closePositionMutation.isPending || !closeTarget}
              className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {closePositionMutation.isPending ? "Closing..." : "Confirm Close"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {closeError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {closeError}
            </div>
          ) : null}
          {!closeTarget ? (
            <p className="text-sm text-[var(--text-muted)]">
              No position selected.
            </p>
          ) : (
            <>
              <div className="rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] p-3 text-sm">
                <p className="font-semibold">
                  {closeTarget.symbol} · {closeTarget.side}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Position ID: {displayTicket(closeTarget)}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Account: {displayAccountLabel(closeTarget)}
                </p>
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                This will close the position at market price. Continue?
              </p>
            </>
          )}
        </div>
      </Modal>
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
      <ClipboardCopy size={10} />
    </button>
  );
}

function FieldControl({
  icon: Icon,
  children,
}: {
  icon: typeof Hash;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2">
      <Icon size={14} className="text-[var(--text-muted)]" />
      {children}
    </div>
  );
}

function MobileTradeCard({
  trade,
  livePrice,
  livePnl,
  onCopy,
  onModify,
  onClose,
}: {
  trade: TradeAdminOpenTrade;
  livePrice?: number;
  livePnl?: number;
  onCopy: (value: string, label: string) => void;
  onModify: (trade: TradeAdminOpenTrade) => void;
  onClose: (trade: TradeAdminOpenTrade) => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-gradient-to-br from-[var(--input-bg)] via-[var(--input-bg)] to-emerald-500/[0.05] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1 text-sm font-semibold">
          <BarChart3 size={14} className="text-emerald-600" />
          {trade.symbol || "--"}
        </p>
        <SideBadge side={trade.side} />
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <SmallField label="Order" value={trade.orderType || "--"} />
        <SmallField label="Volume" value={formatNumber(trade.volume, 4)} />
        <SmallField label="Open Price" value={formatPrice(trade.openPrice)} />
        <SmallField label="Live Price" value={formatPrice(livePrice)} />
        <SmallField label="SL" value={formatPrice(trade.stopLoss ?? undefined)} />
        <SmallField label="TP" value={formatPrice(trade.takeProfit ?? undefined)} />
        <SmallField
          label="PnL"
          value={formatNumber(livePnl, 4)}
          valueClassName={getPnlClass(livePnl)}
        />
        <SmallField label="Margin" value={formatNumber(trade.marginUsed, 4)} />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-[var(--text-muted)]">Live PnL</span>
        <span className={`font-semibold ${getPnlClass(livePnl)}`}>
          {formatNumber(livePnl, 4)}
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
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onModify(trade)}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1.5 text-xs font-semibold hover:bg-[var(--hover-bg)]"
        >
          <Pencil size={12} />
          Modify
        </button>
        <button
          type="button"
          onClick={() => onClose(trade)}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
        >
          <XCircle size={12} />
          Close
        </button>
      </div>
    </div>
  );
}

function SmallField({
  label,
  value,
  valueClassName = "",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p
        className={`mt-0.5 text-xs font-semibold text-[var(--foreground)] ${valueClassName}`}
      >
        {value}
      </p>
    </div>
  );
}
