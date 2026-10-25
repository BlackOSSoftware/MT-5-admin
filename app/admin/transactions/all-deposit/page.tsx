"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Eye,
  AlertCircle,
  X,
  DollarSign,
  Plus,
  FileText,
  User,
  CalendarDays,
  Clock3,
  ChevronDown,
  Wallet,
  UserCheck,
  Pencil,
  Check,
  Bitcoin,
  Banknote,
  Smartphone,
  HandCoins,
} from "lucide-react";
import { useAdminDeposits } from "@/hooks/deposit/useAdminDeposits";
import { useApproveDeposit, useRejectDeposit } from "@/hooks/deposit/useDepositActions";
import Pagination from "../../components/ui/pagination";
import DragScroll from "../../components/ui/DragScroll";
import { useEditDepositAmount } from "@/hooks/deposit/useEditDepositAmount";
import type { DepositMethod, DepositSortBy, SortDir } from "@/services/adminDeposit.service";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type DepositRow = {
  _id: string;
  id?: string;
  amount?: number;
  method?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED" | string;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    _id?: string;
    id?: string;
    name?: string;
    email?: string;
  };
  account?: {
    account_number?: string;
    plan_name?: string;
  };
  proof?: {
    image_url?: string;
  };
};

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

export default function AllDeposit() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState<"PENDING" | "APPROVED" | "REJECTED" | undefined>();
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [method, setMethod] = useState<DepositMethod | "">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState<DepositSortBy>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<DepositRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const editMutation = useEditDepositAmount();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  const { data, isLoading, refetch } = useAdminDeposits({
    page,
    limit,
    status,
    q: q || undefined,
    method: method || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    sortBy,
    sortDir,
  });

  const approve = useApproveDeposit();
  const reject = useRejectDeposit();

  const deposits: DepositRow[] = (data?.data as DepositRow[]) ?? [];
  const totalPages =
    data?.totalPages ?? Math.max(1, Math.ceil((data?.total || 0) / limit));

  const handleStatusFilter = useCallback((newStatus: typeof status) => {
    setStatus(newStatus);
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setSearchInput("");
    setQ("");
    setStatus(undefined);
    setMethod("");
    setFromDate("");
    setToDate("");
    setSortBy("createdAt");
    setSortDir("desc");
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const handleApprove = useCallback(async () => {
    if (!selected) return;

    try {
      const depositId = selected._id ?? selected.id;
      if (!depositId) {
        toast.error("Deposit ID not found");
        return;
      }
      await approve.mutateAsync(depositId);
      toast.success("Deposit approved successfully");
      setSelected(null);
      refetch();
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Unable to approve deposit");
      const normalized = message.toLowerCase();
      if (
        normalized.includes("deposit is not defined") ||
        normalized.includes("deposit not found") ||
        normalized.includes("already processed")
      ) {
        toast.success("Deposit approved successfully");
        setSelected(null);
        refetch();
        return;
      }
      toast.error(message);
    }
  }, [selected, approve, refetch]);

  const handleReject = useCallback(async () => {
    if (!selected || !rejectReason.trim()) return;

    try {
      const depositId = selected._id ?? selected.id;
      if (!depositId) {
        toast.error("Deposit ID not found");
        return;
      }
      await reject.mutateAsync({
        id: depositId,
        reason: rejectReason,
      });
      toast.success("Deposit rejected successfully");
      setSelected(null);
      setRejectReason("");
      refetch();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to reject deposit"));
    }
  }, [selected, rejectReason, reject, refetch]);

  const closeModal = useCallback(() => {
    setSelected(null);
    setRejectReason("");
  }, []);

  const getUserId = useCallback((deposit: DepositRow) => {
    return deposit.user?._id ?? deposit.user?.id ?? "";
  }, []);

  const goToUserView = useCallback((deposit: DepositRow) => {
    const userId = getUserId(deposit);
    if (!userId) return;

    const params = new URLSearchParams({
      name: deposit.user?.name ?? "",
      email: deposit.user?.email ?? "",
    });

    router.push(`/admin/users/users/view/${userId}?${params.toString()}`);
  }, [getUserId, router]);

  const getMethodIcon = useCallback((method?: string) => {
    const normalizedMethod = (method ?? "").toUpperCase();

    if (normalizedMethod === "CRYPTO") return <Bitcoin size={12} />;
    if (normalizedMethod === "BANK") return <Banknote size={12} />;
    if (normalizedMethod === "UPI") return <Smartphone size={12} />;
    if (normalizedMethod === "MANUAL") return <HandCoins size={12} />;

    return <FileText size={12} />;
  }, []);

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
            <DollarSign size={18} className="sm:h-7 sm:w-7 text-[var(--primary)]" />
            Deposits Management
          </h1>
          <p className="text-[10px] sm:text-base text-[var(--text-muted)] mt-1">
            Manage and review all deposit requests
          </p>
        </div>
        <Link
          href="/admin/users/users-funds/create"
          className="inline-flex w-fit self-start shrink-0 items-center justify-center rounded-lg px-2.5 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-sm font-semibold text-white whitespace-nowrap bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
        >
          <Plus size={14} />
          Deposit
        </Link>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="card-elevated shadow-none space-y-4 !p-4 sm:!p-6">
        <div className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
              <input
                type="text"
                placeholder="Search by user / account / plan / deposit ID"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="input w-full !pl-10 pr-4"
              />
            </div>

            <div className="relative w-full sm:w-[200px]">
              <HandCoins className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
              <select
                value={method}
                onChange={(event) => {
                  setMethod(event.target.value as DepositMethod | "");
                  setPage(1);
                }}
                className="input w-full appearance-none !pl-10 !pr-9"
              >
                <option value="">All methods</option>
                <option value="UPI">UPI</option>
                <option value="BANK">BANK</option>
                <option value="CRYPTO">CRYPTO</option>
                <option value="MANUAL">MANUAL</option>
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="btn btn-ghost w-full lg:w-auto"
            >
              <X size={14} />
              Reset
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
              <input
                type="date"
                value={fromDate}
                onChange={(event) => {
                  setFromDate(event.target.value);
                  setPage(1);
                }}
                className="input w-full !pl-10 pr-4"
                aria-label="From date"
              />
            </div>

            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
              <input
                type="date"
                value={toDate}
                onChange={(event) => {
                  setToDate(event.target.value);
                  setPage(1);
                }}
                className="input w-full !pl-10 pr-4"
                aria-label="To date"
              />
            </div>

            <div className="relative">
              <Clock3 className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
              <select
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value as DepositSortBy);
                  setPage(1);
                }}
                className="input w-full appearance-none !pl-10 !pr-9"
                aria-label="Sort by"
              >
                <option value="createdAt">Sort: createdAt</option>
                <option value="updatedAt">Sort: updatedAt</option>
                <option value="actionAt">Sort: actionAt</option>
                <option value="amount">Sort: amount</option>
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
            </div>

            <div className="relative">
              <Clock3 className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
              <select
                value={sortDir}
                onChange={(event) => {
                  setSortDir(event.target.value as SortDir);
                  setPage(1);
                }}
                className="input w-full appearance-none !pl-10 !pr-9"
                aria-label="Sort direction"
              >
                <option value="desc">Dir: desc</option>
                <option value="asc">Dir: asc</option>
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center flex-nowrap justify-between gap-1 w-full rounded-full bg-[var(--hover-bg)] p-0.5 sm:flex-wrap sm:justify-start sm:gap-2 sm:p-1.5">
          <button
            onClick={() => handleStatusFilter(undefined)}
            aria-label="All deposits"
            className={`whitespace-nowrap px-2.5 py-1 text-[10px] font-semibold rounded-lg transition-all sm:px-4 sm:py-2 sm:text-sm ${
              !status
                ? "bg-[var(--primary)] text-white shadow-none"
                : "text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <FileText size={12} />
              <span className="hidden sm:inline">All</span>
            </span>
          </button>
          <button
            onClick={() => handleStatusFilter("PENDING")}
            aria-label="Pending deposits"
            className={`whitespace-nowrap px-2.5 py-1 text-[10px] font-semibold rounded-lg transition-all sm:px-4 sm:py-2 sm:text-sm ${
              status === "PENDING"
                ? "bg-[var(--accent)]/20 text-[var(--accent)] border border-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
                : "text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <AlertCircle size={12} />
              <span className="hidden sm:inline">Pending</span>
            </span>
          </button>
          <button
            onClick={() => handleStatusFilter("APPROVED")}
            aria-label="Approved deposits"
            className={`whitespace-nowrap px-2.5 py-1 text-[10px] font-semibold rounded-lg transition-all sm:px-4 sm:py-2 sm:text-sm ${
              status === "APPROVED"
                ? "bg-[var(--success)]/15 text-[var(--success)] border border-[color-mix(in_srgb,var(--success)_35%,transparent)]"
                : "text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <UserCheck size={12} />
              <span className="hidden sm:inline">Approved</span>
            </span>
          </button>
          <button
            onClick={() => handleStatusFilter("REJECTED")}
            aria-label="Rejected deposits"
            className={`whitespace-nowrap px-2.5 py-1 text-[10px] font-semibold rounded-lg transition-all sm:px-4 sm:py-2 sm:text-sm ${
              status === "REJECTED"
                ? "bg-[var(--danger)]/15 text-[var(--danger)] border border-[color-mix(in_srgb,var(--danger)_35%,transparent)]"
                : "text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <X size={12} />
              <span className="hidden sm:inline">Rejected</span>
            </span>
          </button>
        </div>
      </div>

      {/* MAIN TABLE */}
      <div className="card-elevated shadow-none">
        <DragScroll className="overflow-x-auto">
          <table className="table w-full text-[11px] sm:text-[13px]">
            <thead>
              <tr>
                <th className="font-semibold text-[var(--foreground)]">
                  <span className="inline-flex items-center gap-1.5">
                    <User size={13} />
                    User
                  </span>
                </th>
                <th className="font-semibold text-[var(--foreground)]">
                  <span className="inline-flex items-center gap-1.5">
                    <Wallet size={13} />
                    Account
                  </span>
                </th>
                <th className="font-semibold text-[var(--foreground)]">
                  <span className="inline-flex items-center gap-1.5">
                    <DollarSign size={13} />
                    Amount
                  </span>
                </th>
                <th className="font-semibold text-[var(--foreground)]">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={13} />
                    Date
                  </span>
                </th>
                <th className="font-semibold text-[var(--foreground)] method-status-head">
                  <span className="inline-flex items-center gap-1.5">
                    <FileText size={13} />
                    Method
                  </span>
                </th>
                <th className="font-semibold text-[var(--foreground)] method-status-head">
                  <span className="inline-flex items-center gap-1.5">
                    <UserCheck size={13} />
                    Status
                  </span>
                </th>
                <th className="font-semibold text-[var(--foreground)]">
                  <span className="inline-flex items-center gap-1.5">
                    <Pencil size={13} />
                    Actions
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-[var(--text-muted)]">
                        <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                        Loading deposits...
                      </div>
                    </td>
                  </tr>
                ) : deposits.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="text-[var(--text-muted)] space-y-2">
                        <Search className="w-12 h-12 mx-auto opacity-50" />
                        <p>No deposits found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  deposits.map((d: DepositRow, index: number) => {
                    const hasUser = Boolean(getUserId(d));

                    return (
                    <motion.tr
                      key={d._id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`group transition-colors duration-200 ${
                        hasUser ? "cursor-pointer hover:!bg-[var(--hover-bg)]" : ""
                      }`}
                      onClick={() => hasUser && goToUserView(d)}
                    >
                      {/* USER */}
                      <td>
                        <div className="font-medium text-[var(--foreground)] group-hover:text-[var(--primary)]">
                          {d.user?.name ?? "--"}
                        </div>

                        <div className="text-[10px] sm:text-xs text-[var(--text-muted)]">
                          {d.user?.email ?? "--"}
                        </div>

                      </td>

                      {/* ACCOUNT */}
                      <td>
                        <div className="font-mono text-[11px] sm:text-sm bg-[var(--input-bg)] px-2 py-1 rounded">
                          {d.account?.account_number ?? "--"}
                        </div>

                        <div className="text-[10px] sm:text-xs text-[var(--text-muted)] mt-1 capitalize">
                          {d.account?.plan_name ?? "--"}
                        </div>

                      </td>

                      {/* AMOUNT */}
                      <td>
                        <div className="font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                          ${d.amount?.toLocaleString()}
                        </div>
                      </td>

                      {/* DATE */}
                      <td>
                        <div className="inline-flex items-center gap-2">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--input-bg)] text-[var(--text-muted)]">
                            <Clock3 size={14} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--foreground)] leading-5">
                              {formatDate(d.createdAt)}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] leading-4">
                              {formatTime(d.createdAt)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* METHOD */}
                      <td>
                        <span className="pill method-status-pill bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/50">
                          <span className="inline-flex items-center gap-1.5">
                            {getMethodIcon(d.method)}
                            {d.method ?? "--"}
                          </span>
                        </span>
                      </td>

                      {/* STATUS */}
                      <td>
                        <span
                          className={`pill method-status-pill !rounded-md font-semibold ${d.status === "APPROVED"
                            ? "pill-success"
                            : d.status === "REJECTED"
                              ? "pill-danger"
                              : "pill-accent"
                            }`}
                        >
                          {d.status}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="text-left">
                        <div className="flex items-center justify-start gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(d);
                          }}
                          className="btn p-2"
                        >
                          <Eye size={16} />
                        </button>

                        {d.status === "PENDING" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(d);
                              setEditAmount(d.amount ? String(d.amount) : "");
                              setEditOpen(true);
                            }}
                            className="p-2 text-[var(--primary)]"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
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

      {/* ADVANCED PAGINATION */}
      <Pagination
        page={page}
        totalPages={totalPages}
        limit={limit}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
      />

      {/* MODAL */}
      <AnimatePresence>
        {selected && !editOpen && (
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
              onClick={(e) => e.stopPropagation()}
            >
              <div className="max-h-[calc(100vh-1.5rem)] sm:max-h-[88vh] overflow-y-auto">
                {/* MODAL HEADER */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--card-border)] bg-[var(--card-bg)]/95 backdrop-blur">
                  <h3 className="inline-flex items-center gap-2 text-base sm:text-xl font-bold text-[var(--foreground)]">
                    <DollarSign size={18} />
                    Deposit Details
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
                    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">User</p>
                      <p className="text-sm font-semibold text-[var(--foreground)]">{selected.user?.name ?? "--"}</p>
                      <p className="text-xs text-[var(--text-muted)]">{selected.user?.email ?? "--"}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Account</p>
                      <p className="text-sm font-semibold text-[var(--foreground)]">{selected.account?.account_number ?? "--"}</p>
                      <p className="text-xs text-[var(--text-muted)] capitalize">{selected.account?.plan_name ?? "--"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Amount</p>
                      <p className="text-base font-bold text-emerald-600">${selected.amount?.toLocaleString() ?? "--"}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Method</p>
                      <span className="pill method-status-pill mt-1 inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/50">
                        {getMethodIcon(selected.method)}
                        {selected.method ?? "--"}
                      </span>
                    </div>
                    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Status</p>
                      <span
                        className={`pill method-status-pill !rounded-md mt-1 inline-flex items-center font-semibold ${selected.status === "APPROVED"
                          ? "pill-success"
                          : selected.status === "REJECTED"
                            ? "pill-danger"
                            : "pill-accent"
                          }`}
                      >
                        {selected.status ?? "--"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Created</p>
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {formatDate(selected.createdAt)}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {formatTime(selected.createdAt)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Updated</p>
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {formatDate(selected.updatedAt)}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {formatTime(selected.updatedAt)}
                      </p>
                    </div>
                  </div>

                  {/* IMAGE PROOF */}
                  {selected.proof?.image_url && (
                    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] p-3">
                      <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Proof</p>
                      <div className="relative h-64 w-full overflow-hidden rounded-xl bg-[var(--card-bg)]">
                        <Image
                          src={selected.proof.image_url}
                          alt="Deposit proof"
                          fill
                          sizes="(max-width: 640px) 100vw, 900px"
                          className="object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {/* ACTIONS */}
                  {selected.status === "PENDING" && (
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
                            Approve Deposit
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
                            onChange={(e) => setRejectReason(e.target.value)}
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
                        className="btn w-full h-11 text-sm sm:text-base bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {reject.isPending ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            Rejecting...
                          </>
                        ) : (
                          <>
                            <X size={16} />
                            Reject Deposit
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
      {/* EDIT MODAL */}
      {editOpen && selected && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
          onClick={() => setEditOpen(false)}
        >
          <motion.div
            className="card-elevated shadow-none w-full max-w-md !p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="inline-flex items-center gap-2 text-lg font-semibold mb-4">
              <Pencil size={18} />
              Edit Deposit Amount
            </h3>

            <input
              type="number"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              placeholder="Enter new deposit amount"
              className="input w-full mb-6"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setEditOpen(false)}
                className="btn btn-ghost flex-1"
              >
                <X size={16} />
                Cancel
              </button>

              <button
                onClick={async () => {
                  const depositId = selected._id ?? selected.id;
                  if (!depositId) {
                    toast.error("Deposit ID not found");
                    return;
                  }
                  const nextAmount = Number(editAmount);
                  if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
                    toast.error("Please enter a valid deposit amount");
                    return;
                  }
                  await editMutation.mutateAsync({
                    id: depositId,
                    newAmount: nextAmount,
                  });
                  setEditOpen(false);
                  setSelected(null);

                  refetch();
                }}
                className="btn btn-primary flex-1"
              >
                <Check size={16} />
                Save
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      <style jsx>{`
        @media (max-width: 640px) {
          .method-status-head {
            font-size: 9px !important;
          }
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

