import { useQuery } from "@tanstack/react-query";
import {
  fetchAdminUserIbAccounts,
  fetchAdminUserIbDashboard,
  fetchAdminUserIbKyc,
  fetchAdminUserIbRequests,
} from "@/services/adminUserIb.service";

export function useAdminUserIbDashboard(
  userId?: string,
  params?: { scope?: string; period?: string; from?: string; to?: string },
) {
  return useQuery({
    queryKey: ["admin-user-ib-dashboard", userId, params?.scope, params?.period],
    queryFn: () => fetchAdminUserIbDashboard(userId as string, params),
    enabled: Boolean(userId),
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });
}

export function useAdminUserIbKyc(
  userId?: string,
  params?: { q?: string; status?: string; page?: number; limit?: number },
) {
  return useQuery({
    queryKey: [
      "admin-user-ib-kyc",
      userId,
      params?.q ?? "",
      params?.status ?? "",
      params?.page ?? 1,
      params?.limit ?? 20,
    ],
    queryFn: () => fetchAdminUserIbKyc(userId as string, params),
    enabled: Boolean(userId),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useAdminUserIbAccounts(
  userId?: string,
  params?: { q?: string; page?: number; limit?: number },
) {
  return useQuery({
    queryKey: [
      "admin-user-ib-accounts",
      userId,
      params?.q ?? "",
      params?.page ?? 1,
      params?.limit ?? 20,
    ],
    queryFn: () => fetchAdminUserIbAccounts(userId as string, params),
    enabled: Boolean(userId),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useAdminUserIbRequests(
  userId?: string,
  params?: { status?: string; page?: number; limit?: number },
) {
  return useQuery({
    queryKey: [
      "admin-user-ib-requests",
      userId,
      params?.status ?? "",
      params?.page ?? 1,
      params?.limit ?? 50,
    ],
    queryFn: () => fetchAdminUserIbRequests(userId as string, params),
    enabled: Boolean(userId),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}
