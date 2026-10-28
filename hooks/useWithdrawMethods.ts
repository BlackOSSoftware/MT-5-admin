"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getWithdrawMethodSettings,
  updateWithdrawMethodSettings,
} from "@/services/withdrawMethod.service";

function activeBrokerId() {
  if (typeof window === "undefined") return "none";
  return localStorage.getItem("brokerId") || "none";
}

export const withdrawMethodsQueryKey = (brokerId?: string) =>
  ["withdraw-methods", brokerId || activeBrokerId()] as const;

export const useWithdrawMethods = () => {
  const brokerId = activeBrokerId();
  return useQuery({
    queryKey: withdrawMethodsQueryKey(brokerId),
    queryFn: async () => {
      const res = await getWithdrawMethodSettings();
      return res.data;
    },
    refetchOnWindowFocus: true,
  });
};

export const useUpdateWithdrawMethods = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (methods: Record<string, boolean>) =>
      updateWithdrawMethodSettings(methods),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdraw-methods"] });
    },
  });
};
