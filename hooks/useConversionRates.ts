"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getConversionRates,
  updateConversionRates,
  type ConversionRatesPayload,
} from "@/services/conversionRate.service";

function activeBrokerId() {
  if (typeof window === "undefined") return "none";
  return localStorage.getItem("brokerId") || "none";
}

export const conversionRatesQueryKey = (brokerId?: string) =>
  ["conversion-rates", brokerId || activeBrokerId()] as const;

export const useConversionRates = () => {
  const brokerId = activeBrokerId();
  return useQuery({
    queryKey: conversionRatesQueryKey(brokerId),
    queryFn: getConversionRates,
    refetchOnWindowFocus: true,
  });
};

export const useUpdateConversionRates = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ConversionRatesPayload) => updateConversionRates(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversion-rates"] });
    },
  });
};
