import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  getTradeAdminOpenTrades,
  type TradeAdminOpenTradesParams,
} from "@/services/tradeAdmin.service";

export const useTradeAdminOpenTrades = (params: TradeAdminOpenTradesParams) =>
  useQuery({
    queryKey: [
      "trade-admin-open-trades",
      params.page,
      params.limit,
      params.userId ?? "",
      params.accountId ?? "",
      params.symbol ?? "",
      params.positionId ?? "",
      params.side ?? "",
      params.orderType ?? "",
      params.orderKind ?? "",
      params.from ?? "",
      params.to ?? "",
      params.timeField ?? "",
      params.sortBy ?? "",
      params.sortDir ?? "",
      params.all ?? false,
    ],
    queryFn: () => getTradeAdminOpenTrades(params),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
  });
