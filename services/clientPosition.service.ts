import api from "@/api/axios";

export type ClientPositionAccountType = "live" | "demo" | "all";

export type ClientPositionScript = {
  symbol: string;
  bid: number | null;
  ask: number | null;
  openPositions: number;
  longLots: number;
  shortLots: number;
  netLots: number;
  longAvg: number | null;
  shortAvg: number | null;
  clientFloating: number;
  closedTrades: number;
  closedProfit: number;
  closedLoss: number;
  brokerProfit: number;
  brokerLoss: number;
  brokerNet: number;
};

export type ClientPositionRow = {
  positionId: string;
  ticket: number | null;
  userId: string;
  userName: string;
  userEmail: string;
  accountId: string;
  accountNumber: string;
  accountType: string;
  symbol: string;
  side: "BUY" | "SELL";
  volume: number;
  contractSize: number;
  openPrice: number;
  currentPrice: number | null;
  bid: number | null;
  ask: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  floatingPnL: number;
  equity: number;
  riskAmount: number | null;
  riskPercent: number | null;
  drawdownPercent: number;
  openTime: string;
};

export type ClientPositionReport = {
  range: { from: string; to: string };
  accountType: ClientPositionAccountType;
  totals: {
    openPositions: number;
    longLots: number;
    shortLots: number;
    clientFloating: number;
    closedProfit: number;
    closedLoss: number;
    brokerNet: number;
    positionsWithoutSl: number;
  };
  scripts: ClientPositionScript[];
  positions: ClientPositionRow[];
  generatedAt: string;
};

export async function getClientPositionReport(params: {
  from?: string;
  to?: string;
  accountType?: ClientPositionAccountType;
}): Promise<ClientPositionReport> {
  const { data } = await api.get("/trade-admin/client-positions", { params });
  if (data?.success === false) throw new Error(data?.message || "Failed to load report");
  return data.data as ClientPositionReport;
}
