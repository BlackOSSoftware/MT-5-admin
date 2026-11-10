import api from "@/api/axios";

export type NotificationAudience = "USERS" | "ADMINS";

export type NotificationType =
  | "MAINTENANCE"
  | "HOLIDAY"
  | "GENERAL"
  | "INFORMATION";

export type NotificationUserRef = {
  _id: string;
  email?: string;
  name?: string;
} | null;

export type Notification = {
  _id: string;
  title: string;
  message: string;
  data: {
    type?: NotificationType;
    [key: string]: unknown;
  };
  user_id?: NotificationUserRef | string | null;
  isActive: boolean;
  expireAt: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
  audience?: NotificationAudience;
  brokerId?: string | null;
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
  audience?: NotificationAudience;
};

export type SendUserNotificationPayload = BroadcastNotificationPayload & {
  userId?: string;
  email?: string;
};

export type AdminInboxResponse = {
  list: Notification[];
  unreadCount: number;
};

export async function broadcastNotificationService(
  payload: BroadcastNotificationPayload
): Promise<unknown> {
  const res = await api.post("/notification/admin/broadcast", payload);
  return res.data;
}

export async function sendUserNotificationService(
  payload: SendUserNotificationPayload
): Promise<unknown> {
  const res = await api.post("/notification/admin/send-user", payload);
  return res.data;
}

export async function getAdminNotificationsService(
  page: number = 1,
  limit: number = 10,
  q: string = ""
): Promise<NotificationListResponse> {
  const res = await api.get("/notification/admin/list", {
    params: { page, limit, q: q || undefined },
  });
  return {
    list: (res.data.list as Notification[]) || [],
    pagination: res.data.pagination || {
      page,
      limit,
      totalPages: 1,
      totalItems: 0,
    },
  };
}

export async function getAdminInboxService(
  limit: number = 30
): Promise<AdminInboxResponse> {
  const res = await api.get("/notification/admin/inbox", {
    params: { limit },
  });
  return {
    list: (res.data.list as Notification[]) || [],
    unreadCount: Number(res.data.unreadCount || 0),
  };
}

export async function getAdminInboxCountService(): Promise<number> {
  const res = await api.get("/notification/admin/inbox/count");
  return Number(res.data.unreadCount || 0);
}

export async function markAdminInboxReadService(
  id: string
): Promise<{ unreadCount: number }> {
  const res = await api.post(`/notification/admin/inbox/${id}/read`);
  return { unreadCount: Number(res.data.unreadCount || 0) };
}

export async function markAllAdminInboxReadService(): Promise<void> {
  await api.post("/notification/admin/inbox/read-all");
}

export async function searchUsersForNotifyService(q: string) {
  const res = await api.get("/user/admin/search", {
    params: { q, limit: 8 },
  });
  const data = res.data?.data;
  return (Array.isArray(data) ? data : []) as Array<{
    _id: string;
    email: string;
    name?: string;
  }>;
}
