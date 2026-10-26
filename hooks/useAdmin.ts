import { useQuery } from "@tanstack/react-query";
import adminService from "@/services/admin.service";

export const useAdminMe = () =>
  useQuery({
    queryKey: ["user-me"],
    queryFn: adminService.getMe,
    retry: false,
    // Avoid infinite loading if the API is slow/unreachable.
    refetchOnWindowFocus: false,
  });
