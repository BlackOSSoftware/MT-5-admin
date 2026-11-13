"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ibSettingsService,
  type IbLevel,
} from "@/services/ibSettings.service";
import GlobalLoader from "@/app/admin/components/ui/GlobalLoader";

export default function IbLevelSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [levels, setLevels] = useState<IbLevel[]>([
    { level: 1, percent: 70 },
    { level: 2, percent: 30 },
  ]);
  const [maxDepth, setMaxDepth] = useState(2);

  const sum = useMemo(
    () => levels.reduce((s, l) => s + (Number(l.percent) || 0), 0),
    [levels],
  );

  useEffect(() => {
    (async () => {
      try {
        const data = await ibSettingsService.getLevels();
        setLevels(
          (data.levels || []).map((l) => ({
            level: Number(l.level),
            percent: Number(l.percent),
          })),
        );
        setMaxDepth(Number(data.maxDepth) || 2);
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "response" in err
            ? // @ts-expect-error axios
              err.response?.data?.message
            : null;
        toast.error(message || "Failed to load IB level settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    if (sum > 100) {
      toast.error("Level percents must sum to <= 100");
      return;
    }
    setSaving(true);
    try {
      await ibSettingsService.saveLevels({ levels, maxDepth });
      toast.success("IB level settings saved");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? // @ts-expect-error axios
            err.response?.data?.message
          : null;
      toast.error(message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container-pad">
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-10">
          <GlobalLoader />
        </div>
      </div>
    );
  }

  return (
    <div className="container-pad max-w-3xl space-y-4">
      <header className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <h1 className="text-xl font-semibold">IB Level Settings</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Split the plan IB $ / lot budget across referral levels. Level 1 =
          direct referrer. Sum must be ≤ 100%.
        </p>
      </header>

      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 space-y-4">
        {levels.map((row, idx) => (
          <div key={row.level} className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Level
              <input
                type="number"
                min={1}
                value={row.level}
                onChange={(e) => {
                  const next = [...levels];
                  next[idx] = { ...row, level: Number(e.target.value) };
                  setLevels(next);
                }}
                className="mt-1 h-9 w-full rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-3"
              />
            </label>
            <label className="text-sm">
              Percent %
              <input
                type="number"
                min={0}
                max={100}
                value={row.percent}
                onChange={(e) => {
                  const next = [...levels];
                  next[idx] = { ...row, percent: Number(e.target.value) };
                  setLevels(next);
                }}
                className="mt-1 h-9 w-full rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-3"
              />
            </label>
          </div>
        ))}

        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-xl border border-[var(--card-border)] px-3 py-2 text-sm"
            onClick={() =>
              setLevels((prev) => [
                ...prev,
                { level: prev.length + 1, percent: 0 },
              ])
            }
          >
            Add level
          </button>
          {levels.length > 1 ? (
            <button
              type="button"
              className="rounded-xl border border-[var(--card-border)] px-3 py-2 text-sm"
              onClick={() => setLevels((prev) => prev.slice(0, -1))}
            >
              Remove last
            </button>
          ) : null}
        </div>

        <label className="block text-sm">
          Max depth
          <input
            type="number"
            min={1}
            max={10}
            value={maxDepth}
            onChange={(e) => setMaxDepth(Number(e.target.value))}
            className="mt-1 h-9 w-40 rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-3"
          />
        </label>

        <p
          className={`text-sm font-medium ${
            sum > 100 ? "text-rose-600" : "text-emerald-700"
          }`}
        >
          Sum: {sum.toFixed(2)}% {sum > 100 ? "(invalid)" : "(ok)"}
        </p>

        <button
          type="button"
          disabled={saving || sum > 100}
          onClick={() => void save()}
          className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}
