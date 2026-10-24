import api from "@/api/axios";

export type TradeAdminSummary = {
  activePositions: number;
  activePendingOrders: number;
  activeUsers: number;
  activeTradingAccounts: number;
};

export type TradeAdminBrokerageItem = {
  _id: string;
  user_id: string;
  account_id: string;
  trade_id: string;
  symbol: string;
  spread: number;
  commission: number;
  swap: number;
  pnl: number;
  createdAt: string;
  updatedAt: string;
  userName?: string;
  userEmail?: string;
  accountNumber?: string;
  user_name?: string;
  user_email?: string;
  account_number?: string;
};

export type TradeAdminBrokeragePagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type TradeAdminBrokerageResponse = {
  success?: boolean;
  data: TradeAdminBrokerageItem[];
  pagination?: TradeAdminBrokeragePagination;
};

export type TradeAdminBrokerageParams = {
  symbol?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
};

export type TradeSide = "BUY" | "SELL";
export type TradeOrderType =
  | "MARKET"
  | "BUY_LIMIT"
  | "SELL_LIMIT"
  | "BUY_STOP"
  | "SELL_STOP";
export type TradeOrderKind = "MARKET" | "LIMIT" | "STOP";
export type TradeTimeField = "closeTime" | "openTime" | "createdAt";
export type TradeSortDir = "asc" | "desc";

export type TradeAdminClosedTrade = {
  _id: string;
  userId: string;
  accountId: string;
  userName?: string;
  userEmail?: string;
  accountNumber?: string;
  ipAddress?: string;
  positionId: string;
  ticket?: number | null;
  closeTicket?: number | null;
  symbol: string;
  side: TradeSide | string;
  orderType: TradeOrderType | string;
  status: string;
  volume: number;
  contractSize: number;
  leverage: number;
  openPrice: number;
  entryPrice: number;
  closePrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  marginUsed: number;
  grossPnL: number;
  commission: number;
  spread: number;
  swap: number;
  realizedPnL: number;
  openTime?: string;
  closeTime?: string;
  closeReason?: string;
  engineVersion?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TradeAdminClosedTradesPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type TradeAdminClosedTradesResponse = {
  success?: boolean;
  data: TradeAdminClosedTrade[];
  pagination?: TradeAdminClosedTradesPagination;
};

export type TradeAdminClosedTradesParams = {
  page: number;
  limit: number;
  userId?: string;
  accountId?: string;
  symbol?: string;
  positionId?: string;
  side?: TradeSide;
  orderType?: TradeOrderType;
  orderKind?: TradeOrderKind;
  from?: string;
  to?: string;
  timeField?: TradeTimeField;
  sortBy?: TradeTimeField;
  sortDir?: TradeSortDir;
};

export type TradeAdminOpenTrade = {
  _id: string;
  userId: string;
  accountId: string;
  userName?: string;
  userEmail?: string;
  accountNumber?: string;
  ipAddress?: string;
  positionId: string;
  ticket?: number | null;
  closeTicket?: number | null;
  symbol: string;
  side: TradeSide | string;
  orderType: TradeOrderType | string;
  status?: string;
  volume: number;
  contractSize: number;
  leverage: number;
  openPrice: number;
  entryPrice: number;
  closePrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  marginUsed?: number;
  grossPnL?: number;
  commission?: number;
  spread?: number;
  swap?: number;
  realizedPnL?: number;
  openTime?: string;
  closeTime?: string | null;
  closeReason?: string | null;
  engineVersion?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TradeAdminOpenTradesPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type TradeAdminOpenTradesResponse = {
  success?: boolean;
  data: TradeAdminOpenTrade[];
  pagination?: TradeAdminOpenTradesPagination;
};

export type TradeAdminOpenTradesParams = {
  page: number;
  limit: number;
  userId?: string;
  accountId?: string;
  symbol?: string;
  positionId?: string;
  side?: TradeSide;
  orderType?: TradeOrderType;
  orderKind?: TradeOrderKind;
  from?: string;
  to?: string;
  timeField?: "openTime" | "createdAt" | "updatedAt";
  sortBy?: "openTime" | "createdAt" | "updatedAt";
  sortDir?: TradeSortDir;
};

export type TradeAdminPendingOrderStatus =
  | "PENDING"
  | "EXECUTED"
  | "CANCELLED"
  | "EXPIRED"
  | string;

export type TradeAdminPendingOrder = {
  _id: string;
  userId: string;
  accountId: string;
  userName?: string;
  userEmail?: string;
  accountNumber?: string;
  orderId: string;
  ticket?: number | null;
  symbol: string;
  side: TradeSide | string;
  orderType: TradeOrderType | string;
  price?: number;
  volume?: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
  status?: TradeAdminPendingOrderStatus;
  executedAt?: string | null;
  executedPositionId?: string | null;
  cancelledAt?: string | null;
  expireAt?: string | null;
  engineVersion?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TradeAdminPendingOrdersPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type TradeAdminPendingOrdersResponse = {
  success?: boolean;
  data: TradeAdminPendingOrder[];
  pagination?: TradeAdminPendingOrdersPagination;
};

export type TradeAdminPendingOrdersParams = {
  page: number;
  limit: number;
  status?: TradeAdminPendingOrderStatus;
  symbol?: string;
  userId?: string;
  accountId?: string;
  orderId?: string;
  executedPositionId?: string;
  side?: TradeSide;
  orderType?: TradeOrderType;
  orderKind?: TradeOrderKind;
  from?: string;
  to?: string;
  timeField?: "createdAt" | "executedAt" | "cancelledAt" | "expireAt";
  sortBy?: "createdAt" | "updatedAt" | "executedAt" | "cancelledAt" | "expireAt";
  sortDir?: TradeSortDir;
};

export type TradeAdminPendingOpenParams = {
  page: number;
  limit: number;
  userId?: string;
  accountId?: string;
  orderId?: string;
  symbol?: string;
  side?: TradeSide;
  orderType?: TradeOrderType;
  orderKind?: TradeOrderKind;
  from?: string;
  to?: string;
  timeField?: "createdAt" | "updatedAt" | "expireAt";
  sortBy?: "createdAt" | "updatedAt" | "expireAt";
  sortDir?: TradeSortDir;
};

export type TradeAdminActionResponse<T = unknown> = {
  success?: boolean;
  message?: string;
  data?: T;
};

export type TradeAdminMarketOrderPayload = {
  accountId: string;
  userId?: string;
  symbol: string;
  side: TradeSide;
  volume: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
};

export type TradeAdminPendingOrderPayload = {
  accountId: string;
  userId?: string;
  symbol: string;
  side: TradeSide;
  orderType: Exclude<TradeOrderType, "MARKET">;
  price: number;
  volume: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
};

export type TradeAdminPendingModifyPayload = {
  accountId: string;
  orderId: string;
  userId?: string;
  volume?: number;
  price?: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
};

export type TradeAdminPendingCancelPayload = {
  accountId: string;
  orderId: string;
  userId?: string;
};

export type TradeAdminPositionModifyPayload = {
  accountId: string;
  positionId: string;
  userId?: string;
  volume?: number;
  openPrice?: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
};

export type TradeAdminPositionClosePayload = {
  accountId: string;
  positionId: string;
  userId?: string;
};

export type TradeAdminClosedModifyPayload = {
  accountId: string;
  userId: string;
  positionId?: string;
  tradeId?: string;
  volume?: number;
  openPrice?: number;
  closePrice?: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
  commission?: number;
  spread?: number;
  swap?: number;
  realizedPnL?: number;
  closeReason?: string | null;
};

export const getTradeAdminSummary = async (): Promise<TradeAdminSummary> => {
  const res = await api.get("/trade-admin/summary");
  return res.data?.data;
};

export const getTradeAdminBrokerage = async (
  params: TradeAdminBrokerageParams
): Promise<TradeAdminBrokerageResponse> => {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  };

  if (params.symbol?.trim()) query.symbol = params.symbol.trim().toUpperCase();
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;

  const res = await api.get("/trade-admin/brokerage", { params: query });
  return res.data as TradeAdminBrokerageResponse;
};

export const getTradeAdminClosedTrades = async (
  params: TradeAdminClosedTradesParams
): Promise<TradeAdminClosedTradesResponse> => {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: Math.min(Math.max(params.limit, 1), 100),
  };

  if (params.userId?.trim()) query.userId = params.userId.trim();
  if (params.accountId?.trim()) query.accountId = params.accountId.trim();
  if (params.symbol?.trim()) query.symbol = params.symbol.trim().toUpperCase();
  if (params.positionId?.trim()) query.positionId = params.positionId.trim();
  if (params.side) query.side = params.side;
  if (params.orderType) {
    query.orderType = params.orderType;
  } else if (params.orderKind) {
    query.orderKind = params.orderKind;
  }
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;
  if (params.timeField) query.timeField = params.timeField;
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortDir) query.sortDir = params.sortDir;

  const res = await api.get("/trade-admin/trades/closed", { params: query });
  return res.data as TradeAdminClosedTradesResponse;
};

export const getTradeAdminOpenTrades = async (
  params: TradeAdminOpenTradesParams
): Promise<TradeAdminOpenTradesResponse> => {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: Math.min(Math.max(params.limit, 1), 100),
  };

  if (params.userId?.trim()) query.userId = params.userId.trim();
  if (params.accountId?.trim()) query.accountId = params.accountId.trim();
  if (params.symbol?.trim()) query.symbol = params.symbol.trim().toUpperCase();
  if (params.positionId?.trim()) query.positionId = params.positionId.trim();
  if (params.side) query.side = params.side;
  if (params.orderType) {
    query.orderType = params.orderType;
  } else if (params.orderKind) {
    query.orderKind = params.orderKind;
  }
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;
  if (params.timeField) query.timeField = params.timeField;
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortDir) query.sortDir = params.sortDir;

  const res = await api.get("/trade-admin/trades/open", { params: query });
  return res.data as TradeAdminOpenTradesResponse;
};

export const getTradeAdminPendingOrders = async (
  params: TradeAdminPendingOrdersParams
): Promise<TradeAdminPendingOrdersResponse> => {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: Math.min(Math.max(params.limit, 1), 100),
  };

  const normalizedStatus = params.status?.toString().trim();
  if (normalizedStatus && normalizedStatus !== "ALL") query.status = normalizedStatus;
  if (params.symbol?.trim()) query.symbol = params.symbol.trim().toUpperCase();
  if (params.userId?.trim()) query.userId = params.userId.trim();
  if (params.accountId?.trim()) query.accountId = params.accountId.trim();
  if (params.orderId?.trim()) query.orderId = params.orderId.trim();
  if (params.executedPositionId?.trim())
    query.executedPositionId = params.executedPositionId.trim();
  if (params.side) query.side = params.side;
  if (params.orderType) {
    query.orderType = params.orderType;
  } else if (params.orderKind) {
    query.orderKind = params.orderKind;
  }
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;
  if (params.timeField) query.timeField = params.timeField;
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortDir) query.sortDir = params.sortDir;

  const res = await api.get("/trade-admin/orders/pending/history", { params: query });
  return res.data as TradeAdminPendingOrdersResponse;
};

export const getTradeAdminPendingOpenOrders = async (
  params: TradeAdminPendingOpenParams
): Promise<TradeAdminPendingOrdersResponse> => {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: Math.min(Math.max(params.limit, 1), 100),
  };

  if (params.symbol?.trim()) query.symbol = params.symbol.trim().toUpperCase();
  if (params.userId?.trim()) query.userId = params.userId.trim();
  if (params.accountId?.trim()) query.accountId = params.accountId.trim();
  if (params.orderId?.trim()) query.orderId = params.orderId.trim();
  if (params.side) query.side = params.side;
  if (params.orderType) {
    query.orderType = params.orderType;
  } else if (params.orderKind) {
    query.orderKind = params.orderKind;
  }
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;
  if (params.timeField) query.timeField = params.timeField;
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortDir) query.sortDir = params.sortDir;

  const res = await api.get("/trade-admin/orders/pending/open", { params: query });
  return res.data as TradeAdminPendingOrdersResponse;
};

export const placeTradeAdminMarketOrder = async (
  payload: TradeAdminMarketOrderPayload
): Promise<TradeAdminActionResponse> => {
  const res = await api.post("/trade-admin/trade/market", payload);
  return res.data as TradeAdminActionResponse;
};

export const placeTradeAdminPendingOrder = async (
  payload: TradeAdminPendingOrderPayload
): Promise<TradeAdminActionResponse> => {
  const res = await api.post("/trade-admin/trade/pending", payload);
  return res.data as TradeAdminActionResponse;
};

export const modifyTradeAdminPendingOrder = async (
  payload: TradeAdminPendingModifyPayload
): Promise<TradeAdminActionResponse> => {
  const res = await api.patch("/trade-admin/trade/pending/modify", payload);
  return res.data as TradeAdminActionResponse;
};

export const cancelTradeAdminPendingOrder = async (
  payload: TradeAdminPendingCancelPayload
): Promise<TradeAdminActionResponse> => {
  const res = await api.post("/trade-admin/trade/pending/cancel", payload);
  return res.data as TradeAdminActionResponse;
};

export const modifyTradeAdminPosition = async (
  payload: TradeAdminPositionModifyPayload
): Promise<TradeAdminActionResponse> => {
  const res = await api.patch("/trade-admin/trade/position/modify", payload);
  return res.data as TradeAdminActionResponse;
};

export const closeTradeAdminPosition = async (
  payload: TradeAdminPositionClosePayload
): Promise<TradeAdminActionResponse> => {
  const res = await api.post("/trade-admin/trade/position/close", payload);
  return res.data as TradeAdminActionResponse;
};

export const modifyTradeAdminClosedTrade = async (
  payload: TradeAdminClosedModifyPayload
): Promise<TradeAdminActionResponse> => {
  const res = await api.patch("/trade-admin/trade/closed/modify", payload);
  return res.data as TradeAdminActionResponse;
};

export type TradeAdminDeleteKind = "LIVE" | "CLOSED" | "PENDING";

export type TradeAdminDeletePayload = {
  kind: TradeAdminDeleteKind;
  accountId: string;
  userId: string;
  tradeId?: string;
  positionId?: string;
  orderId?: string;
};

export type TradeAdminRestorePayload = TradeAdminDeletePayload;

export type TradeAdminDeletedTrade = {
  _id: string;
  kind: TradeAdminDeleteKind;
  source?: "TRADE" | "PENDING";
  userId: string;
  accountId: string;
  userName?: string;
  userEmail?: string;
  accountNumber?: string;
  positionId?: string;
  orderId?: string;
  ticket?: number | null;
  symbol?: string;
  side?: string;
  status?: string;
  volume?: number;
  openPrice?: number;
  closePrice?: number;
  price?: number;
  realizedPnL?: number;
  deleteBalanceDelta?: number;
  deletedAt?: string | null;
  isDeleted?: boolean;
};

export type TradeAdminDeletedTradesParams = {
  page: number;
  limit: number;
  kind?: "ALL" | TradeAdminDeleteKind;
  userId?: string;
  accountId?: string;
  symbol?: string;
};

export type TradeAdminDeletedTradesResponse = {
  success?: boolean;
  data: TradeAdminDeletedTrade[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export const deleteTradeAdminTrade = async (
  payload: TradeAdminDeletePayload
): Promise<TradeAdminActionResponse> => {
  const res = await api.post("/trade-admin/trade/delete", payload);
  return res.data as TradeAdminActionResponse;
};

export const restoreTradeAdminTrade = async (
  payload: TradeAdminRestorePayload
): Promise<TradeAdminActionResponse> => {
  const res = await api.post("/trade-admin/trade/restore", payload);
  return res.data as TradeAdminActionResponse;
};

export const getTradeAdminDeletedTrades = async (
  params: TradeAdminDeletedTradesParams
): Promise<TradeAdminDeletedTradesResponse> => {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  };
  if (params.kind && params.kind !== "ALL") query.kind = params.kind;
  if (params.userId?.trim()) query.userId = params.userId.trim();
  if (params.accountId?.trim()) query.accountId = params.accountId.trim();
  if (params.symbol?.trim()) query.symbol = params.symbol.trim().toUpperCase();
  const res = await api.get("/trade-admin/trades/deleted", { params: query });
  return res.data as TradeAdminDeletedTradesResponse;
};
