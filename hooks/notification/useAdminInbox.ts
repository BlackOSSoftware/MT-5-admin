import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminInboxCountService,
  getAdminInboxService,
  markAdminInboxReadService,
  markAllAdminInboxReadService,
} from "@/services/notification/notification.services";

export const useAdminInboxCount = () => {
  return useQuery({
    queryKey: ["admin-inbox-count"] as const,
    queryFn: getAdminInboxCountService,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
};

export const useAdminInbox = (enabled = true) => {
  return useQuery({
    queryKey: ["admin-inbox"] as const,
    queryFn: () => getAdminInboxService(40),
    enabled,
    staleTime: 15_000,
  });
};

export const useMarkAdminInboxRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markAdminInboxReadService(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-inbox"] });
      qc.invalidateQueries({ queryKey: ["admin-inbox-count"] });
    },
  });
};

export const useMarkAllAdminInboxRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllAdminInboxReadService(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-inbox"] });
      qc.invalidateQueries({ queryKey: ["admin-inbox-count"] });
    },
  });
};
