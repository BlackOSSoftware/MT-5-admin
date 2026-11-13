"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  RefreshCcw,
  Save,
  SlidersHorizontal,
  TrendingDown,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import GlobalLoader from "../components/ui/GlobalLoader";
import {
  useSlippageSettings,
  useUpdateSlippageSettings,
} from "@/hooks/useSlippageSettings";
import { useAdminMe } from "@/hooks/useAdmin";
import {
  canManageSlippage,
  type AdminMeLike,
} from "@/utils/adminPermissions";
import type { SlippageSettings } from "@/services/slippageSettings.service";

type FormState = {
  enabled: boolean;
  mode: "FIXED" | "RANDOM";
  fixed_points: string;
  min_points: string;
  max_points: string;
  apply_market_orders: boolean;
  apply_stop_orders: boolean;
  apply_close: boolean;
};

function toForm(data?: SlippageSettings | null): FormState {
  return {
    enabled: data?.enabled === true,
    mode: data?.mode === "RANDOM" ? "RANDOM" : "FIXED",
    fixed_points: String(data?.fixed_points ?? 0),
    min_points: String(data?.min_points ?? 0),
    max_points: String(data?.max_points ?? 0),
    apply_market_orders: data?.apply_market_orders !== false,
    apply_stop_orders: data?.apply_stop_orders !== false,
    apply_close: data?.apply_close === true,
  };
}

function parsePoints(value: string): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export default function SlippageSettingsPage() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useSlippageSettings();
  const updateMutation = useUpdateSlippageSettings();
  const { data: me } = useAdminMe();
  const canEdit = canManageSlippage(me as AdminMeLike);

  const [form, setForm] = useState<FormState>(() => toForm(null));
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (data && !initialized) {
      setForm(toForm(data));
      setInitialized(true);
    }
  }, [data, initialized]);

  const fixedNum = parsePoints(form.fixed_points);
  const minNum = parsePoints(form.min_points);
  const maxNum = parsePoints(form.max_points);

  const valid = useMemo(() => {
    if (fixedNum === null || minNum === null || maxNum === null) return false;
    if (form.mode === "RANDOM" && maxNum < minNum) return false;
    return true;
  }, [form.mode, fixedNum, minNum, maxNum]);

  const dirty = useMemo(() => {
    if (!data) return false;
    const base = toForm(data);
    return (
      form.enabled !== base.enabled ||
      form.mode !== base.mode ||
      Number(form.fixed_points) !== Number(base.fixed_points) ||
      Number(form.min_points) !== Number(base.min_points) ||
      Number(form.max_points) !== Number(base.max_points) ||
      form.apply_market_orders !== base.apply_market_orders ||
      form.apply_stop_orders !== base.apply_stop_orders ||
      form.apply_close !== base.apply_close
    );
  }, [data, form]);

  const getErrorMessage = (value: unknown, fallback: string) => {
    if (typeof value !== "object" || value === null) return fallback;
    const responseMessage = (
      value as { response?: { data?: { message?: string } }; message?: string }
    ).response?.data?.message;
    if (typeof responseMessage === "string" && responseMessage.trim()) {
      return responseMessage;
    }
    const base = (value as { message?: string }).message;
    if (typeof base === "string" && base.trim()) return base;
    return fallback;
  };

  const handleSave = async () => {
    if (!valid) {
      toast.error("Max points cannot be less than min points.");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        enabled: form.enabled,
        mode: form.mode,
        fixed_points: fixedNum ?? 0,
        min_points: minNum ?? 0,
        max_points: maxNum ?? 0,
        apply_market_orders: form.apply_market_orders,
        apply_stop_orders: form.apply_stop_orders,
        apply_close: form.apply_close,
        direction: "ADVERSE_ONLY",
      });
      toast.success("Slippage settings saved.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Unable to save slippage settings."));
    }
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  if (isLoading) return <GlobalLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Trading · Execution
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
            Slippage Settings
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
            Admin-controlled adverse slippage applied at order execution.
            Disabled by default — existing execution stays unchanged until
            enabled.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm"
          >
            <RefreshCcw size={14} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            disabled={!canEdit || !dirty || !valid || updateMutation.isPending}
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            <Save size={14} />
            {updateMutation.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getErrorMessage(error, "Unable to load slippage settings.")}
        </div>
      )}

      {!canEdit && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You have view-only access. The{" "}
          <code className="rounded bg-amber-100 px-1">settings.slippage</code>{" "}
          permission is required to modify slippage settings.
        </div>
      )}

      <fieldset disabled={!canEdit} className="contents">
      {/* Master toggle + mode */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
            <Zap size={16} className={form.enabled ? "text-emerald-500" : "text-[var(--text-muted)]"} />
            Enable Slippage
          </div>
          <button
            type="button"
            onClick={() => setField("enabled", !form.enabled)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
              form.enabled ? "bg-emerald-500" : "bg-[var(--card-border)]"
            }`}
            aria-pressed={form.enabled}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                form.enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            {form.enabled
              ? "Slippage is ACTIVE — applied to new executions."
              : "Slippage is DISABLED — orders execute at market price."}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
            <SlidersHorizontal size={16} className="text-sky-500" />
            Slippage Mode
          </div>
          <div className="flex gap-2">
            {(["FIXED", "RANDOM"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setField("mode", m)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  form.mode === m
                    ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "border-[var(--card-border)] text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            {form.mode === "FIXED"
              ? "Every order gets the same fixed slippage points."
              : "Each order rolls a random value between min and max points."}
          </p>
        </div>
      </div>

      {/* Points inputs */}
      <div className="grid gap-4 md:grid-cols-3">
        {form.mode === "FIXED" ? (
          <label className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
              <ArrowUpRight size={16} className="text-amber-500" />
              Fixed Slippage Points
            </div>
            <input
              type="number"
              min={0}
              step="0.1"
              value={form.fixed_points}
              onChange={(e) => setField("fixed_points", e.target.value)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2 text-lg"
            />
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Points added adversely per order (1 point = symbol tick size).
            </p>
          </label>
        ) : (
          <>
            <label className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                <ArrowDownRight size={16} className="text-emerald-500" />
                Minimum Slippage Points
              </div>
              <input
                type="number"
                min={0}
                step="0.1"
                value={form.min_points}
                onChange={(e) => setField("min_points", e.target.value)}
                className="w-full rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2 text-lg"
              />
            </label>
            <label className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                <ArrowUpRight size={16} className="text-amber-500" />
                Maximum Slippage Points
              </div>
              <input
                type="number"
                min={0}
                step="0.1"
                value={form.max_points}
                onChange={(e) => setField("max_points", e.target.value)}
                className={`w-full rounded-lg border bg-transparent px-3 py-2 text-lg ${
                  maxNum !== null && minNum !== null && maxNum < minNum
                    ? "border-red-400"
                    : "border-[var(--card-border)]"
                }`}
              />
              {maxNum !== null && minNum !== null && maxNum < minNum ? (
                <p className="mt-2 text-xs text-red-600">
                  Max points cannot be less than min points.
                </p>
              ) : (
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Upper bound for the random roll.
                </p>
              )}
            </label>
          </>
        )}

        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
            <TrendingDown size={16} className="text-violet-500" />
            Slippage Direction
          </div>
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2 text-sm font-medium">
            ADVERSE_ONLY
          </div>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            BUY fills higher, SELL fills lower — never in the client&apos;s
            favour.
          </p>
        </div>
      </div>

      {/* Apply-to toggles */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm">
        <div className="mb-4 text-sm font-medium text-[var(--foreground)]">
          Apply Slippage To
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <ToggleRow
            label="Market Orders"
            hint="Instant buy/sell at market price"
            checked={form.apply_market_orders}
            onChange={(v) => setField("apply_market_orders", v)}
          />
          <ToggleRow
            label="Stop Orders"
            hint="BUY_STOP / SELL_STOP at trigger"
            checked={form.apply_stop_orders}
            onChange={(v) => setField("apply_stop_orders", v)}
          />
          <ToggleRow
            label="Position Closing"
            hint="Reserved — currently disabled"
            checked={form.apply_close}
            disabled
            onChange={(v) => setField("apply_close", v)}
          />
        </div>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          LIMIT and STOP_LIMIT orders always keep their limit-price protection
          and are never slipped.
        </p>
      </div>

      </fieldset>

      {/* Meta */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-5 py-4 text-sm text-[var(--text-muted)]">
        <p>
          Status:{" "}
          <strong className={form.enabled ? "text-emerald-600" : ""}>
            {form.enabled ? "ENABLED" : "DISABLED"}
          </strong>
          {" · "}Mode: <strong>{form.mode}</strong>
          {form.mode === "FIXED" ? (
            <>
              {" · "}Fixed: <strong>{fixedNum ?? 0}</strong> pts
            </>
          ) : (
            <>
              {" · "}Range: <strong>{minNum ?? 0}</strong>–
              <strong>{maxNum ?? 0}</strong> pts
            </>
          )}
        </p>
        {data?.updatedAt ? (
          <p className="mt-1 text-xs">
            Last updated:{" "}
            {new Date(data.updatedAt).toLocaleString()}
            {data.updatedBy?.name || data.updatedBy?.email
              ? ` by ${data.updatedBy.name || data.updatedBy.email}`
              : ""}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex items-start justify-between gap-3 rounded-lg border p-3 text-left transition ${
        disabled
          ? "cursor-not-allowed border-[var(--card-border)] opacity-50"
          : checked
            ? "border-[var(--primary)]/40 bg-[var(--primary)]/5"
            : "border-[var(--card-border)] hover:bg-[var(--hover-bg)]"
      }`}
    >
      <span>
        <span className="block text-sm font-medium text-[var(--foreground)]">
          {label}
        </span>
        <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
          {hint}
        </span>
      </span>
      <span
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
          checked ? "bg-emerald-500" : "bg-[var(--card-border)]"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}
