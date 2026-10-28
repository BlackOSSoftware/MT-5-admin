import api from "@/api/axios";

export type WithdrawMethodField = {
  key: string;
  label: string;
  required: boolean;
};

export type WithdrawMethodCatalogItem = {
  code: string;
  label: string;
  description?: string;
  fields: WithdrawMethodField[];
  enabled: boolean;
};

export type WithdrawMethodSettings = {
  brokerId: string | null;
  methods: Record<string, boolean>;
  catalog: WithdrawMethodCatalogItem[];
  enabledMethods: Array<{
    code: string;
    label: string;
    description?: string;
    fields: WithdrawMethodField[];
  }>;
};

export async function getWithdrawMethodSettings() {
  const res = await api.get("/withdraw-methods/admin");
  return res.data as { success: boolean; data: WithdrawMethodSettings };
}

export async function updateWithdrawMethodSettings(
  methods: Record<string, boolean>,
) {
  const res = await api.put("/withdraw-methods/admin", { methods });
  return res.data as {
    success: boolean;
    message?: string;
    data: WithdrawMethodSettings;
  };
}
