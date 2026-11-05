import api from "@/api/axios";

export type NotificationType = "MAINTENANCE" | "HOLIDAY" | "GENERAL" | "INFORMATION";

export type NotificationAudience = "USERS" | "ADMINS";

export type Notification = {
  _id: string;
  title: string;
  message: string;
  data: {
    type: NotificationType;
  };
  isActive: boolean;
  expireAt: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  audience?: NotificationAudience;
  brokerId?: string | null;
  user_id?: { _id: string; email?: string; name?: string } | null;
};

export interface NotificationListResponse {
  list: Notification[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
  };
}

export type BroadcastNotificationPayload = {
  title: string;
  message: string;
  expireAt: string;
  data: {
    type: NotificationType;
  };
  /** Only honoured for SuperAdmin; broker admins always reach their own clients. */
  audience?: NotificationAudience;
};

export async function broadcastNotificationService(
  payload: BroadcastNotificationPayload
): Promise<unknown> {
  const res = await api.post("/notification/admin/broadcast", payload);
  return res.data;
}

export async function getAdminNotificationsService(
  page: number = 1,
  limit: number = 10
): Promise<NotificationListResponse> {
  // Broker-scoped on the backend (SuperAdmin sees every broker).
  const res = await api.get("/notification/admin/list", {
    params: { page, limit },
  });
  return {
    list: (res.data?.list ?? []) as Notification[],
    pagination: res.data?.pagination ?? { page, limit, totalPages: 1, totalItems: 0 },
  };
}
