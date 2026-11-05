"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Layers,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import DragScroll from "../../components/ui/DragScroll";
import adminService from "@/services/admin.service";
import {
  getClientPositionReport,
  type ClientPositionAccountType,
  type ClientPositionRow,
} from "@/services/clientPosition.service";
import {
  closeTradeAdminPosition,
  deleteTradeAdminTrade,
  modifyTradeAdminPosition,
} from "@/services/tradeAdmin.service";
import { isOceanaReportAdmin } from "@/utils/oceanaAdmin";

type Period = "today" | "7d" | "30d" | "mtd";
type SideFilter = "ALL" | "BUY" | "SELL";
type SlFilter = "ALL" | "WITH_SL" | "NO_SL";
type SortKey = "lots_desc" | "lots_asc" | "profit_desc" | "loss_desc" | "risk_desc" | "newest";
type PendingAction = { kind: "close" | "delete"; row: ClientPositionRow } | null;

/** Money lost if this SL is hit (0 when the SL locks in profit). */
function riskAtSl(row: ClientPositionRow, sl: number) {
  const loss = row.side === "BUY" ? row.openPrice - sl : sl - row.openPrice;
  return Math.max(loss, 0) * row.volume * (row.contractSize || 1);
}

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "mtd", label: "This month" },
];
const ACCOUNT_TYPES: { key: ClientPositionAccountType; label: string }[] = [
  { key: "live", label: "Live" },
  { key: "demo", label: "Demo" },
  { key: "all", label: "All" },
];
const SORTS: { key: SortKey; label: string }[] = [
  { key: "lots_desc", label: "Lots: high to low" },
  { key: "lots_asc", label: "Lots: low to high" },
  { key: "profit_desc", label: "Profit: highest first" },
  { key: "loss_desc", label: "Loss: highest first" },
  { key: "risk_desc", label: "Risk: highest first" },
  { key: "newest", label: "Newest first" },
];

function periodFrom(period: Period): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "7d") d.setDate(d.getDate() - 6);
  if (period === "30d") d.setDate(d.getDate() - 29);
  if (period === "mtd") d.setDate(1);
  return d.toISOString();
}

const money = (n: number | null | undefined) =>
  `${Number(n || 0) < 0 ? "-" : ""}$${Math.abs(Number(n || 0)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function fmtPrice(n: number | null | undefined) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return "--";
  const dp = v >= 1000 ? 2 : v >= 10 ? 3 : 5;
  return v.toFixed(dp);
}

const lots = (n: number) => Number(n || 0).toFixed(2);
const pnlClass = (n: number) =>
  n > 0 ? "text-emerald-600" : n < 0 ? "text-rose-600" : "text-[var(--text-muted)]";

function formatTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function ClientPositionsPage() {
  const queryClient = useQueryClient();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [period, setPeriod] = useState<Period>("today");
  const [accountType, setAccountType] = useState<ClientPositionAccountType>("live");
  const [symbol, setSymbol] = useState<string | null>(null);
  const [side, setSide] = useState<SideFilter>("ALL");
  const [slFilter, setSlFilter] = useState<SlFilter>("ALL");
  const [sort, setSort] = useState<SortKey>("lots_desc");
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<PendingAction>(null);
  const [editing, setEditing] = useState<ClientPositionRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminService
      .getMe()
      .then((me: { email?: string } | null) => {
        if (!cancelled) {
          setAllowed(isOceanaReportAdmin(me?.email));
        }
      })
      .catch(() => !cancelled && setAllowed(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(t);
  }, [notice]);

  const from = useMemo(() => periodFrom(period), [period]);
  const report = useQuery({
    queryKey: ["client-position-report", period, accountType],
    queryFn: () => getClientPositionReport({ from, accountType }),
    enabled: allowed === true,
    refetchInterval: 2000,
    refetchIntervalInBackground: false,
  });
  const data = report.data;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (data?.positions ?? []).filter((p) => {
      if (symbol && p.symbol !== symbol) return false;
      if (side !== "ALL" && p.side !== side) return false;
      if (slFilter === "WITH_SL" && p.stopLoss == null) return false;
      if (slFilter === "NO_SL" && p.stopLoss != null) return false;
      if (q) {
        const hay = `${p.userName} ${p.userEmail} ${p.accountNumber} ${p.ticket ?? ""} ${p.symbol}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const riskOf = (p: ClientPositionRow) => (p.riskPercent == null ? Number.POSITIVE_INFINITY : p.riskPercent);
    const sorters: Record<SortKey, (a: ClientPositionRow, b: ClientPositionRow) => number> = {
      lots_desc: (a, b) => b.volume - a.volume,
      lots_asc: (a, b) => a.volume - b.volume,
      profit_desc: (a, b) => b.floatingPnL - a.floatingPnL,
      loss_desc: (a, b) => a.floatingPnL - b.floatingPnL,
      risk_desc: (a, b) => riskOf(b) - riskOf(a),
      newest: (a, b) => new Date(b.openTime).getTime() - new Date(a.openTime).getTime(),
    };
    return [...list].sort(sorters[sort]);
  }, [data, symbol, side, slFilter, sort, search]);

  const runAction = async () => {
    if (!pending || busy) return;
    const { kind, row } = pending;
    setBusy(true);
    try {
      if (kind === "close") {
        await closeTradeAdminPosition({ accountId: row.accountId, positionId: row.positionId, userId: row.userId });
      } else {
        await deleteTradeAdminTrade({
          kind: "LIVE",
          accountId: row.accountId,
          userId: row.userId,
          positionId: row.positionId,
        });
      }
      setNotice({ type: "success", text: `Position ${row.ticket ?? row.positionId} ${kind === "close" ? "closed" : "deleted"}` });
      setPending(null);
      await queryClient.invalidateQueries({ queryKey: ["client-position-report"] });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setNotice({ type: "error", text: e?.response?.data?.message || e?.message || "Action failed" });
    } finally {
      setBusy(false);
    }
  };

  if (allowed === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-[var(--text-muted)]">
        <Loader2 size={18} className="mr-2 animate-spin" /> Checking access…
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="container-pad">
        <div className="mx-auto mt-10 max-w-md rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-8 text-center">
          <ShieldAlert size={28} className="mx-auto text-amber-500" />
          <h1 className="mt-3 text-lg font-semibold">Access restricted</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            The client position report is only available to the Oceana admin account.
          </p>
        </div>
      </div>
    );
  }

  const totals = data?.totals;
  const scripts = data?.scripts ?? [];

  return (
    <div className="container-pad max-w-full space-y-4 text-[var(--foreground)] sm:space-y-5">
      {/* HEADER */}
      <div className="rounded-2xl border border-[var(--card-border)] bg-gradient-to-br from-[var(--card-bg)] via-[var(--card-bg)] to-indigo-500/5 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
              <BarChart3 size={12} />
              Client Position
            </div>
            <h1 className="mt-2 text-lg font-semibold sm:text-2xl">Scriptwise exposure &amp; risk</h1>
            <p className="text-xs text-[var(--text-muted)] sm:text-sm">
              Live client lots, average prices, stop losses and broker P/L for your clients.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Segmented value={period} options={PERIODS} onChange={setPeriod} />
            <Segmented value={accountType} options={ACCOUNT_TYPES} onChange={setAccountType} />
            <button
              type="button"
              onClick={() => report.refetch()}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 text-sm font-medium hover:bg-[var(--hover-bg)]"
            >
              <RefreshCw size={14} className={report.isFetching ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Live · auto-refreshes every 2s
          {data?.generatedAt ? ` · updated ${new Date(data.generatedAt).toLocaleTimeString()}` : ""}
        </p>
      </div>

      {report.isError ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-600">
          {(report.error as Error)?.message || "Failed to load report"}
        </div>
      ) : null}

      {/* METRICS */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Metric label="Open positions" value={String(totals?.openPositions ?? 0)} icon={<Activity size={13} />} />
        <Metric label="Long lots" value={lots(totals?.longLots ?? 0)} icon={<ArrowUpRight size={13} />} tone="emerald" />
        <Metric label="Short lots" value={lots(totals?.shortLots ?? 0)} icon={<ArrowDownRight size={13} />} tone="rose" />
        <Metric
          label="Client floating P/L"
          value={money(totals?.clientFloating)}
          valueClass={pnlClass(totals?.clientFloating ?? 0)}
          icon={<Layers size={13} />}
        />
        <Metric label="Closed profit" value={money(totals?.closedProfit)} valueClass="text-emerald-600" icon={<ArrowUpRight size={13} />} />
        <Metric label="Closed loss" value={money(totals?.closedLoss)} valueClass="text-rose-600" icon={<ArrowDownRight size={13} />} />
        <Metric
          label="Broker net P/L"
          value={money(totals?.brokerNet)}
          valueClass={pnlClass(totals?.brokerNet ?? 0)}
          icon={<BarChart3 size={13} />}
          tone="indigo"
        />
        <Metric
          label="Positions without SL"
          value={String(totals?.positionsWithoutSl ?? 0)}
          valueClass={(totals?.positionsWithoutSl ?? 0) > 0 ? "text-amber-600" : undefined}
          icon={<AlertTriangle size={13} />}
          tone="amber"
        />
      </div>

      {/* SCRIPTWISE */}
      <section className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--card-border)] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Scriptwise</h2>
            <p className="text-[11px] text-[var(--text-muted)]">Click a script to see its positions below.</p>
          </div>
          {symbol ? (
            <button
              type="button"
              onClick={() => setSymbol(null)}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--card-border)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--hover-bg)]"
            >
              {symbol} <X size={12} />
            </button>
          ) : null}
        </div>
        <DragScroll className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-[var(--input-bg)] text-[11px] uppercase text-[var(--text-muted)]">
              <tr className="border-b border-[var(--card-border)]">
                <th rowSpan={2} className="px-4 py-2 text-left align-bottom">Script</th>
                <GroupTh>Total Lots</GroupTh>
                <GroupTh>Average</GroupTh>
                <GroupTh>Close Positions</GroupTh>
                <GroupTh>Net Position Broker</GroupTh>
                <th rowSpan={2} className="px-4 py-2 text-right align-bottom">Live Bid / Ask</th>
              </tr>
              <tr>
                {["Long", "Short", "Long Avg", "Short Avg", "Profit", "Loss", "Profit", "Loss"].map((h, i) => (
                  <th key={`${h}-${i}`} className={`px-4 py-2 text-right font-semibold ${i % 2 === 0 ? "border-l border-[var(--card-border)]" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.isLoading ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-[var(--text-muted)]">
                    <Loader2 size={18} className="mx-auto animate-spin" />
                  </td>
                </tr>
              ) : scripts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-sm text-[var(--text-muted)]">
                    No client positions for this period.
                  </td>
                </tr>
              ) : (
                scripts.map((s) => {
                  const active = symbol === s.symbol;
                  return (
                    <tr
                      key={s.symbol}
                      onClick={() => setSymbol(active ? null : s.symbol)}
                      className={`cursor-pointer border-t border-[var(--card-border)] transition-colors ${
                        active ? "bg-indigo-500/10" : "hover:bg-[var(--hover-bg)]"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold">{s.symbol}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {s.openPositions} open · net {s.netLots > 0 ? "+" : ""}
                          {lots(s.netLots)}
                        </p>
                      </td>
                      <Num className="border-l border-[var(--card-border)] text-emerald-600">{lots(s.longLots)}</Num>
                      <Num className="text-rose-600">{lots(s.shortLots)}</Num>
                      <Num className="border-l border-[var(--card-border)]">{fmtPrice(s.longAvg)}</Num>
                      <Num>{fmtPrice(s.shortAvg)}</Num>
                      <Num className="border-l border-[var(--card-border)] text-emerald-600">{money(s.closedProfit)}</Num>
                      <Num className="text-rose-600">{money(s.closedLoss)}</Num>
                      <Num className="border-l border-[var(--card-border)] font-semibold text-emerald-600">
                        {s.brokerProfit > 0 ? money(s.brokerProfit) : "--"}
                      </Num>
                      <Num className="font-semibold text-rose-600">{s.brokerLoss > 0 ? money(s.brokerLoss) : "--"}</Num>
                      <Num className="text-[var(--text-muted)]">
                        {fmtPrice(s.bid)} / {fmtPrice(s.ask)}
                      </Num>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </DragScroll>
        <p className="border-t border-[var(--card-border)] px-4 py-2 text-[11px] text-[var(--text-muted)]">
          Close Positions = client realised P/L in the selected period. Net Position Broker = broker side of client
          floating + closed P/L (client profit is broker loss).
        </p>
      </section>

      {/* POSITIONS */}
      <section className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="flex flex-col gap-3 border-b border-[var(--card-border)] px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-sm font-semibold">
              Open positions{symbol ? ` · ${symbol}` : ""}{" "}
              <span className="font-normal text-[var(--text-muted)]">({rows.length})</span>
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Risk % = loss if the stop loss is hit ÷ account equity.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Client, account or ticket"
                className="h-9 w-52 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
            <Segmented
              value={side}
              options={[
                { key: "ALL", label: "All sides" },
                { key: "BUY", label: "Long" },
                { key: "SELL", label: "Short" },
              ]}
              onChange={setSide}
            />
            <Segmented
              value={slFilter}
              options={[
                { key: "ALL", label: "All" },
                { key: "WITH_SL", label: "With SL" },
                { key: "NO_SL", label: "No SL" },
              ]}
              onChange={setSlFilter}
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-9 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 text-sm"
              aria-label="Sort positions"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DragScroll className="overflow-x-auto">
          <table className="w-full min-w-[1280px] text-sm">
            <thead className="bg-[var(--input-bg)] text-[11px] uppercase text-[var(--text-muted)]">
              <tr>
                {["Client", "Symbol", "Side", "Lots", "Open price", "Live Bid / Ask", "Stop loss", "Take profit", "P/L", "Risk", "Opened", ""].map(
                  (h, i) => (
                    <th
                      key={`${h}-${i}`}
                      className={`px-4 py-3 ${i >= 3 && i <= 9 ? "text-right" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-sm text-[var(--text-muted)]">
                    {report.isLoading ? "Loading…" : "No positions match these filters."}
                  </td>
                </tr>
              ) : (
                rows.map((p) => (
                  <tr key={p.positionId} className="border-t border-[var(--card-border)] hover:bg-[var(--hover-bg)]">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{p.userName || p.userEmail || "--"}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        #{p.accountNumber || "--"} · {p.accountType || "live"}
                        {p.ticket ? ` · T${p.ticket}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-semibold">{p.symbol}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          p.side === "BUY" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                        }`}
                      >
                        {p.side === "BUY" ? "LONG" : "SHORT"}
                      </span>
                    </td>
                    <Num>{lots(p.volume)}</Num>
                    <Num>{fmtPrice(p.openPrice)}</Num>
                    <Num>
                      <LiveQuote row={p} />
                    </Num>
                    <Num>
                      {p.stopLoss != null ? (
                        <span className="font-semibold">{fmtPrice(p.stopLoss)}</span>
                      ) : (
                        <span className="text-amber-600">Not set</span>
                      )}
                    </Num>
                    <Num>{p.takeProfit != null ? fmtPrice(p.takeProfit) : <span className="text-[var(--text-muted)]">--</span>}</Num>
                    <Num className={`font-semibold ${pnlClass(p.floatingPnL)}`}>{money(p.floatingPnL)}</Num>
                    <Num>
                      <RiskBadge row={p} />
                    </Num>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--text-muted)]">{formatTime(p.openTime)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditing(p)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--card-border)] px-2.5 py-1 text-xs font-semibold hover:bg-[var(--hover-bg)]"
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setPending({ kind: "close", row: p })}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--card-border)] px-2.5 py-1 text-xs font-semibold hover:bg-[var(--hover-bg)]"
                        >
                          <XCircle size={13} /> Close
                        </button>
                        <button
                          type="button"
                          onClick={() => setPending({ kind: "delete", row: p })}
                          aria-label="Delete position"
                          title="Delete position"
                          className="grid h-7 w-7 place-items-center rounded-lg text-rose-600 hover:bg-rose-500/10"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DragScroll>
        <div className="flex flex-wrap items-center gap-4 border-t border-[var(--card-border)] px-4 py-2 text-[11px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Low (under 2%)</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> Medium (2–5%)</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" /> High (over 5%) or no SL</span>
        </div>
      </section>

      {editing ? (
        <EditPositionModal
          key={editing.positionId}
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={async (message) => {
            setEditing(null);
            setNotice({ type: "success", text: message });
            await queryClient.invalidateQueries({ queryKey: ["client-position-report"] });
          }}
          onError={(text) => setNotice({ type: "error", text })}
        />
      ) : null}

      {pending ? (
        <ConfirmModal
          action={pending}
          busy={busy}
          onCancel={() => !busy && setPending(null)}
          onConfirm={runAction}
        />
      ) : null}

      {notice ? (
        <div
          className={`fixed bottom-5 right-5 z-50 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-xl ${
            notice.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {notice.text}
        </div>
      ) : null}
    </div>
  );
}

/** Bid / Ask from the trade engine; the side this position closes on is highlighted. */
function LiveQuote({ row }: { row: ClientPositionRow }) {
  const closesOnBid = row.side === "BUY";
  return (
    <span className="inline-flex flex-col items-end leading-tight">
      <span className={closesOnBid ? "font-semibold text-rose-600" : "text-[var(--text-muted)]"}>
        <span className="mr-1 font-sans text-[10px] uppercase">Bid</span>
        {fmtPrice(row.bid)}
      </span>
      <span className={!closesOnBid ? "font-semibold text-blue-600" : "text-[var(--text-muted)]"}>
        <span className="mr-1 font-sans text-[10px] uppercase">Ask</span>
        {fmtPrice(row.ask)}
      </span>
    </span>
  );
}

function EditPositionModal({
  row,
  onClose,
  onSaved,
  onError,
}: {
  row: ClientPositionRow;
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (text: string) => void;
}) {
  const [openPrice, setOpenPrice] = useState(String(row.openPrice));
  const [sl, setSl] = useState(row.stopLoss != null ? String(row.stopLoss) : "");
  const [tp, setTp] = useState(row.takeProfit != null ? String(row.takeProfit) : "");
  const [saving, setSaving] = useState(false);

  const isBuy = row.side === "BUY";
  const mark = isBuy ? row.bid : row.ask;
  const openNum = Number(openPrice);
  const openChanged = openPrice.trim() !== "" && Number.isFinite(openNum) && openNum !== row.openPrice;
  const slNum = sl.trim() === "" ? null : Number(sl);
  const tpNum = tp.trim() === "" ? null : Number(tp);
  const effectiveRow = openChanged ? { ...row, openPrice: openNum } : row;
  const newPnl =
    openChanged && mark
      ? (isBuy ? mark - openNum : openNum - mark) * row.volume * (row.contractSize || 1)
      : null;

  const problems: string[] = [];
  if (!(openNum > 0)) problems.push("Open price must be a positive price.");
  if (slNum !== null && !(slNum > 0)) problems.push("Stop loss must be a positive price.");
  if (tpNum !== null && !(tpNum > 0)) problems.push("Take profit must be a positive price.");
  if (mark && slNum && slNum > 0) {
    if (isBuy && slNum >= mark) problems.push(`Stop loss for a long must be below the bid (${fmtPrice(mark)}).`);
    if (!isBuy && slNum <= mark) problems.push(`Stop loss for a short must be above the ask (${fmtPrice(mark)}).`);
  }
  if (mark && tpNum && tpNum > 0) {
    if (isBuy && tpNum <= mark) problems.push(`Take profit for a long must be above the bid (${fmtPrice(mark)}).`);
    if (!isBuy && tpNum >= mark) problems.push(`Take profit for a short must be below the ask (${fmtPrice(mark)}).`);
  }

  const newRisk = slNum && slNum > 0 ? riskAtSl(effectiveRow, slNum) : null;
  const newRiskPct = newRisk != null && row.equity > 0 ? (newRisk / row.equity) * 100 : null;
  const unchanged = !openChanged && slNum === row.stopLoss && tpNum === row.takeProfit;

  const save = async () => {
    if (saving || problems.length || unchanged) return;
    setSaving(true);
    try {
      await modifyTradeAdminPosition({
        accountId: row.accountId,
        positionId: row.positionId,
        userId: row.userId,
        ...(openChanged ? { openPrice: openNum } : {}),
        stopLoss: slNum,
        takeProfit: tpNum,
      });
      onSaved(`${row.symbol} position updated`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      onError(e?.response?.data?.message || e?.message || "Update failed");
      setSaving(false);
    }
  };

  const field = (
    label: string,
    value: string,
    set: (v: string) => void,
    hint: string,
  ) => (
    <label className="block">
      <span className="flex items-center justify-between text-xs font-semibold text-[var(--foreground)]">
        {label}
        {value ? (
          <button type="button" onClick={() => set("")} className="text-[11px] font-medium text-[var(--text-muted)] hover:underline">
            Remove
          </button>
        ) : null}
      </span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => set(e.target.value.replace(/[^0-9.]/g, ""))}
        placeholder="Not set"
        className="mt-1 h-10 w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
      />
      <span className="mt-1 block text-[11px] text-[var(--text-muted)]">{hint}</span>
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={() => !saving && onClose()} className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Edit position</h3>
            <p className="text-xs text-[var(--text-muted)]">
              {row.userName || row.userEmail} · #{row.accountNumber} · {isBuy ? "Long" : "Short"} {lots(row.volume)} {row.symbol}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close" className="rounded-lg p-1 hover:bg-[var(--hover-bg)]">
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-[var(--input-bg)] p-3 text-center text-xs">
          <div>
            <p className="text-[var(--text-muted)]">Open</p>
            <p className="font-mono font-semibold">{fmtPrice(row.openPrice)}</p>
          </div>
          <div>
            <p className="text-[var(--text-muted)]">{isBuy ? "Bid (close)" : "Ask (close)"}</p>
            <p className="font-mono font-semibold">{fmtPrice(mark)}</p>
          </div>
          <div>
            <p className="text-[var(--text-muted)]">P/L</p>
            <p className={`font-mono font-semibold ${pnlClass(row.floatingPnL)}`}>{money(row.floatingPnL)}</p>
          </div>
        </div>

        <div className="mt-4">
          <label className="block">
            <span className="flex items-center justify-between text-xs font-semibold text-[var(--foreground)]">
              Open price
              {openChanged ? (
                <button
                  type="button"
                  onClick={() => setOpenPrice(String(row.openPrice))}
                  className="text-[11px] font-medium text-[var(--text-muted)] hover:underline"
                >
                  Reset
                </button>
              ) : null}
            </span>
            <input
              inputMode="decimal"
              value={openPrice}
              onChange={(e) => setOpenPrice(e.target.value.replace(/[^0-9.]/g, ""))}
              className="mt-1 h-10 w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            />
          </label>
          {openChanged ? (
            <p className="mt-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700">
              Changing the open price changes this client&apos;s P/L
              {newPnl != null ? (
                <>
                  : <b>{money(row.floatingPnL)}</b> → <b className={pnlClass(newPnl)}>{money(newPnl)}</b>
                </>
              ) : null}
              .
            </p>
          ) : null}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {field("Stop loss", sl, setSl, isBuy ? "Below the bid" : "Above the ask")}
          {field("Take profit", tp, setTp, isBuy ? "Above the bid" : "Below the ask")}
        </div>

        <div className="mt-3 rounded-xl border border-[var(--card-border)] px-3 py-2 text-xs">
          {newRisk == null ? (
            <span className="text-rose-600">No stop loss — risk is unlimited.</span>
          ) : (
            <span>
              Risk at SL: <b>{money(newRisk)}</b>
              {newRiskPct != null ? <> · <b>{newRiskPct.toFixed(2)}%</b> of equity</> : null}
            </span>
          )}
        </div>

        {problems.length ? (
          <ul className="mt-3 space-y-1 rounded-xl bg-rose-500/5 px-3 py-2 text-xs text-rose-600">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        ) : null}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-lg border border-[var(--card-border)] py-2 text-sm font-semibold hover:bg-[var(--hover-bg)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || problems.length > 0 || unchanged}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

function RiskBadge({ row }: { row: ClientPositionRow }) {
  if (row.riskPercent == null) {
    return (
      <span className="inline-flex flex-col items-end">
        <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold text-rose-600">
          <ShieldAlert size={12} /> No SL
        </span>
        {row.drawdownPercent > 0 ? (
          <span className="mt-0.5 text-[10px] text-[var(--text-muted)]">down {row.drawdownPercent.toFixed(2)}%</span>
        ) : null}
      </span>
    );
  }
  const r = row.riskPercent;
  const tone =
    r > 5 ? "bg-rose-500/10 text-rose-600" : r >= 2 ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600";
  return (
    <span className="inline-flex flex-col items-end">
      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${tone}`}>
        <ShieldCheck size={12} /> {r.toFixed(2)}%
      </span>
      <span className="mt-0.5 text-[10px] text-[var(--text-muted)]">{money(row.riskAmount)} at SL</span>
    </span>
  );
}

function ConfirmModal({
  action,
  busy,
  onCancel,
  onConfirm,
}: {
  action: NonNullable<PendingAction>;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { kind, row } = action;
  const isClose = kind === "close";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Cancel" onClick={onCancel} className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-sm rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-2xl">
        <h3 className="text-base font-semibold">{isClose ? "Close position at market?" : "Delete this position?"}</h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {isClose
            ? "The position will be closed at the current market price."
            : "The live position will be removed from the client's account."}
        </p>
        <dl className="mt-4 space-y-1.5 rounded-xl bg-[var(--input-bg)] p-3 text-sm">
          {[
            ["Client", row.userName || row.userEmail || "--"],
            ["Account", `#${row.accountNumber || "--"}`],
            ["Position", `${row.side === "BUY" ? "Long" : "Short"} ${lots(row.volume)} ${row.symbol}`],
            ["Floating P/L", money(row.floatingPnL)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="text-[var(--text-muted)]">{k}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-lg border border-[var(--card-border)] py-2 text-sm font-semibold hover:bg-[var(--hover-bg)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-70 ${
              isClose ? "bg-[var(--primary)]" : "bg-rose-600"
            }`}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : null}
            {isClose ? "Close position" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] p-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
            o.key === value
              ? "bg-[var(--card-bg)] font-semibold text-[var(--foreground)] shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function GroupTh({ children }: { children: ReactNode }) {
  return (
    <th colSpan={2} className="border-l border-[var(--card-border)] px-4 py-2 text-center font-semibold text-[var(--foreground)]">
      {children}
    </th>
  );
}

function Num({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums ${className}`}>{children}</td>;
}

function Metric({
  label,
  value,
  icon,
  valueClass,
  tone = "slate",
}: {
  label: string;
  value: string;
  icon: ReactNode;
  valueClass?: string;
  tone?: "slate" | "emerald" | "rose" | "amber" | "indigo";
}) {
  const tones: Record<string, string> = {
    slate: "border-slate-400/30 bg-slate-500/[0.04]",
    emerald: "border-emerald-400/30 bg-emerald-500/[0.05]",
    rose: "border-rose-400/30 bg-rose-500/[0.05]",
    amber: "border-amber-400/30 bg-amber-500/[0.05]",
    indigo: "border-indigo-400/30 bg-indigo-500/[0.05]",
  };
  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
        <span className="grid h-6 w-6 place-items-center rounded-md bg-[var(--card-bg)] text-[var(--text-muted)]">{icon}</span>
      </div>
      <p className={`mt-1.5 text-lg font-semibold ${valueClass ?? "text-[var(--foreground)]"}`}>{value}</p>
    </div>
  );
}
