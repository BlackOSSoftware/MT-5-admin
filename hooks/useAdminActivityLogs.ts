import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchAdminActivityLogs } from "@/services/activity.service";
import type { AdminActivityListResponse, AdminActivityParams } from "@/types/activity";
import type { UseQueryResult } from "@tanstack/react-query";

export const useAdminActivityLogs = (
  params: AdminActivityParams
): UseQueryResult<AdminActivityListResponse, Error> =>
  useQuery<AdminActivityListResponse, Error, AdminActivityListResponse>({
    queryKey: [
      "admin-activity",
      params.userId ?? "all",
      params.limit ?? 20,
      params.before ?? "",
      params.actorType ?? "",
      params.category ?? "",
      params.status ?? "",
      params.from ?? "",
      params.to ?? "",
    ],
    queryFn: () => fetchAdminActivityLogs(params),
    staleTime: 1000 * 30,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
