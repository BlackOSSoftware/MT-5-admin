"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  Hash,
  Layers,
  Search,
  Tag,
  Target,
  User,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Modal from "@/app/admin/components/ui/Modal";
import { Toast } from "@/app/admin/components/ui/Toast";
import { useLiveQuotesBySymbols } from "@/hooks/useLiveQuotesBySymbols";
import { useInstrumentPrecisionMap } from "@/hooks/instruments/useInstrumentPrecisionMap";
import { getAccessTokenFromCookie } from "@/services/marketSocket.service";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useAdminUserAccounts } from "@/hooks/useAdminUserAccounts";
import {
  useTradeAdminPlaceMarketOrder,
  useTradeAdminPlacePendingOrder,
} from "@/hooks/useTradeAdminOrderActions";
import {
  searchInstruments,
  type InstrumentSearchItem,
} from "@/services/instrument.service";
import type { AdminUser } from "@/types/user";
import type { AdminAccount } from "@/types/account";
import type { TradeOrderType, TradeSide } from "@/services/tradeAdmin.service";
import { formatPrice } from "@/utils/priceFormat";

const SEGMENTS = ["CRYPTO", "FOREX", "ENERGY", "COMEX", "US Stocks", "US Indices"];
const MIN_VOLUME = 0.01;

const PENDING_ORDER_TYPES: Array<Exclude<TradeOrderType, "MARKET">> = [
  "BUY_LIMIT",
  "SELL_LIMIT",
  "BUY_STOP",
  "SELL_STOP",
];

function getSideFromOrderType(orderType: string): TradeSide {
  return orderType.startsWith("SELL") ? "SELL" : "BUY";
}

function parseNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return null;
  return num;
}

export default function CreateTradePage() {
  const router = useRouter();
  const [toast, setToast] = useState("");
  const [mode, setMode] = useState<"MARKET" | "PENDING">("MARKET");
  const [segment, setSegment] = useState("");

  const [instrumentQuery, setInstrumentQuery] = useState("");
  const [instrumentOpen, setInstrumentOpen] = useState(false);
  const [instrumentResults, setInstrumentResults] = useState<
    InstrumentSearchItem[]
  >([]);
  const [instrumentLoading, setInstrumentLoading] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<
    InstrumentSearchItem | null
  >(null);
  const [symbol, setSymbol] = useState("");

  const [userQuery, setUserQuery] = useState("");
  const [userOpen, setUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const [accountId, setAccountId] = useState("");

  const [side, setSide] = useState<TradeSide>("BUY");
  const [pendingOrderType, setPendingOrderType] = useState<
    Exclude<TradeOrderType, "MARKET">
  >("BUY_LIMIT");
  const [volume, setVolume] = useState("");
  const [price, setPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [formError, setFormError] = useState("");
  const [receipt, setReceipt] = useState<{
    title: string;
    message?: string;
    referenceId?: string;
    userId: string;
    userLabel: string;
    accountId: string;
    accountLabel: string;
    symbol: string;
    side: TradeSide;
    mode: "MARKET" | "PENDING";
    orderType?: string;
    volume: number;
    price?: number;
    stopLoss?: number | null;
    takeProfit?: number | null;
    createdAt: string;
    raw?: unknown;
  } | null>(null);

  const instrumentRef = useRef<HTMLDivElement | null>(null);
  const userRef = useRef<HTMLDivElement | null>(null);
  const token = getAccessTokenFromCookie();
  const { map: precisionMap } = useInstrumentPrecisionMap();
  const symbolUpper = symbol.trim().toUpperCase();
  const liveQuotes = useLiveQuotesBySymbols(
    token,
    symbolUpper ? [symbolUpper] : []
  );
  const liveQuote = symbolUpper ? liveQuotes[symbolUpper] : undefined;
  const effectiveSide =
    mode === "MARKET" ? side : getSideFromOrderType(pendingOrderType);

  const usersQuery = useAdminUsers({
    q: userQuery.trim() ? userQuery.trim() : undefined,
    page: 1,
    limit: 8,
  });

  const accountsQuery = useAdminUserAccounts({
    userId: selectedUser?._id,
    page: 1,
    limit: 50,
  });

  const marketMutation = useTradeAdminPlaceMarketOrder();
  const pendingMutation = useTradeAdminPlacePendingOrder();

  const isSubmitting = marketMutation.isPending || pendingMutation.isPending;

  const userOptions = usersQuery.data?.data ?? [];
  const accountOptions = useMemo(
    () => accountsQuery.data?.data ?? [],
    [accountsQuery.data?.data]
  );

  const selectedAccount = useMemo<AdminAccount | null>(() => {
    if (!accountId) return null;
    return accountOptions.find((acc) => acc._id === accountId) ?? null;
  }, [accountId, accountOptions]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleCloseReceipt = () => setReceipt(null);

  const symbolPrecision = precisionMap[symbolUpper] ?? 2;
  const formatQuoteValue = (value?: string) =>
    formatPrice(value, symbolPrecision);

  const liveBid = formatQuoteValue(liveQuote?.bid);
  const liveAsk = formatQuoteValue(liveQuote?.ask);
  const liveBest =
    effectiveSide === "BUY"
      ? liveAsk
      : effectiveSide === "SELL"
      ? liveBid
      : "--";

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (instrumentRef.current && !instrumentRef.current.contains(event.target as Node)) {
        setInstrumentOpen(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setUserOpen(false);
      }
    };
    document.addEventListener("mousedown", handler, true);
    return () => document.removeEventListener("mousedown", handler, true);
  }, []);

  useEffect(() => {
    if (!selectedUser) {
      setAccountId("");
      return;
    }
    const list = accountsQuery.data?.data ?? [];
    if (!list.length) {
      setAccountId("");
      return;
    }
    if (!accountId || !list.some((acc) => acc._id === accountId)) {
      setAccountId(list[0]._id);
    }
  }, [selectedUser, accountsQuery.data, accountId]);

  useEffect(() => {
    if (!instrumentQuery.trim()) {
      setInstrumentResults([]);
      setInstrumentLoading(false);
      return;
    }

    const handle = setTimeout(async () => {
      try {
        setInstrumentLoading(true);
        const results = await searchInstruments({
          q: instrumentQuery.trim(),
          segment: segment || undefined,
          limit: 8,
        });
        setInstrumentResults(results);
      } catch {
        setInstrumentResults([]);
      } finally {
        setInstrumentLoading(false);
      }
    }, 350);

    return () => clearTimeout(handle);
  }, [instrumentQuery, segment]);

  const handleSelectUser = (user: AdminUser) => {
    setSelectedUser(user);
    setUserQuery(`${user.name ?? "--"} (${user.email ?? "--"})`);
    setUserOpen(false);
  };

  const handleUserChange = (value: string) => {
    setUserQuery(value);
    setSelectedUser(null);
    setAccountId("");
    setUserOpen(true);
  };

  const handleSelectInstrument = (item: InstrumentSearchItem) => {
    setSelectedInstrument(item);
    setSymbol(item.code);
    setInstrumentQuery(`${item.code} - ${item.name}`);
    setInstrumentOpen(false);
  };

  const handleInstrumentChange = (value: string) => {
    setInstrumentQuery(value);
    setSelectedInstrument(null);
    setSymbol(value.trim().toUpperCase());
    setInstrumentOpen(true);
  };

  const handleSubmit = () => {
    setFormError("");
    setReceipt(null);

    if (!selectedUser) {
      setFormError("Select a user first.");
      return;
    }
    if (!accountId) {
      setFormError("Select an account.");
      return;
    }
    if (!symbol) {
      setFormError("Select a symbol/instrument.");
      return;
    }

    const volumeValue = parseNumber(volume);
    if (!volumeValue || volumeValue <= 0) {
      setFormError("Enter a valid volume.");
      return;
    }

    if (volumeValue < MIN_VOLUME) {
      setFormError(`Minimum volume is ${MIN_VOLUME}.`);
      return;
    }

    const stopLossValue = parseNumber(stopLoss);
    const takeProfitValue = parseNumber(takeProfit);
    if (stopLossValue !== null && stopLossValue <= 0) {
      setFormError("Stop Loss must be greater than 0.");
      return;
    }
    if (takeProfitValue !== null && takeProfitValue <= 0) {
      setFormError("Take Profit must be greater than 0.");
      return;
    }

    const buildReferenceId = (resp: unknown): string | undefined => {
      if (!resp || typeof resp !== "object") return undefined;
      const record = resp as Record<string, unknown>;
      const pickRef = (obj: Record<string, unknown>) => {
        const ticket = obj.ticket;
        if (ticket !== undefined && ticket !== null && String(ticket).trim()) {
          return String(ticket);
        }
        const preferred =
          obj.orderId ?? obj.positionId ?? obj.tradeId ?? obj.id;
        if (preferred !== undefined && preferred !== null) return String(preferred);
        return undefined;
      };

      const direct = pickRef(record);
      if (direct) return direct;

      const nested = record.data;
      if (!nested || typeof nested !== "object") return undefined;
      return pickRef(nested as Record<string, unknown>);
    };

    if (mode === "MARKET") {
      marketMutation.mutate(
        {
          accountId,
          userId: selectedUser._id,
          symbol: symbol.toUpperCase(),
          side,
          volume: volumeValue,
          stopLoss: stopLossValue ?? null,
          takeProfit: takeProfitValue ?? null,
        },
        {
          onSuccess: (resp) => {
            setToast(resp?.message || "Market order placed.");
            setPrice("");
            setReceipt({
              title: "Market Order Receipt",
              message: resp?.message,
              referenceId: buildReferenceId(resp?.data ?? resp),
              userId: selectedUser._id,
              userLabel:
                selectedUser.email || selectedUser.name || selectedUser._id,
              accountId,
              accountLabel:
                selectedAccount?.account_number || accountId,
              symbol: symbol.toUpperCase(),
              side,
              mode: "MARKET",
              volume: volumeValue,
              stopLoss: stopLossValue ?? null,
              takeProfit: takeProfitValue ?? null,
              createdAt: new Date().toISOString(),
              raw: resp?.data ?? resp,
            });
           },
          onError: (err: unknown) => {
            const msg =
              typeof err === "object" && err !== null
                ? ((err as { response?: { data?: { message?: string } } }).response
                    ?.data?.message ??
                  (err as { message?: string }).message)
                : undefined;
            setFormError(msg || "Market order failed.");
          },
        }
      );
      return;
    }

    const priceValue = parseNumber(price);
    if (!priceValue || priceValue <= 0) {
      setFormError("Enter a valid price for pending order.");
      return;
    }

    pendingMutation.mutate(
      {
        accountId,
        userId: selectedUser._id,
        symbol: symbol.toUpperCase(),
        side: getSideFromOrderType(pendingOrderType),
        orderType: pendingOrderType,
        price: priceValue,
        volume: volumeValue,
        stopLoss: stopLossValue ?? null,
        takeProfit: takeProfitValue ?? null,
      },
      {
        onSuccess: (resp) => {
          setToast(resp?.message || "Pending order placed.");
          setReceipt({
            title: "Pending Order Receipt",
            message: resp?.message,
            referenceId: buildReferenceId(resp?.data ?? resp),
            userId: selectedUser._id,
            userLabel:
              selectedUser.email || selectedUser.name || selectedUser._id,
            accountId,
            accountLabel:
              selectedAccount?.account_number || accountId,
            symbol: symbol.toUpperCase(),
            side: getSideFromOrderType(pendingOrderType),
            mode: "PENDING",
            orderType: pendingOrderType,
            volume: volumeValue,
            price: priceValue,
            stopLoss: stopLossValue ?? null,
            takeProfit: takeProfitValue ?? null,
            createdAt: new Date().toISOString(),
            raw: resp?.data ?? resp,
          });
        },
        onError: (err: unknown) => {
          const msg =
            typeof err === "object" && err !== null
              ? ((err as { response?: { data?: { message?: string } } }).response?.data
                  ?.message ??
                (err as { message?: string }).message)
              : undefined;
          setFormError(msg || "Pending order failed.");
        },
      }
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] shadow-sm hover:bg-[var(--hover-bg)]"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="rounded-3xl border border-[var(--card-border)] bg-gradient-to-r from-[var(--card-bg)] via-[var(--card-bg)] to-sky-500/10 px-6 py-5">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Create Trade</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Place market or pending trades for any user account. Editing is disabled here.
        </p>
      </div>

      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-5 sm:p-6 space-y-6 shadow-sm">
        <div className="flex flex-wrap gap-3 rounded-full bg-[var(--input-bg)] border border-[var(--card-border)] p-1">
          {[
            { key: "MARKET", label: "Market Order" },
            { key: "PENDING", label: "Pending Order" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setMode(tab.key as "MARKET" | "PENDING")}
              className={`flex-1 min-w-[160px] rounded-full px-4 py-2 text-sm font-semibold transition ${
                mode === tab.key
                  ? "bg-[var(--primary)] text-white shadow-sm ring-1 ring-[var(--primary)]/40"
                  : "text-[var(--foreground)]/80 hover:text-[var(--foreground)] hover:bg-[var(--card-bg)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 items-start">
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              <Layers size={14} className="text-[var(--primary)]" />
              Segment
            </label>
            <select
              value={segment}
              onChange={(event) => setSegment(event.target.value)}
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md p-3 mt-1 text-[var(--foreground)]"
            >
              <option value="">All segments</option>
              {SEGMENTS.map((seg, index) => (
                <option key={`${seg}-${index}`} value={seg}>
                  {seg}
                </option>
              ))}
            </select>
          </div>

          <div ref={instrumentRef} className="relative">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              <Tag size={14} className="text-[var(--primary)]" />
              Search instrument
            </label>
            <div className="flex items-center gap-2 w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-3 mt-1 transition focus-within:ring-2 focus-within:ring-[var(--primary)]/20">
              <Search size={16} className="text-[var(--text-muted)]" />
              <input
                value={instrumentQuery}
                onChange={(event) => handleInstrumentChange(event.target.value)}
                onFocus={() => setInstrumentOpen(true)}
                placeholder="Type symbol or name"
                className="w-full bg-transparent outline-none text-[var(--foreground)]"
              />
            </div>
            {instrumentOpen && (instrumentQuery.trim().length > 0 || instrumentLoading) && (
              <div className="absolute z-20 mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xl">
                {instrumentLoading ? (
                  <div className="px-3 py-2 text-sm text-[var(--text-muted)]">Searching...</div>
                ) : instrumentResults.length ? (
                  instrumentResults.map((item, index) => (
                    <button
                      key={`${item._id ?? item.code ?? "instrument"}-${index}`}
                      type="button"
                      onClick={() => handleSelectInstrument(item)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--hover-bg)]"
                    >
                      <div className="font-semibold">{item.code}</div>
                      <div className="text-xs text-[var(--text-muted)]">{item.name}</div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-[var(--text-muted)]">
                    No instruments found.
                  </div>
                )}
              </div>
            )}
            {selectedInstrument ? (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Selected: {selectedInstrument.code} ({selectedInstrument.segment || "segment"})
              </p>
            ) : null}
          </div>

          <div ref={userRef} className="relative">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              <User size={14} className="text-[var(--primary)]" />
              Search user
            </label>
            <div className="flex items-center gap-2 w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-3 mt-1 transition focus-within:ring-2 focus-within:ring-[var(--primary)]/20">
              <Search size={16} className="text-[var(--text-muted)]" />
              <input
                value={userQuery}
                onChange={(event) => handleUserChange(event.target.value)}
                onFocus={() => setUserOpen(true)}
                placeholder="Search by name or email"
                className="w-full bg-transparent outline-none text-[var(--foreground)]"
              />
            </div>
            {userOpen && userQuery.trim().length > 0 && (
              <div className="absolute z-20 mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xl">
                {usersQuery.isLoading ? (
                  <div className="px-3 py-2 text-sm text-[var(--text-muted)]">Searching...</div>
                ) : userOptions.length ? (
                  userOptions.map((user, index) => (
                    <button
                      key={`${user._id ?? user.email ?? "user"}-${index}`}
                      type="button"
                      onClick={() => handleSelectUser(user)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--hover-bg)]"
                    >
                      <div className="font-semibold">{user.name || "--"}</div>
                      <div className="text-xs text-[var(--text-muted)]">{user.email}</div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-[var(--text-muted)]">
                    No users found.
                  </div>
                )}
              </div>
            )}
            {selectedUser ? (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Selected user:{" "}
                {selectedUser.email || selectedUser.name || selectedUser._id}
              </p>
            ) : null}
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              <Wallet size={14} className="text-[var(--primary)]" />
              Account
            </label>
            <select
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md p-3 mt-1 text-[var(--foreground)]"
              disabled={!selectedUser || accountsQuery.isLoading}
            >
              <option value="">{selectedUser ? "Select account" : "Select user first"}</option>
              {accountOptions.map((acc, index) => (
                <option key={`${acc._id ?? acc.account_number ?? "account"}-${index}`} value={acc._id}>
                  {acc.account_number || acc._id}
                </option>
              ))}
            </select>
            {selectedAccount ? (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Type: {selectedAccount.account_type || "--"} | Plan: {selectedAccount.plan_name || "--"}
              </p>
            ) : null}
          </div>

          {mode === "MARKET" ? (
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                <ArrowUpDown size={14} className="text-[var(--primary)]" />
                Side
              </label>
              <select
                value={side}
                onChange={(event) => setSide(event.target.value as TradeSide)}
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md p-3 mt-1 text-[var(--foreground)]"
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                <ArrowUpDown size={14} className="text-[var(--primary)]" />
                Order Type
              </label>
              <select
                value={pendingOrderType}
                onChange={(event) =>
                  setPendingOrderType(
                    event.target.value as Exclude<TradeOrderType, "MARKET">
                  )
                }
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md p-3 mt-1 text-[var(--foreground)]"
              >
                {PENDING_ORDER_TYPES.map((orderType) => (
                  <option key={orderType} value={orderType}>
                    {orderType.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              <Hash size={14} className="text-[var(--primary)]" />
              Volume
            </label>
            <input
              value={volume}
              onChange={(event) => setVolume(event.target.value)}
              placeholder="Min 0.01"
              type="number"
              min={MIN_VOLUME}
              step="0.01"
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md p-3 mt-1 text-[var(--foreground)]"
            />
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Minimum volume: {MIN_VOLUME}
            </p>
          </div>

          {mode === "PENDING" ? (
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                <Tag size={14} className="text-[var(--primary)]" />
                Price
              </label>
              <input
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="Enter pending price"
                type="number"
                min="0"
                step="0.0001"
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md p-3 mt-1 text-[var(--foreground)]"
              />
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-700">
                  Bid
                  <span className="font-semibold text-emerald-900">
                    {liveBid}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-700">
                  Ask
                  <span className="font-semibold text-amber-900">
                    {liveAsk}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-sky-700">
                  Best {effectiveSide}
                  <span className="font-semibold text-sky-900">
                    {liveBest}
                  </span>
                </span>
              </div>
            </div>
          ) : (
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                <Tag size={14} className="text-[var(--primary)]" />
                Price
              </label>
              <div className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md p-3 mt-1 text-[var(--text-muted)]">
                Market price (auto)
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-700">
                  Bid
                  <span className="font-semibold text-emerald-900">
                    {liveBid}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-700">
                  Ask
                  <span className="font-semibold text-amber-900">
                    {liveAsk}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-sky-700">
                  Best {effectiveSide}
                  <span className="font-semibold text-sky-900">
                    {liveBest}
                  </span>
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              <AlertTriangle size={14} className="text-rose-500" />
              Stop Loss (optional)
            </label>
            <input
              value={stopLoss}
              onChange={(event) => setStopLoss(event.target.value)}
              placeholder="Stop loss"
              type="number"
              min="0"
              step="0.0001"
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md p-3 mt-1 text-[var(--foreground)]"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              <Target size={14} className="text-emerald-500" />
              Take Profit (optional)
            </label>
            <input
              value={takeProfit}
              onChange={(event) => setTakeProfit(event.target.value)}
              placeholder="Take profit"
              type="number"
              min="0"
              step="0.0001"
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md p-3 mt-1 text-[var(--foreground)]"
            />
          </div>
        </div>

        {formError ? (
          <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-700">
            {formError}
          </div>
        ) : null}

        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-4 py-3 text-xs text-[var(--text-muted)]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Validation Rules
          </p>
          <ul className="mt-2 list-disc pl-4 space-y-1">
            <li>User, Account, and Symbol are required.</li>
            <li>Volume must be at least {MIN_VOLUME}.</li>
            <li>Stop Loss and Take Profit are optional but must be &gt; 0 if provided.</li>
            {mode === "PENDING" ? (
              <li>Pending price is required and must be &gt; 0.</li>
            ) : (
              <li>Market orders use current market price (no price input).</li>
            )}
            <li>
              Order-type price rules (checked server-side): BUY_LIMIT below market, BUY_STOP above market, SELL_LIMIT above market, SELL_STOP below market.
            </li>
          </ul>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-[var(--primary)] text-black px-8 py-2 rounded-full font-semibold hover:opacity-90 transition disabled:opacity-60"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>

      <Modal
        title="Trade Receipt"
        open={Boolean(receipt)}
        onClose={handleCloseReceipt}
        size="lg"
        footer={
          receipt ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[var(--text-muted)]">
                Confirm to continue.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseReceipt}
                  className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-xs font-semibold hover:bg-[var(--hover-bg)]"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/admin/users/users/view/${receipt.userId}?tab=active-trades`
                    )
                  }
                  className="rounded-md bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-black hover:opacity-90"
                >
                  OK, Continue
                </button>
              </div>
            </div>
          ) : null
        }
      >
        {receipt ? (
          <div className="rounded-2xl border border-[var(--card-border)] bg-gradient-to-br from-[var(--card-bg)] via-[var(--card-bg)] to-emerald-500/10 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                    Receipt
                  </p>
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">
                    {receipt.title}
                  </h2>
                  {receipt.message ? (
                    <p className="text-sm text-[var(--text-muted)]">
                      {receipt.message}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide">
                    <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-sky-700">
                      {receipt.mode === "PENDING" ? "Pending" : "Market"}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 ${
                        receipt.side === "SELL"
                          ? "border-rose-500/40 bg-rose-500/10 text-rose-700"
                          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                      }`}
                    >
                      {receipt.side}
                    </span>
                    <span className="rounded-full border border-[var(--card-border)] bg-[var(--input-bg)] px-2 py-0.5 text-[var(--text-muted)]">
                      {receipt.orderType ?? "MARKET"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                {new Date(receipt.createdAt).toLocaleString()}
              </div>
            </div>

            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <p className="text-xs text-[var(--text-muted)]">Symbol</p>
                <p className="mt-1 text-lg font-semibold">{receipt.symbol}</p>
              </div>
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <p className="text-xs text-[var(--text-muted)]">Volume</p>
                <p className="mt-1 text-lg font-semibold">{receipt.volume}</p>
              </div>
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <p className="text-xs text-[var(--text-muted)]">Price</p>
                <p className="mt-1 text-lg font-semibold">
                  {receipt.price ?? "Market"}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <p className="text-xs text-[var(--text-muted)]">Reference ID</p>
                <p className="mt-1 font-mono text-xs text-[var(--foreground)]">
                  {receipt.referenceId ?? "--"}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] p-4">
                <p className="text-xs text-[var(--text-muted)]">Stop Loss</p>
                <p className="mt-1 font-semibold">{receipt.stopLoss ?? "--"}</p>
              </div>
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] p-4">
                <p className="text-xs text-[var(--text-muted)]">Take Profit</p>
                <p className="mt-1 font-semibold">{receipt.takeProfit ?? "--"}</p>
              </div>
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] p-4 sm:col-span-2">
                <p className="text-xs text-[var(--text-muted)]">Account</p>
                <p className="mt-1 font-mono text-xs text-[var(--foreground)]">
                  {receipt.accountLabel || receipt.accountId}
                </p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  User: {receipt.userLabel || receipt.userId}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {toast && <Toast message={toast} />}
    </div>
  );
}
