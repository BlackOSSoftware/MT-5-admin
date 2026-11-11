"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Calendar,
  CheckCircle2,
  Copy,
  DollarSign,
  FlaskConical,
  Hash,
  Mail,
  Percent,
  Scale,
  Search,
  SlidersHorizontal,
  User,
  Wallet,
  XCircle,
} from "lucide-react";
import { useAccountPlans } from "@/hooks/useAccountPlans";
import { useAdminAccountsSearch } from "@/hooks/useAdminAccounts";
import type { AdminAccountItem } from "@/services/adminAccounts.service";
import GlobalLoader from "@/app/admin/components/ui/GlobalLoader";
import Pagination from "@/app/admin/components/ui/pagination";
import DragScroll from "@/app/admin/components/ui/DragScroll";

function formatMoney(value?: number | null, digits = 2) {
  if (value === undefined || value === null || Number.isNaN(value)) return "--";
  return `$${Number(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function accountTypeMeta(type?: string) {
  const normalized = (type ?? "").toLowerCase();
  if (normalized === "live") {
    return {
      label: "LIVE",
      className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
      Icon: BadgeCheck,
    };
  }
  if (normalized === "demo") {
    return {
      label: "DEMO",
      className: "border-sky-500/40 bg-sky-500/10 text-sky-700",
      Icon: FlaskConical,
    };
  }
  return {
    label: (type || "--").toUpperCase(),
    className: "border-slate-500/40 bg-slate-500/10 text-slate-700",
    Icon: Hash,
  };
}

function statusClass(status?: string) {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "active")
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700";
  if (normalized === "inactive" || normalized === "suspended")
    return "border-rose-500/40 bg-rose-500/10 text-rose-700";
  if (normalized === "pending")
    return "border-amber-500/40 bg-amber-500/10 text-amber-700";
  return "border-slate-500/40 bg-slate-500/10 text-slate-700";
}

function CopyBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="inline-flex h-5 w-5 items-center justify-center rounded border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-muted)] hover:text-[var(--foreground)]"
      aria-label="Copy value"
      title="Copy"
    >
      <Copy size={10} />
    </button>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone: "slate" | "sky" | "violet" | "amber" | "emerald" | "rose";
}) {
  const toneClasses: Record<typeof tone, string> = {
    slate: "border-slate-400/30 bg-slate-500/[0.04]",
    sky: "border-sky-400/30 bg-sky-500/[0.05]",
    violet: "border-violet-400/30 bg-violet-500/[0.05]",
    amber: "border-amber-400/30 bg-amber-500/[0.05]",
    emerald: "border-emerald-400/30 bg-emerald-500/[0.05]",
    rose: "border-rose-400/30 bg-rose-500/[0.05]",
  };

  return (
    <div className={`rounded-xl border p-3 ${toneClasses[tone]}`}>
      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <div className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-md bg-[var(--card-bg)] text-[var(--text-muted)]">
        {icon}
      </div>
      <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

export default function AccountPlanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const planId = params?.id ?? "";

  const { data: plans = [], isLoading: plansLoading } = useAccountPlans();
  const plan = useMemo(
    () => plans.find((item) => item._id === planId) ?? null,
    [plans, planId]
  );

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [accountType, setAccountType] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [copyToast, setCopyToast] = useState("");

  const accountsQuery = useAdminAccountsSearch({
    q: search || undefined,
    page,
    limit,
    plan_id: planId || undefined,
    account_type: accountType || undefined,
    status: statusFilter || undefined,
  });

  const rows = accountsQuery.data?.items ?? [];
  const pagination = accountsQuery.data?.pagination;
  const total = pagination?.total ?? rows.length;
  const totalPages =
    pagination?.totalPages ?? Math.max(1, Math.ceil(total / Math.max(limit, 1)));

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => {
          acc.deposit += row.total_deposit ?? 0;
          acc.withdraw += row.total_withdraw ?? 0;
          acc.balance += row.total_balance ?? 0;
          return acc;
        },
        { deposit: 0, withdraw: 0, balance: 0 }
      ),
    [rows]
  );

  const handleCopy = async (value: string, label: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopyToast(`${label} copied`);
      setTimeout(() => setCopyToast(""), 1800);
    } catch {
      setCopyToast("Copy failed");
      setTimeout(() => setCopyToast(""), 2200);
    }
  };

  const openUser = (account: AdminAccountItem) => {
    const userId = account.user?._id || account.user_id;
    if (!userId) return;
    router.push(`/admin/users/users/view/${userId}`);
  };

  if (plansLoading) {
    return (
      <div className="container-pad max-w-full">
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-10">
          <GlobalLoader />
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="container-pad max-w-full">
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--card-bg)] px-6 py-16 text-center">
          <h2 className="text-base font-semibold">Plan not found</h2>
          <p className="max-w-md text-sm text-[var(--text-muted)]">
            This account plan may have been deleted or the link is invalid.
          </p>
          <button
            type="button"
            onClick={() => router.push("/admin/account-plan")}
            className="mt-1 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            <ArrowLeft size={15} />
            Back to Accounts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-pad max-w-full space-y-5 text-[var(--foreground)]">
      {/* Plan header */}
      <header className="relative overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/admin/account-plan")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--foreground)]"
                aria-label="Back to accounts"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                  Account plan
                </p>
                <h1 className="mt-0.5 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {plan.name}
                </h1>
              </div>
            </div>
            <span
              className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                plan.isActive
                  ? "bg-emerald-500/12 text-emerald-700"
                  : "bg-rose-500/12 text-rose-700"
              }`}
            >
              {plan.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              label="Min Deposit"
              value={formatMoney(plan.minDeposit)}
              icon={<DollarSign size={13} />}
              tone="emerald"
            />
            <MetricCard
              label="Spread"
              value={`${plan.spreadPips}`}
              icon={<Percent size={13} />}
              tone="sky"
            />
            <MetricCard
              label="Leverage"
              value={plan.max_leverage ? `1:${plan.max_leverage}` : "Unlimited"}
              icon={<Scale size={13} />}
              tone="violet"
            />
            <MetricCard
              label="Commission"
              value={`${plan.commission}`}
              icon={<SlidersHorizontal size={13} />}
              tone="amber"
            />
          </div>
        </div>
      </header>

      {/* Accounts table */}
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="flex flex-col gap-3 border-b border-[var(--card-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Trading Accounts</h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {total} account{total === 1 ? "" : "s"} on this plan
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search name, email, account no..."
                className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] py-2 pl-9 pr-3 text-[13px] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 sm:w-64"
              />
            </div>
            <select
              value={accountType}
              onChange={(event) => {
                setAccountType(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              <option value="">All types</option>
              <option value="live">Live</option>
              <option value="demo">Demo</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {accountsQuery.isLoading ? (
          <div className="p-10">
            <GlobalLoader />
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-[var(--text-muted)]">
            No trading accounts found for this plan.
          </div>
        ) : (
          <>
            <DragScroll className="hidden overflow-x-auto md:block">
              <table className="min-w-[1200px] w-full text-left text-sm">
                <thead className="bg-[var(--input-bg)] text-xs uppercase text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <Hash size={12} /> Account No
                      </span>
                    </th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <User size={12} /> Trader
                      </span>
                    </th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <Mail size={12} /> Email
                      </span>
                    </th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1">
                        <ArrowUpRight size={12} /> Deposit
                      </span>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1">
                        <ArrowDownRight size={12} /> Withdraw
                      </span>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1">
                        <Wallet size={12} /> Balance
                      </span>
                    </th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={12} /> Created
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((account) => {
                    const typeMeta = accountTypeMeta(account.account_type);
                    const TypeIcon = typeMeta.Icon;
                    return (
                      <tr
                        key={account._id}
                        onClick={() => openUser(account)}
                        className="cursor-pointer border-t border-[var(--card-border)] hover:bg-[var(--hover-bg)]/60"
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold">
                          <span className="inline-flex items-center gap-1.5">
                            {account.account_number || "--"}
                            <CopyBtn
                              onClick={() =>
                                handleCopy(
                                  account.account_number || "",
                                  "Account No"
                                )
                              }
                            />
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs">
                          <span className="inline-flex items-center gap-1.5">
                            {account.user?.name || "--"}
                            <CopyBtn
                              onClick={() =>
                                handleCopy(account.user?.name || "", "Trader")
                              }
                            />
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs">
                          <span className="inline-flex items-center gap-1.5">
                            {account.user?.email || "--"}
                            <CopyBtn
                              onClick={() =>
                                handleCopy(account.user?.email || "", "Email")
                              }
                            />
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${typeMeta.className}`}
                          >
                            <TypeIcon size={11} />
                            {typeMeta.label}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold text-emerald-600">
                          {formatMoney(account.total_deposit)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold text-rose-600">
                          {formatMoney(account.total_withdraw)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold">
                          {formatMoney(account.total_balance)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass(
                              account.status
                            )}`}
                          >
                            {account.status === "active" ? (
                              <CheckCircle2 size={11} />
                            ) : (
                              <XCircle size={11} />
                            )}
                            {account.status || "--"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--text-muted)]">
                          {formatDateTime(account.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </DragScroll>

            {/* Mobile cards */}
            <div className="space-y-3 p-4 md:hidden">
              {rows.map((account) => {
                const typeMeta = accountTypeMeta(account.account_type);
                const TypeIcon = typeMeta.Icon;
                return (
                  <button
                    key={account._id}
                    type="button"
                    onClick={() => openUser(account)}
                    className="w-full rounded-xl border border-[var(--card-border)] bg-gradient-to-br from-[var(--input-bg)] via-[var(--input-bg)] to-sky-500/[0.04] p-3 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="inline-flex items-center gap-1 text-sm font-semibold">
                        <BarChart3 size={14} className="text-sky-600" />
                        {account.account_number || "--"}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${typeMeta.className}`}
                      >
                        <TypeIcon size={11} />
                        {typeMeta.label}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1.5">
                        <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                          Trader
                        </p>
                        <p className="mt-0.5 truncate text-xs font-semibold">
                          {account.user?.name || "--"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1.5">
                        <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                          Email
                        </p>
                        <p className="mt-0.5 truncate text-xs font-semibold">
                          {account.user?.email || "--"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1.5">
                        <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                          Deposit
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-emerald-600">
                          {formatMoney(account.total_deposit)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1.5">
                        <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                          Withdraw
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-rose-600">
                          {formatMoney(account.total_withdraw)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1.5">
                        <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                          Balance
                        </p>
                        <p className="mt-0.5 text-xs font-semibold">
                          {formatMoney(account.total_balance)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1.5">
                        <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                          Status
                        </p>
                        <p className="mt-0.5 text-xs font-semibold uppercase">
                          {account.status || "--"}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                      <Calendar size={11} />
                      Created: {formatDateTime(account.createdAt)}
                    </p>
                  </button>
                );
              })}
            </div>
          </>
        )}

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

      {copyToast ? (
        <div className="fixed bottom-5 right-5 z-50 rounded-md bg-[var(--foreground)] px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
          {copyToast}
        </div>
      ) : null}
    </div>
  );
}
