import { useQuery } from "@tanstack/react-query";
import {
  getTradeAdminDeletedTrades,
  type TradeAdminDeletedTradesParams,
} from "@/services/tradeAdmin.service";

export const useTradeAdminDeletedTrades = (
  params: TradeAdminDeletedTradesParams
) =>
  useQuery({
    queryKey: ["trade-admin-deleted-trades", params],
    queryFn: () => getTradeAdminDeletedTrades(params),
  });
