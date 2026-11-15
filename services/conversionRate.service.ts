import api from "@/api/axios";

export type ConversionRatesPayload = {
  usdtInr: number;
  usdtInrWithdraw: number;
  btcUsdt: number;
  btcUsdtWithdraw: number;
};

export type ConversionRatesData = ConversionRatesPayload & {
  updatedAt?: string;
};

export type ConversionRatesResponse = {
  success: boolean;
  data: ConversionRatesData;
};

export const getConversionRates = async (): Promise<ConversionRatesResponse> => {
  const res = await api.get("/conversion/admin/rates");
  return res.data as ConversionRatesResponse;
};

export const updateConversionRates = async (
  payload: ConversionRatesPayload
): Promise<ConversionRatesResponse> => {
  const res = await api.put("/conversion/admin/rates", payload);
  return res.data as ConversionRatesResponse;
};
