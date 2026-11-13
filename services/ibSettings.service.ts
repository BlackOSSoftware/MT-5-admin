import api from "@/api/axios";

export type IbLevel = { level: number; percent: number };

export type IbLevelSettings = {
  _id?: string;
  brokerId?: string | null;
  levels: IbLevel[];
  maxDepth: number;
  isDefault?: boolean;
};

export const ibSettingsService = {
  getLevels: async (): Promise<IbLevelSettings> => {
    const { data } = await api.get("/ib-settings/levels");
    return data.data;
  },

  saveLevels: async (payload: {
    levels: IbLevel[];
    maxDepth?: number;
  }): Promise<IbLevelSettings> => {
    const { data } = await api.put("/ib-settings/levels", payload);
    return data.data;
  },

  listCommissions: async (params?: {
    page?: number;
    limit?: number;
    ibUserId?: string;
  }) => {
    const { data } = await api.get("/ib-settings/commissions", { params });
    return data.data;
  },
};
