"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronRight,
  GitBranch,
  Network,
  Search,
  Sparkles,
  UserPlus,
  Users,
  Link2,
} from "lucide-react";
import Pagination from "@/app/admin/components/ui/pagination";
import GlobalLoader from "@/app/admin/components/ui/GlobalLoader";
import DragScroll from "@/app/admin/components/ui/DragScroll";
import {
  useReferralNetworkList,
  useReferralNetworkSummary,
  useReferralTree,
} from "@/hooks/referrals/useAdminReferralNetwork";
import type {
  ReferralTreeNode,
  ReferralUserCard,
} from "@/services/adminReferralNetwork.service";
import Link from "next/link";

type TabKey = "referrers" | "tree";

function displayName(user?: ReferralUserCard | null) {
  if (!user) return "--";
  return user.name?.trim() || user.email || user._id || "--";
}

function Metric({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          {label}
        </p>
        <span className="text-[var(--text-muted)]">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

function LevelChips({
  breakdown,
}: {
  breakdown?: Record<string, number>;
}) {
  const entries = Object.entries(breakdown || {})
    .map(([k, v]) => [Number(k), v] as const)
    .filter(([k, v]) => k > 0 && v > 0)
    .sort((a, b) => a[0] - b[0]);

  if (!entries.length) {
    return <span className="text-xs text-[var(--text-muted)]">No downline</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([level, count]) => (
        <span
          key={level}
          className="inline-flex items-center rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-sky-700"
          title={`Level ${level}: people referred ${level} hop(s) away`}
        >
          L{level}: {count}
        </span>
      ))}
    </div>
  );
}

function TreeNodeCard({
  node,
  isRoot = false,
}: {
  node: ReferralTreeNode;
  isRoot?: boolean;
}) {
  const levelTone =
    node.level === 0
      ? "border-emerald-500/40 bg-emerald-500/[0.08]"
      : node.level === 1
        ? "border-sky-500/35 bg-sky-500/[0.06]"
        : node.level === 2
          ? "border-amber-500/35 bg-amber-500/[0.06]"
          : "border-violet-500/30 bg-violet-500/[0.05]";

  return (
    <div
      className={`min-w-[200px] max-w-[240px] rounded-xl border px-3 py-2.5 shadow-sm ${levelTone} ${
        isRoot ? "ring-2 ring-emerald-500/30" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-[var(--card-bg)]/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
          {node.level === 0 ? "Root" : `L${node.level}`}
        </span>
        {node.directReferrals > 0 ? (
          <span className="text-[10px] font-semibold text-[var(--text-muted)]">
            +{node.directReferrals} direct
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 truncate text-sm font-semibold">
        {displayName(node.user)}
      </p>
      <p className="truncate text-[11px] text-[var(--text-muted)]">
        {node.user?.email || "--"}
      </p>
      {node.user?.referralCode ? (
        <p className="mt-1 font-mono text-[10px] font-semibold text-emerald-700">
          {node.user.referralCode}
        </p>
      ) : null}
    </div>
  );
}

/** Horizontal org-chart style tree */
function TreeNodeView({ node }: { node: ReferralTreeNode }) {
  const [open, setOpen] = useState(true);
  const hasKids = (node.children?.length ?? 0) > 0;

  return (
    <div className="inline-flex flex-col items-center">
      <div className="relative flex flex-col items-center">
        <TreeNodeCard node={node} isRoot={node.level === 0} />
        {hasKids ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-1 inline-flex items-center gap-1 rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
          >
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {open ? "Hide" : "Show"} {node.children.length}
          </button>
        ) : null}
      </div>

      {open && hasKids ? (
        <div className="flex flex-col items-center">
          {/* stem down from parent */}
          <div className="h-5 w-px bg-[var(--card-border)]" />
          {/* horizontal bar across children */}
          <div className="relative flex items-start justify-center gap-6 px-2">
            {node.children.length > 1 ? (
              <div
                className="absolute top-0 h-px bg-[var(--card-border)]"
                style={{
                  left: "calc(12.5% + 8px)",
                  right: "calc(12.5% + 8px)",
                }}
              />
            ) : null}
            {node.children.map((child) => (
              <div
                key={child.userId}
                className="relative flex flex-col items-center pt-0"
              >
                <div className="h-5 w-px bg-[var(--card-border)]" />
                <TreeNodeView node={child} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ReferralNetworkPage() {
  const [tab, setTab] = useState<TabKey>("referrers");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const summaryQuery = useReferralNetworkSummary();
  const networkQuery = useReferralNetworkList({
    q: query || undefined,
    page,
    limit,
    onlyReferrers: true,
  });
  const treeQuery = useReferralTree(selectedUserId, 8);

  const summary = summaryQuery.data;

  const openTree = (userId: string) => {
    setSelectedUserId(userId);
    setTab("tree");
  };

  return (
    <div className="container-pad max-w-full space-y-4 text-[var(--foreground)] sm:space-y-5">
      <header className="rounded-2xl border border-[var(--card-border)] bg-gradient-to-br from-[var(--card-bg)] via-[var(--card-bg)] to-emerald-500/5 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
              <Sparkles size={12} />
              Referral intelligence
            </div>
            <h1 className="mt-2 text-xl font-semibold sm:text-2xl">
              Referral Network Report
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
              See how many people each referrer brought in and open their
              full downline tree.
            </p>
          </div>
          <Link
            href="/admin/referral"
            className="inline-flex items-center justify-center rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold hover:bg-[var(--hover-bg)]"
          >
            Reward approvals
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric
            label="Referrers"
            value={summary?.totalReferrers ?? "--"}
            icon={<UserPlus size={16} />}
            hint="Users who referred at least one person"
          />
          <Metric
            label="Linked users"
            value={summary?.linkedUsers ?? "--"}
            icon={<Users size={16} />}
            hint="Signed up with a referral code"
          />
          <Metric
            label="Profiles"
            value={summary?.totalProfiles ?? "--"}
            icon={<Network size={16} />}
            hint="Users with a referral profile"
          />
          <Metric
            label="Unlinked"
            value={summary?.unlinkedUsers ?? "--"}
            icon={<Link2 size={16} />}
            hint="No referrer attached"
          />
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-1">
          {(
            [
              { key: "referrers", label: "Referrers", icon: <Users size={14} /> },
              { key: "tree", label: "Tree view", icon: <Network size={14} /> },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold sm:text-sm ${
                tab === item.key
                  ? "bg-[var(--foreground)] text-[var(--card-bg)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {tab !== "tree" ? (
          <div className="relative w-full sm:max-w-sm">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, email, phone, or code..."
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>
        ) : null}
      </div>

      {tab === "referrers" ? (
        <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
          <DragScroll className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-[var(--input-bg)] text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                <tr>
                  <th className="px-4 py-3">Referrer</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Direct</th>
                  <th className="px-4 py-3">Network</th>
                  <th className="px-4 py-3">Levels</th>
                  <th className="px-4 py-3">Earned</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {networkQuery.isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <GlobalLoader />
                    </td>
                  </tr>
                ) : (networkQuery.data?.items?.length ?? 0) === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-sm text-[var(--text-muted)]"
                    >
                      No referrers found yet.
                    </td>
                  </tr>
                ) : (
                  networkQuery.data?.items.map((row) => (
                    <tr
                      key={row.userId}
                      className="border-t border-[var(--card-border)] hover:bg-[var(--hover-bg)]/50"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold">{displayName(row.user)}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {row.user?.email || "--"}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {row.referralCode || "--"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                          {row.directReferrals}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold tabular-nums">
                        {row.networkSize}
                      </td>
                      <td className="px-4 py-3">
                        <LevelChips breakdown={row.levelBreakdown} />
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        ${Number(row.totalEarned || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openTree(row.userId)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--card-border)] px-2.5 py-1 text-xs font-semibold hover:bg-[var(--hover-bg)]"
                        >
                          <GitBranch size={12} />
                          View tree
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </DragScroll>
          <div className="border-t border-[var(--card-border)] px-3 py-2">
            <Pagination
              page={page}
              totalPages={networkQuery.data?.pagination?.totalPages || 1}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={(l) => {
                setLimit(l);
                setPage(1);
              }}
            />
          </div>
        </div>
      ) : null}

      {tab === "tree" ? (
        <div className="space-y-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
          {!selectedUserId ? (
            <div className="py-12 text-center text-sm text-[var(--text-muted)]">
              Pick a referrer from the <strong>Referrers</strong> tab and click{" "}
              <strong>View tree</strong> to see their full downline.
            </div>
          ) : treeQuery.isLoading ? (
            <div className="py-12">
              <GlobalLoader />
            </div>
          ) : treeQuery.isError ? (
            <div className="py-12 text-center text-sm text-rose-600">
              Failed to load referral tree.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)]/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Root referrer
                  </p>
                  <p className="text-lg font-semibold">
                    {displayName(treeQuery.data?.root?.user)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Code: {treeQuery.data?.root?.referralCode || "--"}
                    {treeQuery.data?.root?.referredBy
                      ? ` · Referred by ${displayName(treeQuery.data.root.referredBy)}`
                      : " · Organic (no parent)"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-semibold text-emerald-700">
                    Direct: {treeQuery.data?.stats?.directReferrals ?? 0}
                  </span>
                  <span className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 font-semibold text-sky-700">
                    Network: {treeQuery.data?.stats?.networkSize ?? 0}
                  </span>
                  <span className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 font-semibold">
                    Depth: {treeQuery.data?.stats?.maxDepth ?? 0}
                  </span>
                </div>
              </div>

              <div className="mb-2">
                <LevelChips breakdown={treeQuery.data?.stats?.levelBreakdown} />
              </div>

              {treeQuery.data?.tree ? (
                <div className="overflow-x-auto pb-4">
                  <div className="inline-block min-w-full px-2 py-4 text-center">
                    <TreeNodeView node={treeQuery.data.tree} />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">
                  No tree data.
                </p>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
