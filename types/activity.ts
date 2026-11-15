export type AdminActivityLog = {
  _id: string;
  user_id?: string;
  user_name?: string | null;
  user_email?: string | null;
  action?: string;
  category?: string | null;
  description?: string | null;
  actor_type?: string;
  actor_id?: string | null;
  actor_name?: string | null;
  actor_email?: string | null;
  actor_role?: string | null;
  target_entity_type?: string | null;
  target_entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
  status?: "SUCCESS" | "FAILED" | string;
  ip?: string | null;
  user_agent?: string | null;
  createdAt?: string;
};

export type AdminActivityListResponse = {
  success?: boolean;
  data: AdminActivityLog[];
  nextCursor?: string | null;
  limit?: number;
  message?: string;
};

export type AdminActivityParams = {
  userId?: string;
  limit?: number;
  before?: string;
  actorType?: string;
  category?: string;
  status?: string;
  from?: string;
  to?: string;
};
