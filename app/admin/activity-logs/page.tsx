"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AtSign,
  CalendarClock,
  Clock3,
  Fingerprint,
  RefreshCcw,
  Search,
  ShieldCheck,
  Tag,
  User,
  UserCircle2,
} from "lucide-react";
import { useAdminActivityLogs } from "@/hooks/useAdminActivityLogs";
import type { AdminActivityLog } from "@/types/activity";
import GlobalLoader from "../components/ui/GlobalLoader";
import DragScroll from "../components/ui/DragScroll";

const EMPTY_LOGS: AdminActivityLog[] = [];

function formatLabel(value?: string) {
  if (!value) return "--";
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDateTime(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortId(value?: string | null) {
  if (!value) return "--";
  if (value.length <= 10) return value;
  return `${value.slice(0, 8)}...`;
}

function actionTone(action?: string) {
  const value = action?.toLowerCase() ?? "";
  if (!value) return "pill-muted";
  if (value.includes("create") || value.includes("added") || value.includes("register"))
    return "pill-success";
  if (
    value.includes("delete") ||
    value.includes("remove") ||
    value.includes("reject") ||
    value.includes("block")
  )
    return "pill-danger";
  if (value.includes("password") || value.includes("security") || value.includes("login"))
    return "pill-accent";
  return "pill-muted";
}

function actorTone(actorType?: string) {
  const value = actorType?.toUpperCase() ?? "";
  if (!value) return "pill-muted";
  if (value === "SYSTEM") return "pill-muted";
  if (value === "SELF") return "pill-accent";
  return "pill-success";
}

export default function ActivityLogsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [userIdInput, setUserIdInput] = useState("");
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [limit, setLimit] = useState(20);
  const [before, setBefore] = useState<string | undefined>(undefined);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
    }, 350);

    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = userIdInput.trim();
      setUserId(next.length ? next : undefined);
      setBefore(undefined);
    }, 350);

    return () => clearTimeout(t);
  }, [userIdInput]);

  const query = useAdminActivityLogs({
    userId,
    limit,
    before,
  });

  const logs = query.data?.data ?? EMPTY_LOGS;
  const nextCursor = query.data?.nextCursor ?? undefined;
  const isInitialLoading = query.isLoading && !query.data;
  const isUpdating = query.isFetching && !isInitialLoading;

  const stats = useMemo(() => {
    const total = logs.length;
    const system = logs.filter((log) => log.actor_type === "SYSTEM").length;
    const self = logs.filter((log) => log.actor_type === "SELF").length;
    const userActions = logs.filter((log) => log.actor_type === "USER").length;
    const security = logs.filter((log) =>
      (log.action ?? "").toLowerCase().includes("password")
    ).length;

    return { total, system, self, userActions, security };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return logs;

    return logs.filter((log) => {
      const haystack = [
        log.action,
        log.user_name,
        log.user_email,
        log.actor_type,
        log.actor_id ?? "",
        log.user_id ?? "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [logs, search]);

  const handleRefresh = () => {
    setBefore(undefined);
    query.refetch();
  };

  return (
    <div className="container-pad space-y-5 max-w-full text-[var(--foreground)]">
      <div className="rounded-2xl border border-[var(--card-border)] bg-gradient-to-br from-[var(--card-bg)] via-[var(--card-bg)] to-amber-500/5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
            <Clock3 size={12} />
            Activity Stream
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1 text-[11px] font-semibold text-[var(--text-muted)]">
            <Activity size={12} />
            {before ? "Older batch" : "Most recent"}
          </span>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Activity size={18} />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-semibold">Activity Logs</h1>
                <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                  Recent actions across users and the system
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--card-border)]
                       bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-main)]
                       hover:bg-[var(--hover-bg)] w-full sm:w-auto"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Total Actions"
            value={stats.total}
            icon={<Activity size={16} />}
            tone="amber"
          />
          <SummaryCard
            label="System"
            value={stats.system}
            icon={<ShieldCheck size={16} />}
            tone="slate"
          />
          <SummaryCard
            label="Self"
            value={stats.self}
            icon={<UserCircle2 size={16} />}
            tone="sky"
          />
          <SummaryCard
            label="User Actions"
            value={stats.userActions}
            icon={<User size={16} />}
            tone="emerald"
          />
          <SummaryCard
            label="Security"
            value={stats.security}
            icon={<Fingerprint size={16} />}
            tone="rose"
          />
        </div>

        <div className="mt-4 flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              placeholder="Search by action, user, email, or actor..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)]
                         pl-9 pr-3 py-2 text-sm text-[var(--foreground)]
                         focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            />
          </div>

          <div className="flex-1 relative">
            <User
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              placeholder="Filter by user ID (optional)"
              value={userIdInput}
              onChange={(e) => setUserIdInput(e.target.value)}
              className="w-full rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)]
                         pl-9 pr-3 py-2 text-sm text-[var(--foreground)]
                         focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            />
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative w-full lg:w-[160px]">
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setBefore(undefined);
                }}
                className="w-full appearance-none rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)]
                           px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} rows
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                v
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
        <span>
          Showing {filteredLogs.length} of {logs.length} results
        </span>
        <span className="inline-flex items-center gap-2">
          {isUpdating && (
            <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
              Updating
            </span>
          )}
        </span>
      </div>

      <div className="card-elevated overflow-hidden">
        <DragScroll className="overflow-x-auto">
          <table className="table min-w-[1100px] w-full">
            <thead>
              <tr>
                <th className="w-[60px]">#</th>
                <th className="w-[180px]">
                  <span className="inline-flex items-center gap-2">
                    <Tag size={13} />
                    Action
                  </span>
                </th>
                <th className="w-[200px]">
                  <span className="inline-flex items-center gap-2">
                    <User size={13} />
                    User
                  </span>
                </th>
                <th className="w-[220px]">
                  <span className="inline-flex items-center gap-2">
                    <AtSign size={13} />
                    Email
                  </span>
                </th>
                <th className="w-[140px]">
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck size={13} />
                    Actor
                  </span>
                </th>
                <th className="w-[200px]">
                  <span className="inline-flex items-center gap-2">
                    <CalendarClock size={13} />
                    Time
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {isInitialLoading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center">
                    <GlobalLoader />
                  </td>
                </tr>
              ) : query.isError ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-[var(--danger)]">
                    Failed to load activity logs. Please try again.
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="space-y-2">
                      <div className="w-14 h-14 bg-[var(--hover-bg)] rounded-xl flex items-center justify-center mx-auto">
                        <Clock3 className="w-6 h-6 text-[var(--text-muted)]" />
                      </div>
                      <div className="text-[var(--text-muted)]">
                        <p className="font-semibold text-[var(--foreground)]">
                          No activity found
                        </p>
                        <p className="text-sm">Try adjusting your filters.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => (
                  <tr key={log._id ?? `${index}`} className="hover:bg-[var(--hover-bg)]">
                    <td className="text-[var(--text-muted)]">
                      {index + 1}
                    </td>
                    <td>
                      <span className={`pill text-xs font-medium ${actionTone(log.action)}`}>
                        {formatLabel(log.action)}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-semibold">{log.user_name || "--"}</span>
                      </div>
                    </td>
                    <td className="text-[var(--text-muted)]">
                      {log.user_email || "--"}
                    </td>
                    <td>
                      <span className={`pill text-xs font-medium ${actorTone(log.actor_type)}`}>
                        {formatLabel(log.actor_type)}
                      </span>
                    </td>
                    <td className="text-[var(--text-muted)] whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DragScroll>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--card-border)] px-4 py-3">
          <span className="text-xs text-[var(--text-muted)]">
            {before ? "Showing older activity logs" : "Showing most recent activity logs"}
          </span>
          <div className="flex items-center gap-2">
            {before && (
              <button
                type="button"
                onClick={() => setBefore(undefined)}
                className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--hover-bg)]"
              >
                Back to recent
              </button>
            )}
            <button
              type="button"
              disabled={!nextCursor || isInitialLoading}
              onClick={() => {
                if (nextCursor) setBefore(nextCursor);
              }}
              className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--text-main)]
                         hover:bg-[var(--hover-bg)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Load older
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone: "slate" | "sky" | "amber" | "emerald" | "rose";
}) {
  const toneClasses: Record<typeof tone, string> = {
    slate: "border-slate-400/30 bg-slate-500/[0.04] text-slate-700",
    sky: "border-sky-400/30 bg-sky-500/[0.05] text-sky-700",
    amber: "border-amber-400/30 bg-amber-500/[0.05] text-amber-700",
    emerald: "border-emerald-400/30 bg-emerald-500/[0.05] text-emerald-700",
    rose: "border-rose-400/30 bg-rose-500/[0.05] text-rose-700",
  };

  return (
    <div className={`rounded-xl border p-3 ${toneClasses[tone]}`}>
      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-lg font-semibold text-[var(--foreground)]">
          {value}
        </span>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--card-bg)] text-[var(--text-muted)]">
          {icon}
        </span>
      </div>
    </div>
  );
}
