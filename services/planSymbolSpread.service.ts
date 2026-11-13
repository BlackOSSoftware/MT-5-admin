import api from "@/api/axios";

export type PlanSymbolSpreadRow = {
  _id?: string | null;
  planId?: string;
  symbol: string;
  house_usd_per_lot: number;
  ib_usd_per_lot: number;
  client_spread_override?: number | null;
  isActive: boolean;
  total_usd_per_lot?: number;
  client_spread?: number;
  contractSize?: number;
  pipSize?: number | null;
  pip_view?: number | null;
  half_spread?: number;
  instrument_name?: string | null;
  instrument_default_spread?: number | null;
};

export const planSymbolSpreadService = {
  list: async (planId: string): Promise<PlanSymbolSpreadRow[]> => {
    const { data } = await api.get(
      `/account-plans/${planId}/symbol-spreads`,
    );
    return data.data;
  },

  upsert: async (
    planId: string,
    payload: {
      symbol: string;
      house_usd_per_lot: number;
      ib_usd_per_lot: number;
      client_spread_override?: number | null;
      isActive?: boolean;
    },
  ): Promise<PlanSymbolSpreadRow> => {
    const { data } = await api.put(
      `/account-plans/${planId}/symbol-spreads`,
      payload,
    );
    return data.data;
  },

  seed: async (planId: string) => {
    const { data } = await api.post(
      `/account-plans/${planId}/symbol-spreads/seed`,
    );
    return data.data;
  },
};
