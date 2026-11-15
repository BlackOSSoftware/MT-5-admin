"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Crown,
  GitBranch,
  RefreshCcw,
  Search,
  Shield,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import {
  adminHierarchy,
  type HierarchyNode,
} from "@/services/platform/platform.services";
import adminService from "@/services/admin.service";
import GlobalLoader from "../components/ui/GlobalLoader";

const PERM_LABELS: Record<string, string> = {
  "users.read": "View users",
  "users.create": "Create users",
  "users.update": "Update users",
  "kyc.review": "Review KYC",
  "finance.deposit.read": "View deposits",
  "finance.deposit.approve": "Approve deposits",
  "finance.deposit.reject": "Reject deposits",
  "finance.withdrawal.read": "View withdrawals",
  "finance.withdrawal.approve": "Approve withdrawals",
  "finance.withdrawal.reject": "Reject withdrawals",
  "finance.transactions.read": "View transactions",
  "finance.wallet.adjust": "Adjust wallet",
  "finance.payment_methods.manage": "Payment methods",
  "plans.manage": "Account plans",
  "trading.positions.read": "View positions",
  "trading.intervene": "Trade intervention",
  "settings.bonus": "Bonus settings",
  "settings.referral": "Referral settings",
  "settings.slippage": "Slippage settings",
  "settings.risk": "Risk settings",
  "conversion.manage": "Conversion rates",
  "notifications.send": "Notifications",
  "inquiry.manage": "Inquiries",
  "activity.read": "Activity logs",
  "instruments.manage": "Instruments",
  "admins.manage": "Manage staff",
  "reports.export": "Export reports",
  "reports.client_positions": "Client positions",
};

function permLabel(key: string) {
  return PERM_LABELS[key] || key;
}

function statusMeta(status: string) {
  if (status === "ACTIVE")
    return {
      label: "Active",
      cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
      dot: "bg-emerald-500",
    };
  if (status === "SUSPENDED")
    return {
      label: "Suspended",
      cls: "border-amber-500/30 bg-amber-500/10 text-amber-600",
      dot: "bg-amber-500",
    };
  return {
    label: status,
    cls: "border-slate-400/30 bg-slate-400/10 text-slate-600",
    dot: "bg-slate-400",
  };
}

function roleLabel(role?: string) {
  if (role === "SUB_ADMIN") return "Sub-Admin";
  if (role === "BROKER_ADMIN") return "Admin";
  return role || "Member";
}

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminHierarchyPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<HierarchyNode[]>([]);
  const [err, setErr] = useState("");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await adminHierarchy();
      setAdmins(res.data?.admins || []);
    } catch (e: unknown) {
      const ax = e as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setErr(ax?.response?.data?.message || ax.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await adminService.getMe();
        if (cancelled) return;
        // Hierarchy is SuperAdmin-only.
        if (me?.platformRole !== "SUPER_ADMIN") {
          router.replace("/admin");
          return;
        }
        setAllowed(true);
        refresh();
      } catch {
        if (!cancelled) router.replace("/admin");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, refresh]);

  const stats = useMemo(() => {
    let subCount = 0;
    let activeSubs = 0;
    for (const a of admins) {
      const subs = a.subAdmins || [];
      subCount += subs.length;
      activeSubs += subs.filter((s) => s.status === "ACTIVE").length;
    }
    const activeAdmins = admins.filter((a) => a.status === "ACTIVE").length;
    const brokers = new Set(
      admins.map((a) => a.broker?._id).filter(Boolean)
    ).size;
    return { admins: admins.length, activeAdmins, subAdmins: subCount, activeSubs, brokers };
  }, [admins]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return admins;
    const match = (n: HierarchyNode) =>
      n.user?.email?.toLowerCase().includes(q) ||
      n.user?.name?.toLowerCase().includes(q);
    return admins.filter(
      (a) => match(a) || (a.subAdmins || []).some(match)
    );
  }, [admins, query]);

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  if (!allowed) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[var(--text-muted)]">
        Checking access…
      </div>
    );
  }

  if (loading && !admins.length) {
    return (
      <div className="flex h-64 items-center justify-center">
        <GlobalLoader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch size={20} className="text-[var(--primary)]" />
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">
              Admin Hierarchy
            </h1>
          </div>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Complete org structure — Super Admin, Admins and their Sub-Admins.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--hover-bg)]"
        >
          <RefreshCcw size={15} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Admins", value: stats.admins, sub: `${stats.activeAdmins} active`, icon: Shield },
          { label: "Total Sub-Admins", value: stats.subAdmins, sub: `${stats.activeSubs} active`, icon: Users },
          { label: "Staff Accounts", value: stats.admins + stats.subAdmins, sub: "admins + sub-admins", icon: UserRound },
          { label: "Brokers Covered", value: stats.brokers, sub: "unique tenants", icon: Building2 },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-[var(--shadow-1)]"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                {s.label}
              </p>
              <s.icon size={16} className="text-[var(--text-muted)] opacity-60" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              {s.value}
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] py-2.5 pl-10 pr-4 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
        />
      </div>

      {err && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {err}
        </div>
      )}

      {/* Tree */}
      <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--shadow-1)]">
        {/* Root node */}
        <div className="border-b border-[var(--card-border)] bg-gradient-to-r from-[var(--primary)]/10 to-transparent px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/15 text-[var(--primary)]">
              <Crown size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Super Admin
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Platform owner — full control over all admins & sub-admins
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          {filtered.length === 0 && !loading && (
            <p className="py-10 text-center text-sm text-[var(--text-muted)]">
              {query ? "No matches found." : "No admins yet."}
            </p>
          )}

          <div className="space-y-4">
            {filtered.map((admin, idx) => {
              const adminKey = admin._id || admin.membershipId || `admin-${idx}`;
              const open = expanded[adminKey] !== false;
              const subs = admin.subAdmins || [];
              return (
                <div key={adminKey} className="relative">
                  {/* connector */}
                  <span className="absolute -left-5 top-8 h-full w-px bg-[var(--card-border)]" />
                  <span className="absolute -left-5 top-8 h-px w-5 bg-[var(--card-border)]" />

                  <MemberCard node={admin} variant="admin" />

                  {subs.length > 0 && (
                    <div className="ml-6 mt-3 space-y-3 border-l-2 border-dashed border-[var(--card-border)] pl-5">
                      <button
                        type="button"
                        onClick={() => toggle(adminKey)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
                      >
                        {open ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                        {subs.length} sub-admin{subs.length === 1 ? "" : "s"}
                      </button>

                      {open &&
                        subs.map((sub, sIdx) => (
                          <div
                            key={sub._id || sub.membershipId || `sub-${sIdx}`}
                            className="relative"
                          >
                            <span className="absolute -left-[27px] top-7 h-px w-5 bg-[var(--card-border)]" />
                            <MemberCard node={sub} variant="sub" />
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberCard({
  node,
  variant,
}: {
  node: HierarchyNode;
  variant: "admin" | "sub";
}) {
  const [showAllPerms, setShowAllPerms] = useState(false);
  const perms = node.permissions || [];
  const visiblePerms = showAllPerms ? perms : perms.slice(0, 6);
  const st = statusMeta(node.status);
  const isAdmin = variant === "admin";

  return (
    <div
      className={`rounded-xl border bg-[var(--card-bg)] p-4 transition-shadow hover:shadow-[var(--shadow-1)] ${
        isAdmin
          ? "border-[var(--primary)]/25"
          : "border-[var(--card-border)]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              isAdmin
                ? "bg-[var(--primary)]/15 text-[var(--primary)]"
                : "bg-[var(--hover-bg)] text-[var(--text-muted)]"
            }`}
          >
            {isAdmin ? <Shield size={17} /> : <UserRound size={17} />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                {node.user?.name || node.user?.email || "Unknown"}
              </p>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${st.cls}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                {st.label}
              </span>
              <span className="rounded-full border border-[var(--card-border)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
                {roleLabel(node.role)}
              </span>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--primary)]">
                  <Users size={11} />
                  {(node.subAdmins || []).length} sub-admin
                  {(node.subAdmins || []).length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
              {node.user?.email}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
              Joined {fmtDate(node.user?.createdAt)}
              {node.broker?.displayName && ` · ${node.broker.displayName}`}
              {node.parentAdmin &&
                ` · by ${node.parentAdmin.name || node.parentAdmin.email}`}
            </p>
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div className="mt-3 border-t border-[var(--card-border)] pt-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            <ShieldCheck size={12} />
            Permissions ({perms.length})
          </p>
          {perms.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAllPerms((v) => !v)}
              className="text-[11px] font-medium text-[var(--primary)] hover:underline"
            >
              {showAllPerms ? "Show less" : `+${perms.length - 6} more`}
            </button>
          )}
        </div>
        {perms.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">
            No permissions assigned — dashboard only.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {visiblePerms.map((p) => (
              <span
                key={p}
                className="rounded-md border border-[var(--card-border)] bg-[var(--hover-bg)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]"
              >
                {permLabel(p)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
