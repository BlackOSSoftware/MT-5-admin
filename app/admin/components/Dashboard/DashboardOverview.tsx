"use client";

import {
  Users,
  Activity,
  ShieldCheck,
  DollarSign,
  LineChart,
  Plus,
  Clock3,
  CandlestickChart,
  Gift,
} from "lucide-react";

import { motion } from "framer-motion";
import Link from "next/link";
import { useTradeAdminSummary } from "@/hooks/useTradeAdminSummary";
import { useTradeAdminOpenTrades } from "@/hooks/useTradeAdminOpenTrades";
import { useDefaultWatchlist } from "@/queries/defaultWatchlist.queries";
import { useLiveQuotesBySymbols } from "@/hooks/useLiveQuotesBySymbols";
import { getAccessTokenFromCookie } from "@/services/marketSocket.service";
import { useInstrumentPrecisionMap } from "@/hooks/instruments/useInstrumentPrecisionMap";
import { formatPrice } from "@/utils/priceFormat";
import { displayTicket } from "@/utils/displayIds";

// ================= MOCK DATA =================

// ================= ANIMATION =================

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// ================= COMPONENT =================

export default function Overview() {
  const { data: summary, isLoading } = useTradeAdminSummary();
  const openTradesQuery = useTradeAdminOpenTrades({
    page: 1,
    limit: 5,
    sortBy: "updatedAt",
    sortDir: "desc",
  });
  const token = getAccessTokenFromCookie();
  const watchlistQuery = useDefaultWatchlist();
  const { map: precisionMap } = useInstrumentPrecisionMap();

  const safeSummary = summary ?? {
    activePositions: 0,
    activePendingOrders: 0,
    activeUsers: 0,
    activeTradingAccounts: 0,
  };

  // ================= KPI CARDS =================

  const cards = [
    {
      title: "Active Users",
      value: safeSummary.activeUsers,
      icon: Users,
      color: "text-blue-400",
    },
    {
      title: "Active Positions",
      value: safeSummary.activePositions,
      icon: Activity,
      color: "text-emerald-400",
    },
    {
      title: "Active Accounts",
      value: safeSummary.activeTradingAccounts,
      icon: ShieldCheck,
      color: "text-indigo-400",
    },
    {
      title: "Pending Orders",
      value: safeSummary.activePendingOrders,
      icon: DollarSign,
      color: "text-amber-400",
    },
  ];

  const actions = [
    {
      title: "Create Trade",
      description: "Place a market or pending order.",
      href: "/admin/trades/live/create",
      icon: Plus,
      color: "text-emerald-400",
    },
    {
      title: "Active Positions",
      description: "Monitor open trades in real time.",
      href: "/admin/trades/active-positions",
      icon: Activity,
      color: "text-amber-400",
    },
    {
      title: "Pending Orders",
      description: "Review stops and limits.",
      href: "/admin/trades/pending-orders",
      icon: Clock3,
      color: "text-sky-400",
    },
    {
      title: "Market Watch",
      description: "View live quotes and spreads.",
      href: "/admin/instruments/market-watch",
      icon: CandlestickChart,
      color: "text-indigo-400",
    },
    {
      title: "Users",
      description: "Manage users and accounts.",
      href: "/admin/users/users",
      icon: Users,
      color: "text-violet-400",
    },
    {
      title: "Account Plans",
      description: "Edit pricing plans quickly.",
      href: "/admin/account-plan",
      icon: Gift,
      color: "text-rose-400",
    },
  ];

  const watchRows = watchlistQuery.data?.data ?? [];
  const topRows = watchRows.slice(0, 5);
  const symbols = topRows.map((r) => r.code);
  const liveQuotes = useLiveQuotesBySymbols(token, symbols);

  const openTrades = openTradesQuery.data?.data ?? [];
  const formatVolume = (value?: number) =>
    Number.isFinite(value ?? NaN) ? Number(value).toLocaleString("en-IN") : "--";
  const getSideTone = (side?: string) => {
    const normalized = (side ?? "").toUpperCase();
    if (normalized === "BUY") {
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-500";
    }
    if (normalized === "SELL") {
      return "border-rose-500/40 bg-rose-500/10 text-rose-500";
    }
    return "border-[var(--border-subtle)] bg-[var(--chip-bg)] text-[var(--text-muted)]";
  };

  // ================= UI =================

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-5 sm:space-y-8 pb-8 sm:pb-10"
    >
      {/* ================= HEADER ================= */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-3 sm:px-6 lg:px-0">

        <div>
          <h2 className="text-sm sm:text-base font-semibold tracking-wide text-[var(--text-muted)]">
            Dashboard
          </h2>
        </div>

        {/* PNL CARD REMOVED */}

      </div>

      {/* ================= LOADING ================= */}

      {isLoading && (
        <div className="px-4 sm:px-6 lg:px-0 text-sm opacity-70">
          Loading summary...
        </div>
      )}

      {/* ================= KPI GRID ================= */}

      <motion.section
        variants={container}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 px-3 sm:px-6 lg:px-0"
      >
        {cards.map((card, i) => (
          <motion.div
            key={i}
            variants={item}
            whileHover={{ y: -6 }}
            className="relative overflow-hidden bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-3.5 sm:p-5 ring-1 ring-white/5"
          >
            {/* Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-transparent pointer-events-none" />

            <div className="flex items-center justify-between gap-3">

              <div>
                <p className="text-[10px] sm:text-xs text-[var(--text-muted)] leading-tight">
                  {card.title}
                </p>

                <p className="text-[15px] sm:text-2xl font-bold mt-0.5 leading-tight">
                  {card.value.toLocaleString()}
                </p>
              </div>

              <div
                className={`h-8 w-8 sm:h-12 sm:w-12 rounded-xl bg-black/5 flex items-center justify-center ${card.color}`}
              >
                <card.icon size={18} className="sm:hidden" />
                <card.icon size={26} className="hidden sm:block" />
              </div>

            </div>
          </motion.div>
        ))}
      </motion.section>

      {/* ================= MARKET WATCH (TOP 5) ================= */}
      <motion.section
        variants={container}
        className="px-3 sm:px-6 lg:px-0"
      >
        <motion.div
          variants={item}
          className="relative overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-7 ring-1 ring-white/5"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-transparent pointer-events-none" />
          <div className="flex items-start gap-3 mb-3 sm:mb-5">
            <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] flex items-center justify-center">
              <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white flex items-center justify-center">
                <LineChart size={14} className="sm:hidden" />
                <LineChart size={16} className="hidden sm:block" />
              </div>
            </div>
            <div>
              <p className="text-base sm:text-lg font-semibold text-[var(--foreground)]">
                Market Watchlist
              </p>
              <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                Top 5 scripts from default watchlist
              </p>
            </div>
          </div>

          <div className="grid grid-cols-[1.2fr_0.9fr_0.9fr] text-[9px] sm:text-xs uppercase tracking-wider text-[var(--text-muted)] px-1.5 sm:px-3 pb-2 sm:pb-3">
            <div>Symbol</div>
            <div className="text-right">Bid</div>
            <div className="text-right">Ask</div>
          </div>

          {watchlistQuery.isLoading ? (
            <div className="text-sm text-[var(--text-muted)]">
              Loading watchlist...
            </div>
          ) : topRows.length === 0 ? (
            <div className="text-sm text-[var(--text-muted)]">
              No symbols found
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:gap-3">
              {topRows.map((row) => {
                const live = liveQuotes[row.code];
                const precision = precisionMap[row.code] ?? 2;
                const bidColor =
                  live?.bidDir === "up"
                    ? "text-emerald-500"
                    : live?.bidDir === "down"
                    ? "text-red-600"
                    : "text-[var(--foreground)]";
                const askColor =
                  live?.askDir === "up"
                    ? "text-emerald-500"
                    : live?.askDir === "down"
                    ? "text-red-600"
                    : "text-[var(--foreground)]";

                return (
                  <div
                    key={row.code}
                    className="grid grid-cols-[1.2fr_0.9fr_0.9fr] items-center rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 sm:px-4 py-2 sm:py-3 gap-2 sm:gap-0"
                  >
                    <div>
                      <p className="text-xs sm:text-base font-semibold">
                        {row.code}
                      </p>
                      <p className="text-[9px] sm:text-xs text-[var(--text-muted)]">
                        {row.name}
                      </p>
                    </div>

                    <div className="text-right">
                      <p
                        className={`text-[11px] sm:text-base font-semibold tracking-tight tabular-nums drop-shadow-[0_0_2px_rgba(0,0,0,0.18)] ${bidColor}`}
                      >
                        {formatPrice(
                          live?.bid && live.bid !== "--"
                            ? live.bid
                            : live?.close ?? live?.open,
                          precision
                        )}
                      </p>
                    </div>

                    <div className="text-right">
                      <p
                        className={`text-[11px] sm:text-base font-semibold tracking-tight tabular-nums drop-shadow-[0_0_2px_rgba(0,0,0,0.18)] ${askColor}`}
                      >
                        {formatPrice(
                          live?.ask && live.ask !== "--"
                            ? live.ask
                            : live?.close ?? live?.open,
                          precision
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-3 sm:mt-4 flex justify-end">
            <Link
              href="/admin/instruments/market-watch"
              className="text-xs sm:text-sm font-semibold text-[var(--primary)] hover:underline"
            >
              View All →
            </Link>
          </div>
        </motion.div>
      </motion.section>

      {/* ================= QUICK ACTIONS ================= */}
      <motion.section
        variants={container}
        className="px-3 sm:px-6 lg:px-0"
      >
        <motion.div
          variants={item}
          className="relative overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-6 ring-1 ring-white/5"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-transparent pointer-events-none" />
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-base sm:text-lg font-semibold text-[var(--foreground)]">
                Quick Actions
              </p>
              <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                Jump to frequently used admin screens.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {actions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="group relative overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3 sm:p-4 transition hover:-translate-y-0.5 hover:bg-[var(--hover-bg)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-xl bg-black/10 flex items-center justify-center ${action.color}`}>
                    <action.icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-main)] truncate">
                      {action.title}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      </motion.section>

      {/* ================= LIVE POSITIONS ================= */}
      <motion.section
        variants={container}
        className="px-3 sm:px-6 lg:px-0"
      >
        <motion.div
          variants={item}
          className="relative overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-6 ring-1 ring-white/5"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-transparent pointer-events-none" />
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-base sm:text-lg font-semibold text-[var(--foreground)]">
                Live Positions
              </p>
              <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                Latest 5 active trades.
              </p>
            </div>
            <Link
              href="/admin/trades/active-positions"
              className="text-xs sm:text-sm font-semibold text-[var(--primary)] hover:underline"
            >
              View All →
            </Link>
          </div>

          <div className="grid grid-cols-[1.2fr_0.8fr_0.9fr] text-[9px] sm:text-xs uppercase tracking-wider text-[var(--text-muted)] px-1.5 sm:px-3 pb-2 sm:pb-3">
            <div>Symbol</div>
            <div className="text-right">Volume</div>
            <div className="text-right">Open</div>
          </div>

          {openTradesQuery.isLoading ? (
            <div className="text-sm text-[var(--text-muted)]">
              Loading positions...
            </div>
          ) : openTrades.length === 0 ? (
            <div className="text-sm text-[var(--text-muted)]">
              No active positions found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:gap-3">
              {openTrades.map((trade) => {
                const symbol = (trade.symbol ?? "").toUpperCase();
                const precision = precisionMap[symbol] ?? 2;
                return (
                  <div
                    key={trade._id}
                    className="grid grid-cols-[1.2fr_0.8fr_0.9fr] items-center rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 sm:px-4 py-2 sm:py-3 gap-2 sm:gap-0"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-base font-semibold">
                          {symbol || "--"}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${getSideTone(trade.side)}`}
                        >
                          {(trade.side ?? "").toString().toUpperCase() || "--"}
                        </span>
                      </div>
                      <p className="text-[9px] sm:text-xs text-[var(--text-muted)]">
                        Position ID: {displayTicket(trade)}
                      </p>
                    </div>
                    <div className="text-right text-[11px] sm:text-base font-semibold tabular-nums">
                      {formatVolume(trade.volume)}
                    </div>
                    <div className="text-right text-[11px] sm:text-base font-semibold tabular-nums">
                      {formatPrice(trade.openPrice ?? trade.entryPrice, precision)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </motion.section>
    </motion.div>
  );
}
