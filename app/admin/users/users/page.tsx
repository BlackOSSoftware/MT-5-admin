"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Plus,
  Search,
  ShieldCheck,
  Mail,
  ChevronDown,
  Sparkles,
  Users,
  Clock3,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Pagination from "../../components/ui/pagination";
import GlobalLoader from "../../components/ui/GlobalLoader";
import DragScroll from "../../components/ui/DragScroll";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import type { AdminUser } from "@/types/user";
import PresenceBadge from "@/app/admin/components/ui/PresenceBadge";

const EMPTY_USERS: AdminUser[] = [];

type KycFilter = "ALL" | "NOT_STARTED" | "PENDING" | "VERIFIED" | "REJECTED";
type MailFilter = "ALL" | "true" | "false";
type FilterKey = "kyc" | "mail";

const kycStyles: Record<string, string> = {
  VERIFIED: "border-emerald-500/40 bg-emerald-500/5 text-emerald-600",
  PENDING: "border-amber-500/40 bg-amber-500/5 text-amber-600",
  NOT_STARTED: "border-slate-400/40 bg-slate-400/5 text-slate-600",
  REJECTED: "border-red-500/40 bg-red-500/5 text-red-600",
};

function formatDate(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function UsersPage() {
  const router = useRouter();

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [kycStatus, setKycStatus] = useState<KycFilter>("ALL");
  const [mailVerified, setMailVerified] = useState<MailFilter>("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);

  const kycOptions: Array<{ value: KycFilter; label: string; dot: string }> = [
    { value: "ALL", label: "All KYC", dot: "bg-slate-300" },
    { value: "NOT_STARTED", label: "Not Started", dot: "bg-slate-400" },
    { value: "PENDING", label: "Pending", dot: "bg-amber-500" },
    { value: "VERIFIED", label: "Verified", dot: "bg-emerald-500" },
    { value: "REJECTED", label: "Rejected", dot: "bg-red-500" },
  ];

  const mailOptions: Array<{ value: MailFilter; label: string; dot: string }> = [
    { value: "ALL", label: "All Mail", dot: "bg-slate-300" },
    { value: "true", label: "Mail Verified", dot: "bg-emerald-500" },
    { value: "false", label: "Mail Unverified", dot: "bg-amber-500" },
  ];

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(searchInput.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const onClick = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-filter]")) return;
      setOpenFilter(null);
    };

    document.addEventListener("mousedown", onClick, true);
    document.addEventListener("touchstart", onClick, true);
    return () => {
      document.removeEventListener("mousedown", onClick, true);
      document.removeEventListener("touchstart", onClick, true);
    };
  }, []);

  const listQuery = useAdminUsers({
    q: query || undefined,
    kycStatus: kycStatus === "ALL" ? undefined : kycStatus,
    isMailVerified:
      mailVerified === "ALL" ? undefined : mailVerified === "true",
    page,
    limit,
  });

  const users = listQuery.data?.data ?? EMPTY_USERS;
  const pagination = listQuery.data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const total = pagination?.total ?? users.length;
  const isInitialLoading = listQuery.isLoading && !listQuery.data;
  const isUpdating = listQuery.isFetching && !isInitialLoading;

  const summary = useMemo(
    () =>
      users.reduce(
        (acc, user) => {
          if (user.kycStatus === "VERIFIED") acc.kycVerified += 1;
          else if (user.kycStatus === "PENDING") acc.kycPending += 1;
          else if (user.kycStatus === "REJECTED") acc.kycRejected += 1;
          else if (user.kycStatus === "NOT_STARTED") acc.kycNotStarted += 1;
          if (user.isMailVerified) acc.mailVerified += 1;
          else acc.mailUnverified += 1;
          return acc;
        },
        {
          kycVerified: 0,
          kycPending: 0,
          kycRejected: 0,
          kycNotStarted: 0,
          mailVerified: 0,
          mailUnverified: 0,
        }
      ),
    [users]
  );

  const navigateToUser = (user: AdminUser) => {
    const params = new URLSearchParams({
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      kycStatus: user.kycStatus ?? "",
      isMailVerified: String(Boolean(user.isMailVerified)),
    });
    router.push(`/admin/users/users/view/${user._id}?${params.toString()}`);
  };

  return (
    <div className="container-pad space-y-4 max-w-full text-[var(--foreground)] sm:space-y-5">
      <div className="rounded-2xl border border-[var(--card-border)] bg-gradient-to-br from-[var(--card-bg)] via-[var(--card-bg)] to-sky-500/5 p-4 sm:p-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-700">
          <Sparkles size={12} />
          User Directory
        </div>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg sm:text-2xl font-semibold">Users</h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)]">
              Manage users, verification, and KYC status
            </p>
          </div>

          <button
            onClick={() => router.push("/admin/users/users/clients")}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--card-border)]
                       bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-main)]
                       hover:bg-[var(--hover-bg)] w-full sm:w-auto"
          >
            <Plus size={16} /> Create User
          </button>
        </div>

        <div className="mt-4 flex flex-col lg:flex-row lg:items-center gap-2">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              placeholder="Search by name, email or phone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)]
                         pl-9 pr-3 py-2 text-sm text-[var(--foreground)]
                         focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            />
          </div>

          <div className="relative w-full sm:w-[200px]" data-filter>
          <button
            type="button"
            onClick={() =>
              setOpenFilter((prev) => (prev === "kyc" ? null : "kyc"))
            }
            className={`w-full rounded-lg border px-3 py-2 text-sm font-medium flex items-center justify-between ${
              kycStatus === "VERIFIED"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                : kycStatus === "PENDING"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-700"
                : kycStatus === "NOT_STARTED"
                ? "border-slate-400/40 bg-slate-100 text-slate-700"
                : kycStatus === "REJECTED"
                ? "border-red-500/40 bg-red-500/10 text-red-700"
                : "border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--foreground)]"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-600" />
              {kycOptions.find((opt) => opt.value === kycStatus)?.label}
            </span>
            <ChevronDown
              size={14}
              className={`text-[var(--text-muted)] transition-transform ${
                openFilter === "kyc" ? "rotate-180" : ""
              }`}
            />
          </button>

          {openFilter === "kyc" && (
            <div className="absolute z-20 mt-2 w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-lg">
              {kycOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[var(--hover-bg)] ${
                    opt.value === kycStatus ? "bg-[var(--hover-bg)]" : ""
                  }`}
                  onClick={() => {
                    setKycStatus(opt.value);
                    setPage(1);
                    setOpenFilter(null);
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${opt.dot}`} />
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

          <div className="relative w-full sm:w-[200px]" data-filter>
          <button
            type="button"
            onClick={() =>
              setOpenFilter((prev) => (prev === "mail" ? null : "mail"))
            }
            className={`w-full rounded-lg border px-3 py-2 text-sm font-medium flex items-center justify-between ${
              mailVerified === "true"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                : mailVerified === "false"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-700"
                : "border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--foreground)]"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Mail size={16} className="text-sky-600" />
              {mailOptions.find((opt) => opt.value === mailVerified)?.label}
            </span>
            <ChevronDown
              size={14}
              className={`text-[var(--text-muted)] transition-transform ${
                openFilter === "mail" ? "rotate-180" : ""
              }`}
            />
          </button>

          {openFilter === "mail" && (
            <div className="absolute z-20 mt-2 w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-lg">
              {mailOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[var(--hover-bg)] ${
                    opt.value === mailVerified ? "bg-[var(--hover-bg)]" : ""
                  }`}
                  onClick={() => {
                    setMailVerified(opt.value);
                    setPage(1);
                    setOpenFilter(null);
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${opt.dot}`} />
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>Counts based on current page results</span>
        <span>Total users: {total}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <MetricCard
          label="Total Users"
          value={String(total)}
          icon={<Users size={13} />}
          tone="slate"
        />
        <MetricCard
          label="KYC Verified"
          value={String(summary.kycVerified)}
          icon={<ShieldCheck size={13} />}
          tone="emerald"
        />
        <MetricCard
          label="KYC Pending"
          value={String(summary.kycPending)}
          icon={<Clock3 size={13} />}
          tone="amber"
        />
        <MetricCard
          label="KYC Rejected"
          value={String(summary.kycRejected)}
          icon={<XCircle size={13} />}
          tone="rose"
        />
        <MetricCard
          label="Mail Verified"
          value={String(summary.mailVerified)}
          icon={<Mail size={13} />}
          tone="sky"
        />
        <MetricCard
          label="Mail Unverified"
          value={String(summary.mailUnverified)}
          icon={<Mail size={13} />}
          tone="violet"
        />
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-2">
            Total: {total}
            {isUpdating && (
              <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
                Updating
              </span>
            )}
          </span>
          <span>Page {page} of {totalPages}</span>
        </div>

        <DragScroll className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-[var(--input-bg)] text-[var(--text-muted)] text-xs uppercase">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">User Type</th>
                <th className="px-4 py-3">Mail</th>
                <th className="px-4 py-3">KYC</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {isInitialLoading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center">
                    <GlobalLoader />
                  </td>
                </tr>
              ) : listQuery.isError ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-sm text-[var(--danger)]">
                    Failed to load users. Please try again.
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-sm text-[var(--text-muted)]">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u: AdminUser, idx: number) => (
                  <tr
                    key={u._id}
                    className="border-t border-[var(--card-border)] hover:bg-[var(--hover-bg)] duration-150 cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigateToUser(u)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigateToUser(u);
                      }
                    }}
                  >
                    <td className="px-4 py-3 text-[var(--text-muted)]">
                      {(page - 1) * limit + idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold">{u.name || "--"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <PresenceBadge
                        online={Boolean(u.isOnline)}
                        lastSeenAt={u.lastSeenAt}
                      />
                    </td>
                    <td className="px-4 py-3">{u.email || "--"}</td>
                    <td className="px-4 py-3">{u.phone || "--"}</td>
                    <td className="px-4 py-3">{u.userType || "--"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                          u.isMailVerified
                            ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-600"
                            : "border-amber-500/40 bg-amber-500/5 text-amber-600"
                        }`}
                      >
                        {u.isMailVerified ? "Verified" : "Unverified"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                          kycStyles[u.kycStatus] ||
                          "border-[var(--border-subtle)] bg-[var(--chip-bg)] text-[var(--text-muted)]"
                        }`}
                      >
                        {u.kycStatus || "UNKNOWN"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatDate(u.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DragScroll>
      </div>

      {/* PAGINATION */}
      <Pagination
        page={page}
        totalPages={totalPages}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(1);
        }}
      />
    </div>
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
