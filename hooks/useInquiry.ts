// hooks/useInquiry.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getInquiryService,
  updateInquiryStatusService,
} from "@/services/inquiry/inquiry.services";
import { GetInquiryResponse } from "@/types/inquiry";

export const useInquiry = (page: number, limit: number, status?: string) =>
  useQuery<GetInquiryResponse>({
    queryKey: ["inquiries", page, limit, status || "ALL"],
    queryFn: () => getInquiryService(page, limit, status),
    placeholderData: (prev) => prev,
  });

export const useUpdateInquiryStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateInquiryStatusService,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inquiries"] });
    },
  });
};
