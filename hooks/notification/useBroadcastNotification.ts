import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  broadcastNotificationService,
  sendUserNotificationService,
} from "@/services/notification/notification.services";
import type {
  BroadcastNotificationPayload,
  SendUserNotificationPayload,
} from "@/services/notification/notification.services";

export const useBroadcastNotification = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BroadcastNotificationPayload) =>
      broadcastNotificationService(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-notifications"] });
      qc.invalidateQueries({ queryKey: ["admin-inbox"] });
      qc.invalidateQueries({ queryKey: ["admin-inbox-count"] });
    },
  });
};

export const useSendUserNotification = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SendUserNotificationPayload) =>
      sendUserNotificationService(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-notifications"] });
      qc.invalidateQueries({ queryKey: ["admin-inbox"] });
      qc.invalidateQueries({ queryKey: ["admin-inbox-count"] });
    },
  });
};
