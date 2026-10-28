"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Save, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import GlobalLoader from "../../components/ui/GlobalLoader";
import {
  useUpdateWithdrawMethods,
  useWithdrawMethods,
} from "@/hooks/useWithdrawMethods";

export default function WithdrawMethodsPage() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useWithdrawMethods();
  const updateMutation = useUpdateWithdrawMethods();
  const [draft, setDraft] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    if (data?.methods) setDraft(data.methods);
  }, [data?.methods]);

  const catalog = data?.catalog ?? [];
  const methods = draft ?? data?.methods ?? {};

  const enabledCount = useMemo(
    () => Object.values(methods).filter(Boolean).length,
    [methods],
  );

  const dirty = useMemo(() => {
    if (!data?.methods || !draft) return false;
    return catalog.some((item) => draft[item.code] !== data.methods[item.code]);
  }, [catalog, data?.methods, draft]);

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

  const handleToggle = (code: string) => {
    setDraft((prev) => ({
      ...(prev || methods),
      [code]: !Boolean((prev || methods)[code]),
    }));
  };

  const handleSave = async () => {
    if (!draft) return;
    try {
      await updateMutation.mutateAsync(draft);
      toast.success("Withdraw methods updated for this admin/broker.");
    } catch (err) {
      toast.error(
        getErrorMessage(err, "Unable to update withdraw methods."),
      );
    }
  };

  if (isLoading) return <GlobalLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Finance · Withdraw
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
            Withdraw Methods
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
            Enable payout types for this broker only. Users on the web portal
            will only see methods you turn on here.
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
            disabled={!dirty || updateMutation.isPending}
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            <Save size={14} />
            {updateMutation.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {isError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600">
          {getErrorMessage(error, "Unable to load withdraw methods.")}
        </div>
      ) : null}

      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <Wallet size={16} />
          <span>
            {enabledCount} method{enabledCount === 1 ? "" : "s"} enabled for
            this broker
          </span>
        </div>

        <div className="grid gap-3">
          {catalog.map((item) => {
            const on = Boolean(methods[item.code]);
            return (
              <label
                key={item.code}
                className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-[var(--foreground)]">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {item.description}
                  </p>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    Fields:{" "}
                    {item.fields
                      .map(
                        (f) =>
                          `${f.label}${f.required ? "" : " (optional)"}`,
                      )
                      .join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  onClick={() => handleToggle(item.code)}
                  className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition ${
                    on ? "bg-[var(--primary)]" : "bg-[var(--card-border)]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                      on ? "left-5" : "left-0.5"
                    }`}
                  />
                </button>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
