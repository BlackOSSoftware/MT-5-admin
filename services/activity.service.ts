import api from "@/api/axios";
import type {
  AdminActivityLog,
  AdminActivityListResponse,
  AdminActivityParams,
} from "@/types/activity";

type ActivityPayload = {
  success?: boolean;
  data?: AdminActivityLog[] | { data?: AdminActivityLog[]; nextCursor?: string; limit?: number };
  nextCursor?: string;
  limit?: number;
  message?: string;
};

function normalizeActivityList(payload: ActivityPayload): AdminActivityListResponse {
  const root = payload && typeof payload === "object" ? payload : {};

  if ("success" in root && root.success === false) {
    throw new Error(root.message || "Request failed.");
  }

  const nested =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as { data?: AdminActivityLog[]; nextCursor?: string; limit?: number; success?: boolean; message?: string })
      : undefined;

  if (nested && "success" in nested && nested.success === false) {
    throw new Error(nested.message || "Request failed.");
  }

  const list = Array.isArray(root.data)
    ? root.data
    : Array.isArray(nested?.data)
      ? nested?.data ?? []
      : [];

  return {
    success: root.success ?? nested?.success,
    data: list,
    nextCursor: root.nextCursor ?? nested?.nextCursor ?? null,
    limit: root.limit ?? nested?.limit,
    message: root.message ?? nested?.message,
  };
}

export const fetchAdminActivityLogs = async (
  params: AdminActivityParams
): Promise<AdminActivityListResponse> => {
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const before = params.before?.trim() || undefined;
  const userId = params.userId?.trim() || undefined;

  const query: Record<string, string | number> = {
    limit,
  };

  if (before) query.before = before;
  if (params.actorType) query.actorType = params.actorType;
  if (params.category) query.category = params.category;
  if (params.status) query.status = params.status;
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;

  const url = userId ? `/activity/admin/${userId}` : "/activity/admin";
  const res = await api.get<ActivityPayload>(url, { params: query });
  return normalizeActivityList(res.data);
};
