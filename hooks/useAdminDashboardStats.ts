import { useQuery } from "@tanstack/react-query";
import { fetchAdminDashboardStats } from "@/services/user.service";

export const useAdminDashboardStats = () =>
  useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: fetchAdminDashboardStats,
    staleTime: 1000 * 30,
  });
