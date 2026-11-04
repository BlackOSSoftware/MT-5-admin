// services/inquiry/inquiry.services.ts
import api from "@/api/axios";
import { GetInquiryResponse, Inquiry } from "@/types/inquiry";

export async function getInquiryService(
  page = 1,
  limit = 20,
  status?: string
): Promise<GetInquiryResponse> {
  const res = await api.get(`/inquiry`, {
    params: {
      page,
      limit,
      ...(status ? { status } : {}),
    },
  });
  return res.data;
}

export async function updateInquiryStatusService(payload: {
  id: string;
  status: "REVIEWED" | "CLOSED";
  adminNote?: string;
}): Promise<{ success: boolean; message?: string; data: Inquiry }> {
  const res = await api.patch(`/inquiry/${payload.id}/status`, {
    status: payload.status,
    adminNote: payload.adminNote || "",
  });
  return res.data;
}
