"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gift,
  User,
  Users,
  SlidersHorizontal,
  CalendarDays,
  Clock3,
  FileText,
  UserCheck,
  Eye,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import Pagination from "@/app/admin/components/ui/pagination";
import { useAdminReferralRewards } from "@/hooks/referrals/useAdminReferralRewards";
import {
  useApproveReferralReward,
  useRejectReferralReward,
} from "@/hooks/referrals/useReferralRewardActions";
import type { ReferralRewardStatus } from "@/services/adminReferralReward.service";
import DragScroll from "@/app/admin/components/ui/DragScroll";

type RewardUser = {
  _id?: string;
  id?: string;
  userId?: string;
  name?: string;
  fullName?: string;
  username?: string;
  email?: string;
};

type RewardRow = {
  _id?: string;
  id?: string;
  rewardId?: string;
  amount?: number;
  rewardAmount?: number;
  bonusAmount?: number;
  currency?: string;
  rewardCurrency?: string;
  bonusCurrency?: string;
  status?: ReferralRewardStatus | string;
  createdAt?: string;
  requestedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  updatedAt?: string;
  actionAt?: string;
  rejectionReason?: string;
  reason?: string;
  referrerUser?: RewardUser;
  referredUser?: RewardUser;
  referrer?: RewardUser;
  referred?: RewardUser;
  referrerUserId?: string;
  referredUserId?: string;
  referrerId?: string;
  referredId?: string;
};

type RewardFilters = {
  status: "" | ReferralRewardStatus;
  referrerUserId: string;
  referredUserId: string;
  createdFrom: string;
  createdTo: string;
  requestedFrom: string;
  requestedTo: string;
  approvedFrom: string;
  approvedTo: string;
  rejectedFrom: string;
  rejectedTo: string;
};

const STATUS_OPTIONS: ReferralRewardStatus[] = [
  "ELIGIBLE",
  "REQUESTED",
  "APPROVED",
  "REJECTED",
];

const EMPTY_ROWS: RewardRow[] = [];

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error !== "object" || error === null) return fallback;

  const responseMessage = (error as {
    response?: { data?: { message?: string; error?: string } };
  }).response?.data;

  if (typeof responseMessage?.message === "string" && responseMessage.message.trim()) {
    return responseMessage.message;
  }

  if (typeof responseMessage?.error === "string" && responseMessage.error.trim()) {
    return responseMessage.error;
  }

  const baseMessage = (error as { message?: string }).message;
  if (typeof baseMessage === "string" && baseMessage.trim()) {
    return baseMessage;
  }

  return fallback;
};

const formatDate = (value?: string) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (value?: string) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getDefaultFilters = (): RewardFilters => ({
  status: "",
  referrerUserId: "",
  referredUserId: "",
  createdFrom: "",
  createdTo: "",
  requestedFrom: "",
  requestedTo: "",
  approvedFrom: "",
  approvedTo: "",
  rejectedFrom: "",
  rejectedTo: "",
});

const getRewardId = (row: RewardRow) => row._id ?? row.id ?? row.rewardId ?? "";

const getRewardAmount = (row: RewardRow) => {
  if (typeof row.amount === "number") return row.amount;
  if (typeof row.rewardAmount === "number") return row.rewardAmount;
  if (typeof row.bonusAmount === "number") return row.bonusAmount;
  return undefined;
};

const getRewardCurrency = (row: RewardRow) =>
  row.currency ?? row.rewardCurrency ?? row.bonusCurrency ?? "";

const formatAmount = (amount?: number, currency?: string) => {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return "--";
  if (currency) {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toLocaleString()}`;
    }
  }
  return `$${amount.toLocaleString()}`;
};

const resolveUser = (row: RewardRow, kind: "referrer" | "referred") => {
  const direct =
    kind === "referrer"
      ? row.referrerUser ?? row.referrer
      : row.referredUser ?? row.referred;

  const id =
    direct?._id ??
    direct?.id ??
    direct?.userId ??
    (kind === "referrer"
      ? row.referrerUserId ?? row.referrerId
      : row.referredUserId ?? row.referredId) ??
    "";

  return {
    id,
    name: direct?.name ?? direct?.fullName ?? direct?.username ?? "--",
    email: direct?.email ?? "--",
  };
};

const getUserDisplay = (user: { id?: string; name?: string; email?: string }) => {
  const hasName = Boolean(user.name && user.name !== "--");
  const hasEmail = Boolean(user.email && user.email !== "--");
  const primary = hasName
    ? (user.name as string)
    : hasEmail
      ? (user.email as string)
      : "--";
  const secondary = hasEmail && hasName ? (user.email as string) : "--";
  return { primary, secondary };
};

const getStatusPill = (status?: string) => {
  if (status === "APPROVED") return "pill-success";
  if (status === "REJECTED") return "pill-danger";
  if (status === "REQUESTED") return "pill-accent";
  if (status === "ELIGIBLE") return "pill-muted";
  return "pill-muted";
};

const getActionMeta = (row: RewardRow) => {
  if (row.approvedAt) return { label: "Approved", date: row.approvedAt };
  if (row.rejectedAt) return { label: "Rejected", date: row.rejectedAt };
  if (row.requestedAt) return { label: "Requested", date: row.requestedAt };
  if (row.actionAt) return { label: "Action", date: row.actionAt };
  if (row.updatedAt) return { label: "Updated", date: row.updatedAt };
  return { label: "Action", date: undefined };
};

export default function ReferralPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<RewardFilters>(getDefaultFilters);
  const [filters, setFilters] = useState<RewardFilters>(getDefaultFilters);
  const [selected, setSelected] = useState<RewardRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const rewardsQuery = useAdminReferralRewards({
    page,
    limit,
    status: filters.status || undefined,
    referrerUserId: filters.referrerUserId || undefined,
    referredUserId: filters.referredUserId || undefined,
    createdFrom: filters.createdFrom || undefined,
    createdTo: filters.createdTo || undefined,
    requestedFrom: filters.requestedFrom || undefined,
    requestedTo: filters.requestedTo || undefined,
    approvedFrom: filters.approvedFrom || undefined,
    approvedTo: filters.approvedTo || undefined,
    rejectedFrom: filters.rejectedFrom || undefined,
    rejectedTo: filters.rejectedTo || undefined,
  });

  const approve = useApproveReferralReward();
  const reject = useRejectReferralReward();

  const rewards: RewardRow[] = (rewardsQuery.data?.data as RewardRow[]) ?? EMPTY_ROWS;
  const totalPages = Math.max(
    1,
    rewardsQuery.data?.totalPages ??
      Math.ceil((rewardsQuery.data?.total ?? rewards.length) / Math.max(limit, 1))
  );

  const emptyStateMessage = useMemo(() => {
    if (!filters.status) return "No referral rewards found";
    if (filters.status === "ELIGIBLE") return "No eligible rewards found";
    if (filters.status === "REQUESTED") return "No requested rewards found";
    if (filters.status === "APPROVED") return "No approved rewards found";
    if (filters.status === "REJECTED") return "No rejected rewards found";
    return "No referral rewards found";
  }, [filters.status]);

  const handleStatusFilter = useCallback((nextStatus: "" | ReferralRewardStatus) => {
    setDraftFilters((prev) => ({ ...prev, status: nextStatus }));
    setFilters((prev) => ({ ...prev, status: nextStatus }));
    setPage(1);
  }, []);

  const applyFilters = useCallback(() => {
    setFilters({
      ...draftFilters,
      referrerUserId: draftFilters.referrerUserId.trim(),
      referredUserId: draftFilters.referredUserId.trim(),
    });
    setPage(1);
    setMobileFiltersOpen(false);
  }, [draftFilters]);

  const resetFilters = useCallback(() => {
    const next = getDefaultFilters();
    setDraftFilters(next);
    setFilters(next);
    setPage(1);
    setMobileFiltersOpen(false);
  }, []);

  const closeModal = useCallback(() => {
    setSelected(null);
    setRejectReason("");
  }, []);

  const handleApprove = useCallback(async () => {
    if (!selected) return;
    const rewardId = getRewardId(selected);
    if (!rewardId) {
      toast.error("Reward ID not found");
      return;
    }

    try {
      await approve.mutateAsync(rewardId);
      toast.success("Reward approved successfully");
      setSelected(null);
      setRejectReason("");
      rewardsQuery.refetch();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to approve reward"));
    }
  }, [approve, rewardsQuery, selected]);

  const handleReject = useCallback(async () => {
    if (!selected || !rejectReason.trim()) return;
    const rewardId = getRewardId(selected);
    if (!rewardId) {
      toast.error("Reward ID not found");
      return;
    }

    try {
      await reject.mutateAsync({ id: rewardId, reason: rejectReason.trim() });
      toast.success("Reward rejected successfully");
      setSelected(null);
      setRejectReason("");
      rewardsQuery.refetch();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to reject reward"));
    }
  }, [reject, rejectReason, rewardsQuery, selected]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container-pad space-y-8 min-h-screen no-shadow"
    >
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <h1 className="inline-flex items-center gap-2 text-base sm:text-3xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] bg-clip-text text-transparent">
            <Gift size={18} className="sm:h-7 sm:w-7 text-[var(--primary)]" />
            Referral Rewards
          </h1>
          <p className="text-[10px] sm:text-base text-[var(--text-muted)] mt-1">
            Review and manage referral reward requests
          </p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="card-elevated shadow-none space-y-4 !p-4 sm:!p-6">
        <div className="flex items-center justify-between md:hidden">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((prev) => !prev)}
            className="btn btn-ghost"
          >
            <SlidersHorizontal size={14} />
            {mobileFiltersOpen ? "Hide Filters" : "Show Filters"}
          </button>
        </div>

        <div
          className={`${
            mobileFiltersOpen ? "grid" : "hidden md:grid"
          } grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4`}
        >
          <FilterInput
            label="Referrer User ID"
            icon={<User size={14} />}
            value={draftFilters.referrerUserId}
            onChange={(value) =>
              setDraftFilters((prev) => ({ ...prev, referrerUserId: value }))
            }
            placeholder="Referrer user id"
          />
          <FilterInput
            label="Referred User ID"
            icon={<Users size={14} />}
            value={draftFilters.referredUserId}
            onChange={(value) =>
              setDraftFilters((prev) => ({ ...prev, referredUserId: value }))
            }
            placeholder="Referred user id"
          />
          <FilterInput
            label="Created From"
            icon={<CalendarDays size={14} />}
            type="date"
            value={draftFilters.createdFrom}
            onChange={(value) =>
              setDraftFilters((prev) => ({ ...prev, createdFrom: value }))
            }
          />
          <FilterInput
            label="Created To"
            icon={<CalendarDays size={14} />}
            type="date"
            value={draftFilters.createdTo}
            onChange={(value) =>
              setDraftFilters((prev) => ({ ...prev, createdTo: value }))
            }
          />
          <FilterInput
            label="Requested From"
            icon={<CalendarDays size={14} />}
            type="date"
            value={draftFilters.requestedFrom}
            onChange={(value) =>
              setDraftFilters((prev) => ({ ...prev, requestedFrom: value }))
            }
          />
          <FilterInput
            label="Requested To"
            icon={<CalendarDays size={14} />}
            type="date"
            value={draftFilters.requestedTo}
            onChange={(value) =>
              setDraftFilters((prev) => ({ ...prev, requestedTo: value }))
            }
          />
          <FilterInput
            label="Approved From"
            icon={<CalendarDays size={14} />}
            type="date"
            value={draftFilters.approvedFrom}
            onChange={(value) =>
              setDraftFilters((prev) => ({ ...prev, approvedFrom: value }))
            }
          />
          <FilterInput
            label="Approved To"
            icon={<CalendarDays size={14} />}
            type="date"
            value={draftFilters.approvedTo}
            onChange={(value) =>
              setDraftFilters((prev) => ({ ...prev, approvedTo: value }))
            }
          />
          <FilterInput
            label="Rejected From"
            icon={<CalendarDays size={14} />}
            type="date"
            value={draftFilters.rejectedFrom}
            onChange={(value) =>
              setDraftFilters((prev) => ({ ...prev, rejectedFrom: value }))
            }
          />
          <FilterInput
            label="Rejected To"
            icon={<CalendarDays size={14} />}
            type="date"
            value={draftFilters.rejectedTo}
            onChange={(value) =>
              setDraftFilters((prev) => ({ ...prev, rejectedTo: value }))
            }
          />
        </div>

        <div
          className={`${
            mobileFiltersOpen ? "flex" : "hidden md:flex"
          } flex-wrap items-center gap-2`}
        >
          <button type="button" onClick={applyFilters} className="btn btn-primary">
            Apply Filters
          </button>
          <button type="button" onClick={resetFilters} className="btn btn-ghost">
            <X size={14} />
            Reset
          </button>
        </div>

        <div className="flex items-center flex-nowrap justify-between gap-1 w-full rounded-full bg-[var(--hover-bg)] p-0.5 overflow-x-auto sm:flex-wrap sm:justify-start sm:gap-2 sm:p-1.5 sm:overflow-visible">
          <button
            onClick={() => handleStatusFilter("")}
            aria-label="All rewards"
            className={`whitespace-nowrap px-2.5 py-1 text-[10px] font-semibold rounded-lg transition-all sm:px-4 sm:py-2 sm:text-sm ${
              !filters.status
                ? "bg-[var(--primary)] text-white shadow-none"
                : "text-[var(--text-muted)] hover:bg-white/70"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <FileText size={12} />
              <span className="hidden sm:inline">All</span>
            </span>
          </button>
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              onClick={() => handleStatusFilter(status)}
              aria-label={`${status.toLowerCase()} rewards`}
              className={`whitespace-nowrap px-2.5 py-1 text-[10px] font-semibold rounded-lg transition-all sm:px-4 sm:py-2 sm:text-sm ${
                filters.status === status
                  ? status === "APPROVED"
                    ? "bg-[var(--success)]/15 text-[var(--success)] border border-[color-mix(in_srgb,var(--success)_35%,transparent)]"
                    : status === "REJECTED"
                    ? "bg-[var(--danger)]/15 text-[var(--danger)] border border-[color-mix(in_srgb,var(--danger)_35%,transparent)]"
                    : status === "REQUESTED"
                    ? "bg-[var(--accent)]/20 text-[var(--accent)] border border-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
                    : "bg-[var(--muted)]/30 text-[var(--foreground)] border border-[color-mix(in_srgb,var(--foreground)_15%,transparent)]"
                  : "text-[var(--text-muted)] hover:bg-white/70"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <UserCheck size={12} />
                <span className="hidden sm:inline">{status}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="card-elevated shadow-none">
        <div className="flex flex-col gap-1 px-1 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] sm:text-xs text-[var(--text-muted)]">
            {rewardsQuery.isLoading
              ? "Loading..."
              : `${rewardsQuery.data?.total ?? rewards.length} result${
                  (rewardsQuery.data?.total ?? rewards.length) === 1 ? "" : "s"
                }`}
          </p>
          {rewardsQuery.isFetching && !rewardsQuery.isLoading && (
            <span className="inline-flex items-center gap-2 text-[10px] sm:text-xs text-[var(--text-muted)]">
              <span className="w-3.5 h-3.5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
              Updating...
            </span>
          )}
        </div>
        <DragScroll className="overflow-x-auto">
          <table className="table w-full text-[11px] sm:text-[13px]">
            <thead>
              <tr>
                <th className="font-semibold text-[var(--foreground)]">
                  <span className="inline-flex items-center gap-1.5">
                    <User size={13} />
                    Referrer
                  </span>
                </th>
                <th className="font-semibold text-[var(--foreground)]">
                  <span className="inline-flex items-center gap-1.5">
                    <Users size={13} />
                    Referred
                  </span>
                </th>
                <th className="font-semibold text-[var(--foreground)]">
                  <span className="inline-flex items-center gap-1.5">
                    <Gift size={13} />
                    Reward
                  </span>
                </th>
                <th className="font-semibold text-[var(--foreground)]">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={13} />
                    Created
                  </span>
                </th>
                <th className="font-semibold text-[var(--foreground)]">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 size={13} />
                    Action
                  </span>
                </th>
                <th className="font-semibold text-[var(--foreground)]">
                  <span className="inline-flex items-center gap-1.5">
                    <UserCheck size={13} />
                    Status
                  </span>
                </th>
                <th className="font-semibold text-[var(--foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {rewardsQuery.isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-[var(--text-muted)]">
                        <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                        Loading rewards...
                      </div>
                    </td>
                  </tr>
                ) : rewardsQuery.isError ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="text-[var(--text-muted)] space-y-2">
                        <AlertCircle className="w-12 h-12 mx-auto opacity-60 text-orange-500" />
                        <p className="font-medium text-[var(--foreground)]">
                          {getErrorMessage(rewardsQuery.error, "Unable to load rewards")}
                        </p>
                        <button
                          type="button"
                          onClick={() => rewardsQuery.refetch()}
                          className="btn btn-ghost mx-auto"
                        >
                          Try again
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : rewards.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="text-[var(--text-muted)] space-y-2">
                        <Gift className="w-12 h-12 mx-auto opacity-50" />
                        <p>{emptyStateMessage}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rewards.map((reward, index) => {
                    const referrer = resolveUser(reward, "referrer");
                    const referred = resolveUser(reward, "referred");
                    const referrerDisplay = getUserDisplay(referrer);
                    const referredDisplay = getUserDisplay(referred);
                    const amount = getRewardAmount(reward);
                    const currency = getRewardCurrency(reward);
                    const actionMeta = getActionMeta(reward);
                    const status = reward.status ?? "--";

                    return (
                      <motion.tr
                        key={getRewardId(reward) || index}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="group transition-colors duration-200 hover:!bg-[var(--hover-bg)]"
                      >
                        <td>
                          <div className="font-medium text-[var(--foreground)] group-hover:text-[var(--primary)]">
                            {referrerDisplay.primary}
                          </div>
                          <div className="text-[10px] sm:text-xs text-[var(--text-muted)]">
                            {referrerDisplay.secondary}
                          </div>
                        </td>
                        <td>
                          <div className="font-medium text-[var(--foreground)] group-hover:text-[var(--primary)]">
                            {referredDisplay.primary}
                          </div>
                          <div className="text-[10px] sm:text-xs text-[var(--text-muted)]">
                            {referredDisplay.secondary}
                          </div>
                        </td>
                        <td>
                          <div className="font-bold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                            {formatAmount(amount, currency)}
                          </div>
                        </td>
                        <td>
                          <div className="inline-flex items-center gap-2">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--input-bg)] text-[var(--text-muted)]">
                              <Clock3 size={14} />
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[var(--foreground)] leading-5">
                                {formatDate(reward.createdAt)}
                              </p>
                              <p className="text-xs text-[var(--text-muted)] leading-4">
                                {formatTime(reward.createdAt)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td>
                          {actionMeta.date ? (
                            <div className="inline-flex items-center gap-2">
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--input-bg)] text-[var(--text-muted)]">
                                <Clock3 size={14} />
                              </span>
                              <div className="min-w-0">
                                <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                                  {actionMeta.label}
                                </p>
                                <p className="text-sm font-medium text-[var(--foreground)] leading-5">
                                  {formatDate(actionMeta.date)}
                                </p>
                                <p className="text-xs text-[var(--text-muted)] leading-4">
                                  {formatTime(actionMeta.date)}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[var(--text-muted)]">--</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`pill method-status-pill !rounded-md font-semibold ${getStatusPill(
                              status
                            )}`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="text-left">
                          <div className="flex items-center justify-start gap-2">
                            <button
                              type="button"
                              onClick={() => setSelected(reward)}
                              className="btn p-2"
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
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
        onLimitChange={(nextLimit) => {
          setLimit(nextLimit);
          setPage(1);
        }}
      />

      {/* MODAL */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm p-3 sm:p-6"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="card-elevated shadow-none !p-0 w-full max-w-2xl mx-auto my-3 sm:my-6 overflow-hidden"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="max-h-[calc(100vh-1.5rem)] sm:max-h-[88vh] overflow-y-auto">
                <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--card-border)] bg-[var(--card-bg)]/95 backdrop-blur">
                  <h3 className="inline-flex items-center gap-2 text-base sm:text-xl font-bold text-[var(--foreground)]">
                    <Gift size={18} />
                    Reward Details
                  </h3>
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={closeModal}
                    className="p-1.5 rounded-lg hover:bg-[var(--hover-bg)]"
                  >
                    <X size={18} />
                  </motion.button>
                </div>

                <div className="p-4 sm:p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(() => {
                      const referrer = resolveUser(selected, "referrer");
                      const referred = resolveUser(selected, "referred");
                      const referrerDisplay = getUserDisplay(referrer);
                      const referredDisplay = getUserDisplay(referred);

                      return (
                        <>
                          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2">
                            <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Referrer</p>
                            <p className="text-sm font-semibold text-[var(--foreground)]">
                              {referrerDisplay.primary}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {referrerDisplay.secondary}
                            </p>
                          </div>
                          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2">
                            <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Referred</p>
                            <p className="text-sm font-semibold text-[var(--foreground)]">
                              {referredDisplay.primary}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {referredDisplay.secondary}
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Reward</p>
                      <p className="text-base font-bold text-emerald-600">
                        {formatAmount(getRewardAmount(selected), getRewardCurrency(selected))}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Status</p>
                      <span
                        className={`pill method-status-pill !rounded-md mt-1 inline-flex items-center font-semibold ${getStatusPill(
                          selected.status
                        )}`}
                      >
                        {selected.status ?? "--"}
                      </span>
                    </div>
                    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                        Reward Status
                      </p>
                      <p className="text-xs font-semibold text-[var(--foreground)]">
                        {selected.status ?? "--"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <DateCard label="Created" value={selected.createdAt} />
                    <DateCard label="Requested" value={selected.requestedAt} />
                    <DateCard label="Approved" value={selected.approvedAt} />
                    <DateCard label="Rejected" value={selected.rejectedAt} />
                  </div>

                  {(selected.rejectionReason || selected.reason) && (
                    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Rejection Reason</p>
                      <p className="text-sm text-[var(--foreground)]">
                        {selected.rejectionReason || selected.reason}
                      </p>
                    </div>
                  )}

                  {(selected.status === "REQUESTED" || selected.status === "ELIGIBLE") && (
                    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] p-3 sm:p-4 space-y-3">
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={handleApprove}
                        disabled={approve.isPending}
                        className="btn btn-primary w-full h-11 text-sm sm:text-base"
                      >
                        {approve.isPending ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            Approving...
                          </>
                        ) : (
                          <>
                            <Check size={16} />
                            Approve Reward
                          </>
                        )}
                      </motion.button>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--foreground)] block">
                          Reject Reason (Required)
                        </label>
                        <div className="relative">
                          <textarea
                            placeholder="Enter reason for rejection..."
                            value={rejectReason}
                            onChange={(event) => setRejectReason(event.target.value)}
                            className="input resize-none w-full h-24 pr-10"
                            rows={4}
                          />
                          {rejectReason.trim().length === 0 && (
                            <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-500 w-4 h-4" />
                          )}
                        </div>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={handleReject}
                        disabled={rejectReason.trim().length === 0 || reject.isPending}
                        className="btn w-full h-11 text-sm sm:text-base bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {reject.isPending ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            Rejecting...
                          </>
                        ) : (
                          <>
                            <X size={16} />
                            Reject Reward
                          </>
                        )}
                      </motion.button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <style jsx>{`
        @media (max-width: 640px) {
          .method-status-pill {
            font-size: 8px !important;
            padding: 4px 7px !important;
            line-height: 1 !important;
          }
        }
      `}</style>
    </motion.div>
  );
}

function FilterInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            {icon}
          </span>
        ) : null}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`input w-full ${icon ? "!pl-10" : ""} pr-4`}
        />
      </div>
    </div>
  );
}

function DateCard({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="text-sm font-semibold text-[var(--foreground)]">
        {formatDate(value)}
      </p>
      <p className="text-xs text-[var(--text-muted)]">{formatTime(value)}</p>
    </div>
  );
}
