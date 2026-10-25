import api from "@/api/axios";

export type AdminUserReferralSummary = {
  referralCode?: string | null;
  totalReferrals: number;
  referralBalance: number;
  totalEarned: number;
  pendingCount: number;
  pendingAmount: number;
  status?: string | null;
  referredBy?: string | null;
};

export async function fetchAdminUserReferralSummary(
  userId: string,
): Promise<AdminUserReferralSummary> {
  const { data } = await api.get(`/referrals/admin/users/${userId}/summary`);
  return (data?.data ?? data) as AdminUserReferralSummary;
}
