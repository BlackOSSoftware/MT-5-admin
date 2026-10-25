import api from "@/api/axios";

export type PlatformAdmin = {
  _id: string;
  status: string;
  role: string;
  permissions: string[];
  createdAt?: string;
  user: {
    _id: string;
    email: string;
    name?: string;
    createdAt?: string;
  } | null;
};

export async function listAdmins() {
  const res = await api.get("/platform/admins");
  return res.data as { success: boolean; data: PlatformAdmin[] };
}

export async function createAdmin(payload: {
  email: string;
  password?: string;
  name?: string;
  permissions?: string[];
}) {
  const res = await api.post("/platform/admins", payload);
  return res.data as {
    success: boolean;
    data?: {
      temporaryPassword?: string;
      user?: { email?: string; name?: string };
    };
    message?: string;
  };
}

export async function updateMembership(
  membershipId: string,
  payload: { permissions?: string[]; status?: string; role?: string }
) {
  const res = await api.patch(`/platform/memberships/${membershipId}`, payload);
  return res.data as { success: boolean; data: PlatformAdmin };
}

export async function listPermissions() {
  const res = await api.get("/platform/permissions");
  return res.data as { success: boolean; data: string[] };
}
