import api from "@/api/axios";

export interface AdminAccountUser {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  userType?: string;
  isMailVerified?: boolean;
  kycStatus?: string;
}

export interface AdminAccountItem {
  _id: string;
  user_id: string;
  account_plan_id?: string;
  account_number?: string;
  account_type?: string;
  plan_name?: string;
  leverage?: number;
  balance?: number;
  hold_balance?: number;
  non_withdrawable_balance?: number;
  equity?: number;
  bonus_balance?: number;
  bonus_granted?: number;
  currency?: string;
  first_deposit?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  total_balance?: number;
  total_deposit?: number;
  total_withdraw?: number;
  user?: AdminAccountUser | null;
}

export interface AdminAccountsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminAccountsResponse {
  items: AdminAccountItem[];
  pagination: AdminAccountsPagination;
}

export interface AdminAccountsSearchParams {
  q?: string;
  page?: number;
  limit?: number;
  account_type?: string;
  status?: string;
  plan_id?: string;
}

export const adminAccountsService = {
  search: async (
    params: AdminAccountsSearchParams
  ): Promise<AdminAccountsResponse> => {
    const query: Record<string, string | number> = {
      page: params.page ?? 1,
      limit: params.limit ?? 10,
    };

    if (params.q?.trim()) query.q = params.q.trim();
    if (params.account_type?.trim())
      query.account_type = params.account_type.trim();
    if (params.status?.trim()) query.status = params.status.trim();
    if (params.plan_id?.trim()) query.plan_id = params.plan_id.trim();

    const { data } = await api.get("/accounts/admin/search", {
      params: query,
    });
    return {
      items: data?.data ?? [],
      pagination: data?.pagination ?? {
        page: 1,
        limit: params.limit ?? 10,
        total: 0,
        totalPages: 1,
      },
    };
  },
};
