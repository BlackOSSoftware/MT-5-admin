"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSlippageSettings,
  updateSlippageSettings,
  type SlippageSettingsPayload,
} from "@/services/slippageSettings.service";

export const slippageSettingsQueryKey = ["slippage-settings"] as const;

export const useSlippageSettings = () => {
  return useQuery({
    queryKey: slippageSettingsQueryKey,
    queryFn: async () => {
      const res = await getSlippageSettings();
      return res.data;
    },
    refetchOnWindowFocus: true,
  });
};

export const useUpdateSlippageSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SlippageSettingsPayload) =>
      updateSlippageSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slippage-settings"] });
    },
  });
};
