"use client";

import { useState } from "react";
import {
  BadgeCheck,
  Building2,
  DollarSign,
  FileCheck,
  GitBranch,
  Landmark,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import GlobalLoader from "@/app/admin/components/ui/GlobalLoader";
import Pagination from "@/app/admin/components/ui/pagination";
import {
  useAdminUserIbAccounts,
  useAdminUserIbDashboard,
  useAdminUserIbKyc,
  useAdminUserIbRequests,
} from "@/hooks/referrals/useAdminUserIb";
import type {
  IbAccountItem,
  IbKycItem,
  IbRequestItem,
} from "@/services/adminUserIb.service";

function fmt(n?: number | null) {
  return Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(v?: string | null) {
  if (!v) return "--";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const statusTone: Record<string, string> = {
  VERIFIED: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  APPROVED: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  COMPLETED: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  PENDING: "border-amber-500/40 bg-amber-500/10 text-amber-700",
  REJECTED: "border-rose-500/40 bg-rose-500/10 text-rose-700",
  active: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
};

function StatusPill({ status }: { status?: string }) {
  const key = String(status || "").toUpperCase();
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
        statusTone[key] ||
        "border-[var(--card-border)] bg-[var(--input-bg)] text-[var(--text-muted)]"
      }`}
    >
      {status || "--"}
    </span>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tone = "sky",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "sky" | "emerald" | "amber" | "violet" | "rose" | "slate";
}) {
  const tones: Record<string, string> = {
    sky: "text-sky-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    violet: "text-violet-600",
    rose: "text-rose-600",
    slate: "text-slate-600",
  };
  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
        <span className={tones[tone]}>{icon}</span> {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {sub ? <p className="mt-1 text-xs text-[var(--text-muted)]">{sub}</p> : null}
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
      <div className="border-b border-[var(--card-border)] px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function IbDashboardTab({ userId }: { userId: string }) {
  const [kycPage, setKycPage] = useState(1);
  const [accPage, setAccPage] = useState(1);
  const [reqPage, setReqPage] = useState(1);

  const dashQuery = useAdminUserIbDashboard(userId, { scope: "total", period: "total" });
  const kycQuery = useAdminUserIbKyc(userId, { page: kycPage, limit: 10 });
  const accQuery = useAdminUserIbAccounts(userId, { page: accPage, limit: 10 });
  const reqQuery = useAdminUserIbRequests(userId, { page: reqPage, limit: 10 });

  const d = dashQuery.data;
  const loading = dashQuery.isLoading;

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Wallet size={14} />}
          label="Total Commission"
          value={`$${fmt(d?.commission?.totalEarned)}`}
          sub={`Available $${fmt(d?.commission?.available)} · Pending $${fmt(d?.commission?.pending)}`}
          tone="emerald"
        />
        <StatCard
          icon={<Landmark size={14} />}
          label="Total Deposit"
          value={`$${fmt(d?.totalDeposits)}`}
          sub={`Net $${fmt(d?.netDeposits)} · ${d?.activityTotals?.deposits ?? 0} txns`}
          tone="sky"
        />
        <StatCard
          icon={<DollarSign size={14} />}
          label="Total Withdraw"
          value={`$${fmt(d?.totalWithdrawals)}`}
          sub={`${d?.activityTotals?.withdrawals ?? 0} txns`}
          tone="amber"
        />
        <StatCard
          icon={<TrendingUp size={14} />}
          label="Network"
          value={String(d?.totalClients ?? 0)}
          sub={`${d?.directSubIbs ?? 0} sub-IBs · ${fmt(d?.totalLots)} lots · ${d?.tradeCount ?? 0} trades`}
          tone="violet"
        />
      </div>

      {/* KYC / Accounts / IB Requests stat strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={<FileCheck size={14} />}
          label="KYC Details"
          value={`${d?.kycStats?.complete ?? 0} Complete`}
          sub={`Pending ${d?.kycStats?.pending ?? 0}`}
          tone="sky"
        />
        <StatCard
          icon={<Building2 size={14} />}
          label="Live Account"
          value={`${d?.liveAccountStats?.complete ?? 0} Complete`}
          sub={`Total ${d?.liveAccountStats?.total ?? 0} · Pending ${d?.liveAccountStats?.pending ?? 0}`}
          tone="emerald"
        />
        <StatCard
          icon={<GitBranch size={14} />}
          label="IB Requests"
          value={`${d?.ibRequestStats?.approved ?? 0} Approved`}
          sub={`Pending ${d?.ibRequestStats?.pending ?? 0} · Rejected ${d?.ibRequestStats?.rejected ?? 0}`}
          tone="amber"
        />
      </div>

      {loading ? (
        <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
          <GlobalLoader />
        </div>
      ) : null}

      {/* KYC table */}
      <SectionCard title="KYC Details">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[var(--input-bg)] text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">KYC Type</th>
                <th className="px-4 py-3">Request Date</th>
                <th className="px-4 py-3">Action Date</th>
                <th className="px-4 py-3">Action By</th>
                <th className="px-4 py-3">User Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Remark</th>
              </tr>
            </thead>
            <tbody>
              {kycQuery.isLoading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center">
                    <GlobalLoader />
                  </td>
                </tr>
              ) : (kycQuery.data?.items?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-sm text-[var(--text-muted)]">
                    No KYC records in this network.
                  </td>
                </tr>
              ) : (
                kycQuery.data?.items.map((k: IbKycItem) => (
                  <tr
                    key={k.id}
                    className="border-t border-[var(--card-border)] hover:bg-[var(--hover-bg)]/50"
                  >
                    <td className="px-4 py-3 font-medium">{k.name || "--"}</td>
                    <td className="px-4 py-3 text-xs">{k.email || "--"}</td>
                    <td className="px-4 py-3 text-xs">{k.phone || "--"}</td>
                    <td className="px-4 py-3 text-xs">{k.kycType || "--"}</td>
                    <td className="px-4 py-3 text-xs">{fmtDate(k.requestDate)}</td>
                    <td className="px-4 py-3 text-xs">{fmtDate(k.actionDate)}</td>
                    <td className="px-4 py-3 text-xs">{k.actionBy || "--"}</td>
                    <td className="px-4 py-3 text-xs">{k.userType || "--"}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={k.status} />
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-xs text-[var(--text-muted)]">
                      {k.remark || "--"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-[var(--card-border)] px-3 py-2">
          <Pagination
            page={kycPage}
            totalPages={kycQuery.data?.pagination?.totalPages || 1}
            limit={10}
            onPageChange={setKycPage}
            onLimitChange={() => setKycPage(1)}
          />
        </div>
      </SectionCard>

      {/* Live accounts table */}
      <SectionCard
        title={`Live Accounts${
          accQuery.data?.totalBalance != null
            ? ` — Total Balance $${fmt(accQuery.data.totalBalance)}`
            : ""
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-[var(--input-bg)] text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">Account No</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Leverage</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3">Request Time</th>
                <th className="px-4 py-3">Action By</th>
                <th className="px-4 py-3">User Type</th>
                <th className="px-4 py-3">Remark</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {accQuery.isLoading ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center">
                    <GlobalLoader />
                  </td>
                </tr>
              ) : (accQuery.data?.items?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-sm text-[var(--text-muted)]">
                    No live accounts in this network.
                  </td>
                </tr>
              ) : (
                accQuery.data?.items.map((a: IbAccountItem) => (
                  <tr
                    key={a.id}
                    className="border-t border-[var(--card-border)] hover:bg-[var(--hover-bg)]/50"
                  >
                    <td className="px-4 py-3 font-medium">{a.name || "--"}</td>
                    <td className="px-4 py-3 text-xs">{a.email || "--"}</td>
                    <td className="px-4 py-3 text-xs">{a.phone || "--"}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {a.accountNumber || "--"}
                    </td>
                    <td className="px-4 py-3 text-xs uppercase">{a.accountType || "--"}</td>
                    <td className="px-4 py-3 text-xs">{a.leverage || "--"}</td>
                    <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums">
                      {a.currency} {fmt(a.balance)}
                    </td>
                    <td className="px-4 py-3 text-xs">{fmtDate(a.requestTime)}</td>
                    <td className="px-4 py-3 text-xs">{a.actionBy || "--"}</td>
                    <td className="px-4 py-3 text-xs">{a.userType || "--"}</td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-xs text-[var(--text-muted)]">
                      {a.remark || "--"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={a.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-[var(--card-border)] px-3 py-2">
          <Pagination
            page={accPage}
            totalPages={accQuery.data?.pagination?.totalPages || 1}
            limit={10}
            onPageChange={setAccPage}
            onLimitChange={() => setAccPage(1)}
          />
        </div>
      </SectionCard>

      {/* IB requests table */}
      <SectionCard title="IB Requests">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[var(--input-bg)] text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3">Direction</th>
                <th className="px-4 py-3">Requester</th>
                <th className="px-4 py-3">IB</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3">Request Date</th>
                <th className="px-4 py-3">Responded By</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {reqQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center">
                    <GlobalLoader />
                  </td>
                </tr>
              ) : (reqQuery.data?.items?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-[var(--text-muted)]">
                    No IB requests.
                  </td>
                </tr>
              ) : (
                reqQuery.data?.items.map((r: IbRequestItem) => (
                  <tr
                    key={r.id}
                    className="border-t border-[var(--card-border)] hover:bg-[var(--hover-bg)]/50"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                          r.direction === "RECEIVED"
                            ? "border-sky-500/40 bg-sky-500/10 text-sky-700"
                            : "border-violet-500/40 bg-violet-500/10 text-violet-700"
                        }`}
                      >
                        {r.direction === "RECEIVED" ? "Received" : "Sent"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium">{r.requester?.name || "--"}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {r.requester?.email || ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium">{r.ib?.name || "--"}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {r.ib?.email || ""}
                      </p>
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-xs text-[var(--text-muted)]">
                      {r.note || "--"}
                    </td>
                    <td className="px-4 py-3 text-xs">{fmtDate(r.createdAt)}</td>
                    <td className="px-4 py-3 text-xs">
                      {r.respondedBy?.name || r.respondedBy?.email || "--"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={r.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-[var(--card-border)] px-3 py-2">
          <Pagination
            page={reqPage}
            totalPages={reqQuery.data?.pagination?.totalPages || 1}
            limit={10}
            onPageChange={setReqPage}
            onLimitChange={() => setReqPage(1)}
          />
        </div>
      </SectionCard>

      {/* Recent network activity summary */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<BadgeCheck size={14} />}
          label="Client Equity"
          value={`$${fmt(d?.clientEquity)}`}
          tone="sky"
        />
        <StatCard
          icon={<Users size={14} />}
          label="Active Traders"
          value={String(d?.activeTraders ?? 0)}
          tone="violet"
        />
        <StatCard
          icon={<TrendingUp size={14} />}
          label="Period Earnings"
          value={`$${fmt(d?.periodEarnings)}`}
          tone="emerald"
        />
        <StatCard
          icon={<GitBranch size={14} />}
          label="Referral Code"
          value={d?.referralCode || "--"}
          sub={`${d?.linkUsedCount ?? 0} direct link uses`}
          tone="slate"
        />
      </div>
    </div>
  );
}
