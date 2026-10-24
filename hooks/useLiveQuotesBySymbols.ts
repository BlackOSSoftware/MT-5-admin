"use client";

import {
    MarketSocket,
    isMarketSocketDebugEnabled,
} from "@/services/marketSocket.service";
import { QuoteLiveState } from "@/types/market";
import { useCallback, useEffect, useRef, useState } from "react";

type QuoteMap = Record<string, QuoteLiveState>;

const SYMBOL_ALIAS_MAP: Record<string, string> = {
    SILVER: "XAGUSD",
    GOLD: "XAUUSD",
};

function normalizeSymbol(value: string) {
    return (value ?? "").trim().toUpperCase();
}

function compactSymbol(value: string) {
    const compact = normalizeSymbol(value).replace(/[^A-Z0-9]/g, "");
    return compact.replace(/^XBT/, "BTC");
}

function canonicalSymbol(value: string) {
    const compact = compactSymbol(value);
    if (compact === "GOLD") return "XAUUSD";
    if (compact === "SILVER") return "XAGUSD";
    return compact;
}

function sameSymbol(a: string, b: string) {
    const ca = canonicalSymbol(a);
    const cb = canonicalSymbol(b);
    return Boolean(ca && cb && ca === cb);
}

function resolveFeedSymbol(value: string) {
    const normalized = normalizeSymbol(value);
    if (!normalized) return "";
    return compactSymbol(SYMBOL_ALIAS_MAP[normalized] ?? normalized);
}

export function useLiveQuotesBySymbols(
    token: string,
    symbols: string[]
) {
    const socketRef = useRef<MarketSocket | null>(null);
    const bufferRef = useRef<QuoteMap>({});
    const subscribedRef = useRef<Set<string>>(new Set());
    const frameRef = useRef<number | null>(null);
    const firstTickLoggedRef = useRef<Set<string>>(new Set());
    const firstMessageLoggedRef = useRef(false);
    const aliasesRef = useRef<Record<string, string[]>>({});

    const [quotes, setQuotes] = useState<QuoteMap>({});

    function pickNumber(...values: Array<unknown>) {
        for (const v of values) {
            if (v === undefined || v === null) continue;
            const n = Number(v);
            if (Number.isFinite(n)) return n;
        }
        return undefined;
    }

    function isRecord(value: unknown): value is Record<string, unknown> {
        return typeof value === "object" && value !== null;
    }

    function toQuoteString(value: unknown): string | undefined {
        if (typeof value === "string") return value;
        if (typeof value === "number" && Number.isFinite(value)) return value.toString();
        return undefined;
    }

    function createEmptyQuote(symbol: string): QuoteLiveState {
        return {
            symbol,
            bid: "--",
            ask: "--",
            bidVolume: "--",
            askVolume: "--",
            bidDir: "same",
            askDir: "same",
        };
    }

    const getAliasKeys = useCallback((symbol: string) => {
        const compact = compactSymbol(symbol);
        const keys = new Set<string>();

        Object.keys(bufferRef.current).forEach((key) => {
            if (compactSymbol(key) === compact || sameSymbol(key, symbol)) keys.add(key);
        });

        Object.entries(aliasesRef.current).forEach(([feedSymbol, aliases]) => {
            if (compactSymbol(feedSymbol) === compact || sameSymbol(feedSymbol, symbol)) {
                keys.add(feedSymbol);
                aliases.forEach((alias) => keys.add(alias));
            }
        });

        if (keys.size === 0 && compact) keys.add(compact);
        return Array.from(keys);
    }, []);

    const writeQuoteToAliases = useCallback((symbol: string, quote: QuoteLiveState) => {
        getAliasKeys(symbol).forEach((key) => {
            bufferRef.current[key] = { ...quote, symbol: key };
        });
    }, [getAliasKeys]);

    function flush() {
        if (frameRef.current) return;
        frameRef.current = requestAnimationFrame(() => {
            frameRef.current = null;
            setQuotes({ ...bufferRef.current });
        });
    }

    useEffect(() => {
        return () => {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
            }
        };
    }, []);

    /* SOCKET INIT */
    useEffect(() => {
        const debug = isMarketSocketDebugEnabled();
        if (!token) {
            return;
        }
        const socket = new MarketSocket();
        socketRef.current = socket;

        const handleMessage = (raw: Record<string, unknown>) => {
            if (!firstMessageLoggedRef.current) {
                const meta = {
                    type: typeof raw.type === "string" ? raw.type : undefined,
                    status: typeof raw.status === "string" ? raw.status : undefined,
                    symbol: typeof raw.symbol === "string" ? raw.symbol : undefined,
                };
                if (debug) {
                    console.log("[LivePrice] message received", meta);
                }
                firstMessageLoggedRef.current = true;
            }

            if (raw.status === "subscribed") {
                const s = typeof raw.symbol === "string" ? compactSymbol(raw.symbol) : "";
                if (!s) return;

                const data = isRecord(raw.data) ? raw.data : undefined;
                const providerSymbol =
                    typeof raw.providerSymbol === "string"
                        ? compactSymbol(raw.providerSymbol)
                        : "";

                if (providerSymbol && providerSymbol !== s) {
                    if (!aliasesRef.current[providerSymbol]) {
                        aliasesRef.current[providerSymbol] = [];
                    }
                    if (!aliasesRef.current[providerSymbol].includes(s)) {
                        aliasesRef.current[providerSymbol].push(s);
                    }
                    if (!bufferRef.current[providerSymbol]) {
                        bufferRef.current[providerSymbol] =
                            bufferRef.current[s] ?? createEmptyQuote(providerSymbol);
                    }
                }

                if (!bufferRef.current[s]) {
                    bufferRef.current[s] = createEmptyQuote(s);
                }

                const prev = bufferRef.current[s];
                const nextOpen = pickNumber(
                    raw.dayOpen,
                    raw.day_open,
                    raw.open,
                    data?.dayOpen,
                    data?.day_open,
                    data?.open
                );
                const nextClose = pickNumber(
                    raw.dayClose,
                    raw.day_close,
                    raw.close,
                    data?.dayClose,
                    data?.day_close,
                    data?.close,
                    raw.prevClose,
                    data?.prevClose
                );
                const seedBid = pickNumber(
                    raw.lastBid,
                    raw.last_bid,
                    data?.lastBid,
                    data?.last_bid,
                    nextClose
                );
                const seedAsk = pickNumber(
                    raw.lastAsk,
                    raw.last_ask,
                    data?.lastAsk,
                    data?.last_ask,
                    nextClose
                );

                // When market is closed (no orderbook ticks yet), show last known price instead of "--".
                const hasLiveBid = prev.bid !== "--" && Number.isFinite(Number(prev.bid));
                const hasLiveAsk = prev.ask !== "--" && Number.isFinite(Number(prev.ask));

                const next = {
                    ...prev,
                    high:
                        pickNumber(raw.dayHigh, raw.day_high, raw.high, data?.dayHigh, data?.day_high, data?.high) ??
                        prev.high,
                    low:
                        pickNumber(raw.dayLow, raw.day_low, raw.low, data?.dayLow, data?.day_low, data?.low) ??
                        prev.low,
                    open: nextOpen ?? prev.open,
                    close: nextClose ?? prev.close,
                    bid: hasLiveBid
                        ? prev.bid
                        : seedBid !== undefined
                          ? String(seedBid)
                          : prev.bid,
                    ask: hasLiveAsk
                        ? prev.ask
                        : seedAsk !== undefined
                          ? String(seedAsk)
                          : prev.ask,
                };

                writeQuoteToAliases(s, next);
                if (providerSymbol) writeQuoteToAliases(providerSymbol, next);
                flush();
                return;
            }

            if (raw.type === "orderbook") {
                const data = raw.data;
                if (!isRecord(data)) return;

                const s = typeof data.code === "string" ? compactSymbol(data.code) : "";
                if (!s) return;

                const bids = data.bids;
                const asks = data.asks;
                if (!Array.isArray(bids) || !Array.isArray(asks)) return;

                const bidRaw = bids[0];
                const askRaw = asks[0];
                if (!isRecord(bidRaw) || !isRecord(askRaw)) return;

                const bidPrice = toQuoteString(bidRaw.price);
                const askPrice = toQuoteString(askRaw.price);
                const bidVolume = toQuoteString(bidRaw.volume) ?? "--";
                const askVolume = toQuoteString(askRaw.volume) ?? "--";
                if (!bidPrice || !askPrice) {
                    return;
                }

                const old = bufferRef.current[s] ?? createEmptyQuote(s);

                const nextOpen = pickNumber(
                    data.dayOpen,
                    data.day_open,
                    data.open,
                    data.openPrice
                );
                const nextClose = pickNumber(
                    data.dayClose,
                    data.day_close,
                    data.close,
                    data.prevClose
                );

                const current = Number(bidPrice);
                const fallbackOpen =
                    nextOpen ??
                    old.open ??
                    (Number.isFinite(current) ? current : undefined);
                const changeBase = nextClose ?? old.close ?? fallbackOpen;
                const change =
                    Number.isFinite(current) && typeof changeBase === "number"
                        ? current - changeBase
                        : old.change;
                const changePercent =
                    Number.isFinite(current) &&
                        typeof changeBase === "number" &&
                        changeBase !== 0
                        ? ((current - changeBase) / changeBase) * 100
                        : old.changePercent;

                const next = {
                    ...old,
                    bid: bidPrice,
                    ask: askPrice,
                    bidVolume,
                    askVolume,
                    high:
                        pickNumber(data.dayHigh, data.day_high, data.high) ??
                        (typeof old.high === "number" && Number.isFinite(current)
                            ? Math.max(old.high, current)
                            : Number.isFinite(current)
                                ? current
                                : old.high),
                    low:
                        pickNumber(data.dayLow, data.day_low, data.low) ??
                        (typeof old.low === "number" && Number.isFinite(current)
                            ? Math.min(old.low, current)
                            : Number.isFinite(current)
                                ? current
                                : old.low),
                    open: fallbackOpen,
                    close: nextClose ?? old.close,
                    change,
                    changePercent,
                    bidDir:
                        old.bid === "--"
                            ? "same"
                            : Number(bidPrice) > Number(old.bid)
                                ? "up"
                                : Number(bidPrice) < Number(old.bid)
                                    ? "down"
                                    : old.bidDir,
                    askDir:
                        old.ask === "--"
                            ? "same"
                            : Number(askPrice) > Number(old.ask)
                                ? "up"
                                : Number(askPrice) < Number(old.ask)
                                    ? "down"
                            : old.askDir,
                };

                writeQuoteToAliases(s, next);

                if (!firstTickLoggedRef.current.has(s)) {
                    if (debug) {
                        console.log("[LivePrice] first tick", {
                            symbol: s,
                            bid: bidPrice,
                            ask: askPrice,
                        });
                    }
                    firstTickLoggedRef.current.add(s);
                }
                flush();
            }
        };

        socket.connect(token, (raw: unknown) => {
            if (Array.isArray(raw)) {
                raw.forEach((item) => {
                    if (isRecord(item)) handleMessage(item);
                });
                return;
            }

            if (!isRecord(raw)) return;
            handleMessage(raw);
        });

        // subscribe any symbols that were queued before socket was ready
        subscribedRef.current.forEach((s) => {
            socket.subscribe(s);
        });

        return () => {
            socket.close();
            socketRef.current = null;
        };
    }, [token, writeQuoteToAliases]);

    /* SYMBOL SYNC */
    useEffect(() => {
        const debug = isMarketSocketDebugEnabled();
        const normalizedSymbols = symbols
            .map((s) => normalizeSymbol(s))
            .filter(Boolean);
        const feedSymbols = normalizedSymbols.map((s) => resolveFeedSymbol(s));
        const nextFeed = new Set(feedSymbols);
        const nextAliases = new Set(normalizedSymbols);
        const aliasesByFeed: Record<string, string[]> = {};

        normalizedSymbols.forEach((displaySymbol, idx) => {
            const feedSymbol = feedSymbols[idx];
            if (!feedSymbol) return;
            if (!aliasesByFeed[feedSymbol]) aliasesByFeed[feedSymbol] = [];
            if (!aliasesByFeed[feedSymbol].includes(displaySymbol)) {
                aliasesByFeed[feedSymbol].push(displaySymbol);
            }
        });

        aliasesRef.current = aliasesByFeed;

        nextFeed.forEach((feedSymbol) => {
            if (!subscribedRef.current.has(feedSymbol)) {
                subscribedRef.current.add(feedSymbol);
                if (!bufferRef.current[feedSymbol]) {
                    bufferRef.current[feedSymbol] = createEmptyQuote(feedSymbol);
                }
                if (debug) {
                    console.log("[LivePrice] subscribe", { symbol: feedSymbol });
                }
                socketRef.current?.subscribe(feedSymbol);
            }

            const aliases = aliasesByFeed[feedSymbol] ?? [];
            aliases.forEach((alias) => {
                if (!bufferRef.current[alias]) {
                    bufferRef.current[alias] = {
                        ...bufferRef.current[feedSymbol],
                        symbol: alias,
                    };
                }
            });
        });

        subscribedRef.current.forEach((feedSymbol) => {
            if (!nextFeed.has(feedSymbol)) {
                subscribedRef.current.delete(feedSymbol);
                socketRef.current?.unsubscribe(feedSymbol);
                if (debug) {
                    console.log("[LivePrice] unsubscribe", { symbol: feedSymbol });
                }
            }
        });

        const keepKeys = new Set<string>([...nextFeed, ...nextAliases]);
        Object.keys(bufferRef.current).forEach((key) => {
            if (!keepKeys.has(key)) {
                delete bufferRef.current[key];
            }
        });

        flush();
    }, [symbols]);

    return quotes;
}
