
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  ArrowLeftRight,
  ChevronLeft,
  ChevronDown,
  Download,
  DollarSign,
  Eye,
  EyeOff,
  FlaskConical,
  Globe,
  KeyRound,
  Copy,
  Percent,
  MapPin,
  Mail,
  Pencil,
  Phone,
  Rocket,
  ShieldCheck,
  User,
  Users,
  Hash,
  Building2,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Modal from "@/app/admin/components/ui/Modal";
import GlobalLoader from "@/app/admin/components/ui/GlobalLoader";
import { Toast } from "@/app/admin/components/ui/Toast";
import Pagination from "@/app/admin/components/ui/pagination";
import DragScroll from "@/app/admin/components/ui/DragScroll";
import { useAdminUser } from "@/hooks/useAdminUser";
import { useAdminUserAccounts } from "@/hooks/useAdminUserAccounts";
import { useAdminUserTransactions } from "@/hooks/useAdminUserTransactions";
import { useTradeAdminClosedTrades } from "@/hooks/useTradeAdminClosedTrades";
import { useTradeAdminPendingOpenOrders } from "@/hooks/useTradeAdminPendingOpenOrders";
import { useLiveQuotesBySymbols } from "@/hooks/useLiveQuotesBySymbols";
import { getAccessTokenFromCookie } from "@/services/marketSocket.service";
import { useUpdateAdminUser } from "@/hooks/useUpdateAdminUser";
import { useChangeAdminUserPassword } from "@/hooks/useChangeAdminUserPassword";
import { useUpdateAdminUserAccount } from "@/hooks/useUpdateAdminUserAccount";
import { useAdminInternalTransfer } from "@/hooks/useAdminInternalTransfer";
import { useDeleteAdminUser } from "@/hooks/useDeleteAdminUser";
import { useDeleteAdminUserTradeAccount } from "@/hooks/useDeleteAdminUserTradeAccount";
import { useBonusCredit, useTradableFundCredit } from "@/hooks/bonus/useBonusCredit";
import {
  useResetAccountTradePassword,
  useResetAccountWatchPassword,
} from "@/hooks/useResetAccountPasswords";
import {
  useTradeAdminModifyPendingOrder,
  useTradeAdminCancelPendingOrder,
  useTradeAdminModifyPosition,
  useTradeAdminClosePosition,
  useTradeAdminModifyClosedTrade,
} from "@/hooks/useTradeAdminOrderActions";
import type { AdminAccount, AdminAccountUpdatePayload } from "@/types/account";
import type { AdminUserUpdatePayload } from "@/types/user";
import type { AdminTransaction } from "@/types/transaction";
import type {
  TradeAdminClosedTrade,
  TradeAdminPendingOrder,
} from "@/services/tradeAdmin.service";
import { displayTicket } from "@/utils/displayIds";
import TradeEditModal from "@/app/admin/components/trades/TradeEditModal";
import PresenceBadge from "@/app/admin/components/ui/PresenceBadge";

const kycStyles: Record<string, string> = {
  VERIFIED: "border-emerald-500/40 bg-emerald-500/5 text-emerald-600",
  PENDING: "border-amber-500/40 bg-amber-500/5 text-amber-600",
  NOT_STARTED: "border-slate-400/40 bg-slate-400/5 text-slate-600",
  REJECTED: "border-red-500/40 bg-red-500/5 text-red-600",
};

const txStatusStyles: Record<string, string> = {
  SUCCESS: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  PENDING: "border-amber-500/40 bg-amber-500/10 text-amber-700",
  FAILED: "border-rose-500/40 bg-rose-500/10 text-rose-700",
  REJECTED: "border-slate-500/40 bg-slate-500/10 text-slate-700",
};

const txTypeStyles: Record<string, string> = {
  DEPOSIT: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  WITHDRAW: "border-rose-500/40 bg-rose-500/10 text-rose-700",
  TRADE_PROFIT: "border-sky-500/40 bg-sky-500/10 text-sky-700",
  TRADE_LOSS: "border-amber-500/40 bg-amber-500/10 text-amber-700",
  BONUS: "border-purple-500/40 bg-purple-500/10 text-purple-700",
  BONUS_MANUAL: "border-purple-500/40 bg-purple-500/10 text-purple-700",
  BONUS_CREDIT_IN: "border-purple-500/40 bg-purple-500/10 text-purple-700",
  BONUS_CREDIT_OUT: "border-purple-500/40 bg-purple-500/10 text-purple-700",
  ADJUSTMENT: "border-slate-500/40 bg-slate-500/10 text-slate-700",
};

const getAccountTypeMeta = (accountType?: string) => {
  const normalizedType = (accountType ?? "").toLowerCase();

  if (normalizedType === "demo") {
    return {
      label: "DEMO",
      icon: FlaskConical,
      className: "border-slate-500/40 bg-slate-500/10 text-slate-700",
      cardClassName: "border-slate-400/60 bg-slate-500/[0.04]",
    };
  }

  if (normalizedType === "live") {
    return {
      label: "LIVE",
      icon: Rocket,
      className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
      cardClassName: "border-emerald-500/30 bg-emerald-500/[0.04]",
    };
  }

  if (normalizedType) {
    return {
      label: normalizedType.toUpperCase(),
      icon: Globe,
      className: "border-sky-500/40 bg-sky-500/10 text-sky-700",
      cardClassName: "border-sky-400/40 bg-sky-500/[0.04]",
    };
  }

  return {
    label: "--",
    icon: Hash,
    className: "border-[var(--card-border)] bg-[var(--chip-bg)] text-[var(--text-muted)]",
    cardClassName: "border-[var(--card-border)] bg-[var(--input-bg)]",
  };
};

type AccountEditForm = {
  leverage: string;
  spread_enabled: "true" | "false";
  spread_pips: string;
  commission_per_lot: string;
  swap_enabled: "true" | "false";
  swap_charge: string;
  status: "active" | "disabled";
  bonus_percent_override: string;
};

const buildAccountEditForm = (account: AdminAccount): AccountEditForm => ({
  leverage:
    account.leverage === null || account.leverage === undefined || account.leverage === 0
      ? ""
      : String(account.leverage),
  spread_enabled: account.spread_enabled === false ? "false" : "true",
  spread_pips:
    account.spread_pips === null || account.spread_pips === undefined || account.spread_pips === 0
      ? ""
      : String(account.spread_pips),
  commission_per_lot:
    account.commission_per_lot === null ||
    account.commission_per_lot === undefined ||
    account.commission_per_lot === 0
      ? ""
      : String(account.commission_per_lot),
  swap_enabled: account.swap_enabled === false ? "false" : "true",
  swap_charge:
    account.swap_charge === null || account.swap_charge === undefined || account.swap_charge === 0
      ? ""
      : String(account.swap_charge),
  status:
    (account.status ?? "active").toLowerCase() === "disabled"
      ? "disabled"
      : "active",
  bonus_percent_override:
    account.bonus_percent_override === null ||
    account.bonus_percent_override === undefined ||
    account.bonus_percent_override === 0
      ? ""
      : String(account.bonus_percent_override),
});

type LivePositionSnapshot = {
  positionId: string;
  ticket?: number | null;
  accountId: string;
  symbol?: string;
  side?: string;
  volume?: number;
  openPrice?: number;
  currentPrice?: number;
  floatingPnL?: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
  openTime?: number;
  updatedAt: string;
};

function normalizeWebSocketUrl(url: string) {
  if (url.startsWith("ws://") || url.startsWith("wss://")) return url;
  if (url.startsWith("http://")) return `ws://${url.slice("http://".length)}`;
  if (url.startsWith("https://")) return `wss://${url.slice("https://".length)}`;
  if (url.startsWith("//")) {
    const protocol =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? "wss:"
        : "ws:";
    return `${protocol}${url}`;
  }
  return url;
}

function resolveAccountSocketUrl() {
  const direct = process.env.NEXT_PUBLIC_ACCOUNT_SOCKET_URL;
  if (direct) return normalizeWebSocketUrl(direct);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return "";
  const trimmed = apiUrl.replace(/\/$/, "");
  const derived = /\/api\/v\d+$/i.test(trimmed)
    ? trimmed.replace(/\/api\/v\d+$/i, "/ws/account")
    : `${trimmed}/ws/account`;
  return normalizeWebSocketUrl(derived);
}

function parseSocketMessages(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }
}

const FieldControl = ({
  icon: Icon,
  children,
  trailing,
  className = "",
}: {
  icon: LucideIcon;
  children: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) => (
  <div
    className={`flex items-center gap-2 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 ${className}`}
  >
    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--primary)]/10 text-[var(--primary)]">
      <Icon size={16} />
    </span>
    <div className="min-w-0 flex-1">{children}</div>
    {trailing ? (
      <span className="ml-2 text-[var(--text-muted)]">{trailing}</span>
    ) : null}
  </div>
);

type SelectOption = {
  value: string;
  label: string;
  dotClass?: string;
};

function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  toneClass = "border-[var(--card-border)] bg-[var(--card-bg)]",
  buttonClassName = "",
  menuClassName = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  toneClass?: string;
  buttonClassName?: string;
  menuClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const selected = options.find((opt) => opt.value === value);

  useEffect(() => {
    const onClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (!ref.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick, true);
    document.addEventListener("touchstart", onClick, true);
    return () => {
      document.removeEventListener("mousedown", onClick, true);
      document.removeEventListener("touchstart", onClick, true);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className={`mt-1 h-10 w-full rounded-xl border px-3 py-2 text-sm font-semibold text-[var(--text-main)] ${toneClass} bg-[var(--card-bg)] ${buttonClassName} flex items-center justify-between transition focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 ${
          open ? "border-[var(--primary)]/40 bg-[var(--primary)]/5" : ""
        }`}
      >
        <span className="inline-flex min-w-0 flex-1 items-center gap-2">
          {selected?.dotClass && (
            <span className={`h-2.5 w-2.5 rounded-full ${selected.dotClass}`} />
          )}
          <span className="truncate">{selected?.label ?? placeholder}</span>
        </span>
        <ChevronDown
          size={16}
          className={`text-[var(--text-muted)] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute z-40 mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden ${menuClassName}`}
        >
          <div className="max-h-64 overflow-auto">
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <button
                  key={opt.value || opt.label}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition hover:bg-[var(--hover-bg)] ${
                    active
                      ? "bg-[var(--primary)]/10 text-[var(--primary)] font-semibold"
                      : ""
                  }`}
                >
                  {opt.dotClass && (
                    <span className={`h-2.5 w-2.5 rounded-full ${opt.dotClass}`} />
                  )}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function UserViewPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const rawId = params?.id as string | string[] | undefined;
  const userId = Array.isArray(rawId) ? rawId[0] : rawId;

  const userQuery = useAdminUser(userId);
  const updateMutation = useUpdateAdminUser();
  const changePasswordMutation = useChangeAdminUserPassword();
  const updateAccountMutation = useUpdateAdminUserAccount();
  const internalTransferMutation = useAdminInternalTransfer();
  const bonusCreditMutation = useBonusCredit();
  const tradableFundCreditMutation = useTradableFundCredit();
  const deleteUserMutation = useDeleteAdminUser();
  const deleteTradeAccountMutation = useDeleteAdminUserTradeAccount();
  const resetTradePasswordMutation = useResetAccountTradePassword();
  const resetWatchPasswordMutation = useResetAccountWatchPassword();
  const modifyPendingMutation = useTradeAdminModifyPendingOrder();
  const cancelPendingMutation = useTradeAdminCancelPendingOrder();
  const modifyPositionMutation = useTradeAdminModifyPosition();
  const closePositionMutation = useTradeAdminClosePosition();
  const modifyClosedMutation = useTradeAdminModifyClosedTrade();

  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [accountViewOpen, setAccountViewOpen] = useState(false);
  const [accountEditOpen, setAccountEditOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [accountFormError, setAccountFormError] = useState("");
  const [accountForm, setAccountForm] = useState<AccountEditForm>({
    leverage: "",
    spread_enabled: "true",
    spread_pips: "",
    commission_per_lot: "",
    swap_enabled: "true",
    swap_charge: "",
    status: "active",
    bonus_percent_override: "",
  });
  const [toast, setToast] = useState("");
  const [touched, setTouched] = useState<Partial<Record<keyof AdminUserUpdatePayload, boolean>>>({});
  const [activeTab, setActiveTab] = useState<
    "Fund History" | "Accounts" | "Active Trades" | "Closed Trades" | "Pending Trades"
  >(() => {
    const normalized = (searchParams.get("tab") ?? "").toLowerCase();
    if (
      normalized === "active-trades" ||
      normalized === "active_trades" ||
      normalized === "active" ||
      normalized === "positions"
    ) {
      return "Active Trades";
    }
    return "Fund History";
  });
  const [positionActionOpen, setPositionActionOpen] = useState(false);
  const [positionAction, setPositionAction] = useState<LivePositionSnapshot | null>(null);
  const [positionActionError, setPositionActionError] = useState("");
  const [pendingActionOpen, setPendingActionOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<TradeAdminPendingOrder | null>(
    null
  );
  const [pendingActionError, setPendingActionError] = useState("");
  const [closedEditOpen, setClosedEditOpen] = useState(false);
  const [closedEditTrade, setClosedEditTrade] =
    useState<TradeAdminClosedTrade | null>(null);
  const [closedEditError, setClosedEditError] = useState("");
  const [liveStatus, setLiveStatus] = useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle");
  const [livePositions, setLivePositions] = useState<LivePositionSnapshot[]>([]);
  const [liveAccountFilter, setLiveAccountFilter] = useState("");
  const livePositionsRef = useRef<Map<string, LivePositionSnapshot>>(new Map());
  const closedPositionsRef = useRef<Map<string, number>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);

  const handleTabChange = (nextTab: typeof activeTab) => {
    setActiveTab(nextTab);
    if (nextTab === "Active Trades") {
      setLiveStatus((prev) => (prev === "connected" ? prev : "connecting"));
    } else {
      setLiveStatus("idle");
    }
  };

  const [closedPage, setClosedPage] = useState(1);
  const [closedLimit, setClosedLimit] = useState(20);
  const [closedAccountFilter, setClosedAccountFilter] = useState("");
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingLimit, setPendingLimit] = useState(20);
  const [pendingAccountFilter, setPendingAccountFilter] = useState("");
  const [txPage, setTxPage] = useState(1);
  const [txLimit, setTxLimit] = useState(20);
  const [txAccountId, setTxAccountId] = useState("");
  const [txType, setTxType] = useState("");
  const [txStatus, setTxStatus] = useState("");
  const [txReferenceId, setTxReferenceId] = useState("");
  const [txSortBy, setTxSortBy] = useState("createdAt");
  const [txSortDir, setTxSortDir] = useState("desc");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [draftFromDate, setDraftFromDate] = useState<string>("");
  const [draftToDate, setDraftToDate] = useState<string>("");
  const [form, setForm] = useState<AdminUserUpdatePayload>({
    name: "",
    phone: "",
    isMailVerified: false,
    kycStatus: "NOT_STARTED",
    date_of_birth: "",
    gender: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetPasswordType, setResetPasswordType] = useState<"trade" | "watch">(
    "trade"
  );
  const [resetPasswordAccount, setResetPasswordAccount] =
    useState<AdminAccount | null>(null);
  const [accountPassword, setAccountPassword] = useState("");
  const [accountPasswordConfirm, setAccountPasswordConfirm] = useState("");
  const [showAccountPassword, setShowAccountPassword] = useState(false);
  const [showAccountPasswordConfirm, setShowAccountPasswordConfirm] =
    useState(false);
  const [accountPasswordError, setAccountPasswordError] = useState("");
  const [internalTransferOpen, setInternalTransferOpen] = useState(false);
  const [bonusModalOpen, setBonusModalOpen] = useState(false);
  const [bonusAccountId, setBonusAccountId] = useState("");
  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusError, setBonusError] = useState("");
  const [tradableFundModalOpen, setTradableFundModalOpen] = useState(false);
  const [tradableFundAccountId, setTradableFundAccountId] = useState("");
  const [tradableFundAmount, setTradableFundAmount] = useState("");
  const [tradableFundError, setTradableFundError] = useState("");
  const [internalTransferFrom, setInternalTransferFrom] = useState("");
  const [internalTransferTo, setInternalTransferTo] = useState("");
  const [internalTransferAmount, setInternalTransferAmount] = useState("");
  const [internalTransferError, setInternalTransferError] = useState("");
  const [deleteActionOpen, setDeleteActionOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<"whole" | "trade">("whole");
  const [deleteTradeAccountId, setDeleteTradeAccountId] = useState("");
  const [deleteActionError, setDeleteActionError] = useState("");

  const profileFromParams = useMemo(() => {
    const name = searchParams.get("name") ?? "";
    const email = searchParams.get("email") ?? "";
    const phone = searchParams.get("phone") ?? "";
    const kycStatus = searchParams.get("kycStatus") ?? "NOT_STARTED";
    const isMailVerified = searchParams.get("isMailVerified") === "true";

    return { name, email, phone, kycStatus, isMailVerified };
  }, [searchParams]);

  const profile = userQuery.data ?? profileFromParams;
  const profileSnapshot = {
    name: profile.name ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    isMailVerified: Boolean(profile.isMailVerified),
    kycStatus: profile.kycStatus ?? "NOT_STARTED",
  };

  const accountsQuery = useAdminUserAccounts({
    userId,
    page: 1,
    limit: 50,
  });
  const accountList = useMemo(
    () => accountsQuery.data?.data ?? [],
    [accountsQuery.data?.data]
  );
  const accountNumberById = useMemo(() => {
    const map = new Map<string, string>();
    for (const account of accountList) {
      const id = String(account._id ?? "").trim();
      if (!id) continue;
      map.set(id, String(account.account_number || id));
    }
    return map;
  }, [accountList]);
  const resolveAccountLabel = (accountId?: string | null) => {
    const id = String(accountId ?? "").trim();
    if (!id) return "--";
    return accountNumberById.get(id) || id;
  };
  const selectedAccount = useMemo(() => {
    if (!selectedAccountId) return null;
    return accountList.find((account) => account._id === selectedAccountId) ?? null;
  }, [accountList, selectedAccountId]);
  const accountIds = useMemo(
    () => accountList.map((account) => account._id).filter(Boolean),
    [accountList]
  );
  const accountIdSet = useMemo(() => new Set(accountIds), [accountIds]);
  const accountSocketUrl = resolveAccountSocketUrl();
  const effectiveLiveStatus =
    activeTab !== "Active Trades"
      ? "idle"
      : !accountIds.length
      ? "idle"
      : !accountSocketUrl
      ? "error"
      : liveStatus;

  const closedTradesQuery = useTradeAdminClosedTrades({
    page: closedPage,
    limit: closedLimit,
    userId: userId ?? "0",
    accountId: closedAccountFilter || undefined,
    sortBy: "closeTime",
    sortDir: "desc",
  });

  const closedTrades = useMemo(
    () => closedTradesQuery.data?.data ?? [],
    [closedTradesQuery.data?.data]
  );
  const closedPagination = closedTradesQuery.data?.pagination;
  const closedTotalPages = closedPagination?.totalPages ?? 1;
  const closedTotal = closedPagination?.total ?? closedTrades.length;
  const closedSummary = useMemo(() => {
    return closedTrades.reduce(
      (acc, trade) => {
        acc.pageTrades += 1;
        acc.totalVolume += trade.volume ?? 0;
        acc.totalPnl += trade.realizedPnL ?? 0;
        if ((trade.realizedPnL ?? 0) > 0) acc.wins += 1;
        return acc;
      },
      { pageTrades: 0, totalVolume: 0, totalPnl: 0, wins: 0 }
    );
  }, [closedTrades]);

  const pendingOpenQuery = useTradeAdminPendingOpenOrders({
    page: pendingPage,
    limit: pendingLimit,
    userId: userId ?? "0",
    accountId: pendingAccountFilter || undefined,
    sortBy: "createdAt",
    sortDir: "desc",
  });

  const pendingOpenTrades = useMemo(
    () => pendingOpenQuery.data?.data ?? [],
    [pendingOpenQuery.data?.data]
  );
  const pendingSymbols = useMemo(
    () =>
      Array.from(
        new Set(
          pendingOpenTrades
            .map((order) => (order.symbol ?? "").toUpperCase())
            .filter(Boolean)
        )
      ),
    [pendingOpenTrades]
  );
  const marketToken = getAccessTokenFromCookie();
  const pendingQuotes = useLiveQuotesBySymbols(marketToken, pendingSymbols);
  const pendingPagination = pendingOpenQuery.data?.pagination;
  const pendingTotalPages = pendingPagination?.totalPages ?? 1;
  const pendingTotal = pendingPagination?.total ?? pendingOpenTrades.length;
  const pendingSummary = useMemo(() => {
    return pendingOpenTrades.reduce(
      (acc, order) => {
        acc.pageOrders += 1;
        const side = (order.side ?? "").toUpperCase();
        if (side === "BUY") acc.buy += 1;
        if (side === "SELL") acc.sell += 1;
        acc.totalVolume += order.volume ?? 0;
        return acc;
      },
      { pageOrders: 0, buy: 0, sell: 0, totalVolume: 0 }
    );
  }, [pendingOpenTrades]);

	  const accountOptions = useMemo<SelectOption[]>(() => {
	    if (!accountList.length) {
      return [
        {
          value: "",
          label: accountsQuery.isLoading ? "Loading accounts..." : "All Accounts",
          dotClass: "bg-slate-300",
        },
      ];
    }

    return [
      { value: "", label: "All Accounts", dotClass: "bg-slate-300" },
	      ...accountList.map((account) => {
        const typeLabel =
          account.account_type?.toLowerCase() === "demo" ? "Demo" : "Live";
        const planLabel = account.plan_name ? ` • ${account.plan_name}` : "";
        return {
          value: account._id,
          label: `${account.account_number ?? account._id} • ${typeLabel}${planLabel}`,
          dotClass:
            account.account_type?.toLowerCase() === "demo"
              ? "bg-slate-500"
              : "bg-emerald-500",
        };
      }),
    ];
	  }, [accountList, accountsQuery.isLoading]);

  const internalTransferAccountOptions = useMemo<SelectOption[]>(() => {
    return accountList
      .filter((account) => (account.account_type ?? "").toLowerCase() !== "demo")
      .map((account) => {
      const typeLabel =
        account.account_type?.toLowerCase() === "demo" ? "Demo" : "Live";
      const planLabel = account.plan_name ? ` • ${account.plan_name}` : "";
      return {
        value: account._id,
        label: `${account.account_number ?? account._id} • ${typeLabel}${planLabel}`,
        dotClass:
          account.account_type?.toLowerCase() === "demo"
            ? "bg-slate-500"
            : "bg-emerald-500",
      };
    });
  }, [accountList]);

  const internalTransferToOptions = useMemo<SelectOption[]>(() => {
    return internalTransferAccountOptions.filter(
      (opt) => opt.value && opt.value !== internalTransferFrom
    );
  }, [internalTransferAccountOptions, internalTransferFrom]);

	  const nonDemoAccounts = useMemo(
	    () =>
	      accountList.filter(
	        (account) => (account.account_type ?? "").toLowerCase() !== "demo"
	      ),
	    [accountList]
	  );

    const internalFromAccount = useMemo(
      () =>
        nonDemoAccounts.find((account) => account._id === internalTransferFrom) ??
        null,
      [nonDemoAccounts, internalTransferFrom]
    );

    const internalFromBalance = internalFromAccount?.balance ?? 0;
    const internalFromHold = internalFromAccount?.hold_balance ?? 0;
    const internalFromEquity = internalFromAccount?.equity ?? internalFromBalance;
    const internalAvailableBalance = Math.max(0, internalFromBalance - internalFromHold);
    const internalMaxTransferable = Math.max(
      0,
      Math.min(internalAvailableBalance, internalFromEquity)
    );
    const internalMaxTransferableRounded =
      Math.round(internalMaxTransferable * 100) / 100;

	  const accountSummary = useMemo(
	    () =>
	      nonDemoAccounts.reduce(
	        (acc, account) => ({
	          totalBalance: acc.totalBalance + (account.balance ?? 0),
            totalBonusBalance: acc.totalBonusBalance + (account.bonus_balance ?? 0),
	          totalHoldBalance: acc.totalHoldBalance + (account.hold_balance ?? 0),
            totalNonWithdrawableBalance:
              acc.totalNonWithdrawableBalance +
              (account.non_withdrawable_balance ?? 0),
	          totalEquity: acc.totalEquity + (account.equity ?? 0),
            totalUsableBalance:
              acc.totalUsableBalance +
              (account.total_balance ??
                (account.balance ?? 0) + (account.bonus_balance ?? 0)),
	        }),
	        {
            totalBalance: 0,
            totalBonusBalance: 0,
            totalHoldBalance: 0,
            totalNonWithdrawableBalance: 0,
            totalEquity: 0,
            totalUsableBalance: 0,
          }
	      ),
	    [nonDemoAccounts]
	  );

	  const transactionsQuery = useAdminUserTransactions({
    userId,
    page: txPage,
    limit: txLimit,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    account: txAccountId || undefined,
    type: txType || undefined,
    status: txStatus || undefined,
    referenceId: txReferenceId || undefined,
    sortBy: txSortBy || undefined,
    sortDir: txSortDir || undefined,
  });

  const txData = transactionsQuery.data?.data ?? [];
  const txPagination = transactionsQuery.data?.pagination;
  const txSummary = transactionsQuery.data?.summary;
  const txTotalPages = txPagination?.totalPages ?? 1;
  const txTotal = txPagination?.total ?? txData.length;

  const formatAmount = (value?: number) => {
    if (value === undefined || value === null) return "--";
    return value.toLocaleString("en-IN");
  };

  const getAmountClass = (
    value?: number,
    positiveClass = "text-emerald-600"
  ) => {
    if (value === undefined || value === null || Number.isNaN(value))
      return "text-[var(--text-muted)]";
    if (value < 0) return "text-rose-600";
    if (value === 0) return "text-slate-600";
    return positiveClass;
  };

  const formatDateTime = (value?: string) => {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatLiveNumber = (value?: number, digits = 2) => {
    if (value === undefined || value === null || Number.isNaN(value)) return "--";
    return value.toLocaleString("en-IN", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  };

  const formatLivePrice = (value?: number) => {
    if (value === undefined || value === null || Number.isNaN(value)) return "--";
    const digits = Math.abs(value) >= 100 ? 2 : 5;
    return formatLiveNumber(value, digits);
  };

  const parseNullableNumber = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const num = Number(trimmed);
    if (!Number.isFinite(num)) return null;
    return num;
  };

  const extractMessage = (value: unknown): string | undefined => {
    if (typeof value !== "object" || value === null) return undefined;

    const record = value as Record<string, unknown>;
    const direct = record.message;
    if (typeof direct === "string" && direct.trim()) return direct;

    const nestedData = record.data;
    if (typeof nestedData === "object" && nestedData !== null) {
      const nestedMessage = (nestedData as Record<string, unknown>).message;
      if (typeof nestedMessage === "string" && nestedMessage.trim()) {
        return nestedMessage;
      }
    }

    const response = record.response;
    if (typeof response === "object" && response !== null) {
      const responseData = (response as Record<string, unknown>).data;
      if (typeof responseData === "object" && responseData !== null) {
        const responseMessage = (responseData as Record<string, unknown>).message;
        if (typeof responseMessage === "string" && responseMessage.trim()) {
          return responseMessage;
        }
      }
    }

    return undefined;
  };

  const getLiveStatusClass = (status: string) => {
    if (status === "connected")
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700";
    if (status === "connecting")
      return "border-amber-500/40 bg-amber-500/10 text-amber-700";
    if (status === "error")
      return "border-rose-500/40 bg-rose-500/10 text-rose-700";
    return "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-muted)]";
  };

  const getSideClass = (side?: string) => {
    const normalized = (side ?? "").toUpperCase();
    if (normalized === "BUY")
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700";
    if (normalized === "SELL")
      return "border-rose-500/40 bg-rose-500/10 text-rose-700";
    return "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-muted)]";
  };

  const getOrderTypeClass = (orderType?: string) => {
    const normalized = (orderType ?? "").toUpperCase();
    if (normalized === "MARKET")
      return "border-violet-500/40 bg-violet-500/10 text-violet-700";
    if (normalized.includes("LIMIT"))
      return "border-sky-500/40 bg-sky-500/10 text-sky-700";
    if (normalized.includes("STOP"))
      return "border-amber-500/40 bg-amber-500/10 text-amber-700";
    return "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-muted)]";
  };

  const getPnlClass = (value?: number) => {
    if (value === undefined || value === null || Number.isNaN(value))
      return "text-[var(--text-muted)]";
    if (value > 0) return "text-emerald-600";
    if (value < 0) return "text-rose-600";
    return "text-[var(--text-muted)]";
  };

  const getPendingLivePrice = (order: {
    symbol?: string;
    side?: string;
  }) => {
    const symbol = (order.symbol ?? "").toUpperCase();
    if (!symbol) return undefined;
    const quote = pendingQuotes[symbol];
    if (!quote) return undefined;
    const bid = Number(quote.bid);
    const ask = Number(quote.ask);
    const side = (order.side ?? "").toUpperCase();
    if (side === "BUY" && Number.isFinite(ask)) return ask;
    if (side === "SELL" && Number.isFinite(bid)) return bid;
    if (Number.isFinite(ask)) return ask;
    if (Number.isFinite(bid)) return bid;
    return undefined;
  };

  const getPendingTriggerInfo = (order: {
    orderType?: string;
    orderKind?: string;
    side?: string;
    price?: number;
  }) => {
    const livePrice = getPendingLivePrice(order);
    const target = order.price;
    if (
      livePrice === undefined ||
      target === undefined ||
      target === null ||
      Number.isNaN(target)
    ) {
      return { status: "na" as const };
    }

    const side = (order.side ?? "").toUpperCase();
    const kind = (order.orderType ?? order.orderKind ?? "").toUpperCase();
    let triggered = false;

    if (kind.includes("LIMIT")) {
      if (side === "BUY") triggered = livePrice <= target;
      if (side === "SELL") triggered = livePrice >= target;
    } else if (kind.includes("STOP")) {
      if (side === "BUY") triggered = livePrice >= target;
      if (side === "SELL") triggered = livePrice <= target;
    }

    if (triggered) return { status: "ready" as const };

    return {
      status: "away" as const,
      value: Math.abs(target - livePrice),
    };
  };

  const filteredLivePositions = useMemo(() => {
    if (!liveAccountFilter) return livePositions;
    return livePositions.filter(
      (position) => position.accountId === liveAccountFilter
    );
  }, [liveAccountFilter, livePositions]);

  const markPositionClosed = useCallback((positionId: string) => {
    if (!positionId) return;
    closedPositionsRef.current.set(positionId, Date.now());
    if (livePositionsRef.current.delete(positionId)) {
      setLivePositions(Array.from(livePositionsRef.current.values()));
    }
    while (closedPositionsRef.current.size > 500) {
      const oldestKey = closedPositionsRef.current.keys().next().value;
      if (!oldestKey) break;
      closedPositionsRef.current.delete(oldestKey);
    }
  }, []);

  const liveSummary = useMemo(
    () =>
      filteredLivePositions.reduce(
        (acc, position) => {
          acc.total += 1;
          const side = (position.side ?? "").toUpperCase();
          if (side === "BUY") acc.buy += 1;
          if (side === "SELL") acc.sell += 1;
          acc.pnl += position.floatingPnL ?? 0;
          acc.last = position.updatedAt ?? acc.last;
          return acc;
        },
        { total: 0, buy: 0, sell: 0, pnl: 0, last: "" }
      ),
    [filteredLivePositions]
  );

  const resolveTxType = (tx: AdminTransaction) =>
    (tx.transactionType ?? tx.type ?? "").toString();
  const resolveTxStatus = (tx: AdminTransaction) =>
    (tx.status ?? "").toString();

  useEffect(() => {
    if (activeTab !== "Active Trades") {
      if (wsRef.current) {
        wsRef.current.close(1000, "active_tab_change");
        wsRef.current = null;
      }
      return;
    }

    if (!accountIds.length) {
      if (wsRef.current) {
        wsRef.current.close(1000, "no_accounts");
        wsRef.current = null;
      }
      return;
    }
    const socketUrl = resolveAccountSocketUrl();
    if (!socketUrl) {
      if (wsRef.current) {
        wsRef.current.close(1000, "no_socket_url");
        wsRef.current = null;
      }
      return;
    }

    const existing = wsRef.current;
    if (
      existing &&
      (existing.readyState === WebSocket.OPEN ||
        existing.readyState === WebSocket.CONNECTING)
    ) {
      if (existing.readyState === WebSocket.OPEN) {
        accountIds.forEach((accountId) => {
          existing.send(
            JSON.stringify({
              type: "identify",
              accountId,
            })
          );
        });
      }
      return;
    }

    const ws = new WebSocket(socketUrl);
    wsRef.current = ws;

    const sendIdentifyAll = () => {
      accountIds.forEach((accountId) => {
        ws.send(
          JSON.stringify({
            type: "identify",
            accountId,
          })
        );
      });
    };

    ws.onopen = () => {
      setLiveStatus("connected");
      sendIdentifyAll();
    };

    ws.onmessage = (event) => {
      const raw =
        typeof event.data === "string"
          ? event.data
          : event.data instanceof ArrayBuffer
          ? new TextDecoder().decode(event.data)
          : "";
      const messages = parseSocketMessages(raw);
      if (!messages.length) return;

      messages.forEach((msg) => {
        const type = (msg?.type ?? "").toString().toLowerCase();
        const data = msg?.data ?? msg;

        if (!data?.accountId || !accountIdSet.has(data.accountId)) return;

        if (type === "live_account") {
          return;
        }

        if (
          type !== "live_position" &&
          type.includes("position") &&
          (type.includes("close") || type.includes("closed"))
        ) {
          const positionId = data.positionId ?? data.position_id;
          if (positionId) {
            markPositionClosed(positionId);
          }
          return;
        }

        if (type === "live_position") {
          const positionId = data.positionId ?? data.position_id;
          if (!positionId) return;
          if (closedPositionsRef.current.has(positionId)) return;

          const rawStatus = data.status ?? data.positionStatus ?? "";
          const normalizedStatus = rawStatus.toString().toLowerCase();
          const volumeValue =
            typeof data.volume === "number" ? data.volume : Number(data.volume);
          const isClosedFlag = data.isClosed === true || data.closed === true;
          const isOpenFlag = data.isOpen === false || data.open === false;
          const closeTime =
            data.closeTime ??
            data.closedAt ??
            data.closed_at ??
            data.close_time ??
            data.closeTimestamp ??
            data.close_ts;
          const closePrice =
            data.closePrice ?? data.close_price ?? data.closedPrice ?? data.closed_price;
          const closeReasonRaw = data.closeReason ?? data.close_reason ?? data.reason ?? "";
          const closeReason = closeReasonRaw.toString().toLowerCase();
          const hasCloseReason = closeReason.length > 0;
          const closeReasonMatches =
            hasCloseReason &&
            (closeReason.includes("stop") ||
              closeReason.includes("sl") ||
              closeReason.includes("take") ||
              closeReason.includes("tp") ||
              closeReason.includes("close") ||
              closeReason.includes("liquid") ||
              closeReason.includes("margin"));

          if (
            isClosedFlag ||
            isOpenFlag ||
            normalizedStatus === "closed" ||
            normalizedStatus === "close" ||
            normalizedStatus === "closing" ||
            normalizedStatus === "cancelled" ||
            normalizedStatus === "canceled" ||
            Boolean(closeTime) ||
            Boolean(closePrice) ||
            closeReasonMatches ||
            (Number.isFinite(volumeValue) && volumeValue <= 0)
          ) {
            markPositionClosed(positionId);
            return;
          }

          const prev = livePositionsRef.current.get(positionId);
          const ticketRaw = data.ticket ?? data.Ticket ?? prev?.ticket;
          const ticketNum =
            typeof ticketRaw === "number"
              ? ticketRaw
              : Number(ticketRaw);
          const snapshot: LivePositionSnapshot = {
            positionId,
            ticket: Number.isFinite(ticketNum) ? ticketNum : prev?.ticket ?? null,
            accountId: data.accountId,
            symbol: data.symbol ?? prev?.symbol,
            side: data.side ?? prev?.side,
            volume: Number.isFinite(volumeValue) ? volumeValue : prev?.volume,
            openPrice: data.openPrice ?? prev?.openPrice,
            currentPrice: data.currentPrice ?? prev?.currentPrice,
            floatingPnL: data.floatingPnL ?? prev?.floatingPnL,
            stopLoss: data.stopLoss ?? prev?.stopLoss ?? null,
            takeProfit: data.takeProfit ?? prev?.takeProfit ?? null,
            openTime: data.openTime ?? prev?.openTime,
            updatedAt: new Date().toISOString(),
          };
          livePositionsRef.current.set(positionId, snapshot);
          setLivePositions(Array.from(livePositionsRef.current.values()));
        }
      });
    };

    ws.onerror = () => setLiveStatus("error");
    ws.onclose = () => {
      wsRef.current = null;
      setLiveStatus("idle");
    };

    return () => {
      ws.close(1000, "component_unmount");
      wsRef.current = null;
    };
  }, [activeTab, accountIds, accountIdSet, markPositionClosed]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const displayName = profileSnapshot.name || "User";
  const displayEmail = profileSnapshot.email || "--";
  const selectedAccountTypeMeta = useMemo(
    () => getAccountTypeMeta(selectedAccount?.account_type),
    [selectedAccount?.account_type]
  );
  const SelectedAccountTypeIcon = selectedAccountTypeMeta.icon;

  const kycBadgeClass =
    kycStyles[profileSnapshot.kycStatus ?? ""] ||
    "border-[var(--border-subtle)] bg-[var(--chip-bg)] text-[var(--text-muted)]";

  const mailBadgeClass = profileSnapshot.isMailVerified
    ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-600"
    : "border-amber-500/40 bg-amber-500/5 text-amber-600";

  const canSubmit = useMemo(
    () => !updateMutation.isPending,
    [updateMutation.isPending]
  );

  const openEdit = () => {
    const profile = userQuery.data;

    setForm({
      name: profileSnapshot.name,
      phone: profileSnapshot.phone,
      isMailVerified: profileSnapshot.isMailVerified,
      kycStatus: profileSnapshot.kycStatus,
      date_of_birth: profile?.date_of_birth ? profile.date_of_birth.slice(0, 10) : "",
      gender: profile?.gender ?? "",
      address_line_1: profile?.address_line_1 ?? "",
      address_line_2: profile?.address_line_2 ?? "",
      city: profile?.city ?? "",
      state: profile?.state ?? "",
      country: profile?.country ?? "",
      pincode: profile?.pincode ?? "",
    });
    setTouched({});
    setEditOpen(true);
  };

  const handleChange =
    (key: keyof AdminUserUpdatePayload) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [key]: value }));
      setTouched((prev) => ({ ...prev, [key]: true }));
    };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!userId) return;

    const payload = (Object.keys(form) as Array<keyof AdminUserUpdatePayload>).reduce(
      (acc, key) => {
        if (touched[key]) {
          acc[key] = form[key] as never;
        }
        return acc;
      },
      {} as AdminUserUpdatePayload
    );

    if (Object.keys(payload).length === 0) {
      setToast("No changes to update.");
      setEditOpen(false);
      return;
    }

    updateMutation.mutate(
      { id: userId, payload },
      {
        onSuccess: (resp: unknown) => {
          const msg =
            typeof resp === "object" && resp !== null
              ? ((resp as { message?: string; data?: { message?: string } }).message ??
                  (resp as { data?: { message?: string } }).data?.message)
              : undefined;
          setTouched({});
          setEditOpen(false);
          setToast(msg || "Profile updated successfully");
        },
        onError: (err: unknown) => {
          const msg =
            typeof err === "object" && err !== null
              ? ((err as { response?: { data?: { message?: string } } }).response
                  ?.data?.message ??
                (err as { message?: string }).message)
              : undefined;
          setToast(msg || "Update failed. Please try again.");
        },
      }
    );
  };

  const handleCopy = async (value: string, label: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setToast(`${label} copied.`);
    } catch {
      setToast("Copy failed.");
    }
  };

  const openAccountView = (account: AdminAccount) => {
    setSelectedAccountId(account._id);
    setAccountViewOpen(true);
  };

  const openAccountEdit = (account: AdminAccount) => {
    setSelectedAccountId(account._id);
    setAccountForm(buildAccountEditForm(account));
    setAccountFormError("");
    setAccountEditOpen(true);
  };

  const openInternalTransfer = (fromAccountId?: string) => {
    const resolvedFrom =
      fromAccountId ?? nonDemoAccounts[0]?._id ?? "";
    const resolvedTo =
      nonDemoAccounts.find((acc) => acc._id !== resolvedFrom)?._id ?? "";

    setInternalTransferFrom(resolvedFrom);
    setInternalTransferTo(resolvedTo);
    setInternalTransferAmount("");
    setInternalTransferError("");
    setInternalTransferOpen(true);
  };

  const closeInternalTransfer = () => {
    setInternalTransferOpen(false);
    setInternalTransferError("");
  };

  const openBonusModal = (accountId?: string) => {
    const liveAccounts = nonDemoAccounts.filter(
      (account) => (account.account_type ?? "").toLowerCase() === "live"
    );
    if (!liveAccounts.length) {
      setToast("No live account available for bonus.");
      return;
    }

    const resolvedAccountId =
      accountId && liveAccounts.some((account) => account._id === accountId)
        ? accountId
        : liveAccounts[0]?._id ?? "";

    setBonusAccountId(resolvedAccountId);
    setBonusAmount("");
    setBonusError("");
    setBonusModalOpen(true);
  };

  const closeBonusModal = () => {
    setBonusModalOpen(false);
    setBonusError("");
  };

  const openTradableFundModal = (accountId?: string) => {
    const liveAccounts = nonDemoAccounts.filter(
      (account) => (account.account_type ?? "").toLowerCase() === "live"
    );
    if (!liveAccounts.length) {
      setToast("No live account available for tradable fund.");
      return;
    }

    const resolvedAccountId =
      accountId && liveAccounts.some((account) => account._id === accountId)
        ? accountId
        : liveAccounts[0]?._id ?? "";

    setTradableFundAccountId(resolvedAccountId);
    setTradableFundAmount("");
    setTradableFundError("");
    setTradableFundModalOpen(true);
  };

  const closeTradableFundModal = () => {
    setTradableFundModalOpen(false);
    setTradableFundError("");
  };

  const handleBonusSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBonusError("");

    if (!userId) {
      setBonusError("User not found.");
      return;
    }

    if (!bonusAccountId) {
      setBonusError("Please select an account.");
      return;
    }

    const amount = parseNullableNumber(bonusAmount);
    if (amount === null || amount <= 0) {
      setBonusError("Please enter a valid bonus amount greater than 0.");
      return;
    }

    try {
      const response = await bonusCreditMutation.mutateAsync({
        userId,
        accountId: bonusAccountId,
        bonusAmount: amount,
      });

      await Promise.all([accountsQuery.refetch(), transactionsQuery.refetch()]);
      closeBonusModal();
      const added = response.data?.bonusAdded ?? amount;
      setToast(`Bonus added successfully: $${formatAmount(added)}`);
    } catch (error) {
      const message =
        typeof error === "object" && error !== null
          ? ((error as { response?: { data?: { message?: string } }; message?: string }).response
              ?.data?.message ??
              (error as { message?: string }).message)
          : undefined;
      setBonusError(message || "Unable to add bonus.");
    }
  };

  const handleTradableFundSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setTradableFundError("");

    if (!userId) {
      setTradableFundError("User not found.");
      return;
    }

    if (!tradableFundAccountId) {
      setTradableFundError("Please select an account.");
      return;
    }

    const amount = parseNullableNumber(tradableFundAmount);
    if (amount === null || amount <= 0) {
      setTradableFundError(
        "Please enter a valid tradable fund amount greater than 0."
      );
      return;
    }

    try {
      const response = await tradableFundCreditMutation.mutateAsync({
        userId,
        accountId: tradableFundAccountId,
        tradableFundAmount: amount,
      });

      await Promise.all([accountsQuery.refetch(), transactionsQuery.refetch()]);
      closeTradableFundModal();
      const added = response.data?.tradableFundAdded ?? amount;
      setToast(`Tradable fund added successfully: $${formatAmount(added)}`);
    } catch (error) {
      const message =
        typeof error === "object" && error !== null
          ? ((error as { response?: { data?: { message?: string } }; message?: string }).response
              ?.data?.message ??
              (error as { message?: string }).message)
          : undefined;
      setTradableFundError(message || "Unable to add tradable fund.");
    }
  };

  const internalTransferAmountValue = parseNullableNumber(internalTransferAmount);
  const internalTransferCanSubmit =
    nonDemoAccounts.length >= 2 &&
    Boolean(internalTransferFrom) &&
    Boolean(internalTransferTo) &&
    internalTransferFrom !== internalTransferTo &&
    internalTransferAmountValue !== null &&
    internalTransferAmountValue > 0 &&
    internalTransferAmountValue <= internalMaxTransferableRounded &&
    internalMaxTransferableRounded > 0;

  const handleInternalTransferSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setInternalTransferError("");

    if (!internalTransferFrom) {
      setInternalTransferError("Please select a From account.");
      return;
    }

    if (!internalTransferTo) {
      setInternalTransferError("Please select a To account.");
      return;
    }

    if (internalTransferFrom === internalTransferTo) {
      setInternalTransferError("From and To accounts must be different.");
      return;
    }

    const fromAccount = nonDemoAccounts.find(
      (account) => account._id === internalTransferFrom
    );
    if (!fromAccount) {
      setInternalTransferError("From account not found.");
      return;
    }

    const toAccount = nonDemoAccounts.find(
      (account) => account._id === internalTransferTo
    );
    if (!toAccount) {
      setInternalTransferError("To account not found.");
      return;
    }

    const amount = parseNullableNumber(internalTransferAmount);
    if (amount === null || amount <= 0) {
      setInternalTransferError("Please enter a valid amount.");
      return;
    }

    const balance = fromAccount.balance ?? 0;
    const hold = fromAccount.hold_balance ?? 0;
    const equity = fromAccount.equity ?? balance;

    if (equity <= 0) {
      setInternalTransferError("From account equity must be greater than 0.");
      return;
    }

    const availableBalance = Math.max(0, balance - hold);
    const maxTransferable = Math.max(
      0,
      Math.min(availableBalance, equity)
    );

    if (amount > maxTransferable) {
      setInternalTransferError(
        `Amount cannot exceed available funds (${formatAmount(maxTransferable)}).`
      );
      return;
    }

    try {
      const resp = await internalTransferMutation.mutateAsync({
        fromAccount: internalTransferFrom,
        toAccount: internalTransferTo,
        amount,
      });

      setToast(extractMessage(resp) || "Internal transfer created.");
      closeInternalTransfer();
      setInternalTransferFrom("");
      setInternalTransferTo("");
      setInternalTransferAmount("");
    } catch (err: unknown) {
      setInternalTransferError(
        extractMessage(err) || "Internal transfer failed. Please try again."
      );
    }
  };

  const closeAccountEdit = () => {
    setAccountEditOpen(false);
    setAccountFormError("");
  };

  const openPositionAction = (position: LivePositionSnapshot) => {
    setPositionAction(position);
    setPositionActionError("");
    setPositionActionOpen(true);
  };

  const closePositionAction = () => {
    setPositionActionOpen(false);
    setPositionAction(null);
    setPositionActionError("");
  };

  const openPendingAction = (order: TradeAdminPendingOrder) => {
    setPendingAction(order);
    setPendingActionError("");
    setPendingActionOpen(true);
  };

  const closePendingAction = () => {
    setPendingActionOpen(false);
    setPendingAction(null);
    setPendingActionError("");
  };

  const openClosedEdit = (trade: TradeAdminClosedTrade) => {
    setClosedEditTrade(trade);
    setClosedEditError("");
    setClosedEditOpen(true);
  };

  const closeClosedEdit = () => {
    setClosedEditOpen(false);
    setClosedEditTrade(null);
    setClosedEditError("");
  };

  const handlePositionModifySubmit = (payload: Record<string, unknown>) => {
    modifyPositionMutation.mutate(
      {
        accountId: String(payload.accountId),
        positionId: String(payload.positionId),
        userId: String(payload.userId || userId),
        volume:
          typeof payload.volume === "number" ? payload.volume : undefined,
        openPrice:
          typeof payload.openPrice === "number" ? payload.openPrice : undefined,
        stopLoss:
          payload.stopLoss === undefined
            ? undefined
            : (payload.stopLoss as number | null),
        takeProfit:
          payload.takeProfit === undefined
            ? undefined
            : (payload.takeProfit as number | null),
      },
      {
        onSuccess: () => {
          setToast("Position updated.");
          closePositionAction();
        },
        onError: (err: unknown) => {
          setPositionActionError(extractMessage(err) || "Position update failed.");
        },
      }
    );
  };

  const handlePendingModifySubmit = (payload: Record<string, unknown>) => {
    modifyPendingMutation.mutate(
      {
        accountId: String(payload.accountId),
        orderId: String(payload.orderId),
        userId: String(payload.userId || userId),
        volume:
          typeof payload.volume === "number" ? payload.volume : undefined,
        price: typeof payload.price === "number" ? payload.price : undefined,
        stopLoss:
          payload.stopLoss === undefined
            ? undefined
            : (payload.stopLoss as number | null),
        takeProfit:
          payload.takeProfit === undefined
            ? undefined
            : (payload.takeProfit as number | null),
      },
      {
        onSuccess: () => {
          setToast("Pending order updated.");
          closePendingAction();
          pendingOpenQuery.refetch();
        },
        onError: (err: unknown) => {
          setPendingActionError(
            extractMessage(err) || "Pending order update failed."
          );
        },
      }
    );
  };

  const handleClosedEditSubmit = (payload: Record<string, unknown>) => {
    modifyClosedMutation.mutate(
      {
        tradeId: String(payload.tradeId),
        accountId: String(payload.accountId),
        userId: String(payload.userId || userId),
        volume:
          typeof payload.volume === "number" ? payload.volume : undefined,
        openPrice:
          typeof payload.openPrice === "number" ? payload.openPrice : undefined,
        closePrice:
          typeof payload.closePrice === "number"
            ? payload.closePrice
            : undefined,
        stopLoss:
          payload.stopLoss === undefined
            ? undefined
            : (payload.stopLoss as number | null),
        takeProfit:
          payload.takeProfit === undefined
            ? undefined
            : (payload.takeProfit as number | null),
        commission:
          typeof payload.commission === "number"
            ? payload.commission
            : undefined,
        spread:
          typeof payload.spread === "number" ? payload.spread : undefined,
        swap: typeof payload.swap === "number" ? payload.swap : undefined,
        realizedPnL:
          typeof payload.realizedPnL === "number"
            ? payload.realizedPnL
            : undefined,
        closeReason:
          payload.closeReason === undefined
            ? undefined
            : (payload.closeReason as string | null),
      },
      {
        onSuccess: () => {
          setToast("Closed trade updated.");
          closeClosedEdit();
          closedTradesQuery.refetch();
        },
        onError: (err: unknown) => {
          setClosedEditError(
            extractMessage(err) || "Closed trade update failed."
          );
        },
      }
    );
  };

  const handlePendingCancel = (order: TradeAdminPendingOrder) => {
    const cancelUserId = order.userId ?? userId ?? "";
    if (!cancelUserId) {
      setToast("User ID is required to cancel this order.");
      return;
    }
    cancelPendingMutation.mutate(
      { accountId: order.accountId, orderId: order.orderId, userId: cancelUserId },
      {
        onSuccess: () => {
          setToast("Pending order cancelled.");
          pendingOpenQuery.refetch();
          if (pendingAction?.orderId === order.orderId) {
            closePendingAction();
          }
        },
        onError: (err: unknown) => {
          setToast(extractMessage(err) || "Cancel pending order failed.");
        },
      }
    );
  };

  const handlePositionClose = (position: LivePositionSnapshot) => {
    closePositionMutation.mutate(
      {
        accountId: position.accountId,
        positionId: position.positionId,
        userId,
      },
      {
        onSuccess: () => {
          markPositionClosed(position.positionId);
          setToast("Position closed.");
        },
        onError: (err: unknown) => {
          setToast(extractMessage(err) || "Close position failed.");
        },
      }
    );
  };

  const handleAccountFormField =
    <K extends keyof AccountEditForm>(key: K) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setAccountForm((prev) => ({
        ...prev,
        [key]: event.target.value as AccountEditForm[K],
      }));
    };

  const handleAccountUpdateSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedAccountId) return;

    setAccountFormError("");

    const leverage = Number(accountForm.leverage);
    const spreadPips = Number(accountForm.spread_pips);
    const commissionPerLot = Number(accountForm.commission_per_lot);
    const swapCharge = Number(accountForm.swap_charge);
    const bonusOverrideRaw = accountForm.bonus_percent_override.trim();
    const bonusOverrideValue =
      bonusOverrideRaw.length === 0 ? null : Number(bonusOverrideRaw);

    const numericValues = [leverage, spreadPips, commissionPerLot, swapCharge];
    const invalidNumber = numericValues.some(
      (value) => Number.isNaN(value) || !Number.isFinite(value) || value < 0
    );

    if (invalidNumber) {
      setAccountFormError("Please enter valid numeric values (0 or greater).");
      return;
    }

    if (
      bonusOverrideValue !== null &&
      (Number.isNaN(bonusOverrideValue) ||
        !Number.isFinite(bonusOverrideValue) ||
        bonusOverrideValue < 0 ||
        bonusOverrideValue > 100)
    ) {
      setAccountFormError("Bonus override must be between 0 and 100.");
      return;
    }

    const payload: AdminAccountUpdatePayload = {
      leverage,
      spread_enabled: accountForm.spread_enabled === "true",
      spread_pips: spreadPips,
      commission_per_lot: commissionPerLot,
      swap_enabled: accountForm.swap_enabled === "true",
      swap_charge: swapCharge,
      status: accountForm.status,
      bonus_percent_override: bonusOverrideValue,
    };

    updateAccountMutation.mutate(
      { accountId: selectedAccountId, payload },
      {
        onSuccess: () => {
          setToast("Account updated successfully.");
          setAccountEditOpen(false);
        },
        onError: (error) => {
          const err = error as {
            response?: { data?: { message?: string } };
            message?: string;
          };
          setAccountFormError(
            err?.response?.data?.message || err?.message || "Failed to update account."
          );
        },
      }
    );
  };

  const handlePasswordSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!userId) return;
    setPasswordError("");

    const newPassword = passwordForm.newPassword.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();

    if (!newPassword || !confirmPassword) {
      setPasswordError("Please enter and confirm the new password.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    changePasswordMutation.mutate(
      { userId, newPassword },
      {
        onSuccess: (resp: unknown) => {
          setToast(extractMessage(resp) || "Password updated successfully");
          setPasswordForm({ newPassword: "", confirmPassword: "" });
          setPasswordOpen(false);
        },
        onError: (err: unknown) => {
          setPasswordError(extractMessage(err) || "Unable to update password.");
        },
      }
    );
  };

  const openResetPassword = (account: AdminAccount, type: "trade" | "watch") => {
    setResetPasswordAccount(account);
    setResetPasswordType(type);
    setAccountPassword("");
    setAccountPasswordConfirm("");
    setAccountPasswordError("");
    setShowAccountPassword(false);
    setShowAccountPasswordConfirm(false);
    setResetPasswordOpen(true);
  };

  const closeResetPassword = () => {
    setResetPasswordOpen(false);
  };

  const openDeleteAction = () => {
    setDeleteActionOpen(true);
    setDeleteMode("whole");
    setDeleteTradeAccountId(accountList[0]?._id ?? "");
    setDeleteActionError("");
  };

  const closeDeleteAction = () => {
    if (deleteUserMutation.isPending || deleteTradeAccountMutation.isPending) {
      return;
    }
    setDeleteActionOpen(false);
    setDeleteActionError("");
  };

  const handleDeleteAction = async () => {
    setDeleteActionError("");

    try {
      if (deleteMode === "whole") {
        if (!userId) {
          setDeleteActionError("User id not found.");
          return;
        }

        const resp = await deleteUserMutation.mutateAsync(userId);
        setToast(extractMessage(resp) || "User account deleted.");
        setDeleteActionOpen(false);
        router.push("/admin/users/users");
        return;
      }

      if (!deleteTradeAccountId) {
        setDeleteActionError("Please select a trade login account.");
        return;
      }

      const resp = await deleteTradeAccountMutation.mutateAsync({
        accountId: deleteTradeAccountId,
        userId,
      });
      setToast(extractMessage(resp) || "Trade login account deleted.");
      setDeleteActionOpen(false);

      if (selectedAccountId === deleteTradeAccountId) {
        setSelectedAccountId("");
      }
      if (accountViewOpen) {
        setAccountViewOpen(false);
      }
      if (accountEditOpen) {
        setAccountEditOpen(false);
      }
    } catch (err: unknown) {
      setDeleteActionError(
        extractMessage(err) || "Unable to complete delete action."
      );
    }
  };

  const handleResetAccountPassword = () => {
    setAccountPasswordError("");
    const accountId = resetPasswordAccount?._id;
    if (!accountId) {
      setAccountPasswordError("Select an account first.");
      return;
    }
    const password = accountPassword.trim();
    const confirmation = accountPasswordConfirm.trim();
    if (!password || !confirmation) {
      setAccountPasswordError("Both password fields are required.");
      return;
    }
    if (password.length < 6) {
      setAccountPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmation) {
      setAccountPasswordError("Passwords do not match.");
      return;
    }

    const mutation =
      resetPasswordType === "trade"
        ? resetTradePasswordMutation
        : resetWatchPasswordMutation;
    const label = resetPasswordType === "trade" ? "Trade" : "Investor";

    mutation.mutate(
      { accountId, newPassword: password },
      {
        onSuccess: (resp) => {
          setToast(resp?.message || `${label} password reset.`);
          closeResetPassword();
        },
        onError: (err: unknown) => {
          setAccountPasswordError(
            extractMessage(err) ||
              `Failed to reset ${label.toLowerCase()} password.`
          );
        },
      }
    );
  };

  return (
    <div className="container-pad w-full max-w-full min-w-0 overflow-x-hidden space-y-5 text-[var(--foreground)]">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-medium hover:bg-[var(--hover-bg)]"
        >
          <ChevronLeft size={16} /> Back
        </button>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <button className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-medium hover:bg-[var(--hover-bg)]">
            <span className="h-7 w-7 rounded-md bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
              <Download size={14} />
            </span>
            Export Trades
          </button>
          <button className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-medium hover:bg-[var(--hover-bg)]">
            <span className="h-7 w-7 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Download size={14} />
            </span>
            Export Funds
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
        {userQuery.isLoading ? (
          <div className="py-6">
            <GlobalLoader />
          </div>
        ) : userQuery.isError ? (
          <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>Unable to load latest user data from server.</span>
            <button
              type="button"
              onClick={() => userQuery.refetch()}
              className="w-fit rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-semibold hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-semibold">{displayName}</h2>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-4 text-sm text-[var(--text-muted)]">
                <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5 break-all">
                  <Mail size={14} />
                  {displayEmail}
                  {displayEmail && displayEmail !== "--" && (
                    <button
                      type="button"
                      onClick={() => handleCopy(displayEmail, "Email")}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
                      aria-label="Copy email"
                    >
                      <Copy size={12} />
                    </button>
                  )}
                </span>
                <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5 break-all">
                  <Phone size={14} />
                  {profileSnapshot.phone || "--"}
                  {profileSnapshot.phone && profileSnapshot.phone !== "--" && (
                    <button
                      type="button"
                      onClick={() => handleCopy(profileSnapshot.phone, "Phone")}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
                      aria-label="Copy phone"
                    >
                      <Copy size={12} />
                    </button>
                  )}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <PresenceBadge
                  online={Boolean(userQuery.data?.isOnline)}
                  lastSeenAt={userQuery.data?.lastSeenAt ?? null}
                  size="md"
                />
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 uppercase tracking-wide ${mailBadgeClass}`}
                >
                  <Mail size={12} />
                  {profileSnapshot.isMailVerified ? "MAIL VERIFIED" : "MAIL UNVERIFIED"}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 uppercase tracking-wide ${kycBadgeClass}`}
                >
                  <ShieldCheck size={12} />
                  KYC {(profileSnapshot.kycStatus || "STATUS").replaceAll("_", " ")}
                </span>
              </div>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
              <button
                onClick={() => setViewOpen(true)}
                className="inline-flex w-full sm:w-auto items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-medium hover:bg-[var(--hover-bg)]"
              >
                <Eye size={16} /> View Details
              </button>
              <button
                onClick={openEdit}
                className="inline-flex w-full sm:w-auto items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-medium hover:bg-[var(--hover-bg)]"
              >
                <Pencil size={16} /> Update
              </button>
              <button
                onClick={() => setPasswordOpen(true)}
                className="inline-flex w-full sm:w-auto items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-medium hover:bg-[var(--hover-bg)]"
              >
                <KeyRound size={16} /> Change Password
              </button>
              <button
                onClick={openDeleteAction}
                className="inline-flex w-full sm:w-auto items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-500/15"
              >
                <XCircle size={16} /> Delete Account
              </button>
            </div>
          </div>
        )}
      </div>

	      <div className="flex flex-wrap gap-2">
	        {(
	          ["Fund History", "Accounts", "Active Trades", "Closed Trades", "Pending Trades"] as const
	        ).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                activeTab === tab
                  ? "border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--hover-bg)]"
              }`}
            >
              {tab}
            </button>
          ))}
      </div>

	      {activeTab === "Fund History" && (
	        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Fund - Withdrawal & Deposits</h3>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
                <span>Total: {txTotal}</span>
                {txSummary?.totalAmount !== undefined && (
                  <span>Total Amount: {txSummary.totalAmount.toLocaleString("en-IN")}</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <div className="flex w-full flex-col gap-1 sm:w-auto">
                <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  From
                </span>
                <div className="relative w-full sm:w-auto">
                  <Calendar
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                  <input
                    type="date"
                    value={draftFromDate || ""}
                    onChange={(e) => setDraftFromDate(e.target.value || "")}
                    className="w-full sm:w-[170px] rounded-lg border border-[var(--input-border)] bg-[var(--card-bg)] pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  />
                </div>
              </div>

              <div className="flex w-full flex-col gap-1 sm:w-auto">
                <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  To
                </span>
                <div className="relative w-full sm:w-auto">
                  <Calendar
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                  <input
                    type="date"
                    value={draftToDate || ""}
                    onChange={(e) => setDraftToDate(e.target.value || "")}
                    className="w-full sm:w-[170px] rounded-lg border border-[var(--input-border)] bg-[var(--card-bg)] pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFromDate(draftFromDate);
                  setToDate(draftToDate);
                  setTxPage(1);
                }}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)]"
              >
                Apply Dates
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                Account
              </label>
              <CustomSelect
                value={txAccountId}
                onChange={(next) => {
                  setTxAccountId(next);
                  setTxPage(1);
                }}
                placeholder="All Accounts"
                toneClass="border-slate-300/70"
                options={accountOptions}
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                Type
              </label>
              <CustomSelect
                value={txType}
                onChange={(next) => {
                  setTxType(next);
                  setTxPage(1);
                }}
                placeholder="All Types"
                toneClass="border-amber-300/70"
                options={[
                  { value: "", label: "All Types", dotClass: "bg-slate-300" },
                  { value: "DEPOSIT", label: "Deposit", dotClass: "bg-emerald-500" },
                  { value: "WITHDRAW", label: "Withdraw", dotClass: "bg-amber-500" },
                  { value: "TRADE_PROFIT", label: "Trade Profit", dotClass: "bg-sky-500" },
                  { value: "TRADE_LOSS", label: "Trade Loss", dotClass: "bg-rose-500" },
                  { value: "BONUS", label: "Bonus (Legacy)", dotClass: "bg-purple-500" },
                  { value: "BONUS_MANUAL", label: "Bonus Manual", dotClass: "bg-purple-500" },
                  { value: "BONUS_CREDIT_IN", label: "Bonus Credit In", dotClass: "bg-purple-500" },
                  { value: "BONUS_CREDIT_OUT", label: "Bonus Credit Out", dotClass: "bg-purple-500" },
                  { value: "ADJUSTMENT", label: "Adjustment", dotClass: "bg-slate-500" },
                ]}
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                Status
              </label>
              <CustomSelect
                value={txStatus}
                onChange={(next) => {
                  setTxStatus(next);
                  setTxPage(1);
                }}
                placeholder="All Status"
                toneClass="border-rose-300/70"
                options={[
                  { value: "", label: "All Status", dotClass: "bg-slate-300" },
                  { value: "SUCCESS", label: "Success", dotClass: "bg-emerald-500" },
                  { value: "PENDING", label: "Pending", dotClass: "bg-amber-500" },
                  { value: "FAILED", label: "Failed", dotClass: "bg-rose-500" },
                  { value: "REJECTED", label: "Rejected", dotClass: "bg-slate-500" },
                ]}
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                Reference Id
              </label>
              <input
                value={txReferenceId}
                onChange={(e) => {
                  setTxReferenceId(e.target.value);
                  setTxPage(1);
                }}
                placeholder="Search reference id"
                className="mt-1 w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                  Sort By
                </label>
                <CustomSelect
                  value={txSortBy}
                  onChange={(next) => {
                    setTxSortBy(next);
                    setTxPage(1);
                  }}
                  placeholder="Created At"
                  toneClass="border-sky-300/70"
                  options={[
                    { value: "createdAt", label: "Created At", dotClass: "bg-emerald-500" },
                    { value: "amount", label: "Amount", dotClass: "bg-sky-500" },
                    { value: "status", label: "Status", dotClass: "bg-amber-500" },
                    { value: "type", label: "Type", dotClass: "bg-slate-500" },
                  ]}
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                  Direction
                </label>
                <CustomSelect
                  value={txSortDir}
                  onChange={(next) => {
                    setTxSortDir(next);
                    setTxPage(1);
                  }}
                  placeholder="Desc"
                  toneClass="border-violet-300/70"
                  options={[
                    { value: "desc", label: "Desc", dotClass: "bg-slate-600" },
                    { value: "asc", label: "Asc", dotClass: "bg-slate-400" },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setTxType("");
                setTxStatus("");
                setTxReferenceId("");
                setTxAccountId("");
                setFromDate("");
                setToDate("");
                setDraftFromDate("");
                setDraftToDate("");
                setTxSortBy("createdAt");
                setTxSortDir("desc");
                setTxPage(1);
              }}
              className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-xs font-medium hover:bg-[var(--hover-bg)]"
            >
              Reset Filters
            </button>
          </div>

          <DragScroll className="mt-4 overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-[var(--input-bg)] text-[var(--text-muted)] text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Created At</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Remark</th>
                  <th className="px-4 py-3">Balance After</th>
                </tr>
              </thead>
              <tbody>
                {transactionsQuery.isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center">
                      <GlobalLoader />
                    </td>
                  </tr>
                ) : transactionsQuery.isError ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-[var(--danger)]">
                      Failed to load transactions.
                    </td>
                  </tr>
                ) : txData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-[var(--text-muted)]">
                      No transactions found for selected date range.
                    </td>
                  </tr>
                ) : (
                  txData.map((tx: AdminTransaction) => (
                    <tr
                      key={tx._id ?? `${tx.createdAt}-${tx.amount}`}
                      className="border-t border-[var(--card-border)]"
                    >
                      <td className="px-4 py-3 font-medium">{formatAmount(tx.amount)}</td>
                      <td className="px-4 py-3">{formatDateTime(tx.createdAt)}</td>
                      <td className="px-4 py-3">
                        {resolveTxType(tx) ? (
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                              txTypeStyles[resolveTxType(tx)] ??
                              "border-[var(--card-border)] bg-[var(--chip-bg)] text-[var(--text-muted)]"
                            }`}
                          >
                            {resolveTxType(tx).replaceAll("_", " ")}
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {resolveTxStatus(tx) ? (
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                              txStatusStyles[resolveTxStatus(tx)] ??
                              "border-[var(--card-border)] bg-[var(--chip-bg)] text-[var(--text-muted)]"
                            }`}
                          >
                            {resolveTxStatus(tx)}
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td className="px-4 py-3">{tx.referenceId ?? "--"}</td>
                      <td className="px-4 py-3">{tx.remark ?? tx.notes ?? "--"}</td>
                      <td className="px-4 py-3">{formatAmount(tx.balanceAfter)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </DragScroll>

          <Pagination
            page={txPage}
            totalPages={txTotalPages}
            limit={txLimit}
            onPageChange={setTxPage}
            onLimitChange={(next) => {
              setTxLimit(next);
              setTxPage(1);
            }}
          />
	        </div>
	      )}

	      {activeTab === "Accounts" && (
	        <div className="w-full max-w-full overflow-x-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
	          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
	            <div>
	              <h3 className="text-lg font-semibold">Accounts Overview</h3>
	              <p className="text-xs text-[var(--text-muted)] mt-1">
	                View all user accounts, balances and trading settings
	              </p>
	            </div>
              <div className="flex flex-wrap items-center gap-2">
	              <span className="inline-flex items-center rounded-full border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-1 text-xs font-semibold text-[var(--text-main)]">
	                Total Live Accounts: {nonDemoAccounts.length}
	              </span>
                <button
                  type="button"
                  onClick={() => openBonusModal()}
                  disabled={!nonDemoAccounts.length}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1 text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--hover-bg)] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <DollarSign size={14} />
                  Add Bonus
                </button>
                <button
                  type="button"
                  onClick={() => openTradableFundModal()}
                  disabled={!nonDemoAccounts.length}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/15 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <DollarSign size={14} />
                  Add Tradable Fund
                </button>
                <button
                  type="button"
                  onClick={() => openInternalTransfer()}
                  disabled={nonDemoAccounts.length < 2}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1 text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--hover-bg)] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <ArrowLeftRight size={14} />
                  Internal Transfer
                </button>
              </div>
	          </div>

	          {accountsQuery.isLoading ? (
	            <div className="py-10">
	              <GlobalLoader />
	            </div>
	          ) : accountsQuery.isError ? (
	            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
	              Failed to load account details.
	            </div>
	          ) : accountList.length === 0 ? (
	            <div className="mt-4 rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] px-4 py-6 text-center text-sm text-[var(--text-muted)]">
	              No accounts found for this user.
	            </div>
	          ) : (
	            <>
	              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
	                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] p-3">
	                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
	                    Total Real Balance
	                  </p>
                  <p className={`mt-1 text-lg font-semibold ${getAmountClass(accountSummary.totalBalance, "text-emerald-600")}`}>
                    ${formatAmount(accountSummary.totalBalance)}
                  </p>
	                </div>
	                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] p-3">
	                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
	                    Total Bonus Balance
	                  </p>
                  <p className={`mt-1 text-lg font-semibold ${getAmountClass(accountSummary.totalBonusBalance, "text-violet-600")}`}>
                    ${formatAmount(accountSummary.totalBonusBalance)}
                  </p>
	                </div>
	                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] p-3">
	                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
	                    Total Hold Balance
	                  </p>
                  <p className={`mt-1 text-lg font-semibold ${getAmountClass(accountSummary.totalHoldBalance, "text-amber-600")}`}>
                    ${formatAmount(accountSummary.totalHoldBalance)}
                  </p>
	                </div>
	                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] p-3">
	                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
	                    Total Non-Withdrawable
	                  </p>
                  <p className={`mt-1 text-lg font-semibold ${getAmountClass(accountSummary.totalNonWithdrawableBalance, "text-rose-600")}`}>
                    ${formatAmount(accountSummary.totalNonWithdrawableBalance)}
                  </p>
	                </div>
	                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] p-3">
	                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
	                    Total Usable Balance
	                  </p>
                  <p className={`mt-1 text-lg font-semibold ${getAmountClass(accountSummary.totalUsableBalance, "text-sky-600")}`}>
                    ${formatAmount(accountSummary.totalUsableBalance)}
                  </p>
	                </div>
	                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] p-3">
	                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
	                    Active Accounts
	                  </p>
	                  <p className="mt-1 text-lg font-semibold text-[var(--text-main)]">
	                    {
	                      nonDemoAccounts.filter(
	                        (account) => (account.status ?? "").toLowerCase() === "active"
	                      ).length
	                    }
	                  </p>
	                </div>
	              </div>

	              <div className="mt-4 space-y-3 md:hidden">
	                {accountList.map((account) => {
	                  const statusValue = (account.status ?? "unknown").toUpperCase();
	                  const statusClass =
	                    statusValue === "ACTIVE"
	                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
	                      : statusValue === "INACTIVE"
	                      ? "border-amber-500/40 bg-amber-500/10 text-amber-700"
	                      : "border-[var(--card-border)] bg-[var(--chip-bg)] text-[var(--text-muted)]";
	                  const typeMeta = getAccountTypeMeta(account.account_type);
	                  const TypeIcon = typeMeta.icon;

	                  return (
	                    <div
	                      key={account._id}
	                      className={`rounded-lg border p-3 ${typeMeta.cardClassName}`}
	                    >
	                      <div className="flex items-center justify-between gap-2">
	                        <p className="font-mono text-xs font-semibold">
	                          {account.account_number ?? account._id}
	                        </p>
	                        <span
	                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusClass}`}
	                        >
	                          {statusValue}
	                        </span>
	                      </div>
	                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
	                        <p><span className="text-[var(--text-muted)]">Plan:</span> {account.plan_name ?? "--"}</p>
	                        <p className="inline-flex items-center gap-1.5">
	                          <span className="text-[var(--text-muted)]">Type:</span>
	                          <span
	                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${typeMeta.className}`}
	                          >
	                            <TypeIcon size={11} />
	                            {typeMeta.label}
	                          </span>
	                        </p>
                        <p>
                          <span className="text-[var(--text-muted)]">Balance:</span>{" "}
                          <span className={`font-semibold ${getAmountClass(account.balance, "text-emerald-600")}`}>
                            ${formatAmount(account.balance)}
                          </span>
                        </p>
                        <p>
                          <span className="text-[var(--text-muted)]">Hold:</span>{" "}
                          <span className={`font-semibold ${getAmountClass(account.hold_balance, "text-amber-600")}`}>
                            ${formatAmount(account.hold_balance)}
                          </span>
                        </p>
                        <p>
                          <span className="text-[var(--text-muted)]">Bonus:</span>{" "}
                          <span className={`font-semibold ${getAmountClass(account.bonus_balance, "text-violet-600")}`}>
                            ${formatAmount(account.bonus_balance)}
                          </span>
                        </p>
                        <p>
                          <span className="text-[var(--text-muted)]">Non-withdrawable:</span>{" "}
                          <span className={`font-semibold ${getAmountClass(account.non_withdrawable_balance, "text-rose-600")}`}>
                            ${formatAmount(account.non_withdrawable_balance)}
                          </span>
                        </p>
                        <p>
                          <span className="text-[var(--text-muted)]">Equity:</span>{" "}
                          <span className={`font-semibold ${getAmountClass(account.equity, "text-sky-600")}`}>
                            ${formatAmount(account.equity)}
                          </span>
                        </p>
	                        <p><span className="text-[var(--text-muted)]">Currency:</span> {account.currency ?? "--"}</p>
	                        <p><span className="text-[var(--text-muted)]">Leverage:</span> {account.leverage ? `x${account.leverage}` : "--"}</p>
	                        <p><span className="text-[var(--text-muted)]">Commission:</span> {account.commission_per_lot ?? "--"}</p>
                          <p>
                            <span className="text-[var(--text-muted)]">Bonus %:</span>{" "}
                            {account.bonus_percent_override === null ||
                            account.bonus_percent_override === undefined
                              ? "Default"
                              : account.bonus_percent_override}
                          </p>
	                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openAccountView(account)}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-xs font-medium hover:bg-[var(--hover-bg)]"
                        >
                          <Eye size={13} />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openAccountEdit(account)}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-xs font-medium hover:bg-[var(--hover-bg)]"
                        >
                          <Pencil size={13} />
                          Edit
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => openResetPassword(account, "trade")}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-500/20"
                        >
                          <KeyRound size={12} />
                          Reset Trade
                        </button>
                        <button
                          type="button"
                          onClick={() => openResetPassword(account, "watch")}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-[11px] font-semibold text-sky-700 hover:bg-sky-500/20"
                        >
                          <KeyRound size={12} />
                          Reset Investor
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

	              <DragScroll className="mt-4 hidden w-full min-w-0 max-w-full overflow-x-auto md:block">
	                <table className="w-full table-auto text-left text-sm">
	                  <thead className="bg-[var(--input-bg)] text-[var(--text-muted)] text-xs uppercase">
	                    <tr>
	                      <th className="px-4 py-3">Account</th>
	                      <th className="px-4 py-3">Plan</th>
	                      <th className="px-4 py-3">Type</th>
	                      <th className="px-4 py-3">Leverage</th>
	                      <th className="px-4 py-3">Bonus %</th>
	                      <th className="px-4 py-3">Spread</th>
	                      <th className="px-4 py-3">Commission/Lot</th>
	                      <th className="px-4 py-3">Swap</th>
	                      <th className="px-4 py-3">Real Balance</th>
	                      <th className="px-4 py-3">Bonus Balance</th>
	                      <th className="px-4 py-3">Hold</th>
	                      <th className="px-4 py-3">Usable</th>
	                      <th className="px-4 py-3">Currency</th>
	                      <th className="px-4 py-3">Status</th>
	                      <th className="px-4 py-3">First Deposit</th>
	                      <th className="px-4 py-3">Created</th>
	                      <th className="px-4 py-3">Updated</th>
	                      <th className="px-4 py-3">Actions</th>
	                    </tr>
	                  </thead>
	                  <tbody>
	                    {accountList.map((account) => {
	                      const statusValue = (account.status ?? "unknown").toUpperCase();
	                      const statusClass =
	                        statusValue === "ACTIVE"
	                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
	                          : statusValue === "INACTIVE"
	                          ? "border-amber-500/40 bg-amber-500/10 text-amber-700"
	                          : "border-[var(--card-border)] bg-[var(--chip-bg)] text-[var(--text-muted)]";
	                      const typeMeta = getAccountTypeMeta(account.account_type);
	                      const TypeIcon = typeMeta.icon;
	                      const rowToneClass =
	                        typeMeta.label === "DEMO"
	                          ? "bg-slate-500/[0.03]"
	                          : typeMeta.label === "LIVE"
	                          ? "bg-emerald-500/[0.02]"
	                          : "";

	                      return (
	                        <tr
	                          key={account._id}
	                          className={`border-t border-[var(--card-border)] ${rowToneClass}`}
	                        >
	                          <td className="px-4 py-3 font-mono">
	                            {account.account_number ?? account._id}
	                          </td>
	                          <td className="px-4 py-3">{account.plan_name ?? "--"}</td>
	                          <td className="px-4 py-3">
	                            <span
	                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${typeMeta.className}`}
	                            >
	                              <TypeIcon size={11} />
	                              {typeMeta.label}
	                            </span>
	                          </td>
	                          <td className="px-4 py-3">
	                            {account.leverage ? `x${account.leverage}` : "--"}
	                          </td>
	                          <td className="px-4 py-3">
	                            {account.bonus_percent_override === null ||
	                            account.bonus_percent_override === undefined
	                              ? "Default"
	                              : account.bonus_percent_override}
	                          </td>
	                          <td className="px-4 py-3">
	                            {account.spread_enabled === false
	                              ? "Disabled"
	                              : `${account.spread_pips ?? 0} pips`}
	                          </td>
	                          <td className="px-4 py-3">{account.commission_per_lot ?? "--"}</td>
	                          <td className="px-4 py-3">
	                            {account.swap_enabled === false
	                              ? "Disabled"
	                              : `${account.swap_charge ?? "--"}`}
	                          </td>
                          <td className={`px-4 py-3 font-medium ${getAmountClass(account.balance, "text-emerald-600")}`}>
                            ${formatAmount(account.balance)}
                          </td>
                          <td className={`px-4 py-3 font-medium ${getAmountClass(account.bonus_balance, "text-violet-600")}`}>
                            ${formatAmount(account.bonus_balance)}
                          </td>
                          <td className={`px-4 py-3 font-medium ${getAmountClass(account.hold_balance, "text-amber-600")}`}>
                            ${formatAmount(account.hold_balance)}
                          </td>
                          <td className={`px-4 py-3 font-medium ${getAmountClass(account.equity, "text-sky-600")}`}>
                            ${formatAmount(account.total_balance ?? account.equity)}
                          </td>
	                          <td className="px-4 py-3 uppercase">{account.currency ?? "--"}</td>
	                          <td className="px-4 py-3">
	                            <span
	                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusClass}`}
	                            >
	                              {statusValue}
	                            </span>
	                          </td>
	                          <td className="px-4 py-3">
	                            <span
	                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
	                                account.first_deposit
	                                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
	                                  : "border-slate-400/40 bg-slate-500/10 text-slate-700"
	                              }`}
	                            >
	                              {account.first_deposit ? "Yes" : "No"}
	                            </span>
	                          </td>
	                          <td className="px-4 py-3">{formatDateTime(account.createdAt)}</td>
	                          <td className="px-4 py-3">{formatDateTime(account.updatedAt)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openAccountView(account)}
                                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--hover-bg)]"
                              >
                                <Eye size={12} />
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => openAccountEdit(account)}
                                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--hover-bg)]"
                              >
                                <Pencil size={12} />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => openResetPassword(account, "trade")}
                                className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-500/20"
                              >
                                <KeyRound size={12} />
                                Trade PW
                              </button>
                              <button
                                type="button"
                                onClick={() => openResetPassword(account, "watch")}
                                className="inline-flex items-center gap-1.5 rounded-md border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-500/20"
                              >
                                <KeyRound size={12} />
                                Investor PW
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
	                  </tbody>
	                </table>
	              </DragScroll>
	            </>
	          )}
	        </div>
	      )}
	
	
	      {activeTab === "Active Trades" && (
	        <div className="rounded-2xl border border-[var(--card-border)] bg-gradient-to-br from-[var(--card-bg)] via-[var(--card-bg)] to-emerald-500/5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                Live Stream
              </div>
              <h3 className="mt-2 text-lg font-semibold">Active Positions</h3>
              <p className="text-xs text-[var(--text-muted)]">
                WebSocket:
                <span
                  className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getLiveStatusClass(
                    effectiveLiveStatus
                  )}`}
                >
                  {effectiveLiveStatus}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-xs text-[var(--text-muted)]">
                Accounts: {accountIds.length} | Positions: {filteredLivePositions.length}
              </div>
              <div className="min-w-[200px]">
                <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  Account Filter
                </p>
                <CustomSelect
                  value={liveAccountFilter}
                  onChange={setLiveAccountFilter}
                  options={accountOptions}
                  placeholder="All Accounts"
                  buttonClassName="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-3">
              <p className="text-[11px] uppercase tracking-wide text-emerald-700">BUY</p>
              <p className="mt-1 text-xl font-semibold text-emerald-700">
                {liveSummary.buy}
              </p>
            </div>
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] p-3">
              <p className="text-[11px] uppercase tracking-wide text-rose-700">SELL</p>
              <p className="mt-1 text-xl font-semibold text-rose-700">
                {liveSummary.sell}
              </p>
            </div>
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/[0.06] p-3">
              <p className="text-[11px] uppercase tracking-wide text-sky-700">Total</p>
              <p className="mt-1 text-xl font-semibold text-sky-700">
                {liveSummary.total}
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3">
              <p className="text-[11px] uppercase tracking-wide text-amber-700">Floating PnL</p>
              <p className={`mt-1 text-xl font-semibold ${getPnlClass(liveSummary.pnl)}`}>
                {formatLiveNumber(liveSummary.pnl, 2)}
              </p>
            </div>
          </div>

          {filteredLivePositions.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--input-bg)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
              No live positions for this account. Try another filter or keep this tab
              open to receive updates.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <DragScroll className="overflow-x-auto">
                <table className="min-w-[1200px] w-full text-left text-sm">
                <thead className="bg-[var(--input-bg)] text-xs uppercase text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-3">Symbol</th>
                    <th className="px-4 py-3">Side</th>
                    <th className="px-4 py-3">Volume</th>
                    <th className="px-4 py-3">Open Price</th>
                    <th className="px-4 py-3">Current Price</th>
                    <th className="px-4 py-3">Stop Loss</th>
                    <th className="px-4 py-3">Take Profit</th>
                    <th className="px-4 py-3">Floating PnL</th>
                    <th className="px-4 py-3">Account</th>
                    <th className="px-4 py-3">Position ID</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLivePositions.map((position) => (
                    <tr
                      key={position.positionId}
                      className="border-b border-[var(--card-border)] even:bg-[var(--input-bg)]/40"
                    >
                      <td className="px-4 py-3 font-medium">
                        {position.symbol ?? "--"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getSideClass(
                            position.side
                          )}`}
                        >
                          {position.side ?? "--"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {formatLiveNumber(position.volume, 2)}
                      </td>
                      <td className="px-4 py-3">
                        {formatLivePrice(position.openPrice)}
                      </td>
                      <td className="px-4 py-3">
                        {formatLivePrice(position.currentPrice)}
                      </td>
                      <td className="px-4 py-3">
                        {formatLivePrice(position.stopLoss ?? undefined)}
                      </td>
                      <td className="px-4 py-3">
                        {formatLivePrice(position.takeProfit ?? undefined)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={getPnlClass(position.floatingPnL)}>
                          {formatLiveNumber(position.floatingPnL, 2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {resolveAccountLabel(position.accountId)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {displayTicket(position)}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {formatDateTime(position.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openPositionAction(position)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1 text-xs font-semibold hover:bg-[var(--hover-bg)]"
                          >
                            <Pencil size={12} />
                            Modify
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePositionClose(position)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-500/20"
                          >
                            <XCircle size={12} />
                            Close
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </DragScroll>
            </div>
          )}
        </div>
      )}

      {activeTab === "Closed Trades" && (
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Closed Trades</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Total: {closedTotal}
              </p>
            </div>
            <div className="min-w-[200px]">
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                Account Filter
              </p>
              <CustomSelect
                value={closedAccountFilter}
                onChange={(value) => {
                  setClosedAccountFilter(value);
                  setClosedPage(1);
                }}
                options={accountOptions}
                placeholder="All Accounts"
                buttonClassName="h-9 text-xs"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3">
              <p className="text-[11px] uppercase tracking-wide text-sky-700">
                Total Trades
              </p>
              <p className="mt-1 text-xl font-semibold text-sky-700">
                {closedTotal}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                On page: {closedSummary.pageTrades}
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="text-[11px] uppercase tracking-wide text-amber-700">
                Total Volume (page)
              </p>
              <p className="mt-1 text-xl font-semibold text-amber-700">
                {formatLiveNumber(closedSummary.totalVolume, 2)}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <p className="text-[11px] uppercase tracking-wide text-emerald-700">
                Net PnL (page)
              </p>
              <p
                className={`mt-1 text-xl font-semibold ${getPnlClass(
                  closedSummary.totalPnl
                )}`}
              >
                {formatLiveNumber(closedSummary.totalPnl, 2)}
              </p>
            </div>
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3">
              <p className="text-[11px] uppercase tracking-wide text-violet-700">
                Win Rate (page)
              </p>
              <p className="mt-1 text-xl font-semibold text-violet-700">
                {closedSummary.pageTrades
                  ? Math.round((closedSummary.wins / closedSummary.pageTrades) * 100)
                  : 0}
                %
              </p>
            </div>
          </div>

          {closedTradesQuery.isLoading ? (
            <div className="mt-6">
              <GlobalLoader />
            </div>
          ) : closedTrades.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--input-bg)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
              No closed trades found for this user.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <DragScroll className="overflow-x-auto">
                <table className="min-w-[1200px] w-full text-left text-sm">
                  <thead className="bg-[var(--input-bg)] text-xs uppercase text-[var(--text-muted)]">
                    <tr>
                      <th className="px-4 py-3">Symbol</th>
                      <th className="px-4 py-3">Side</th>
                      <th className="px-4 py-3">Order Type</th>
                      <th className="px-4 py-3">Volume</th>
                      <th className="px-4 py-3">Open</th>
                      <th className="px-4 py-3">Close</th>
                      <th className="px-4 py-3">Realized PnL</th>
                      <th className="px-4 py-3">Open Time</th>
                      <th className="px-4 py-3">Close Time</th>
                      <th className="px-4 py-3">Account</th>
                      <th className="px-4 py-3">Position ID</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closedTrades.map((trade) => (
                      <tr
                        key={trade._id}
                        className="border-b border-[var(--card-border)] even:bg-[var(--input-bg)]/40"
                      >
                        <td className="px-4 py-3 font-medium">
                          {trade.symbol ?? "--"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getSideClass(
                              trade.side
                            )}`}
                          >
                            {trade.side ?? "--"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getOrderTypeClass(
                              trade.orderType
                            )}`}
                          >
                            {trade.orderType ?? "--"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {formatLiveNumber(trade.volume, 2)}
                        </td>
                        <td className="px-4 py-3">
                          {formatLivePrice(trade.openPrice)}
                        </td>
                        <td className="px-4 py-3">
                          {formatLivePrice(trade.closePrice)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={getPnlClass(trade.realizedPnL)}>
                            {formatLiveNumber(trade.realizedPnL, 2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {formatDateTime(trade.openTime)}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {formatDateTime(trade.closeTime)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {trade.accountNumber ||
                            resolveAccountLabel(trade.accountId)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {displayTicket(trade)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openClosedEdit(trade)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1 text-xs font-semibold hover:bg-[var(--hover-bg)]"
                          >
                            <Pencil size={12} />
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DragScroll>

              <Pagination
                page={closedPage}
                totalPages={closedTotalPages}
                limit={closedLimit}
                onPageChange={setClosedPage}
                onLimitChange={(value) => {
                  setClosedLimit(value);
                  setClosedPage(1);
                }}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === "Pending Trades" && (
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Open Pending Orders</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Total: {pendingTotal}
              </p>
            </div>
            <div className="min-w-[200px]">
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                Account Filter
              </p>
              <CustomSelect
                value={pendingAccountFilter}
                onChange={(value) => {
                  setPendingAccountFilter(value);
                  setPendingPage(1);
                }}
                options={accountOptions}
                placeholder="All Accounts"
                buttonClassName="h-9 text-xs"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3">
              <p className="text-[11px] uppercase tracking-wide text-sky-700">
                Total Orders
              </p>
              <p className="mt-1 text-xl font-semibold text-sky-700">
                {pendingTotal}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                On page: {pendingSummary.pageOrders}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <p className="text-[11px] uppercase tracking-wide text-emerald-700">
                BUY
              </p>
              <p className="mt-1 text-xl font-semibold text-emerald-700">
                {pendingSummary.buy}
              </p>
            </div>
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
              <p className="text-[11px] uppercase tracking-wide text-rose-700">
                SELL
              </p>
              <p className="mt-1 text-xl font-semibold text-rose-700">
                {pendingSummary.sell}
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="text-[11px] uppercase tracking-wide text-amber-700">
                Total Volume (page)
              </p>
              <p className="mt-1 text-xl font-semibold text-amber-700">
                {formatLiveNumber(pendingSummary.totalVolume, 2)}
              </p>
            </div>
          </div>

          {pendingOpenQuery.isLoading ? (
            <div className="mt-6">
              <GlobalLoader />
            </div>
          ) : pendingOpenTrades.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--input-bg)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
              No open pending orders found for this user.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <DragScroll className="overflow-x-auto">
                <table className="min-w-[1200px] w-full text-left text-sm">
                  <thead className="bg-[var(--input-bg)] text-xs uppercase text-[var(--text-muted)]">
                    <tr>
                      <th className="px-4 py-3">Symbol</th>
                      <th className="px-4 py-3">Side</th>
                      <th className="px-4 py-3">Order Type</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3">Live Price</th>
                      <th className="px-4 py-3">Trigger Left</th>
                      <th className="px-4 py-3">Volume</th>
                      <th className="px-4 py-3">Stop Loss</th>
                      <th className="px-4 py-3">Take Profit</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3">Updated</th>
                      <th className="px-4 py-3">Account</th>
                      <th className="px-4 py-3">Order ID</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingOpenTrades.map((order) => (
                      <tr
                        key={order._id}
                        className="border-b border-[var(--card-border)] even:bg-[var(--input-bg)]/40"
                      >
                        <td className="px-4 py-3 font-medium">
                          {order.symbol ?? "--"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getSideClass(
                              order.side
                            )}`}
                          >
                            {order.side ?? "--"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getOrderTypeClass(
                              order.orderType
                            )}`}
                          >
                            {order.orderType ?? "--"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {formatLivePrice(order.price)}
                        </td>
                        <td className="px-4 py-3">
                          {formatLivePrice(getPendingLivePrice(order))}
                        </td>
                        <td className="px-4 py-3">
                          {(() => {
                            const info = getPendingTriggerInfo(order);
                            if (info.status === "ready") {
                              return (
                                <span className="inline-flex rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                                  Ready
                                </span>
                              );
                            }
                            if (info.status === "away") {
                              return (
                                <span className="text-xs font-semibold text-[var(--text-muted)]">
                                  {formatLivePrice(info.value)} away
                                </span>
                              );
                            }
                            return <span className="text-xs text-[var(--text-muted)]">--</span>;
                          })()}
                        </td>
                        <td className="px-4 py-3">
                          {formatLiveNumber(order.volume, 2)}
                        </td>
                        <td className="px-4 py-3">
                          {formatLivePrice(order.stopLoss ?? undefined)}
                        </td>
                        <td className="px-4 py-3">
                          {formatLivePrice(order.takeProfit ?? undefined)}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {formatDateTime(order.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {formatDateTime(order.updatedAt)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {order.accountNumber ||
                            resolveAccountLabel(order.accountId)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {displayTicket(order)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openPendingAction(order)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1 text-xs font-semibold hover:bg-[var(--hover-bg)]"
                            >
                              <Pencil size={12} />
                              Modify
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePendingCancel(order)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-500/20"
                            >
                              <XCircle size={12} />
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DragScroll>

              <Pagination
                page={pendingPage}
                totalPages={pendingTotalPages}
                limit={pendingLimit}
                onPageChange={setPendingPage}
                onLimitChange={(value) => {
                  setPendingLimit(value);
                  setPendingPage(1);
                }}
              />
            </div>
          )}
        </div>
      )}

      <Modal
        title="Account Details"
        open={accountViewOpen}
        onClose={() => setAccountViewOpen(false)}
        size="md"
      >
        {!selectedAccount ? (
          <p className="text-sm text-[var(--text-muted)]">No account selected.</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-sm font-semibold">
                  {selectedAccount.account_number ?? selectedAccount._id}
                </p>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    selectedAccountTypeMeta.className
                  }`}
                >
                  <SelectedAccountTypeIcon size={11} />
                  {selectedAccountTypeMeta.label}
                </span>
              </div>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Plan: {selectedAccount.plan_name ?? "--"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
                <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Real Balance</p>
                <p className={`mt-1 font-semibold ${getAmountClass(selectedAccount.balance, "text-emerald-600")}`}>
                  ${formatAmount(selectedAccount.balance)}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
                <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Bonus Balance</p>
                <p className={`mt-1 font-semibold ${getAmountClass(selectedAccount.bonus_balance, "text-violet-600")}`}>
                  ${formatAmount(selectedAccount.bonus_balance)}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
                <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Hold</p>
                <p className={`mt-1 font-semibold ${getAmountClass(selectedAccount.hold_balance, "text-amber-600")}`}>
                  ${formatAmount(selectedAccount.hold_balance)}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
                <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Usable Balance</p>
                <p className={`mt-1 font-semibold ${getAmountClass(selectedAccount.total_balance ?? selectedAccount.equity, "text-sky-600")}`}>
                  ${formatAmount(selectedAccount.total_balance ?? selectedAccount.equity)}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
                <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Status</p>
                <p className="mt-1 font-semibold uppercase text-[var(--text-main)]">
                  {selectedAccount.status ?? "--"}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
                <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Leverage</p>
                <p className="mt-1 font-semibold text-[var(--text-main)]">
                  {selectedAccount.leverage ? `x${selectedAccount.leverage}` : "--"}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
                <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Currency</p>
                <p className="mt-1 font-semibold uppercase text-[var(--text-main)]">
                  {selectedAccount.currency ?? "--"}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
                <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Bonus %</p>
                <p className="mt-1 font-semibold text-[var(--text-main)]">
                  {selectedAccount.bonus_percent_override === null ||
                  selectedAccount.bonus_percent_override === undefined
                    ? "Default"
                    : selectedAccount.bonus_percent_override}
                </p>
              </div>
            </div>

          </div>
        )}
      </Modal>

      <Modal
        title="Add Bonus"
        open={bonusModalOpen}
        onClose={closeBonusModal}
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeBonusModal}
              className="w-full rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold hover:bg-[var(--hover-bg)] sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-bonus-form"
              disabled={bonusCreditMutation.isPending}
              className="w-full rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] disabled:opacity-60 sm:w-auto"
            >
              {bonusCreditMutation.isPending ? "Adding..." : "Submit"}
            </button>
          </div>
        }
      >
        <form id="add-bonus-form" onSubmit={handleBonusSubmit} className="space-y-4">
          {bonusError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {bonusError}
            </div>
          ) : null}

          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-3 text-xs text-[var(--text-muted)]">
            Manual bonus only updates `bonusBalance`. Deposits continue updating only the real balance.
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-muted)]">Select Account</label>
            <select
              value={bonusAccountId}
              onChange={(event) => setBonusAccountId(event.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              <option value="">Select live account</option>
              {nonDemoAccounts
                .filter((account) => (account.account_type ?? "").toLowerCase() === "live")
                .map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.account_number || account._id} | Real ${formatAmount(account.balance)} | Bonus ${formatAmount(account.bonus_balance)}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-muted)]">Bonus Amount</label>
            <FieldControl icon={DollarSign}>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={bonusAmount}
                onChange={(event) => setBonusAmount(event.target.value)}
                placeholder="Enter bonus amount"
                className="w-full bg-transparent text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </FieldControl>
          </div>
        </form>
      </Modal>

      <Modal
        title="Add Tradable Fund"
        open={tradableFundModalOpen}
        onClose={closeTradableFundModal}
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeTradableFundModal}
              className="w-full rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold hover:bg-[var(--hover-bg)] sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-tradable-fund-form"
              disabled={tradableFundCreditMutation.isPending}
              className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 sm:w-auto"
            >
              {tradableFundCreditMutation.isPending ? "Adding..." : "Submit"}
            </button>
          </div>
        }
      >
        <form
          id="add-tradable-fund-form"
          onSubmit={handleTradableFundSubmit}
          className="space-y-4"
        >
          {tradableFundError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {tradableFundError}
            </div>
          ) : null}

          <div className="rounded-xl border border-amber-300/40 bg-amber-500/5 px-3 py-3 text-xs text-amber-800">
            Tradable fund updates real balance for trading, but the added amount remains
            non-withdrawable. It can be used in trades and can also be lost in trading.
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-muted)]">
              Select Account
            </label>
            <select
              value={tradableFundAccountId}
              onChange={(event) => setTradableFundAccountId(event.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Select live account</option>
              {nonDemoAccounts
                .filter((account) => (account.account_type ?? "").toLowerCase() === "live")
                .map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.account_number || account._id} | Real ${formatAmount(account.balance)} | Locked ${formatAmount(account.non_withdrawable_balance)}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-muted)]">
              Tradable Fund Amount
            </label>
            <FieldControl icon={DollarSign}>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={tradableFundAmount}
                onChange={(event) => setTradableFundAmount(event.target.value)}
                placeholder="Enter tradable fund amount"
                className="w-full bg-transparent text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </FieldControl>
          </div>
        </form>
      </Modal>

      <Modal
        title="Internal Transfer"
        open={internalTransferOpen}
        onClose={closeInternalTransfer}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeInternalTransfer}
              className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold hover:bg-[var(--hover-bg)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="internal-transfer-form"
              disabled={internalTransferMutation.isPending || !internalTransferCanSubmit}
              className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] disabled:opacity-60"
            >
              {internalTransferMutation.isPending ? "Transferring..." : "Transfer"}
            </button>
          </div>
        }
      >
        {nonDemoAccounts.length < 2 ? (
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] px-4 py-4 text-sm text-[var(--text-muted)]">
            Internal transfer requires at least two live accounts.
          </div>
        ) : (
          <form
            id="internal-transfer-form"
            onSubmit={handleInternalTransferSubmit}
            className="space-y-4"
          >
            {internalTransferError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {internalTransferError}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                  From account
                </label>
                <CustomSelect
                  value={internalTransferFrom}
                  onChange={(value) => {
                    setInternalTransferFrom(value);
                    setInternalTransferTo((prev) => {
                      if (prev && prev !== value) return prev;
                      return nonDemoAccounts.find((acc) => acc._id !== value)?._id ?? "";
                    });
                    setInternalTransferError("");
                  }}
                  placeholder="Select account"
                  toneClass="border-slate-300/70"
                  options={internalTransferAccountOptions}
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                  To account
                </label>
                <CustomSelect
                  value={internalTransferTo}
                  onChange={(value) => {
                    setInternalTransferTo(value);
                    setInternalTransferError("");
                  }}
                  placeholder="Select account"
                  toneClass="border-slate-300/70"
                  options={internalTransferToOptions}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] p-3 text-xs">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  Balance
                </p>
                <p className="mt-1 font-semibold text-emerald-700">
                  ${formatAmount(internalFromBalance)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  Hold
                </p>
                <p className="mt-1 font-semibold text-amber-700">
                  ${formatAmount(internalFromHold)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  Equity
                </p>
                <p className="mt-1 font-semibold text-sky-700">
                  ${formatAmount(internalFromEquity)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  Max transferable
                </p>
                <p className="mt-1 font-semibold text-[var(--text-main)]">
                  ${formatAmount(internalMaxTransferableRounded)}
                </p>
              </div>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                Amount
              </label>
              <FieldControl
                icon={DollarSign}
                trailing={
                  <button
                    type="button"
                    onClick={() => {
                      setInternalTransferAmount(String(internalMaxTransferableRounded));
                      setInternalTransferError("");
                    }}
                    disabled={internalMaxTransferableRounded <= 0}
                    className="text-xs font-semibold text-[var(--primary)] disabled:opacity-50"
                  >
                    Max
                  </button>
                }
              >
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max={internalMaxTransferableRounded || undefined}
                  step="0.01"
                  value={internalTransferAmount}
                  onChange={(event) => {
                    setInternalTransferAmount(event.target.value);
                    setInternalTransferError("");
                  }}
                  placeholder="Enter amount"
                  className="w-full bg-transparent text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]"
                />
              </FieldControl>
              {internalMaxTransferableRounded <= 0 ? (
                <p className="mt-2 text-xs text-rose-600">
                  Transfer not allowed: equity must be greater than 0 and amount must be within available balance.
                </p>
              ) : (
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Amount must be greater than 0 and less than or equal to{" "}
                  <span className="font-semibold">${formatAmount(internalMaxTransferableRounded)}</span>.
                </p>
              )}
            </div>
          </form>
        )}
      </Modal>

      <Modal
        title={`Reset ${
          resetPasswordType === "trade" ? "Trade" : "Investor"
        } Password`}
        open={resetPasswordOpen}
        onClose={closeResetPassword}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeResetPassword}
              className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold hover:bg-[var(--hover-bg)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleResetAccountPassword}
              disabled={
                resetPasswordType === "trade"
                  ? resetTradePasswordMutation.isPending
                  : resetWatchPasswordMutation.isPending
              }
              className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] disabled:opacity-60"
            >
              {resetPasswordType === "trade"
                ? resetTradePasswordMutation.isPending
                  ? "Resetting..."
                  : "Reset Trade Password"
                : resetWatchPasswordMutation.isPending
                ? "Resetting..."
                : "Reset Investor Password"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {accountPasswordError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {accountPasswordError}
            </div>
          ) : null}

          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--text-muted)]">
            Account:{" "}
            <span className="font-mono text-[var(--foreground)]">
              {resetPasswordAccount?.account_number ??
                resetPasswordAccount?._id ??
                "--"}
            </span>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-muted)]">
              New Password
            </label>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2">
              <input
                type={showAccountPassword ? "text" : "password"}
                value={accountPassword}
                onChange={(event) => setAccountPassword(event.target.value)}
                placeholder="Enter new password"
                className="w-full bg-transparent text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setShowAccountPassword((prev) => !prev)}
                className="text-[var(--text-muted)] hover:text-[var(--foreground)]"
              >
                {showAccountPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-muted)]">
              Confirm Password
            </label>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2">
              <input
                type={showAccountPasswordConfirm ? "text" : "password"}
                value={accountPasswordConfirm}
                onChange={(event) => setAccountPasswordConfirm(event.target.value)}
                placeholder="Confirm new password"
                className="w-full bg-transparent text-sm outline-none"
              />
              <button
                type="button"
                onClick={() =>
                  setShowAccountPasswordConfirm((prev) => !prev)
                }
                className="text-[var(--text-muted)] hover:text-[var(--foreground)]"
              >
                {showAccountPasswordConfirm ? (
                  <EyeOff size={16} />
                ) : (
                  <Eye size={16} />
                )}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        title="Edit Account Settings"
        open={accountEditOpen}
        onClose={closeAccountEdit}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeAccountEdit}
              className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold hover:bg-[var(--hover-bg)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-account-form"
              disabled={updateAccountMutation.isPending || !selectedAccount}
              className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] disabled:opacity-60"
            >
              {updateAccountMutation.isPending ? "Updating..." : "Update Account"}
            </button>
          </div>
        }
      >
        <form id="edit-account-form" onSubmit={handleAccountUpdateSubmit} className="space-y-4">
          {accountFormError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {accountFormError}
            </div>
          )}

          {!selectedAccount ? (
            <p className="text-sm text-[var(--text-muted)]">No account selected.</p>
          ) : (
            <>
              <div className="rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] p-3 text-sm">
                <p className="font-mono font-semibold">
                  {selectedAccount.account_number ?? selectedAccount._id}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Configure account trading parameters and status.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-[var(--text-muted)]">Leverage</label>
                  <FieldControl icon={Rocket}>
                    <input
                      type="number"
                      min={0}
                      value={accountForm.leverage}
                      onChange={handleAccountFormField("leverage")}
                      className="w-full bg-transparent text-sm text-[var(--text-main)] outline-none"
                    />
                  </FieldControl>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-muted)]">Spread Enabled</label>
                  <FieldControl icon={Globe}>
                    <select
                      value={accountForm.spread_enabled}
                      onChange={handleAccountFormField("spread_enabled")}
                      className="w-full bg-transparent text-sm text-[var(--text-main)] outline-none"
                    >
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  </FieldControl>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-muted)]">Spread Pips</label>
                  <FieldControl icon={Hash}>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={accountForm.spread_pips}
                      onChange={handleAccountFormField("spread_pips")}
                      className="w-full bg-transparent text-sm text-[var(--text-main)] outline-none"
                    />
                  </FieldControl>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-muted)]">Commission Per Lot</label>
                  <FieldControl icon={Hash}>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={accountForm.commission_per_lot}
                      onChange={handleAccountFormField("commission_per_lot")}
                      className="w-full bg-transparent text-sm text-[var(--text-main)] outline-none"
                    />
                  </FieldControl>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-muted)]">Swap Enabled</label>
                  <FieldControl icon={Globe}>
                    <select
                      value={accountForm.swap_enabled}
                      onChange={handleAccountFormField("swap_enabled")}
                      className="w-full bg-transparent text-sm text-[var(--text-main)] outline-none"
                    >
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  </FieldControl>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-muted)]">Swap Charge</label>
                  <FieldControl icon={Hash}>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={accountForm.swap_charge}
                      onChange={handleAccountFormField("swap_charge")}
                      className="w-full bg-transparent text-sm text-[var(--text-main)] outline-none"
                    />
                  </FieldControl>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-muted)]">
                    Bonus Override (%)
                  </label>
                  <FieldControl icon={Percent}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      value={accountForm.bonus_percent_override}
                      onChange={handleAccountFormField("bonus_percent_override")}
                      placeholder="Default"
                      className="w-full bg-transparent text-sm text-[var(--text-main)] outline-none"
                    />
                  </FieldControl>
                  <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                    Leave empty to use global bonus.
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-[var(--text-muted)]">Status</label>
                  <FieldControl icon={ShieldCheck}>
                    <select
                      value={accountForm.status}
                      onChange={handleAccountFormField("status")}
                      className="w-full bg-transparent text-sm text-[var(--text-main)] outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </FieldControl>
                </div>
              </div>
            </>
          )}
        </form>
      </Modal>

      <TradeEditModal
        open={positionActionOpen}
        mode="live"
        trade={
          positionAction
            ? {
                accountId: positionAction.accountId,
                userId: String(userId),
                positionId: positionAction.positionId,
                ticket: positionAction.ticket,
                accountNumber: resolveAccountLabel(positionAction.accountId),
                symbol: positionAction.symbol,
                side: positionAction.side,
                volume: positionAction.volume,
                openPrice: positionAction.openPrice,
                stopLoss: positionAction.stopLoss,
                takeProfit: positionAction.takeProfit,
              }
            : null
        }
        saving={modifyPositionMutation.isPending}
        error={positionActionError}
        onClose={closePositionAction}
        onSubmit={handlePositionModifySubmit}
      />

      <TradeEditModal
        open={pendingActionOpen}
        mode="pending"
        trade={
          pendingAction
            ? {
                accountId: pendingAction.accountId,
                userId: pendingAction.userId || String(userId),
                orderId: pendingAction.orderId,
                ticket: pendingAction.ticket,
                accountNumber:
                  pendingAction.accountNumber ||
                  resolveAccountLabel(pendingAction.accountId),
                symbol: pendingAction.symbol,
                side: String(pendingAction.side),
                volume: pendingAction.volume,
                price: pendingAction.price,
                stopLoss: pendingAction.stopLoss,
                takeProfit: pendingAction.takeProfit,
              }
            : null
        }
        saving={modifyPendingMutation.isPending}
        error={pendingActionError}
        onClose={closePendingAction}
        onSubmit={handlePendingModifySubmit}
      />

      <TradeEditModal
        open={closedEditOpen}
        mode="closed"
        trade={
          closedEditTrade
            ? {
                accountId: closedEditTrade.accountId,
                userId: closedEditTrade.userId || String(userId),
                tradeId: closedEditTrade._id,
                positionId: closedEditTrade.positionId,
                ticket: closedEditTrade.ticket,
                accountNumber:
                  closedEditTrade.accountNumber ||
                  resolveAccountLabel(closedEditTrade.accountId),
                symbol: closedEditTrade.symbol,
                side: String(closedEditTrade.side),
                volume: closedEditTrade.volume,
                openPrice: closedEditTrade.openPrice,
                closePrice: closedEditTrade.closePrice,
                contractSize: closedEditTrade.contractSize,
                stopLoss: closedEditTrade.stopLoss,
                takeProfit: closedEditTrade.takeProfit,
                commission: closedEditTrade.commission,
                spread: closedEditTrade.spread,
                swap: closedEditTrade.swap,
                realizedPnL: closedEditTrade.realizedPnL,
                closeReason: closedEditTrade.closeReason,
              }
            : null
        }
        saving={modifyClosedMutation.isPending}
        error={closedEditError}
        onClose={closeClosedEdit}
        onSubmit={handleClosedEditSubmit}
      />

      <Modal
        title="Delete Account"
        open={deleteActionOpen}
        onClose={closeDeleteAction}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeDeleteAction}
              disabled={deleteUserMutation.isPending || deleteTradeAccountMutation.isPending}
              className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold hover:bg-[var(--hover-bg)] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteAction}
              disabled={deleteUserMutation.isPending || deleteTradeAccountMutation.isPending}
              className="rounded-md border border-rose-600 bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {deleteUserMutation.isPending || deleteTradeAccountMutation.isPending
                ? "Deleting..."
                : "Delete"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-700">
            This action is permanent and cannot be undone.
          </div>

          {deleteActionError && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {deleteActionError}
            </div>
          )}

          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
              <input
                type="radio"
                name="delete-mode"
                checked={deleteMode === "whole"}
                onChange={() => setDeleteMode("whole")}
                className="mt-1"
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-semibold text-[var(--text-main)]">
                  Delete Whole User Account
                </span>
                <span className="block text-xs text-[var(--text-muted)]">
                  Removes user profile and all trading accounts.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
              <input
                type="radio"
                name="delete-mode"
                checked={deleteMode === "trade"}
                onChange={() => setDeleteMode("trade")}
                className="mt-1"
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-semibold text-[var(--text-main)]">
                  Delete Trade Login Account
                </span>
                <span className="block text-xs text-[var(--text-muted)]">
                  Deletes only one selected trading account.
                </span>
              </span>
            </label>
          </div>

          {deleteMode === "trade" && (
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)]">
                Select trading account
              </label>
              <select
                value={deleteTradeAccountId}
                onChange={(event) => setDeleteTradeAccountId(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                <option value="">Select account</option>
                {accountList.map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.account_number || account._id} ({(account.account_type || "--").toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        title="User Details"
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        size="lg"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <User size={12} /> Full Name
            </div>
            <p className="mt-1 text-sm font-medium">
              {profileSnapshot.name || "--"}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <Mail size={12} /> Email
            </div>
            <p className="mt-1 text-sm font-medium">
              {profileSnapshot.email || "--"}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <Phone size={12} /> Phone
            </div>
            <p className="mt-1 text-sm font-medium">
              {profileSnapshot.phone || "--"}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <Mail size={12} /> Mail Verified
            </div>
            <div className="mt-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase ${mailBadgeClass}`}
              >
                {profileSnapshot.isMailVerified ? "Verified" : "Unverified"}
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <ShieldCheck size={12} /> KYC Status
            </div>
            <div className="mt-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase ${kycBadgeClass}`}
              >
                {(profileSnapshot.kycStatus || "STATUS").replaceAll("_", " ")}
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <Calendar size={12} /> Date of Birth
            </div>
            <p className="mt-1 text-sm font-medium">
              {userQuery.data?.date_of_birth
                ? userQuery.data.date_of_birth.slice(0, 10)
                : "--"}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <Users size={12} /> Gender
            </div>
            <p className="mt-1 text-sm font-medium">
              {userQuery.data?.gender ?? form.gender ?? "--"}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3 sm:col-span-2">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <MapPin size={12} /> Address Line 1
            </div>
            <p className="mt-1 text-sm font-medium">
              {userQuery.data?.address_line_1 ?? form.address_line_1 ?? "--"}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3 sm:col-span-2">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <Building2 size={12} /> Address Line 2
            </div>
            <p className="mt-1 text-sm font-medium">
              {userQuery.data?.address_line_2 ?? form.address_line_2 ?? "--"}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <MapPin size={12} /> City
            </div>
            <p className="mt-1 text-sm font-medium">
              {userQuery.data?.city ?? form.city ?? "--"}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <MapPin size={12} /> State
            </div>
            <p className="mt-1 text-sm font-medium">
              {userQuery.data?.state ?? form.state ?? "--"}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <Globe size={12} /> Country
            </div>
            <p className="mt-1 text-sm font-medium">
              {userQuery.data?.country ?? form.country ?? "--"}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <Hash size={12} /> Pincode
            </div>
            <p className="mt-1 text-sm font-medium">
              {userQuery.data?.pincode ?? form.pincode ?? "--"}
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        title="Edit Profile"
        open={editOpen}
        onClose={() => setEditOpen(false)}
        size="xl"
        footer={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold hover:bg-[var(--hover-bg)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-profile-form"
              disabled={!canSubmit}
              className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] disabled:opacity-60"
            >
              Save Changes
            </button>
          </div>
        }
      >
        <form id="edit-profile-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)]">Full Name</label>
              <FieldControl icon={User}>
                <input
                  value={form.name ?? ""}
                  onChange={handleChange("name")}
                  placeholder="Enter full name"
                  className="w-full bg-transparent text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]"
                />
              </FieldControl>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)]">Phone</label>
              <FieldControl icon={Phone}>
                <input
                  value={form.phone ?? ""}
                  onChange={handleChange("phone")}
                  placeholder="Enter phone number"
                  className="w-full bg-transparent text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]"
                />
              </FieldControl>
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
                <Mail size={12} /> Mail Verified
              </label>
              <CustomSelect
                value={form.isMailVerified ? "true" : "false"}
                onChange={(next) => {
                  setForm((prev) => ({ ...prev, isMailVerified: next === "true" }));
                  setTouched((prev) => ({ ...prev, isMailVerified: true }));
                }}
                placeholder="Select status"
                options={[
                  { value: "true", label: "Verified", dotClass: "bg-emerald-500" },
                  { value: "false", label: "Unverified", dotClass: "bg-amber-500" },
                ]}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
                <ShieldCheck size={12} /> KYC Status
              </label>
              <CustomSelect
                value={form.kycStatus || "NOT_STARTED"}
                onChange={(next) => {
                  setForm((prev) => ({ ...prev, kycStatus: next }));
                  setTouched((prev) => ({ ...prev, kycStatus: true }));
                }}
                placeholder="Select KYC status"
                options={[
                  { value: "VERIFIED", label: "Verified", dotClass: "bg-emerald-500" },
                  { value: "PENDING", label: "Pending", dotClass: "bg-amber-500" },
                  { value: "NOT_STARTED", label: "Not Started", dotClass: "bg-slate-500" },
                  { value: "REJECTED", label: "Rejected", dotClass: "bg-rose-500" },
                ]}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)]">Date of Birth</label>
              <FieldControl icon={Calendar}>
                <input
                  type="date"
                  value={form.date_of_birth ?? ""}
                  onChange={handleChange("date_of_birth")}
                  className="w-full bg-transparent text-sm text-[var(--text-main)] outline-none"
                />
              </FieldControl>
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
                <Users size={12} /> Gender
              </label>
              <CustomSelect
                value={form.gender ?? ""}
                onChange={(next) => {
                  setForm((prev) => ({ ...prev, gender: next }));
                  setTouched((prev) => ({ ...prev, gender: true }));
                }}
                placeholder="Select gender"
                options={[
                  { value: "MALE", label: "Male", dotClass: "bg-sky-500" },
                  { value: "FEMALE", label: "Female", dotClass: "bg-pink-500" },
                  { value: "OTHER", label: "Other", dotClass: "bg-slate-500" },
                ]}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-[var(--text-muted)]">Address Line 1</label>
              <FieldControl icon={MapPin}>
                <input
                  value={form.address_line_1 ?? ""}
                  onChange={handleChange("address_line_1")}
                  placeholder="Enter address line 1"
                  className="w-full bg-transparent text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]"
                />
              </FieldControl>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-[var(--text-muted)]">Address Line 2</label>
              <FieldControl icon={Building2}>
                <input
                  value={form.address_line_2 ?? ""}
                  onChange={handleChange("address_line_2")}
                  placeholder="Enter address line 2"
                  className="w-full bg-transparent text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]"
                />
              </FieldControl>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)]">City</label>
              <FieldControl icon={MapPin}>
                <input
                  value={form.city ?? ""}
                  onChange={handleChange("city")}
                  placeholder="Enter city"
                  className="w-full bg-transparent text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]"
                />
              </FieldControl>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)]">State</label>
              <FieldControl icon={MapPin}>
                <input
                  value={form.state ?? ""}
                  onChange={handleChange("state")}
                  placeholder="Enter state"
                  className="w-full bg-transparent text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]"
                />
              </FieldControl>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)]">Country</label>
              <FieldControl icon={Globe}>
                <input
                  value={form.country ?? ""}
                  onChange={handleChange("country")}
                  placeholder="Enter country"
                  className="w-full bg-transparent text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]"
                />
              </FieldControl>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)]">Pincode</label>
              <FieldControl icon={Hash}>
                <input
                  value={form.pincode ?? ""}
                  onChange={handleChange("pincode")}
                  placeholder="Enter pincode"
                  className="w-full bg-transparent text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]"
                />
              </FieldControl>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        title="Change Password"
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setPasswordOpen(false)}
              className="rounded-sm border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold hover:bg-[var(--hover-bg)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="change-password-form"
              className="rounded-sm border border-black bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/80"
            >
              Change
            </button>
          </div>
        }
      >
        <form id="change-password-form" onSubmit={handlePasswordSubmit} className="space-y-4">
          {passwordError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {passwordError}
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)]">New Password</label>
            <FieldControl
              icon={KeyRound}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            >
              <input
                type={showPassword ? "text" : "password"}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Enter new password"
                className="w-full bg-transparent text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </FieldControl>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)]">Confirm Password</label>
            <FieldControl
              icon={KeyRound}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            >
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
                className="w-full bg-transparent text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </FieldControl>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast} />}
    </div>
  );
}
