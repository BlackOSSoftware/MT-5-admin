import api from "@/api/axios";

export type ReferralUserCard = {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  kycStatus?: string | null;
  isMailVerified?: boolean;
  referralCode?: string | null;
  referralStatus?: string | null;
};

export type ReferralNetworkSummary = {
  totalProfiles: number;
  linkedUsers: number;
  totalReferrers: number;
  unlinkedUsers: number;
  levelCounts: Record<string, number>;
};

export type ReferralNetworkRow = {
  userId: string;
  user: ReferralUserCard;
  referralCode?: string | null;
  status?: string | null;
  referredBy?: ReferralUserCard | null;
  directReferrals: number;
  networkSize: number;
  levelBreakdown: Record<string, number>;
  maxDepth: number;
  totalEarned: number;
  referralBalance: number;
  createdAt?: string | null;
};

export type ReferralLinkRow = {
  referrerUserId: string;
  referredUserId: string;
  referrer: ReferralUserCard | null;
  referred: ReferralUserCard | null;
  referralCode?: string | null;
  status?: string | null;
  createdAt?: string | null;
};

export type ReferralTreeNode = {
  userId: string;
  level: number;
  user: ReferralUserCard;
  directReferrals: number;
  children: ReferralTreeNode[];
};

export type ReferralTreePayload = {
  root: {
    user: ReferralUserCard;
    referralCode?: string | null;
    status?: string | null;
    referredBy?: ReferralUserCard | null;
    totalEarned: number;
    referralBalance: number;
  };
  stats: {
    directReferrals: number;
    networkSize: number;
    levelBreakdown: Record<string, number>;
    maxDepth: number;
  };
  tree: ReferralTreeNode | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export async function fetchReferralNetworkSummary(): Promise<ReferralNetworkSummary> {
  const { data } = await api.get("/referrals/admin/network/summary");
  return (data?.data ?? data) as ReferralNetworkSummary;
}

export async function fetchReferralNetwork(params: {
  q?: string;
  page?: number;
  limit?: number;
  onlyReferrers?: boolean;
}): Promise<{ items: ReferralNetworkRow[]; pagination: Pagination }> {
  const { data } = await api.get("/referrals/admin/network", { params });
  return {
    items: (data?.items ?? data?.data?.items ?? []) as ReferralNetworkRow[],
    pagination: (data?.pagination ?? {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      total: 0,
      totalPages: 0,
    }) as Pagination,
  };
}

export async function fetchReferralLinks(params: {
  q?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: ReferralLinkRow[]; pagination: Pagination }> {
  const { data } = await api.get("/referrals/admin/network/links", { params });
  return {
    items: (data?.items ?? data?.data?.items ?? []) as ReferralLinkRow[],
    pagination: (data?.pagination ?? {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      total: 0,
      totalPages: 0,
    }) as Pagination,
  };
}

export async function fetchReferralTree(
  userId: string,
  maxDepth = 8,
): Promise<ReferralTreePayload> {
  const { data } = await api.get(
    `/referrals/admin/network/${userId}/tree`,
    { params: { maxDepth } },
  );
  return (data?.data ?? data) as ReferralTreePayload;
}
