"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  planSymbolSpreadService,
  type PlanSymbolSpreadRow,
} from "@/services/planSymbolSpread.service";
import GlobalLoader from "@/app/admin/components/ui/GlobalLoader";

type Draft = {
  house: string;
  ib: string;
  active: boolean;
  saving?: boolean;
};

function numOrZero(v: string) {
  if (v.trim() === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export default function PlanScriptSpreadsPanel({ planId }: { planId: string }) {
  const [rows, setRows] = useState<PlanSymbolSpreadRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await planSymbolSpreadService.list(planId);
      setRows(data);
      const next: Record<string, Draft> = {};
      for (const r of data) {
        next[r.symbol] = {
          house: String(r.house_usd_per_lot ?? 0),
          ib: String(r.ib_usd_per_lot ?? 0),
          active: Boolean(r.isActive),
        };
      }
      setDrafts(next);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? // @ts-expect-error axios shape
            err.response?.data?.message
          : null;
      toast.error(message || "Failed to load script spreads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (planId) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  const filtered = useMemo(() => {
    const needle = q.trim().toUpperCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.symbol.includes(needle) ||
        String(r.instrument_name || "")
          .toUpperCase()
          .includes(needle),
    );
  }, [rows, q]);

  const saveRow = async (symbol: string) => {
    const d = drafts[symbol];
    if (!d) return;
    const house = numOrZero(d.house);
    const ib = numOrZero(d.ib);
    if (!Number.isFinite(house) || house < 0) {
      toast.error("Company $ / lot must be >= 0");
      return;
    }
    if (!Number.isFinite(ib) || ib < 0) {
      toast.error("IB $ / lot must be >= 0");
      return;
    }

    const total = house + ib;
    const ok = window.confirm(
      `Save ${symbol}?\nCompany $${house}/lot + IB $${ib}/lot = $${total}/lot total user spread value.`,
    );
    if (!ok) return;

    setDrafts((prev) => ({
      ...prev,
      [symbol]: { ...prev[symbol], saving: true },
    }));

    try {
      const saved = await planSymbolSpreadService.upsert(planId, {
        symbol,
        house_usd_per_lot: house,
        ib_usd_per_lot: ib,
        isActive: d.active,
      });
      setRows((prev) => {
        const idx = prev.findIndex((r) => r.symbol === symbol);
        if (idx < 0) return [...prev, saved];
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      });
      setDrafts((prev) => ({
        ...prev,
        [symbol]: {
          house: String(saved.house_usd_per_lot ?? house),
          ib: String(saved.ib_usd_per_lot ?? ib),
          active: Boolean(saved.isActive),
          saving: false,
        },
      }));
      toast.success(`${symbol} saved`);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? // @ts-expect-error axios shape
            err.response?.data?.message
          : null;
      toast.error(message || "Save failed");
      setDrafts((prev) => ({
        ...prev,
        [symbol]: { ...prev[symbol], saving: false },
      }));
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-10">
        <GlobalLoader />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
      <div className="flex flex-col gap-3 border-b border-[var(--card-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Script Spreads</h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Set Company $ and IB $ per 1.00 lot for each symbol. Pip / bid-ask
            half preview are auto from contract size.
          </p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search symbol"
          className="h-9 w-full rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-3 text-sm sm:w-56"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--card-border)] text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2">Symbol</th>
              <th className="px-3 py-2">Company $ / lot</th>
              <th className="px-3 py-2">IB $ / lot</th>
              <th className="px-3 py-2">Total $</th>
              <th className="px-3 py-2">Pip</th>
              <th className="px-3 py-2">Half (bid/ask)</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const d = drafts[row.symbol] || {
                house: "0",
                ib: "0",
                active: false,
              };
              const house = numOrZero(d.house);
              const ib = numOrZero(d.ib);
              const total =
                Number.isFinite(house) && Number.isFinite(ib) ? house + ib : NaN;
              const cs = Number(row.contractSize) > 0 ? Number(row.contractSize) : 1;
              const width =
                Number.isFinite(total) && total >= 0 ? total / cs : null;
              const half = width != null ? width / 2 : null;
              const pip =
                width != null && row.pipSize && row.pipSize > 0
                  ? width / row.pipSize
                  : null;

              return (
                <tr
                  key={row.symbol}
                  className="border-b border-[var(--card-border)]/70"
                >
                  <td className="px-3 py-2 font-medium">
                    {row.symbol}
                    {row.instrument_name ? (
                      <span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">
                        {row.instrument_name} · CS {cs}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={d.house}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [row.symbol]: { ...d, house: e.target.value },
                        }))
                      }
                      className="h-8 w-24 rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] px-2"
                      inputMode="decimal"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={d.ib}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [row.symbol]: { ...d, ib: e.target.value },
                        }))
                      }
                      className="h-8 w-24 rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] px-2"
                      inputMode="decimal"
                    />
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {Number.isFinite(total) ? total.toFixed(2) : "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-[var(--text-muted)]">
                    {pip != null ? pip.toFixed(4) : "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-[var(--text-muted)]">
                    {half != null ? `±${half.toFixed(6)}` : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={d.active}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [row.symbol]: { ...d, active: e.target.checked },
                        }))
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={d.saving}
                      onClick={() => void saveRow(row.symbol)}
                      className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {d.saving ? "Saving…" : "Save"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {!filtered.length ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-10 text-center text-sm text-[var(--text-muted)]"
                >
                  No symbols found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
