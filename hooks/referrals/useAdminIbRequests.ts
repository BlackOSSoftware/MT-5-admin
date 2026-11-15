import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAdminIbRequests,
  respondAdminIbRequest,
} from "@/services/adminIbRequests.service";

export function useAdminIbRequests(params?: {
  status?: string;
  type?: string;
  q?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: [
      "admin-ib-requests",
      params?.status ?? "",
      params?.type ?? "",
      params?.q ?? "",
      params?.page ?? 1,
      params?.limit ?? 20,
    ],
    queryFn: () => fetchAdminIbRequests(params),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useRespondAdminIbRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      action,
      reason,
    }: {
      requestId: string;
      action: "APPROVE" | "REJECT";
      reason?: string;
    }) => respondAdminIbRequest(requestId, action, reason || ""),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ib-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-user-ib-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-user-ib-dashboard"] });
    },
  });
}
