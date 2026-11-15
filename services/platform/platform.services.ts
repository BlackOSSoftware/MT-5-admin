import api from "@/api/axios";

export type PlatformAdmin = {
  _id: string;
  status: string;
  role?: string;
  permissions: string[];
  parentAdminId?: string | null;
  parentAdmin?: { _id: string; email: string; name?: string } | null;
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

export async function deleteMembership(membershipId: string) {
  const res = await api.delete(`/platform/memberships/${membershipId}`);
  return res.data as { success: boolean; data: PlatformAdmin };
}

export type HierarchyNode = PlatformAdmin & {
  membershipId?: string;
  subAdmins: HierarchyNode[];
  broker?: { _id: string; code?: string; displayName?: string } | null;
};

export async function adminHierarchy() {
  const res = await api.get("/platform/admins/hierarchy");
  return res.data as { success: boolean; data: { admins: HierarchyNode[] } };
}

/* ===== Broker Admin → own sub-admins (admins.manage) ===== */

export async function listBrokerStaff() {
  const res = await api.get("/broker-staff");
  return res.data as { success: boolean; data: PlatformAdmin[] };
}

export async function inviteBrokerStaff(payload: {
  email: string;
  password?: string;
  name?: string;
  permissions?: string[];
}) {
  const res = await api.post("/broker-staff", payload);
  return res.data as {
    success: boolean;
    data?: {
      temporaryPassword?: string;
      user?: { email?: string; name?: string };
    };
    message?: string;
  };
}

export async function updateBrokerStaffMembership(
  membershipId: string,
  payload: { permissions?: string[]; status?: string; role?: string }
) {
  const res = await api.patch(`/broker-staff/${membershipId}`, payload);
  return res.data as { success: boolean; data: PlatformAdmin };
}

export async function deleteBrokerStaffMembership(membershipId: string) {
  const res = await api.delete(`/broker-staff/${membershipId}`);
  return res.data as { success: boolean; data: PlatformAdmin };
}

export async function listBrokerStaffPermissions() {
  const res = await api.get("/broker-staff/permissions");
  return res.data as { success: boolean; data: string[] };
}
