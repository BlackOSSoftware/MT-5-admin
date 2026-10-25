import { useQuery } from "@tanstack/react-query";
import {
  fetchReferralLinks,
  fetchReferralNetwork,
  fetchReferralNetworkSummary,
  fetchReferralTree,
} from "@/services/adminReferralNetwork.service";

export function useReferralNetworkSummary() {
  return useQuery({
    queryKey: ["admin-referral-network-summary"],
    queryFn: fetchReferralNetworkSummary,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useReferralNetworkList(params: {
  q?: string;
  page?: number;
  limit?: number;
  onlyReferrers?: boolean;
}) {
  return useQuery({
    queryKey: [
      "admin-referral-network",
      params.q ?? "",
      params.page ?? 1,
      params.limit ?? 20,
      params.onlyReferrers ?? true,
    ],
    queryFn: () => fetchReferralNetwork(params),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useReferralLinks(params: {
  q?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: [
      "admin-referral-links",
      params.q ?? "",
      params.page ?? 1,
      params.limit ?? 20,
    ],
    queryFn: () => fetchReferralLinks(params),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useReferralTree(userId?: string | null, maxDepth = 8) {
  return useQuery({
    queryKey: ["admin-referral-tree", userId, maxDepth],
    queryFn: () => fetchReferralTree(userId as string, maxDepth),
    enabled: Boolean(userId),
    staleTime: 10_000,
  });
}
