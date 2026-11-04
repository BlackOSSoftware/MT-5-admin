"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCcw, Save, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import GlobalLoader from "../components/ui/GlobalLoader";
import {
  useRiskSettings,
  useUpdateRiskSettings,
} from "@/hooks/useRiskSettings";

export default function RiskSettingsPage() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useRiskSettings();
  const updateMutation = useUpdateRiskSettings();

  const [warningInput, setWarningInput] = useState<string | null>(null);
  const [stopOutInput, setStopOutInput] = useState<string | null>(null);

  useEffect(() => {
    setWarningInput(null);
    setStopOutInput(null);
  }, [data?.warning_loss_percent, data?.stop_out_loss_percent, data?.brokerId]);

  const warningValue =
    warningInput ??
    (data?.warning_loss_percent !== undefined
      ? String(data.warning_loss_percent)
      : "70");
  const stopOutValue =
    stopOutInput ??
    (data?.stop_out_loss_percent !== undefined
      ? String(data.stop_out_loss_percent)
      : "90");

  const warningNum = Number(warningValue);
  const stopOutNum = Number(stopOutValue);

  const valid = useMemo(() => {
    if (!Number.isFinite(warningNum) || warningNum < 0 || warningNum > 100) {
      return false;
    }
    if (!Number.isFinite(stopOutNum) || stopOutNum < 1 || stopOutNum > 100) {
      return false;
    }
    if (stopOutNum < 100 && warningNum >= stopOutNum) return false;
    return true;
  }, [warningNum, stopOutNum]);

  const dirty = useMemo(() => {
    if (!data) return false;
    return (
      warningNum !== Number(data.warning_loss_percent) ||
      stopOutNum !== Number(data.stop_out_loss_percent)
    );
  }, [data, warningNum, stopOutNum]);

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
      toast.error(
        "Warning % must be below stop-out % (unless stop-out is 100).",
      );
      return;
    }
    try {
      await updateMutation.mutateAsync({
        warning_loss_percent: warningNum,
        stop_out_loss_percent: stopOutNum,
      });
      toast.success("Risk settings saved for this broker.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Unable to save risk settings."));
    }
  };

  if (isLoading) return <GlobalLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Trading · Risk
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
            Stop-out &amp; Warnings
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
            Per-broker floating loss %. Warning sends a push; stop-out force
            closes all open positions. FP default is 100% exit; Oceana default
            is 90%.
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
            disabled={!dirty || !valid || updateMutation.isPending}
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
          {getErrorMessage(error, "Unable to load risk settings. Select a broker.")}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
            <AlertTriangle size={16} className="text-amber-500" />
            Warning notification at (%)
          </div>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={warningValue}
            onChange={(e) => setWarningInput(e.target.value)}
            className="w-full rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2 text-lg"
          />
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            User gets a risk warning when floating loss reaches this % of
            (balance + bonus).
          </p>
        </label>

        <label className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
            <ShieldAlert size={16} className="text-red-500" />
            Stop-out / force close at (%)
          </div>
          <input
            type="number"
            min={1}
            max={100}
            step={1}
            value={stopOutValue}
            onChange={(e) => setStopOutInput(e.target.value)}
            className="w-full rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2 text-lg"
          />
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            All open positions are closed when loss reaches this %. Use{" "}
            <strong>100</strong> for FP-style full loss exit.
          </p>
        </label>
      </div>

      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-5 py-4 text-sm text-[var(--text-muted)]">
        <p>
          Active: warning <strong>{warningNum}%</strong> · stop-out{" "}
          <strong>{stopOutNum}%</strong>
          {data?.brokerName || data?.brokerCode ? (
            <>
              {" "}
              · broker{" "}
              <strong>
                {data.brokerName || data.brokerCode}
                {data.brokerCode && data.brokerName !== data.brokerCode
                  ? ` (${data.brokerCode})`
                  : ""}
              </strong>
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}
