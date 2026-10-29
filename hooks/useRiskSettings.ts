"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getBrokerRiskSettings,
  updateBrokerRiskSettings,
} from "@/services/riskSettings.service";

function activeBrokerId() {
  if (typeof window === "undefined") return "none";
  return localStorage.getItem("brokerId") || "none";
}

export const riskSettingsQueryKey = (brokerId?: string) =>
  ["risk-settings", brokerId || activeBrokerId()] as const;

export const useRiskSettings = () => {
  const brokerId = activeBrokerId();
  return useQuery({
    queryKey: riskSettingsQueryKey(brokerId),
    queryFn: async () => {
      const res = await getBrokerRiskSettings();
      return res.data;
    },
    refetchOnWindowFocus: true,
  });
};

export const useUpdateRiskSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      warning_loss_percent: number;
      stop_out_loss_percent: number;
    }) => updateBrokerRiskSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk-settings"] });
    },
  });
};
