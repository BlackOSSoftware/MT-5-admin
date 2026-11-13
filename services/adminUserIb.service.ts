import api from "@/api/axios";

/* ---------- Dashboard ---------- */

export type IbDashboardData = {
  totalClients: number;
  newClients: number;
  activeTraders: number;
  subIbs: number;
  directSubIbs: number;
  totalDeposits: number;
  netDeposits: number;
  clientEquity: number;
  totalLots: number;
  tradeCount: number;
  periodEarnings: number;
  totalWithdrawals: number;
  funnel: {
    linkClicks: number;
    uniqueVisitors: number;
    signedUp: number;
    openedAccount: number;
    fundedAccounts: number;
  };
  commission: {
    totalEarned: number;
    paidOut: number;
    pending: number;
    available: number;
  };
  recentDeposits: Array<Record<string, unknown>>;
  recentWithdrawals: Array<Record<string, unknown>>;
  recentPayouts: Array<Record<string, unknown>>;
  recentAccounts: Array<Record<string, unknown>>;
  activityTotals: {
    deposits: number;
    withdrawals: number;
    payouts: number;
    accounts: number;
  };
  kycStats: { pending: number; complete: number };
  liveAccountStats: { pending: number; complete: number; total: number };
  ibRequestStats: { pending: number; approved: number; rejected: number };
  referralCode?: string | null;
  linkUsedCount: number;
};

export async function fetchAdminUserIbDashboard(
  userId: string,
  params?: { scope?: string; period?: string; from?: string; to?: string },
): Promise<IbDashboardData> {
  const { data } = await api.get(`/referrals/admin/users/${userId}/ib-dashboard`, {
    params,
  });
  return (data?.data ?? data) as IbDashboardData;
}

/* ---------- KYC ---------- */

export type IbKycItem = {
  id: string;
  name: string;
  email: string;
  phone: string;
  kycType: string;
  requestDate?: string;
  actionDate?: string | null;
  actionBy: string;
  userType: string;
  status: string;
  remark: string;
};

export type IbKycResponse = {
  items: IbKycItem[];
  statusCounts: { PENDING: number; VERIFIED: number; REJECTED: number };
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export async function fetchAdminUserIbKyc(
  userId: string,
  params?: { q?: string; status?: string; page?: number; limit?: number },
): Promise<IbKycResponse> {
  const { data } = await api.get(`/referrals/admin/users/${userId}/ib-kyc`, {
    params,
  });
  const payload = data?.data ?? data;
  return payload as IbKycResponse;
}

/* ---------- Live accounts ---------- */

export type IbAccountItem = {
  id: string;
  name: string;
  email: string;
  phone: string;
  accountNumber?: string;
  accountType: string;
  leverage?: string;
  balance: number;
  currency: string;
  requestTime?: string;
  actionBy: string;
  userType: string;
  remark: string;
  status: string;
  planName: string;
  equity: number;
  bonusBalance: number;
};

export type IbAccountsResponse = {
  items: IbAccountItem[];
  totalBalance: number;
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export async function fetchAdminUserIbAccounts(
  userId: string,
  params?: { q?: string; page?: number; limit?: number },
): Promise<IbAccountsResponse> {
  const { data } = await api.get(`/referrals/admin/users/${userId}/ib-accounts`, {
    params,
  });
  const payload = data?.data ?? data;
  return payload as IbAccountsResponse;
}

/* ---------- IB requests ---------- */

export type IbRequestItem = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  note: string;
  rejectionReason: string;
  createdAt?: string;
  respondedAt?: string | null;
  direction: "SENT" | "RECEIVED";
  requester: { id: string; name: string; email: string; phone: string };
  ib: { id: string; name: string; email: string; phone: string };
  respondedBy: { id: string; name: string; email: string } | null;
};

export type IbRequestsResponse = {
  items: IbRequestItem[];
  statusCounts: { PENDING: number; APPROVED: number; REJECTED: number };
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export async function fetchAdminUserIbRequests(
  userId: string,
  params?: { status?: string; page?: number; limit?: number },
): Promise<IbRequestsResponse> {
  const { data } = await api.get(`/referrals/admin/users/${userId}/ib-requests`, {
    params,
  });
  return {
    items: data?.items ?? data?.data?.items ?? [],
    statusCounts: data?.statusCounts ?? data?.data?.statusCounts ?? {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
    },
    pagination: data?.pagination ?? data?.data?.pagination ?? {
      page: 1,
      limit: 50,
      total: 0,
      totalPages: 0,
    },
  };
}
