import api from "@/api/axios";

export type BrokerRiskSettings = {
  brokerId: string | null;
  brokerCode?: string | null;
  brokerName?: string | null;
  warning_loss_percent: number;
  stop_out_loss_percent: number;
  updatedAt?: string | null;
};

function brokerScope() {
  if (typeof window === "undefined") return {};
  const brokerId = localStorage.getItem("brokerId");
  if (!brokerId) return {};
  return {
    params: { brokerId },
    headers: { "x-broker-id": brokerId },
  };
}

export async function getBrokerRiskSettings() {
  const res = await api.get("/risk-settings/admin", brokerScope());
  return res.data as { success: boolean; data: BrokerRiskSettings };
}

export async function updateBrokerRiskSettings(payload: {
  warning_loss_percent: number;
  stop_out_loss_percent: number;
}) {
  const res = await api.put("/risk-settings/admin", payload, brokerScope());
  return res.data as { success: boolean; data: BrokerRiskSettings };
}
