"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Bitcoin, RefreshCcw, Save, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import GlobalLoader from "../components/ui/GlobalLoader";
import {
  useConversionRates,
  useUpdateConversionRates,
} from "@/hooks/useConversionRates";

export default function DollarRatePage() {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useConversionRates();
  const updateMutation = useUpdateConversionRates();

  const [usdtInrInput, setUsdtInrInput] = useState<string | null>(null);
  const [usdtInrWithdrawInput, setUsdtInrWithdrawInput] = useState<string | null>(
    null,
  );
  const [btcUsdtInput, setBtcUsdtInput] = useState<string | null>(null);
  const [btcUsdtWithdrawInput, setBtcUsdtWithdrawInput] = useState<string | null>(
    null,
  );
  const [liveUsdInr, setLiveUsdInr] = useState<number | null>(null);

  const usdtInrValue = usdtInrInput ?? String(data?.data?.usdtInr ?? "");
  const usdtInrWithdrawValue =
    usdtInrWithdrawInput ?? String(data?.data?.usdtInrWithdraw ?? "");
  const btcUsdtValue = btcUsdtInput ?? String(data?.data?.btcUsdt ?? "");
  const btcUsdtWithdrawValue =
    btcUsdtWithdrawInput ?? String(data?.data?.btcUsdtWithdraw ?? "");

  const usdtInrNumber = Number(usdtInrValue);
  const usdtInrWithdrawNumber = Number(usdtInrWithdrawValue);
  const btcUsdtNumber = Number(btcUsdtValue);
  const btcUsdtWithdrawNumber = Number(btcUsdtWithdrawValue);
  const isValidForm =
    Number.isFinite(usdtInrNumber) &&
    Number.isFinite(usdtInrWithdrawNumber) &&
    Number.isFinite(btcUsdtNumber) &&
    Number.isFinite(btcUsdtWithdrawNumber) &&
    usdtInrNumber > 0 &&
    usdtInrWithdrawNumber > 0 &&
    btcUsdtNumber > 0 &&
    btcUsdtWithdrawNumber > 0;

  const btcInr = useMemo(() => {
    if (!isValidForm) return null;
    return btcUsdtNumber * usdtInrNumber;
  }, [btcUsdtNumber, isValidForm, usdtInrNumber]);

  useEffect(() => {
    let cancelled = false;
    const loadLiveRate = async () => {
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/USD");
        const json = await res.json();
        const inr = Number(json?.rates?.INR);
        if (!cancelled && Number.isFinite(inr) && inr > 0) {
          setLiveUsdInr(inr);
        }
      } catch {
        /* live rate is optional */
      }
    };
    loadLiveRate();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const onSubmit = async () => {
    if (!isValidForm) {
      toast.error(
        "Please enter valid deposit, withdraw and BTC/USDT values.",
      );
      return;
    }

    try {
      const payload = {
        usdtInr: usdtInrNumber,
        usdtInrWithdraw: usdtInrWithdrawNumber,
        btcUsdt: btcUsdtNumber,
        btcUsdtWithdraw: btcUsdtWithdrawNumber,
      };
      await updateMutation.mutateAsync(payload);
      setUsdtInrInput(String(payload.usdtInr));
      setUsdtInrWithdrawInput(String(payload.usdtInrWithdraw));
      setBtcUsdtInput(String(payload.btcUsdt));
      setBtcUsdtWithdrawInput(String(payload.btcUsdtWithdraw));
      toast.success("Conversion rates updated successfully.");
    } catch (submitError) {
      toast.error(getErrorMessage(submitError, "Unable to update conversion rates."));
    }
  };

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
    <div className="container-pad space-y-5 text-[var(--foreground)]">
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-700">
              <ArrowRightLeft size={12} />
              Conversion Control
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
              Conversion Rates
            </h1>
            <p className="max-w-2xl text-sm text-[var(--text-muted)]">
              Manage admin conversion rates for deposits, withdrawals, and BTC/USDT with live sync.
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

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <StatsCard label="Deposit USDT/INR" value={formatNumber(data?.data?.usdtInr, 2)} />
          <StatsCard
            label="Withdraw USDT/INR"
            value={formatNumber(data?.data?.usdtInrWithdraw, 2)}
          />
          <StatsCard label="BTC in USDT (Dep)" value={formatNumber(data?.data?.btcUsdt, 2)} />
          <StatsCard
            label="BTC in USDT (Wdr)"
            value={formatNumber(data?.data?.btcUsdtWithdraw, 2)}
          />
          <StatsCard label="BTC in INR" value={formatNumber(btcInr, 2)} />
          <StatsCard
            label="Live USD/INR"
            value={liveUsdInr ? formatNumber(liveUsdInr, 2) : "--"}
          />
          <StatsCard
            label="Last Updated"
            value={formatDateTime(data?.data?.updatedAt || dataUpdatedAt)}
          />
        </div>
      </div>

      {isError ? (
        <div className="rounded-2xl border border-rose-300/40 bg-rose-500/5 p-4 text-sm text-rose-700">
          {getErrorMessage(error, "Unable to load conversion rates.")}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
          <h2 className="text-base font-semibold">Update Rates</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            These values are sent to `/conversion/admin/rates`.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputCard
              label="USDT / INR (Deposit)"
              value={usdtInrValue}
              onChange={setUsdtInrInput}
              icon={<Wallet size={16} />}
              placeholder="91"
            />
            <InputCard
              label="USDT / INR (Withdraw)"
              value={usdtInrWithdrawValue}
              onChange={setUsdtInrWithdrawInput}
              icon={<Wallet size={16} />}
              placeholder="89"
            />
            <InputCard
              label="BTC / USDT (Deposit)"
              value={btcUsdtValue}
              onChange={setBtcUsdtInput}
              icon={<Bitcoin size={16} />}
              placeholder="65000"
            />
            <InputCard
              label="BTC / USDT (Withdraw)"
              value={btcUsdtWithdrawValue}
              onChange={setBtcUsdtWithdrawInput}
              icon={<Bitcoin size={16} />}
              placeholder="64800"
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onSubmit}
              disabled={updateMutation.isPending || !isValidForm}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] disabled:opacity-60"
            >
              <Save size={16} />
              {updateMutation.isPending ? "Saving..." : "Save Rates"}
            </button>

            <p className="text-xs text-[var(--text-muted)]">
              Required: both values must be greater than 0.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
          <h2 className="text-base font-semibold">Quick Preview</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Instant conversion from current form values.
          </p>

          <div className="mt-4 space-y-3 text-sm">
            <PreviewRow
              left="1 BTC (deposit)"
              right={`${formatNumber(btcUsdtNumber, 2)} USDT`}
            />
            <PreviewRow
              left="1 BTC (withdraw)"
              right={`${formatNumber(btcUsdtWithdrawNumber, 2)} USDT`}
            />
            <PreviewRow
              left="1 USDT (deposit)"
              right={`${formatNumber(usdtInrNumber, 2)} INR`}
            />
            <PreviewRow
              left="1 USDT (withdraw)"
              right={`${formatNumber(usdtInrWithdrawNumber, 2)} INR`}
            />
            <PreviewRow
              left="1 BTC"
              right={`${formatNumber(btcInr, 2)} INR`}
            />
            <PreviewRow
              left="0.1 BTC"
              right={`${formatNumber(btcInr ? btcInr * 0.1 : null, 2)} INR`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--hover-bg)] p-3">
      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function InputCard({
  label,
  value,
  onChange,
  icon,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: React.ReactNode;
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-sm text-[var(--text-muted)]">{label}</label>
      <div className="mt-1 flex items-center gap-2 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2">
        <span className="text-[var(--text-muted)]">{icon}</span>
        <input
          type="number"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none"
          step="any"
        />
      </div>
    </div>
  );
}

function PreviewRow({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--card-border)] bg-[var(--hover-bg)] px-3 py-2">
      <span className="text-[var(--text-muted)]">{left}</span>
      <span className="font-semibold">{right}</span>
    </div>
  );
}
