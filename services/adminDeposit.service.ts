import api from "@/api/axios";

export type DepositStatus = "PENDING" | "APPROVED" | "REJECTED";
export type DepositMethod = "UPI" | "BANK" | "CRYPTO" | "MANUAL";
export type DepositSortBy = "createdAt" | "updatedAt" | "actionAt" | "amount";
export type SortDir = "asc" | "desc";

export interface GetDepositsParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: DepositStatus;
  method?: DepositMethod;
  userId?: string;
  accountId?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: DepositSortBy;
  sortDir?: SortDir;
}

export interface CreateAdminDepositPayload {
  accountId: string;
  amount: number;
  method: string;
}

export interface CreateAdminDepositData {
  user: string;
  account: string;
  amount: number;
  method: string;
  status: string;
  rejectionReason?: string;
  actionBy?: string;
  actionAt?: string;
  ipAddress?: string;
  _id: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminDepositResponse {
  success: boolean;
  message: string;
  data: CreateAdminDepositData;
}

export type AdminDepositsListPayload = {
  data: unknown[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
};

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeDepositListResponse(payload: unknown): AdminDepositsListPayload {
  const root = payload as Record<string, unknown> | null | undefined;
  const rootData = root && typeof root === "object" ? (root as { data?: unknown }).data : undefined;
  const node =
    rootData && typeof rootData === "object" ? (rootData as Record<string, unknown>) : root;

  const listCandidate =
    (Array.isArray(rootData) ? rootData : undefined) ??
    (node && Array.isArray((node as { data?: unknown }).data)
      ? (node as { data: unknown[] }).data
      : undefined) ??
    (node && Array.isArray((node as { items?: unknown }).items)
      ? ((node as { items: unknown[] }).items)
      : undefined) ??
    (node && Array.isArray((node as { list?: unknown }).list)
      ? ((node as { list: unknown[] }).list)
      : undefined) ??
    [];

  const rootPagination =
    root && typeof root === "object"
      ? ((root as { pagination?: Record<string, unknown> }).pagination ?? null)
      : null;

  const total =
    asNumber(rootPagination?.total) ??
    asNumber((root as { total?: unknown })?.total) ??
    asNumber((node as { total?: unknown })?.total) ??
    asNumber((node as { pagination?: { total?: unknown } })?.pagination?.total) ??
    asNumber((node as { pagination?: { totalItems?: unknown } })?.pagination?.totalItems) ??
    asNumber((node as { pagination?: { totalDocs?: unknown } })?.pagination?.totalDocs) ??
    listCandidate.length;

  const page =
    asNumber(rootPagination?.page) ??
    asNumber((root as { page?: unknown })?.page) ??
    asNumber((node as { page?: unknown })?.page) ??
    asNumber((node as { pagination?: { page?: unknown } })?.pagination?.page);

  const limit =
    asNumber(rootPagination?.limit) ??
    asNumber((root as { limit?: unknown })?.limit) ??
    asNumber((node as { limit?: unknown })?.limit) ??
    asNumber((node as { pagination?: { limit?: unknown } })?.pagination?.limit);

  const totalPages =
    asNumber(rootPagination?.totalPages) ??
    asNumber((root as { totalPages?: unknown })?.totalPages) ??
    asNumber((node as { totalPages?: unknown })?.totalPages) ??
    asNumber((node as { pagination?: { totalPages?: unknown } })?.pagination?.totalPages);

  return {
    data: Array.isArray(listCandidate) ? listCandidate : [],
    total,
    page,
    limit,
    totalPages,
  };
}

export const getAdminDeposits = async (
  params: GetDepositsParams
): Promise<AdminDepositsListPayload> => {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const q = params.q?.trim() || undefined;

  let fromDate = params.fromDate?.trim() || undefined;
  let toDate = params.toDate?.trim() || undefined;

  if (fromDate && toDate && fromDate > toDate) {
    [fromDate, toDate] = [toDate, fromDate];
  }

  const res = await api.get("/deposits/admin/search", {
    params: {
      page,
      limit,
      q,
      status: params.status,
      method: params.method,
      userId: params.userId,
      accountId: params.accountId,
      fromDate,
      toDate,
      sortBy: params.sortBy,
      sortDir: params.sortDir,
    },
  });

  return normalizeDepositListResponse(res.data);
};

export const createAdminDeposit = async (
  payload: CreateAdminDepositPayload
) : Promise<CreateAdminDepositResponse> => {
  const res = await api.post<CreateAdminDepositResponse>(
    "/deposits/admin-deposit",
    payload
  );
  return res.data;
};

export const approveDeposit = async (depositId: string) => {
  try {
    const res = await api.patch(
      `/deposits/admin/${depositId}/approve`,
      { status: "APPROVED" }
    );
    return res.data;
  } catch (error: unknown) {
    const statusCode = (error as { response?: { status?: number } }).response?.status;
    if (statusCode === 400 || statusCode === 404 || statusCode === 422) {
      const fallbackRes = await api.patch(`/deposits/${depositId}/approve`, {
        status: "APPROVED",
      });
      return fallbackRes.data;
    }
    throw error;
  }
};

export const rejectDeposit = async (
  depositId: string,
  reason: string
) => {
  const res = await api.patch(
    `/deposits/${depositId}/reject`,
    { status: "REJECTED", rejectionReason: reason }
  );
  return res.data;
};
export const editDepositAmount = async (
  depositId: string,
  newAmount: number
) => {
  const res = await api.patch(
    `/deposits/${depositId}/edit-amount`,
    { newAmount }
  );
  return res.data;
};
