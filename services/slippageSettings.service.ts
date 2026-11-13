import api from "@/api/axios";

export type SlippageSettings = {
  enabled: boolean;
  mode: "FIXED" | "RANDOM";
  fixed_points: number;
  min_points: number;
  max_points: number;
  apply_market_orders: boolean;
  apply_stop_orders: boolean;
  apply_close: boolean;
  direction: "ADVERSE_ONLY";
  updatedBy?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  updatedAt?: string | null;
  createdAt?: string | null;
};

export type SlippageSettingsPayload = {
  enabled?: boolean;
  mode?: "FIXED" | "RANDOM";
  fixed_points?: number;
  min_points?: number;
  max_points?: number;
  apply_market_orders?: boolean;
  apply_stop_orders?: boolean;
  apply_close?: boolean;
  direction?: "ADVERSE_ONLY";
};

export async function getSlippageSettings() {
  const res = await api.get("/slippage-settings/settings");
  return res.data as { success: boolean; data: SlippageSettings };
}

export async function updateSlippageSettings(payload: SlippageSettingsPayload) {
  const res = await api.put("/slippage-settings/settings", payload);
  return res.data as { success: boolean; data: SlippageSettings };
}
