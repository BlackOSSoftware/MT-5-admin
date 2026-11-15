import api from "@/api/axios";

export type AdminIbRequestItem = {
  id: string;
  type: "SUB_IB" | "ADMIN";
  status: "PENDING" | "APPROVED" | "REJECTED";
  note: string;
  rejectionReason: string;
  createdAt?: string;
  respondedAt?: string | null;
  requester: { id: string; name: string; email: string; phone: string };
  ib: { id: string; name: string; email: string; phone: string } | null;
  respondedBy: { id: string; name: string; email: string } | null;
};

export type AdminIbRequestsResponse = {
  items: AdminIbRequestItem[];
  statusCounts: { PENDING: number; APPROVED: number; REJECTED: number };
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export async function fetchAdminIbRequests(params?: {
  status?: string;
  type?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<AdminIbRequestsResponse> {
  const { data } = await api.get("/referrals/admin/ib-requests", { params });
  return {
    items: data?.items ?? [],
    statusCounts: data?.statusCounts ?? { PENDING: 0, APPROVED: 0, REJECTED: 0 },
    pagination: data?.pagination ?? {
      page: 1,
      limit: 50,
      total: 0,
      totalPages: 0,
    },
  };
}

export async function respondAdminIbRequest(
  requestId: string,
  action: "APPROVE" | "REJECT",
  reason = "",
): Promise<AdminIbRequestItem> {
  const { data } = await api.patch(
    `/referrals/admin/ib-requests/${requestId}`,
    { action, reason },
  );
  return (data?.data ?? data) as AdminIbRequestItem;
}
