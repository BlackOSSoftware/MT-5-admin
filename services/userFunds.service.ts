import api from "@/api/axios";

export type TradeAdminUserFundsItem = {
  _id?: string;
  userId?: string;
  name?: string;
  fullName?: string;
  email?: string;
  userType?: "USER" | "ADMIN" | string;
  isMailVerified?: boolean;
  kycStatus?: string;
  wallet_balance?: number;
  wallet_hold_balance?: number;
  accountsCount?: number;
  totalBalance?: number;
  totalHoldBalance?: number;
  totalFreeBalance?: number;
  totalEquity?: number;
  funds?: {
    accountsCount?: number;
    totalBalance?: number;
    totalHoldBalance?: number;
    totalFreeBalance?: number;
    totalEquity?: number;
  };
  [key: string]: unknown;
};

export type TradeAdminUsersFundsPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type TradeAdminUsersFundsResponse = {
  success?: boolean;
  message?: string;
  data?: TradeAdminUserFundsItem[];
  pagination?: TradeAdminUsersFundsPagination;
};

export type TradeAdminUsersFundsParams = {
  page: number;
  limit: number;
  q?: string;
  userId?: string;
  userType?: "USER" | "ADMIN" | "";
  isMailVerified?: "true" | "false" | "";
  kycStatus?: "NOT_STARTED" | "PENDING" | "VERIFIED" | "REJECTED" | "";
  accountType?: "demo" | "live" | "";
  accountStatus?: "active" | "disabled" | "";
  currency?: string;
  sortBy?: "createdAt" | "updatedAt" | "name" | "email";
  sortDir?: "asc" | "desc";
};

export async function getTradeAdminUsersFunds(
  params: TradeAdminUsersFundsParams
): Promise<TradeAdminUsersFundsResponse> {
  const query: Record<string, string | number | boolean> = {
    page: params.page,
    limit: Math.min(Math.max(params.limit, 1), 100),
  };

  if (params.q?.trim()) query.q = params.q.trim();
  if (params.userId?.trim()) query.userId = params.userId.trim();
  if (params.userType) query.userType = params.userType;
  if (params.isMailVerified) query.isMailVerified = params.isMailVerified;
  if (params.kycStatus) query.kycStatus = params.kycStatus;
  if (params.accountType) query.accountType = params.accountType;
  if (params.accountStatus) query.status = params.accountStatus;
  if (params.currency?.trim()) query.currency = params.currency.trim().toUpperCase();
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortDir) query.sortDir = params.sortDir;

  const { data } = await api.get<TradeAdminUsersFundsResponse>(
    "/trade-admin/users/funds",
    { params: query }
  );
  return data;
}
