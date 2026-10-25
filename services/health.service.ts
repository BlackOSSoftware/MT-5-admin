import axios from "axios";
import type { HealthResponse } from "@/types/health";

const DEFAULT_HEALTH_ENDPOINT = "http://localhost:4000/api/v1/health";

export async function getHealthStatus(): Promise<HealthResponse> {
  const endpoint =
    process.env.NEXT_PUBLIC_HEALTH_API_URL || DEFAULT_HEALTH_ENDPOINT;

  const { data } = await axios.get<HealthResponse>(endpoint, {
    withCredentials: false,
  });

  return data;
}
