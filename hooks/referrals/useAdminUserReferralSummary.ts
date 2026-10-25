import { useQuery } from "@tanstack/react-query";
import { fetchAdminUserReferralSummary } from "@/services/adminUserReferral.service";

export function useAdminUserReferralSummary(userId?: string) {
  return useQuery({
    queryKey: ["admin-user-referral-summary", userId],
    queryFn: () => fetchAdminUserReferralSummary(userId as string),
    enabled: Boolean(userId),
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });
}
