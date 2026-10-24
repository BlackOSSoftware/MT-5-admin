import { useQuery } from "@tanstack/react-query";
import { fetchAdminUserById } from "@/services/user.service";

export const useAdminUser = (userId?: string) =>
  useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => fetchAdminUserById(userId as string),
    enabled: Boolean(userId),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
    retry: (failureCount, error: unknown) => {
      const status =
        typeof error === "object" && error !== null
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;
      if (status === 404) return false;
      return failureCount < 2;
    },
  });
