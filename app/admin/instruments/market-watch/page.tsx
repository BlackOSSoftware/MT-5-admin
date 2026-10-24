"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import {
  Trash2,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLiveQuotesBySymbols } from "@/hooks/useLiveQuotesBySymbols";
import { useInstrumentPrecisionMap } from "@/hooks/instruments/useInstrumentPrecisionMap";
import { searchInstruments } from "@/services/instrument.service";

import {
  useDefaultWatchlist,
  useAddDefaultWatchlist,
  useRemoveDefaultWatchlist,
} from "@/queries/defaultWatchlist.queries";

import Pagination from "../../components/ui/pagination";
import ConfirmModal from "../../components/ui/ConfirmModal";
import GlobalLoader from "../../components/ui/GlobalLoader";
import DragScroll from "../../components/ui/DragScroll";
import { getAccessTokenFromCookie } from "@/services/marketSocket.service";
import { formatPrice, splitPrice } from "@/utils/priceFormat";


function toNumber(value?: string | number) {
  if (value === undefined || value === null) return null;
  if (value === "--") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatSigned(value: number, digits = 2) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(digits)}`;
}

function calcSpread(bid?: string, ask?: string) {
  if (!bid || !ask || bid === "--" || ask === "--") return "--";

  const b = bid.split(".")[1] ?? "0";
  const a = ask.split(".")[1] ?? "0";

  return Math.abs(Number(b) - Number(a)).toString().padStart(2, "0");
}

function formatVolume(value?: string | number) {
  if (value === undefined || value === null || value === "--") return "--";
  const n = Number(value);
  if (!Number.isFinite(n)) return "--";
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export default function MarketWatch() {
  const token = getAccessTokenFromCookie();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<
    { code: string; name: string }[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const viewBoxRef = useRef<HTMLDivElement | null>(null);

  const [visibleCols, setVisibleCols] = useState({
    code: true,
    bid: true,
    ask: true,
    open: true,
    chg: true,
    lowHigh: true,
    spread: true,
    remove: true,
  });

  const listQuery = useDefaultWatchlist();
  const addMutation = useAddDefaultWatchlist();
  const removeMutation = useRemoveDefaultWatchlist();
  const { map: precisionMap } = useInstrumentPrecisionMap();

  const rows = listQuery.data?.data ?? [];

  const totalPages = Math.max(1, Math.ceil(rows.length / limit));

  const paginated = rows.slice((page - 1) * limit, page * limit);

  /* 🔴 LIVE DATA */
  const symbols = rows.map((r) => r.code);
  const liveQuotes = useLiveQuotesBySymbols(token, symbols);

  useEffect(() => {
    let active = true;
    const handler = setTimeout(async () => {
      const q = search.trim();
      if (!q) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      try {
        const data = await searchInstruments({
          q,
          limit: 20,
        });
        if (active) setSearchResults(data);
      } finally {
        if (active) setIsSearching(false);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(handler);
    };
  }, [search]);

  useEffect(() => {
    const onClick = (e: Event) => {
      const target = e.target as Node;
      const path = (e as Event & { composedPath?: () => EventTarget[] }).composedPath?.();

      const isInsideSearch =
        !!searchBoxRef.current &&
        (searchBoxRef.current.contains(target) ||
          (path && path.includes(searchBoxRef.current)));
      const isInsideView =
        !!viewBoxRef.current &&
        (viewBoxRef.current.contains(target) ||
          (path && path.includes(viewBoxRef.current)));

      if (!isInsideSearch) setSearchOpen(false);
      if (!isInsideView) setViewOpen(false);
    };

    document.addEventListener("mousedown", onClick, true);
    document.addEventListener("touchstart", onClick, true);
    return () => {
      document.removeEventListener("mousedown", onClick, true);
      document.removeEventListener("touchstart", onClick, true);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container-pad space-y-4 sm:space-y-5 max-w-6xl mx-0 md:mx-auto"
    >
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <div>
          <h1 className="text-xs sm:text-lg font-semibold">Default Watchlist</h1>
          <p className="text-[var(--text-muted)] mt-1 text-[10px] sm:text-sm">
            Manage symbols shown for all users
          </p>
        </div>
      </div>

      {/* SEARCH + VIEW */}
      <div className="flex flex-row items-center gap-2">
        <div className="relative flex-1" ref={searchBoxRef}>
          <div className="flex items-center">
            <input
              value={search}
              onFocus={() => setSearchOpen(true)}
              onChange={(e) => {
                setSearch(e.target.value);
                setSearchOpen(true);
              }}
              placeholder="Search symbol..."
              className="w-full rounded-xl bg-[var(--card-bg)] px-3 py-2 text-xs sm:text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] border border-[var(--card-border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>

          {searchOpen && search.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 border border-[var(--card-border)] rounded-lg bg-[var(--card-bg)] max-h-52 sm:max-h-64 overflow-auto z-20">
              {isSearching ? (
                <div className="px-3 py-2 text-[11px] sm:text-xs text-[var(--text-muted)]">
                  Searching...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="px-3 py-2 text-[11px] sm:text-xs text-[var(--text-muted)]">
                  No results
                </div>
              ) : (
                searchResults.map((item) => {
                  const alreadyAdded = rows.some((r) => r.code === item.code);
                  return (
                    <button
                      key={item.code}
                      onClick={async () => {
                        if (!alreadyAdded) {
                          await addMutation.mutateAsync(item.code);
                        }
                        setSearch("");
                        setSearchResults([]);
                        setSearchOpen(false);
                      }}
                      className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-[var(--hover-bg)]"
                      aria-disabled={alreadyAdded}
                    >
                      <span className="flex flex-col min-w-0">
                        <span className="text-xs sm:text-sm font-semibold">
                          {item.code}
                        </span>
                        <span className="text-[10px] sm:text-xs text-[var(--text-muted)] truncate">
                          {item.name}
                        </span>
                      </span>
                      {alreadyAdded ? (
                        <span className="text-[10px] text-[var(--text-muted)]">
                          Added
                        </span>
                      ) : (
                        <span className="h-5 w-5 rounded-full border border-black/20 text-black text-[12px] leading-[18px] text-center">
                          +
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="relative" ref={viewBoxRef}>
          <button
            onClick={() => setViewOpen((v) => !v)}
            className="p-2 text-[var(--text-main)] hover:text-[var(--primary)]"
            aria-label="Toggle columns"
          >
            <SlidersHorizontal size={16} />
          </button>

          {viewOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-20 cursor-default"
                onClick={() => setViewOpen(false)}
                aria-label="Close columns menu"
              />
              <div className="absolute right-0 mt-2 w-52 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-lg z-30">
                <div className="px-3 py-2 text-[11px] sm:text-xs text-[var(--text-muted)] border-b border-[var(--card-border)]">
                  Toggle columns
                </div>
                <div className="p-2 space-y-1">
                  {[
                    { key: "code", label: "Code" },
                    { key: "bid", label: "Bid" },
                    { key: "ask", label: "Ask" },
                    { key: "open", label: "Open" },
                    { key: "chg", label: "Chg" },
                    { key: "lowHigh", label: "Low / High" },
                    { key: "spread", label: "Spread" },
                    { key: "remove", label: "Remove" },
                  ].map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 px-2 py-1 text-xs sm:text-sm cursor-pointer border-b border-[var(--card-border)] hover:bg-[var(--hover-bg)]"
                  >
                    <input
                      type="checkbox"
                      checked={visibleCols[col.key as keyof typeof visibleCols]}
                      onChange={() =>
                        setVisibleCols((prev) => ({
                          ...prev,
                          [col.key]: !prev[col.key as keyof typeof prev],
                        }))
                      }
                      className="h-4 w-4 rounded border border-[var(--card-border)] bg-transparent accent-black"
                    />
                    <span>{col.label}</span>
                  </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="card overflow-hidden shadow-none p-0 border-0">
        <DragScroll className="relative overflow-x-auto sm:overflow-visible">
          <table className="table w-full text-[9px] sm:text-[13px] p-0">
            <thead style={{ background: "transparent" }}>
  <tr>
    {visibleCols.code && (
      <th className="py-0.5 px-0.5 text-[9px] sm:text-[12px]">Code</th>
    )}
    {visibleCols.bid && (
      <th className="text-right py-0.5 px-0.5 text-[9px] sm:text-[12px]">Bid</th>
    )}
    {visibleCols.ask && (
      <th className="text-right py-0.5 px-0.5 text-[9px] sm:text-[12px]">Ask</th>
    )}
    {visibleCols.open && (
      <th className="text-right py-0.5 px-0.5 text-[9px] sm:text-[12px]">Open</th>
    )}
    {visibleCols.chg && (
      <th className="text-right py-0.5 px-0.5 text-[9px] sm:text-[12px]">Chg</th>
    )}
    {visibleCols.lowHigh && (
      <th className="text-center py-0.5 px-0.5 text-[9px] sm:text-[12px]">Low</th>
    )}
    {visibleCols.lowHigh && (
      <th className="text-center py-0.5 px-0.5 text-[9px] sm:text-[12px]">High</th>
    )}
    {visibleCols.spread && (
      <th className="text-center py-0.5 px-0.5 text-[9px] sm:text-[12px]">Spread</th>
    )}
    {visibleCols.remove && (
      <th className="text-center py-0.5 px-0.5 text-[9px] sm:text-[12px]">Remove</th>
    )}
  </tr>
</thead>


           <tbody>
  <AnimatePresence>
    {listQuery.isLoading ? (
      <tr>
        <td
          colSpan={Object.values(visibleCols).filter(Boolean).length}
          className="py-12 text-center"
        >
          <GlobalLoader />
        </td>
      </tr>
    ) : paginated.length === 0 ? (
      <tr>
        <td
          colSpan={Object.values(visibleCols).filter(Boolean).length}
          className="py-12 text-center text-muted"
        >
          No symbols found
        </td>
      </tr>
    ) : (
      paginated.map((row, idx) => {
        const live = liveQuotes[row.code];
        const precision = precisionMap[row.code] ?? 2;

        const lastPrice =
          live?.bid && live.bid !== "--"
            ? live.bid
            : live?.ask && live.ask !== "--"
              ? live.ask
              : live?.close ?? live?.open ?? "--";
        const displayBid =
          live?.bid && live.bid !== "--" ? live.bid : lastPrice;
        const displayAsk =
          live?.ask && live.ask !== "--" ? live.ask : lastPrice;

        const bid = splitPrice(displayBid ?? "--", precision);
        const ask = splitPrice(displayAsk ?? "--", precision);
        const spread = calcSpread(
          live?.bid && live.bid !== "--" ? live.bid : undefined,
          live?.ask && live.ask !== "--" ? live.ask : undefined
        );
        const current = toNumber(displayBid ?? displayAsk);
        const open = toNumber(live?.open);
        const delta =
          typeof live?.change === "number"
            ? live.change
            : current !== null && open !== null
            ? current - open
            : null;
        const pct =
          typeof live?.changePercent === "number"
            ? live.changePercent
            :
          current !== null && open !== null && open !== 0
            ? ((current - open) / open) * 100
            : null;

        const bidColor =
          live?.bidDir === "up"
            ? "text-blue-600"
            : live?.bidDir === "down"
            ? "text-red-600"
            : "text-[var(--text-main)]";

        const askColor =
          live?.askDir === "up"
            ? "text-blue-600"
            : live?.askDir === "down"
            ? "text-red-600"
            : "text-[var(--text-main)]";

        return (
          <Fragment key={row.code}>
            <motion.tr
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
              className={`hover:bg-[var(--hover-bg)] ${
                delta === null
                  ? ""
                  : delta > 0
                  ? "bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent"
                  : delta < 0
                  ? "bg-gradient-to-r from-red-500/10 via-transparent to-transparent"
                  : ""
              }`}
            >
            {/* CODE + NAME */}
            {visibleCols.code && (
              <td className="font-mono font-semibold py-0.5 px-0.5">
                <div className="flex flex-col">
                  <span className="text-[11px] sm:text-[12px]">{row.code}</span>
                  <span className="text-[8px] sm:text-[11px] font-normal text-[var(--text-muted)] truncate">
                    {row.name}
                  </span>
                </div>
              </td>
            )}


            {/* BID */}
            {visibleCols.bid && (
              <td className="text-right py-0.5 px-0.5">
                <div className={`font-semibold ${bidColor} text-[10px] sm:text-[14px]`}>
                  {bid.int}.
                  <span className="text-[10px] sm:text-[15px]">{bid.big}</span>
                  {bid.small && (
                    <sup className="text-[8px] sm:text-[12px] relative top-[-5px]">
                      {bid.small}
                    </sup>
                  )}
                </div>
                <div className="text-[8px] sm:text-[11px] text-muted hidden sm:block">
                  Vol {formatVolume(live?.bidVolume)}
                </div>
              </td>
            )}

            {/* ASK */}
            {visibleCols.ask && (
              <td className="text-right py-0.5 px-0.5">
                <div className={`font-semibold ${askColor} text-[10px] sm:text-[14px]`}>
                  {ask.int}.
                  <span className="text-[10px] sm:text-[15px]">{ask.big}</span>
                  {ask.small && (
                    <sup className="text-[8px] sm:text-[12px] relative top-[-5px]">
                      {ask.small}
                    </sup>
                  )}
                </div>
                <div className="text-[8px] sm:text-[11px] text-muted hidden sm:block">
                  Vol {formatVolume(live?.askVolume)}
                </div>
              </td>
            )}

            {/* OPEN */}
            {visibleCols.open && (
              <td className="text-right py-0.5 px-0.5">
                <div className="font-semibold text-[10px] sm:text-[14px]">
                  {formatPrice(open, precision)}
                </div>
              </td>
            )}

            {/* CHANGE */}
            {visibleCols.chg && (
              <td className="text-right py-0.5 px-0.5">
                <div
                  className={`font-semibold text-[10px] sm:text-[14px] ${
                    delta === null
                      ? "text-[var(--text-muted)]"
                      : delta > 0
                      ? "text-blue-600"
                      : delta < 0
                      ? "text-red-600"
                      : "text-[var(--text-main)]"
                  }`}
                >
                  {delta === null ? "--" : formatSigned(delta, 2)}
                </div>
                <div className="text-[8px] sm:text-[11px] text-muted flex items-center justify-end gap-1">
                  {pct === null ? (
                    "--"
                  ) : (
                    <>
                      {pct > 0 ? (
                        <ArrowUpRight size={10} className="text-emerald-500" />
                      ) : pct < 0 ? (
                        <ArrowDownRight size={10} className="text-red-500" />
                      ) : (
                        <Minus size={10} className="text-[var(--text-muted)]" />
                      )}
                      <span>{`${formatSigned(pct, 2)}%`}</span>
                    </>
                  )}
                </div>
              </td>
            )}

            {/* LOW / HIGH */}
            {visibleCols.lowHigh && (
              <td className="text-center text-[10px] sm:text-[12px] py-0.5 px-0.5">
                <span className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[10px] sm:text-[12px] font-semibold text-red-600 bg-red-500/10 shadow-[0_0_10px_rgba(239,68,68,0.15)]">
                  {formatPrice(live?.low, precision)}
                </span>
              </td>
            )}
            {visibleCols.lowHigh && (
              <td className="text-center text-[10px] sm:text-[12px] py-0.5 px-0.5">
                <span className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[10px] sm:text-[12px] font-semibold text-emerald-600 bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                  {formatPrice(live?.high, precision)}
                </span>
              </td>
            )}

            {/* SPREAD */}
            {visibleCols.spread && (
              <td className="text-center font-mono text-[10px] sm:text-[13px] py-0.5 px-0.5">
                {spread}
              </td>
            )}

            {/* ACTION */}
            {visibleCols.remove && (
              <td className="text-center py-0.5 px-0.5">
                <button
                  onClick={() => {
                    setSelectedCode(row.code);
                    setConfirmOpen(true);
                  }}
                  className="p-1 text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </td>
            )}
            </motion.tr>
          </Fragment>
        );
      })
    )}
  </AnimatePresence>
</tbody>

          </table>
        </DragScroll>
      </div>

      {/* PAGINATION */}
      <Pagination
        page={page}
        totalPages={totalPages}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(1);
        }}
      />

      {/* CONFIRM DELETE */}
      {confirmOpen && selectedCode && (
        <ConfirmModal
          title="Remove Symbol"
          description={`Remove ${selectedCode} from default watchlist?`}
          loading={removeMutation.isPending}
          onCancel={() => {
            setConfirmOpen(false);
            setSelectedCode(null);
          }}
          onConfirm={async () => {
            await removeMutation.mutateAsync(selectedCode);
            setConfirmOpen(false);
            setSelectedCode(null);
          }}
        />
      )}
    </motion.div>
  );
}
