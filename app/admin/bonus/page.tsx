"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Gift,
  Percent,
  RefreshCcw,
  Save,
  ToggleLeft,
  ToggleRight,
  User,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";
import GlobalLoader from "../components/ui/GlobalLoader";
import { useBonusSettings, useUpdateBonusSettings } from "@/hooks/bonus/useBonusSettings";
import { useBonusCredit } from "@/hooks/bonus/useBonusCredit";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useAdminUserAccounts } from "@/hooks/useAdminUserAccounts";
import type { AdminUser } from "@/types/user";
import type { AdminAccount } from "@/types/account";

export default function BonusPage() {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useBonusSettings();
  const updateMutation = useUpdateBonusSettings();
  const creditMutation = useBonusCredit();

  const [enabledInput, setEnabledInput] = useState<boolean | null>(null);
  const [percentInput, setPercentInput] = useState<string | null>(null);
  const [userSearchInput, setUserSearchInput] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserName, setSelectedUserName] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [creditResult, setCreditResult] = useState<{
    bonusAdded?: number;
    bonusBalance?: number;
    equity?: number;
  } | null>(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setUserQuery(userSearchInput.trim());
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [userSearchInput]);

  const usersQuery = useAdminUsers({
    q: userQuery || undefined,
    page: 1,
    limit: 20,
  });
  const accountsQuery = useAdminUserAccounts({
    userId: selectedUserId || undefined,
    page: 1,
    limit: 50,
  });

  const users = usersQuery.data?.data ?? [];
  const accounts = accountsQuery.data?.data ?? [];
  const selectedAccount =
    accounts.find((account: AdminAccount) => account._id === selectedAccountId) ??
    null;
  const shouldShowUserResults =
    userSearchInput.trim().length > 0 && selectedUserId === "";

  const enabledValue = enabledInput ?? data?.bonus_enabled ?? false;
  const percentValue =
    percentInput ?? (data?.default_bonus_percent !== undefined
      ? String(data.default_bonus_percent)
      : "");

  const percentNumber = Number(percentValue);
  const isValidPercent =
    Number.isFinite(percentNumber) && percentNumber >= 0 && percentNumber <= 100;

  const creditAmountNumber = Number(creditAmount);
  const canSubmitCredit =
    selectedAccountId.trim().length > 0 &&
    Number.isFinite(creditAmountNumber) &&
    creditAmountNumber > 0;
  const percentInputDisplayValue =
    percentInput === null &&
    percentValue.trim() !== "" &&
    Number(percentValue) === 0
      ? ""
      : percentValue;

  const formatNumber = (value?: number | null, fractionDigits = 2) => {
    if (value === undefined || value === null || Number.isNaN(value)) return "--";
    return value.toLocaleString("en-IN", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  };

  const formatDateTime = (value?: string | number) => {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";
    return date.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getErrorMessage = (value: unknown, fallback: string) => {
    if (typeof value !== "object" || value === null) return fallback;

    const responseMessage = (
      value as { response?: { data?: { message?: string; error?: string } } }
    ).response?.data;

    if (typeof responseMessage?.message === "string" && responseMessage.message.trim()) {
      return responseMessage.message;
    }

    if (typeof responseMessage?.error === "string" && responseMessage.error.trim()) {
      return responseMessage.error;
    }

    const baseMessage = (value as { message?: string }).message;
    if (typeof baseMessage === "string" && baseMessage.trim()) {
      return baseMessage;
    }

    return fallback;
  };

  const onSaveSettings = async () => {
    if (!isValidPercent) {
      toast.error("Enter a valid bonus percent (0-100).");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        bonus_enabled: enabledValue,
        default_bonus_percent: percentNumber,
      });
      setPercentInput(String(percentNumber));
      setEnabledInput(enabledValue);
      toast.success("Bonus settings updated.");
    } catch (submitError) {
      toast.error(getErrorMessage(submitError, "Unable to update bonus settings."));
    }
  };

  const onSubmitCredit = async () => {
    if (!canSubmitCredit) {
      toast.error("Select an account and enter a bonus amount.");
      return;
    }

    try {
      const response = await creditMutation.mutateAsync({
        accountId: selectedAccountId.trim(),
        amount: creditAmountNumber,
        reason: creditReason.trim() || undefined,
      });

      setCreditResult({
        bonusAdded: response.data?.bonusAdded,
        bonusBalance: response.data?.bonusBalance,
        equity: response.data?.equity,
      });

      toast.success(response.message || "Bonus credited successfully.");
      void accountsQuery.refetch();
      setCreditAmount("");
      setCreditReason("");
    } catch (submitError) {
      toast.error(getErrorMessage(submitError, "Unable to credit bonus."));
    }
  };

  const statusLabel = useMemo(
    () => (enabledValue ? "Enabled" : "Disabled"),
    [enabledValue]
  );

  if (isLoading) {
    return (
      <div className="container-pad">
        <div className="card-elevated min-h-[260px] flex items-center justify-center">
          <GlobalLoader />
        </div>
      </div>
    );
  }

  return (
    <div className="container-pad space-y-6 text-[var(--foreground)]">
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-purple-700">
              <Gift size={12} />
              Bonus Control
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
              Bonus Settings
            </h1>
            <p className="max-w-2xl text-sm text-[var(--text-muted)]">
              Manage global bonus settings and manual credits for specific accounts.
            </p>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2.5 text-sm font-semibold hover:bg-[var(--hover-bg)] disabled:opacity-60"
          >
            <RefreshCcw size={16} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard label="Status" value={statusLabel} />
          <StatsCard
            label="Default Bonus"
            value={`${formatNumber(data?.default_bonus_percent, 2)}%`}
          />
          <StatsCard
            label="Last Updated"
            value={formatDateTime(data?.updatedAt || dataUpdatedAt)}
          />
          <StatsCard label="Manual Credit" value="Available" />
        </div>
      </div>

      {isError ? (
        <div className="rounded-2xl border border-rose-300/40 bg-rose-500/5 p-4 text-sm text-rose-700">
          {getErrorMessage(error, "Unable to load bonus settings.")}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Global Settings</h2>
              <p className="text-sm text-[var(--text-muted)]">
                Toggle bonus and update the default bonus percentage.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEnabledInput((prev) => !(prev ?? enabledValue))}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                enabledValue
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                  : "border-slate-400/40 bg-slate-500/10 text-slate-700"
              }`}
            >
              {enabledValue ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
              {enabledValue ? "Enabled" : "Disabled"}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)]">
                Default Bonus Percent
              </label>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2">
                <Percent size={16} className="text-[var(--text-muted)]" />
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={percentInputDisplayValue}
                  onChange={(event) => setPercentInput(event.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="e.g. 20"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)]">
                Current Status
              </label>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2">
                <Gift size={16} className="text-[var(--text-muted)]" />
                <p className="text-sm font-semibold">{statusLabel}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onSaveSettings}
              disabled={updateMutation.isPending || !isValidPercent}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] disabled:opacity-60"
            >
              <Save size={16} />
              {updateMutation.isPending ? "Saving..." : "Save Settings"}
            </button>
            <p className="text-xs text-[var(--text-muted)]">
              Set percent to 0 to effectively disable bonus while keeping feature enabled.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
          <div>
            <h2 className="text-lg font-semibold">Manual Bonus Credit</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Add a bonus amount to a single account.
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-purple-400/30 bg-purple-500/5 px-3 py-3 text-xs sm:text-sm text-purple-800">
            Manual bonus is credited to bonus balance and follows the existing bonus rules.
          </div>

          <div className="mt-4 space-y-3">
            <div className="relative">
              <label className="text-xs font-medium text-[var(--text-muted)]">
                Search User
              </label>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2">
                <User size={16} className="text-[var(--text-muted)]" />
                <input
                  value={userSearchInput}
                  onChange={(event) => {
                    setUserSearchInput(event.target.value);
                    setSelectedUserId("");
                    setSelectedUserName("");
                    setSelectedAccountId("");
                    setCreditResult(null);
                  }}
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="Search user by name, email or phone"
                />
              </div>

              {shouldShowUserResults && (
                <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-44 overflow-y-auto rounded-lg border border-[var(--input-border)] bg-[var(--card-bg)] shadow-lg">
                  {usersQuery.isLoading ? (
                    <p className="px-3 py-2 text-xs text-[var(--text-muted)]">
                      Searching users...
                    </p>
                  ) : users.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-[var(--text-muted)]">
                      No users found
                    </p>
                  ) : (
                    users.map((user: AdminUser) => (
                      <button
                        key={user._id}
                        type="button"
                        onClick={() => {
                          setSelectedUserId(user._id);
                          setSelectedUserName(user.name || user.email || "--");
                          setUserSearchInput(user.name || user.email || "--");
                          setSelectedAccountId("");
                          setCreditResult(null);
                        }}
                        className="block w-full px-3 py-2 text-left text-xs sm:text-sm hover:bg-[var(--hover-bg)] border-b border-[var(--card-border)] last:border-b-0"
                      >
                        <span className="block font-medium">
                          {user.name || user.email || "--"}
                        </span>
                        <span className="block text-[10px] text-[var(--text-muted)]">
                          {user.email ?? "--"}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {selectedUserId && (
                <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <User size={12} />
                  Selected user: {selectedUserName || selectedUserId}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-muted)]">
                Account
              </label>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2">
                <Wallet size={16} className="text-[var(--text-muted)]" />
                <select
                  value={selectedAccountId}
                  onChange={(event) => {
                    setSelectedAccountId(event.target.value);
                    setCreditResult(null);
                  }}
                  disabled={!selectedUserId || accountsQuery.isLoading}
                  className="w-full bg-transparent text-sm outline-none"
                >
                  <option value="">
                    {!selectedUserId
                      ? "Select user first"
                      : accountsQuery.isLoading
                      ? "Loading accounts..."
                      : accounts.length === 0
                      ? "No accounts found"
                      : "Select account"}
                  </option>
                  {accounts.map((account: AdminAccount) => (
                    <option key={account._id} value={account._id}>
                      {account.account_number ?? account._id}
                      {account.plan_name ? ` - ${account.plan_name}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {selectedAccount && (
                <div className="mt-2 rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2 text-xs sm:text-sm">
                  <p className="text-[var(--text-muted)]">
                    Balance:{" "}
                    <span className="font-semibold text-emerald-600">
                      ${selectedAccount.balance?.toLocaleString() ?? "0"}
                    </span>
                  </p>
                  <p className="text-[var(--text-muted)]">
                    Hold Balance:{" "}
                    <span className="font-semibold text-amber-600">
                      ${selectedAccount.hold_balance?.toLocaleString() ?? "0"}
                    </span>
                  </p>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)]">
                Bonus Amount
              </label>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2">
                <Gift size={16} className="text-[var(--text-muted)]" />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={creditAmount}
                  onChange={(event) => setCreditAmount(event.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="Enter bonus amount"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)]">
                Reason (Optional)
              </label>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2">
                <input
                  value={creditReason}
                  onChange={(event) => setCreditReason(event.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="Goodwill / promo / adjustment"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={onSubmitCredit}
              disabled={creditMutation.isPending || !canSubmitCredit}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <Gift size={16} />
              {creditMutation.isPending ? "Crediting..." : "Credit Bonus"}
            </button>

            {creditResult ? (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700">
                <p className="font-semibold">Bonus credited successfully.</p>
                <p className="text-xs">
                  Added: {formatNumber(creditResult.bonusAdded, 2)} | Bonus Balance:{" "}
                  {formatNumber(creditResult.bonusBalance, 2)} | Equity:{" "}
                  {formatNumber(creditResult.equity, 2)}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}
