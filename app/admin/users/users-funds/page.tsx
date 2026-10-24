"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Download,
  Plus,
  SlidersHorizontal,
  User,
  Wallet,
  Hash,
  Coins,
  ShieldCheck,
  MailCheck,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import GlobalLoader from "@/app/admin/components/ui/GlobalLoader";
import Pagination from "@/app/admin/components/ui/pagination";
import DragScroll from "@/app/admin/components/ui/DragScroll";
import { useAdminUserFunds } from "@/hooks/useAdminUserFunds";
import type { TradeAdminUserFundsItem } from "@/services/userFunds.service";

type FundsFilters = {
  q: string;
  userId: string;
  userType: "" | "USER" | "ADMIN";
  isMailVerified: "" | "true" | "false";
  kycStatus: "" | "NOT_STARTED" | "PENDING" | "VERIFIED" | "REJECTED";
  accountType: "" | "demo" | "live";
  accountStatus: "" | "active" | "disabled";
  currency: string;
  sortBy: "" | "createdAt" | "updatedAt" | "name" | "email";
  sortDir: "asc" | "desc";
};

type FundsSummary = {
  accounts: number;
  balance: number;
  holdBalance: number;
  freeBalance: number;
  equity: number;
};

const EMPTY_ROWS: TradeAdminUserFundsItem[] = [];

function getDefaultFilters(): FundsFilters {
  return {
    q: "",
    userId: "",
    userType: "",
    isMailVerified: "",
    kycStatus: "",
    accountType: "",
    accountStatus: "",
    currency: "",
    sortBy: "createdAt",
    sortDir: "desc",
  };
}

function formatNumber(value?: number, digits = 2) {
  if (value === undefined || value === null || Number.isNaN(value)) return "--";
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function getFundsValue(
  row: TradeAdminUserFundsItem,
  key:
    | "accountsCount"
    | "totalBalance"
    | "totalHoldBalance"
    | "totalFreeBalance"
    | "totalEquity"
) {
  const nested = row.funds?.[key];
  if (nested !== undefined && nested !== null) return nested;
  const flat = (row as Record<string, unknown>)[key];
  if (typeof flat === "number") return flat;
  return undefined;
}

export default function UserFundsPage() {
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [draftFilters, setDraftFilters] = useState<FundsFilters>(
    getDefaultFilters
  );
  const [filters, setFilters] = useState<FundsFilters>(getDefaultFilters);

  const fundsQuery = useAdminUserFunds({
    page,
    limit,
    q: filters.q || undefined,
    userId: filters.userId || undefined,
    userType: filters.userType || undefined,
    isMailVerified: filters.isMailVerified || undefined,
    kycStatus: filters.kycStatus || undefined,
    accountType: filters.accountType || undefined,
    accountStatus: filters.accountStatus || undefined,
    currency: filters.currency || undefined,
    sortBy: filters.sortBy || undefined,
    sortDir: filters.sortDir || undefined,
  });

  const apiData = fundsQuery.data;
  const rows = apiData?.data ?? EMPTY_ROWS;
  const rowsForCsv = rows;
  const pagination = apiData?.pagination;
  const total = pagination?.total ?? rows.length;
  const totalPages =
    pagination?.totalPages ?? Math.max(1, Math.ceil(total / Math.max(limit, 1)));

  const summary = useMemo(
    () =>
      rows.reduce<FundsSummary>(
        (acc, row) => ({
          accounts: acc.accounts + (Number(getFundsValue(row, "accountsCount")) || 0),
          balance: acc.balance + (Number(getFundsValue(row, "totalBalance")) || 0),
          holdBalance:
            acc.holdBalance + (Number(getFundsValue(row, "totalHoldBalance")) || 0),
          freeBalance:
            acc.freeBalance + (Number(getFundsValue(row, "totalFreeBalance")) || 0),
          equity: acc.equity + (Number(getFundsValue(row, "totalEquity")) || 0),
        }),
        {
          accounts: 0,
          balance: 0,
          holdBalance: 0,
          freeBalance: 0,
          equity: 0,
        }
      ),
    [rows]
  );

  const metrics = useMemo(
    () => [
      { label: "Users", value: String(total) },
      { label: "Accounts", value: formatNumber(summary.accounts, 0) },
      { label: "Total Balance", value: formatNumber(summary.balance) },
      { label: "Hold Balance", value: formatNumber(summary.holdBalance) },
      { label: "Free Balance", value: formatNumber(summary.freeBalance) },
      { label: "Total Equity", value: formatNumber(summary.equity) },
    ],
    [summary, total]
  );

  const applyFilters = () => {
    setFilters({
      ...draftFilters,
      q: draftFilters.q.trim(),
      userId: draftFilters.userId.trim(),
      currency: draftFilters.currency.trim().toUpperCase(),
    });
    setPage(1);
  };

  const resetFilters = () => {
    const next = getDefaultFilters();
    setDraftFilters(next);
    setFilters(next);
    setPage(1);
  };

  const downloadCSV = () => {
    const header = [
      "User",
      "Email",
      "User Type",
      "Mail Verified",
      "KYC Status",
      "Accounts",
      "Total Balance",
      "Hold Balance",
      "Free Balance",
      "Total Equity",
    ];

    const rows = rowsForCsv.map((row) => [
      row.name ?? row.fullName ?? "--",
      row.email ?? "--",
      row.userType ?? "--",
      row.isMailVerified === true
        ? "true"
        : row.isMailVerified === false
        ? "false"
        : "--",
      row.kycStatus ?? "--",
      getFundsValue(row, "accountsCount") ?? "--",
      getFundsValue(row, "totalBalance") ?? "--",
      getFundsValue(row, "totalHoldBalance") ?? "--",
      getFundsValue(row, "totalFreeBalance") ?? "--",
      getFundsValue(row, "totalEquity") ?? "--",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [header, ...rows].map((e) => e.join(",")).join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "User_Funds.csv";
    link.click();
  };

  return (
    <div className="container-pad max-w-full space-y-4 text-[var(--foreground)] sm:space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">User Funds</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Aggregated balances per user with account-level filters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={downloadCSV}
            disabled={!rows.length}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold hover:bg-[var(--hover-bg)] disabled:opacity-60"
          >
            <Download size={16} /> Download
          </button>
          <button
            onClick={() => router.push("/admin/users/users-funds/create")}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)]"
          >
            <Plus size={16} /> Add Trader Fund
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InputField
            icon={<Users size={14} />}
            placeholder="Search name/email"
            value={draftFilters.q}
            onChange={(value) =>
              setDraftFilters((prev) => ({ ...prev, q: value }))
            }
          />
          <InputField
            icon={<User size={14} />}
            placeholder="User ID"
            value={draftFilters.userId}
            onChange={(value) =>
              setDraftFilters((prev) => ({ ...prev, userId: value }))
            }
          />
         
          <SelectField
            icon={<MailCheck size={14} />}
            value={draftFilters.isMailVerified}
            onChange={(value) =>
              setDraftFilters((prev) => ({
                ...prev,
                isMailVerified: value as FundsFilters["isMailVerified"],
              }))
            }
            options={[
              { value: "", label: "Mail Verified: All" },
              { value: "true", label: "Mail Verified: true" },
              { value: "false", label: "Mail Verified: false" },
            ]}
          />
          <SelectField
            icon={<ShieldCheck size={14} />}
            value={draftFilters.kycStatus}
            onChange={(value) =>
              setDraftFilters((prev) => ({
                ...prev,
                kycStatus: value as FundsFilters["kycStatus"],
              }))
            }
            options={[
              { value: "", label: "KYC: All" },
              { value: "NOT_STARTED", label: "KYC: NOT_STARTED" },
              { value: "PENDING", label: "KYC: PENDING" },
              { value: "VERIFIED", label: "KYC: VERIFIED" },
              { value: "REJECTED", label: "KYC: REJECTED" },
            ]}
          />
          <SelectField
            icon={<Wallet size={14} />}
            value={draftFilters.accountType}
            onChange={(value) =>
              setDraftFilters((prev) => ({
                ...prev,
                accountType: value as FundsFilters["accountType"],
              }))
            }
            options={[
              { value: "", label: "All Account Type" },
              { value: "demo", label: "demo" },
              { value: "live", label: "live" },
            ]}
          />
          <SelectField
            icon={<Hash size={14} />}
            value={draftFilters.accountStatus}
            onChange={(value) =>
              setDraftFilters((prev) => ({
                ...prev,
                accountStatus: value as FundsFilters["accountStatus"],
              }))
            }
            options={[
              { value: "", label: "All Status" },
              { value: "active", label: "active" },
              { value: "disabled", label: "disabled" },
            ]}
          />
          <InputField
            icon={<Coins size={14} />}
            placeholder="Currency (e.g. USD)"
            value={draftFilters.currency}
            onChange={(value) =>
              setDraftFilters((prev) => ({ ...prev, currency: value }))
            }
          />
          <SelectField
            icon={<SlidersHorizontal size={14} />}
            value={draftFilters.sortBy}
            onChange={(value) =>
              setDraftFilters((prev) => ({
                ...prev,
                sortBy: value as FundsFilters["sortBy"],
              }))
            }
            options={[
              { value: "createdAt", label: "sortBy: createdAt" },
              { value: "updatedAt", label: "sortBy: updatedAt" },
              { value: "name", label: "sortBy: name" },
              { value: "email", label: "sortBy: email" },
            ]}
          />
          <SelectField
            icon={<SlidersHorizontal size={14} />}
            value={draftFilters.sortDir}
            onChange={(value) =>
              setDraftFilters((prev) => ({
                ...prev,
                sortDir: value as FundsFilters["sortDir"],
              }))
            }
            options={[
              { value: "desc", label: "sortDir: desc" },
              { value: "asc", label: "sortDir: asc" },
            ]}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={applyFilters}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)]"
          >
            Apply Filters
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold hover:bg-[var(--hover-bg)]"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} label={metric.label} value={metric.value} />
        ))}
      </div>

      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
        {fundsQuery.isLoading ? (
          <div className="py-8">
            <GlobalLoader />
          </div>
        ) : fundsQuery.isError || apiData?.success === false ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
            {apiData?.message || "Failed to load user funds."}
            <button
              type="button"
              onClick={() => fundsQuery.refetch()}
              className="ml-3 rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-semibold hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--input-bg)] px-4 py-10 text-center text-sm text-[var(--text-muted)]">
            No users found for selected filters.
          </div>
        ) : (
          <DragScroll className="overflow-x-auto">
            <table className="min-w-[1200px] w-full text-left text-sm">
              <thead className="bg-[var(--input-bg)] text-xs uppercase text-[var(--text-muted)]">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Mail</th>
                  <th className="px-4 py-3">KYC</th>
                  <th className="px-4 py-3">Accounts</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Hold Balance</th>
                  <th className="px-4 py-3">Free Balance</th>
                  <th className="px-4 py-3">Equity</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <UserFundsRow key={row.userId ?? row._id ?? index} row={row} />
                ))}
              </tbody>
            </table>
          </DragScroll>
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(nextLimit) => {
          setLimit(nextLimit);
          setPage(1);
        }}
      />
    </div>
  );
}

function InputField({
  value,
  onChange,
  placeholder = "",
  icon,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="relative">
      {icon ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
          {icon}
        </span>
      ) : null}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] py-2 pr-3 text-[13px] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 sm:text-sm ${
          icon ? "pl-9" : "pl-3"
        }`}
      />
    </div>
  );
}

function SelectField({
  value,
  onChange,
  options,
  icon,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  icon?: ReactNode;
}) {
  return (
    <div className="relative">
      {icon ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
          {icon}
        </span>
      ) : null}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] py-2 pr-3 text-[13px] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 sm:text-sm ${
          icon ? "pl-9" : "pl-3"
        }`}
      >
        {options.map((option) => (
          <option key={option.value || option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function UserFundsRow({ row }: { row: TradeAdminUserFundsItem }) {
  const router = useRouter();
  const userId = row.userId ?? (row._id as string | undefined) ?? "--";
  const userName = row.name ?? row.fullName ?? "--";
  const email = row.email ?? "--";
  const userType = row.userType ?? "--";
  const mailVerified =
    row.isMailVerified === true
      ? "verified"
      : row.isMailVerified === false
      ? "unverified"
      : "--";
  const kycStatus = row.kycStatus ?? "--";

  return (
    <tr
      className="border-t border-[var(--card-border)] hover:bg-[var(--hover-bg)]/60 cursor-pointer"
      onClick={() => {
        if (!userId || userId === "--") return;
        router.push(`/admin/users/users/view/${userId}`);
      }}
    >
      <td className="px-4 py-3">
        <p className="font-semibold">{userName}</p>
        <p className="text-xs text-[var(--text-muted)]">{email}</p>
      </td>
      <td className="px-4 py-3">{userType}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            row.isMailVerified === true
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
              : row.isMailVerified === false
              ? "border-amber-500/40 bg-amber-500/10 text-amber-700"
              : "border-slate-500/40 bg-slate-500/10 text-slate-700"
          }`}
        >
          {mailVerified}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            kycStatus === "VERIFIED"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
              : kycStatus === "PENDING"
              ? "border-amber-500/40 bg-amber-500/10 text-amber-700"
              : kycStatus === "REJECTED"
              ? "border-rose-500/40 bg-rose-500/10 text-rose-700"
              : "border-slate-500/40 bg-slate-500/10 text-slate-700"
          }`}
        >
          {kycStatus}
        </span>
      </td>
      <td className="px-4 py-3">{getFundsValue(row, "accountsCount") ?? "--"}</td>
      <td className="px-4 py-3">
        {formatNumber(Number(getFundsValue(row, "totalBalance")))}
      </td>
      <td className="px-4 py-3">
        {formatNumber(Number(getFundsValue(row, "totalHoldBalance")))}
      </td>
      <td className="px-4 py-3">
        {formatNumber(Number(getFundsValue(row, "totalFreeBalance")))}
      </td>
      <td className="px-4 py-3">
        {formatNumber(Number(getFundsValue(row, "totalEquity")))}
      </td>
    </tr>
  );
}
 
