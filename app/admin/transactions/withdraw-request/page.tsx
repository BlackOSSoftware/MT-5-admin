"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Eye,
  AlertCircle,
  X,
  DollarSign,
  FileText,
  User,
  Wallet,
  UserCheck,
  Check,
  CalendarDays,
  Clock3,
  ChevronDown,
  Bitcoin,
  Banknote,
  Smartphone,
  HandCoins,
  ArrowUpCircle,
} from "lucide-react";
import {
  useApproveWithdrawal,
  useRejectWithdrawal,
} from "@/hooks/withdrawals/useWithdrawalActions";
import { useAdminWithdrawals } from "@/hooks/withdrawals/useWithdrawals";
import Pagination from "../../components/ui/pagination";
import DragScroll from "../../components/ui/DragScroll";
import ReportExportButtons from "../../components/ui/ReportExportButtons";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  getAdminWithdrawals,
  type WithdrawalMethod,
  type WithdrawalSortBy,
  type WithdrawalStatus,
  type SortDir,
} from "@/services/adminWithdrawal.service";
import {
  downloadCsv,
  downloadPdfReport,
  type ReportColumn,
  type ReportRow,
} from "@/utils/reportExport";

type WithdrawalRow = {
  _id: string;
  amount?: number;
  method?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  actionAt?: string;
  user?: {
    _id?: string;
    id?: string;
    name?: string;
    email?: string;
  };
  account?: {
    account_number?: string;
    account_type?: string;
    plan_name?: string;
    balance?: number;
    hold_balance?: number;
  };
  payout?: {
    upi_id?: string;
    bank_name?: string;
    account_holder_name?: string;
    account_number?: string;
    ifsc?: string;
    swift_code?: string;
    email?: string;
    crypto_network?: string;
    crypto_address?: string;
    note?: string;
    converted_amount?: number | null;
    converted_currency?: string;
    conversion_rate?: number | null;
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

const formatDateTime = (value?: string) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return `${date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}, ${date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const REPORT_COLUMNS: ReportColumn[] = [
  { key: "id", label: "Withdrawal ID" },
  { key: "userName", label: "User Name" },
  { key: "userEmail", label: "Email" },
  { key: "accountNo", label: "Account No" },
  { key: "plan", label: "Plan" },
  { key: "amount", label: "Amount", align: "right" },
  { key: "method", label: "Method" },
  { key: "payout", label: "Payout Details" },
  { key: "status", label: "Status" },
  { key: "createdAt", label: "Requested At" },
  { key: "actionAt", label: "Action At" },
  { key: "rejectionReason", label: "Rejection Reason" },
];

const getStr = (v: unknown): string =>
  v === null || v === undefined ? "" : String(v);

const CURRENCY_PREFIX: Record<string, string> = {
  INR: "₹",
  USD: "$",
  USDT: "USDT ",
  BTC: "₿",
};

const formatConverted = (p?: WithdrawalRow["payout"]): string => {
  if (!p || p.converted_amount === null || p.converted_amount === undefined) {
    return "";
  }
  const cur = String(p.converted_currency || "").toUpperCase();
  const prefix = CURRENCY_PREFIX[cur] ?? `${cur} `;
  const digits = cur === "BTC" ? 8 : 2;
  const value = Number(p.converted_amount).toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  const rate =
    p.conversion_rate !== null && p.conversion_rate !== undefined
      ? ` @ ${p.conversion_rate}`
      : "";
  return ` → ${prefix}${value}${rate}`;
};

const payoutSummary = (w: WithdrawalRow): string => {
  const p = w.payout;
  if (!p) return "--";
  const m = (w.method ?? "").toUpperCase();
  const conv = formatConverted(p);
  if (m === "UPI" && p.upi_id) return `UPI: ${p.upi_id}${conv}`;
  if ((m === "BANK" || m === "INDIAN_BANK") && (p.bank_name || p.account_number)) {
    return (
      [p.bank_name, p.account_holder_name, p.account_number, p.ifsc]
        .filter(Boolean)
        .join(" | ") + conv
    );
  }
  if (
    (m === "CRYPTO" || m === "USDT" || m === "BITCOIN" || m === "NETELLER" || m === "SKRILL") &&
    (p.crypto_address || p.crypto_network || p.email)
  ) {
    const addr = [p.crypto_network, p.crypto_address || p.email]
      .filter(Boolean)
      .join(" ");
    const base = addr.length > 60 ? `${addr.slice(0, 57)}...` : addr || "--";
    return base + conv;
  }
  return (p.note || "--") + conv;
};

export default function AllWithdrawals() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState<WithdrawalStatus | undefined>();
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [method, setMethod] = useState<WithdrawalMethod | "">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState<WithdrawalSortBy>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<WithdrawalRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  const { data, isLoading, isError, error, refetch, isFetching } = useAdminWithdrawals({
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

  const approve = useApproveWithdrawal();
  const reject = useRejectWithdrawal();

  const withdrawals: WithdrawalRow[] = (data?.data as WithdrawalRow[]) ?? [];
  const totalPages = Math.max(
    1,
    data?.totalPages ?? Math.ceil((data?.total || 0) / limit) ?? 1
  );

  const emptyStateMessage = (() => {
    if (!status) return "No withdrawals found";
    if (status === "PENDING") return "No pending withdrawals found";
    if (status === "APPROVED" || status === "COMPLETED") return "No approved withdrawals found";
    if (status === "REJECTED") return "No rejected withdrawals found";
    return "No withdrawals found";
  })();

  const handleStatusFilter = useCallback((nextStatus: typeof status) => {
    setStatus(nextStatus);
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

  const getUserId = useCallback((withdrawal: WithdrawalRow) => {
    return withdrawal.user?._id ?? withdrawal.user?.id ?? "";
  }, []);

  const goToUserView = useCallback((withdrawal: WithdrawalRow) => {
    const userId = getUserId(withdrawal);
    if (!userId) return;

    const params = new URLSearchParams({
      name: withdrawal.user?.name ?? "",
      email: withdrawal.user?.email ?? "",
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

  const closeModal = useCallback(() => {
    setSelected(null);
    setRejectReason("");
  }, []);

  const buildReportRows = useCallback((items: WithdrawalRow[]): ReportRow[] => {
    return items.map((w) => {
      const extra = w as unknown as Record<string, unknown>;
      return {
        id: getStr(w._id).slice(-8).toUpperCase(),
        userName: getStr(w.user?.name) || "--",
        userEmail: getStr(w.user?.email) || "--",
        accountNo: getStr(w.account?.account_number) || "--",
        plan: getStr(w.account?.plan_name) || getStr(w.account?.account_type) || "--",
        amount: typeof w.amount === "number" ? `$${w.amount.toLocaleString()}` : "--",
        method: getStr(w.method) || "--",
        payout: payoutSummary(w),
        status: getStr(w.status) || "--",
        createdAt: formatDateTime(w.createdAt),
        actionAt: formatDateTime(w.actionAt || getStr(extra.actionAt) || undefined),
        rejectionReason: getStr(extra.rejectionReason) || "--",
      };
    });
  }, []);

  const fetchAllReportRows = useCallback(async (): Promise<WithdrawalRow[]> => {
    const all: WithdrawalRow[] = [];
    let pageNum = 1;
    const pageSize = 100;
    for (let i = 0; i < 50; i += 1) {
      const res = await getAdminWithdrawals({
        page: pageNum,
        limit: pageSize,
        status,
        q: q || undefined,
        method: method || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        sortBy,
        sortDir,
      });
      const batch = (res.data as WithdrawalRow[]) ?? [];
      all.push(...batch);
      const totalPages = res.totalPages ?? Math.ceil((res.total || 0) / pageSize);
      if (batch.length < pageSize || pageNum >= totalPages) break;
      pageNum += 1;
    }
    return all;
  }, [status, q, method, fromDate, toDate, sortBy, sortDir]);

  const reportFilterSummary = useCallback(() => {
    const items: Array<{ label: string; value: string }> = [];
    items.push({ label: "Status", value: status || "All" });
    items.push({ label: "Method", value: method || "All" });
    if (q) items.push({ label: "Search", value: q });
    if (fromDate) items.push({ label: "From", value: fromDate });
    if (toDate) items.push({ label: "To", value: toDate });
    items.push({ label: "Sort", value: `${sortBy} (${sortDir})` });
    return items;
  }, [status, method, q, fromDate, toDate, sortBy, sortDir]);

  const handleExportCsv = useCallback(async () => {
    setReportLoading(true);
    try {
      const items = await fetchAllReportRows();
      const rows = buildReportRows(items);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`withdrawals-report-${stamp}.csv`, REPORT_COLUMNS, rows);
      toast.success(`CSV downloaded — ${rows.length} records`);
    } catch {
      toast.error("Failed to generate CSV report");
    } finally {
      setReportLoading(false);
    }
  }, [fetchAllReportRows, buildReportRows]);

  const handleExportPdf = useCallback(async () => {
    setReportLoading(true);
    try {
      const items = await fetchAllReportRows();
      const rows = buildReportRows(items);
      const totalAmount = items.reduce(
        (sum, w) => sum + (typeof w.amount === "number" ? w.amount : 0),
        0,
      );
      const approved = items.filter(
        (w) => w.status === "APPROVED" || w.status === "COMPLETED",
      ).length;
      const pending = items.filter((w) => w.status === "PENDING").length;
      const rejected = items.filter((w) => w.status === "REJECTED").length;
      downloadPdfReport({
        title: "Withdrawal Requests Report",
        filename: `withdrawals-report-${new Date().toISOString().slice(0, 10)}.pdf`,
        subtitle: "All withdrawal requests matching current filters",
        filterSummary: reportFilterSummary(),
        summaryCards: [
          { label: "Total Records", value: String(rows.length) },
          { label: "Total Amount", value: `$${totalAmount.toLocaleString()}` },
          { label: "Approved", value: String(approved) },
          { label: "Pending", value: String(pending) },
          { label: "Rejected", value: String(rejected) },
        ],
        columns: REPORT_COLUMNS,
        rows,
      });
      toast.success(`PDF report ready — ${rows.length} records`);
    } catch {
      toast.error("Failed to generate PDF report");
    } finally {
      setReportLoading(false);
    }
  }, [fetchAllReportRows, buildReportRows, reportFilterSummary]);

  const handleApprove = useCallback(async () => {
    if (!selected) return;

    try {
      await approve.mutateAsync(selected._id);
      toast.success("Withdrawal approved successfully");
      setSelected(null);
      refetch();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to approve withdrawal"));
    }
  }, [selected, approve, refetch]);

  const handleReject = async () => {
    if (!selected || !rejectReason.trim()) return;

    try {
      await reject.mutateAsync({
        id: selected._id,
        reason: rejectReason,
      });
      toast.success("Withdrawal rejected successfully");
      setSelected(null);
      setRejectReason("");
      refetch();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to reject withdrawal"));
    }
  };

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
            <ArrowUpCircle size={18} className="sm:h-7 sm:w-7 text-[var(--primary)]" />
            Withdrawals Management
          </h1>
          <p className="text-[10px] sm:text-base text-[var(--text-muted)] mt-1">
            Review and manage withdrawal requests
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ReportExportButtons
            onCsv={handleExportCsv}
            onPdf={handleExportPdf}
            loading={reportLoading}
          />
          <Link
            href="/admin/users/users-funds/create?type=Withdrawal"
            className="inline-flex w-fit self-start shrink-0 items-center justify-center rounded-lg px-2.5 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-sm font-semibold text-white whitespace-nowrap bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
          >
            <HandCoins size={14} />
            Withdrawal
          </Link>
        </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="card-elevated shadow-none space-y-4 !p-4 sm:!p-6">
        <div className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
              <input
                type="text"
                placeholder="Search by user / account / plan / withdrawal ID"
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
                  setMethod(event.target.value as WithdrawalMethod | "");
                  setPage(1);
                }}
                className="input w-full appearance-none !pl-10 !pr-9"
              >
                <option value="">All methods</option>
                <option value="UPI">UPI</option>
                <option value="BANK">BANK</option>
                <option value="INDIAN_BANK">INDIAN BANK</option>
                <option value="NETELLER">NETELLER</option>
                <option value="SKRILL">SKRILL</option>
                <option value="USDT">USDT</option>
                <option value="BITCOIN">BITCOIN</option>
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
                  setSortBy(event.target.value as WithdrawalSortBy);
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

        <div className="flex items-center flex-nowrap justify-between gap-1 w-full rounded-full bg-[var(--hover-bg)] p-0.5 overflow-x-auto sm:flex-wrap sm:justify-start sm:gap-2 sm:p-1.5 sm:overflow-visible">
          <button
            onClick={() => handleStatusFilter(undefined)}
            aria-label="All withdrawals"
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
            aria-label="Pending withdrawals"
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
            onClick={() => handleStatusFilter("COMPLETED")}
            aria-label="Approved withdrawals"
            className={`whitespace-nowrap px-2.5 py-1 text-[10px] font-semibold rounded-lg transition-all sm:px-4 sm:py-2 sm:text-sm ${
              status === "COMPLETED" || status === "APPROVED"
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
            aria-label="Rejected withdrawals"
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

      {/* TABLE */}
      <div className="card-elevated shadow-none">
        <div className="flex flex-col gap-1 px-1 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] sm:text-xs text-[var(--text-muted)]">
            {isLoading
              ? "Loading..."
              : `${data?.total ?? withdrawals.length} result${(data?.total ?? withdrawals.length) === 1 ? "" : "s"}`}
          </p>
          {isFetching && !isLoading && (
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
                    User
                  </span>
                </th>
                <th className="font-semibold text-[var(--foreground)]">
                  <span className="inline-flex items-center gap-1.5">
                    <Wallet size={13} />
                    Account
                  </span>
                </th>
                <th className="font-semibold text-[var(--foreground)]">Balance</th>
                <th className="font-semibold text-[var(--foreground)]">Hold</th>
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
                <th className="font-semibold text-[var(--foreground)]">Action</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-[var(--text-muted)]">
                        <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                        Loading withdrawals...
                      </div>
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <div className="text-[var(--text-muted)] space-y-2">
                        <AlertCircle className="w-12 h-12 mx-auto opacity-60 text-orange-500" />
                        <p className="font-medium text-[var(--foreground)]">
                          {getErrorMessage(error, "Unable to load withdrawals")}
                        </p>
                        <button
                          type="button"
                          onClick={() => refetch()}
                          className="btn btn-ghost mx-auto"
                        >
                          Try again
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <div className="text-[var(--text-muted)] space-y-2">
                        <Search className="w-12 h-12 mx-auto opacity-50" />
                        <p>{emptyStateMessage}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  withdrawals.map((w: WithdrawalRow, index: number) => {
                    const hasUser = Boolean(getUserId(w));

                    return (
                      <motion.tr
                        key={w._id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`group transition-colors duration-200 ${
                          hasUser ? "cursor-pointer hover:!bg-[var(--hover-bg)]" : ""
                        }`}
                        onClick={() => hasUser && goToUserView(w)}
                      >
                        <td>
                          <div className="font-medium text-[var(--foreground)] group-hover:text-[var(--primary)]">
                            {w.user?.name ?? "--"}
                          </div>
                          <div className="text-[10px] sm:text-xs text-[var(--text-muted)]">
                            {w.user?.email ?? "--"}
                          </div>
                        </td>

                        <td>
                          <div className="font-mono text-[11px] sm:text-sm bg-[var(--input-bg)] px-2 py-1 rounded">
                            {w.account?.account_number ?? "--"}
                          </div>
                          <div className="text-[10px] sm:text-xs text-[var(--text-muted)] mt-1 capitalize">
                            {w.account?.plan_name ?? w.account?.account_type ?? "--"}
                          </div>
                        </td>

                        <td>
                          <div className="font-semibold text-green-600">
                            ${w.account?.balance?.toLocaleString() ?? "--"}
                          </div>
                        </td>

                        <td>
                          <div className="font-semibold text-amber-600">
                            ${w.account?.hold_balance?.toLocaleString() ?? "--"}
                          </div>
                        </td>

                        <td>
                          <div className="font-bold bg-gradient-to-r from-orange-500 to-amber-600 bg-clip-text text-transparent">
                            ${w.amount?.toLocaleString() ?? "--"}
                          </div>
                        </td>

                        <td>
                          <div className="inline-flex items-center gap-2">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--input-bg)] text-[var(--text-muted)]">
                              <Clock3 size={14} />
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[var(--foreground)] leading-5">
                                {formatDate(w.createdAt)}
                              </p>
                              <p className="text-xs text-[var(--text-muted)] leading-4">
                                {formatTime(w.createdAt)}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="pill method-status-pill bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/50">
                            <span className="inline-flex items-center gap-1.5">
                              {getMethodIcon(w.method)}
                              {w.method ?? "--"}
                            </span>
                          </span>
                        </td>

                        <td>
                          <span
                            className={`pill method-status-pill !rounded-md font-semibold ${
                              w.status === "COMPLETED" || w.status === "APPROVED"
                                ? "pill-success"
                                : w.status === "REJECTED" || w.status === "FAILED"
                                  ? "pill-danger"
                                  : w.status === "PROCESSING"
                                    ? "pill-muted"
                                    : "pill-accent"
                            }`}
                          >
                            {w.status ?? "--"}
                          </span>
                        </td>

                        <td className="text-left">
                          <div className="flex items-center justify-start gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelected(w);
                              }}
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
        onPageChange={(newPage) => setPage(newPage)}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
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
              onClick={(e) => e.stopPropagation()}
            >
              <div className="max-h-[calc(100vh-1.5rem)] sm:max-h-[88vh] overflow-y-auto">
                <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--card-border)] bg-[var(--card-bg)]/95 backdrop-blur">
                  <h3 className="inline-flex items-center gap-2 text-base sm:text-xl font-bold text-[var(--foreground)]">
                    <ArrowUpCircle size={18} />
                    Withdrawal Details
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
                      <p className="text-xs text-[var(--text-muted)] capitalize">{selected.account?.plan_name ?? selected.account?.account_type ?? "--"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Amount</p>
                      <p className="text-base font-bold text-orange-600">${selected.amount?.toLocaleString() ?? "--"}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Balance / Hold</p>
                      <p className="text-sm font-semibold text-emerald-600">
                        ${selected.account?.balance?.toLocaleString() ?? "--"}
                      </p>
                      <p className="text-xs text-amber-600">
                        Hold: ${selected.account?.hold_balance?.toLocaleString() ?? "--"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Method / Status</p>
                      <span className="pill method-status-pill mt-1 inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/50">
                        {getMethodIcon(selected.method)}
                        {selected.method ?? "--"}
                      </span>
                      <span
                        className={`pill method-status-pill !rounded-md mt-1 inline-flex items-center font-semibold ${
                          selected.status === "COMPLETED" || selected.status === "APPROVED"
                            ? "pill-success"
                            : selected.status === "REJECTED" || selected.status === "FAILED"
                              ? "pill-danger"
                              : selected.status === "PROCESSING"
                                ? "pill-muted"
                                : "pill-accent"
                        }`}
                      >
                        {selected.status ?? "--"}
                      </span>
                    </div>
                  </div>

                  {(selected.payout?.upi_id ||
                    selected.payout?.bank_name ||
                    selected.payout?.account_holder_name ||
                    selected.payout?.account_number ||
                    selected.payout?.ifsc ||
                    selected.payout?.swift_code ||
                    selected.payout?.email ||
                    selected.payout?.crypto_network ||
                    selected.payout?.crypto_address ||
                    selected.payout?.note) && (
                    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] p-3 sm:p-4 space-y-2">
                      <p className="text-xs font-medium text-[var(--text-muted)]">Payout Details</p>
                      {selected.payout?.converted_amount !== null &&
                        selected.payout?.converted_amount !== undefined && (
                          <p className="text-sm">
                            <span className="font-semibold">Payout Amount:</span>{" "}
                            {formatConverted(selected.payout)}
                          </p>
                        )}
                      {selected.payout?.upi_id && (
                        <p className="text-sm"><span className="font-semibold">UPI:</span> {selected.payout.upi_id}</p>
                      )}
                      {selected.payout?.email && (
                        <p className="text-sm"><span className="font-semibold">Email:</span> {selected.payout.email}</p>
                      )}
                      {selected.payout?.account_holder_name && (
                        <p className="text-sm"><span className="font-semibold">Holder:</span> {selected.payout.account_holder_name}</p>
                      )}
                      {selected.payout?.bank_name && (
                        <p className="text-sm"><span className="font-semibold">Bank:</span> {selected.payout.bank_name}</p>
                      )}
                      {selected.payout?.account_number && (
                        <p className="text-sm"><span className="font-semibold">Account No:</span> {selected.payout.account_number}</p>
                      )}
                      {selected.payout?.ifsc && (
                        <p className="text-sm"><span className="font-semibold">IFSC:</span> {selected.payout.ifsc}</p>
                      )}
                      {selected.payout?.swift_code && (
                        <p className="text-sm"><span className="font-semibold">SWIFT:</span> {selected.payout.swift_code}</p>
                      )}
                      {selected.payout?.crypto_network && (
                        <p className="text-sm"><span className="font-semibold">Network:</span> {selected.payout.crypto_network}</p>
                      )}
                      {selected.payout?.crypto_address && (
                        <p className="text-sm break-all"><span className="font-semibold">Wallet:</span> {selected.payout.crypto_address}</p>
                      )}
                      {selected.payout?.note && (
                        <p className="text-sm"><span className="font-semibold">Note:</span> {selected.payout.note}</p>
                      )}
                    </div>
                  )}

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
                            Approve Withdrawal
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
                            Reject Withdrawal
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
