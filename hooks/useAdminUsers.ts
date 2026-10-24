import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchAdminUsers } from "@/services/user.service";
import type { AdminUserListResponse, UserListParams } from "@/types/user";
import type { UseQueryResult } from "@tanstack/react-query";

export const useAdminUsers = (
  params: UserListParams
): UseQueryResult<AdminUserListResponse, Error> =>
  useQuery<AdminUserListResponse, Error, AdminUserListResponse>({
    queryKey: [
      "admin-users",
      params.q ?? "",
      params.kycStatus ?? "ALL",
      params.isMailVerified ?? "ALL",
      params.page ?? 1,
      params.limit ?? 20,
    ],
    queryFn: () => fetchAdminUsers(params),
    staleTime: 0,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
  });
