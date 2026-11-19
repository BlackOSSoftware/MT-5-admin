/** Permission that unlocks the Client Position report (backend enforces it too). */
export const CLIENT_POSITIONS_PERMISSION = "reports.client_positions";

/** Permission that allows modifying slippage execution settings. */
export const SLIPPAGE_SETTINGS_PERMISSION = "settings.slippage";

export type AdminMeLike = {
  platformRole?: string | null;
  permissions?: string[] | null;
} | null;

const isSuper = (me: AdminMeLike) => me?.platformRole === "SUPER_ADMIN";

/** SuperAdmin always; broker admins only when granted the permission. */
export const hasPermission = (me: AdminMeLike, perm: string): boolean => {
  if (!me) return false;
  if (isSuper(me)) return true;
  const perms = me.permissions ?? [];
  return perms.includes("*") || perms.includes(perm);
};

/** SuperAdmin always; broker admins need ANY of the listed permissions. */
export const hasAnyPermission = (
  me: AdminMeLike,
  perms: string[],
): boolean => {
  if (!me) return false;
  if (isSuper(me)) return true;
  const mine = me.permissions ?? [];
  if (mine.includes("*")) return true;
  return perms.some((p) => mine.includes(p));
};

/** SuperAdmin always; broker admins only when granted the permission. */
export const canViewClientPositions = (me: AdminMeLike): boolean =>
  hasPermission(me, CLIENT_POSITIONS_PERMISSION);

/** SuperAdmin always; broker admins only when granted settings.slippage. */
export const canManageSlippage = (me: AdminMeLike): boolean =>
  hasPermission(me, SLIPPAGE_SETTINGS_PERMISSION);

/* ================= PAGE → PERMISSION MAP =================
   Sidebar visibility AND direct-URL guard use this map.
   `anyOf` = admin needs at least one of these permissions.
   Paths not listed are always allowed (dashboard, own password, etc). */

const DEPOSIT_READ = [
  "finance.deposit.read",
  "finance.deposit.approve",
  "finance.deposit.reject",
];
const WITHDRAWAL_READ = [
  "finance.withdrawal.read",
  "finance.withdrawal.approve",
  "finance.withdrawal.reject",
];
const CONVERSION_READ = [
  "conversion.manage",
  ...DEPOSIT_READ,
  "finance.withdrawal.approve",
];

const PAGE_RULES: { prefix: string; anyOf: string[] }[] = [
  { prefix: "/admin/super-password", anyOf: [] },
  { prefix: "/admin/create-admin", anyOf: ["admins.manage"] },
  { prefix: "/admin/instruments", anyOf: ["instruments.manage"] },
  { prefix: "/admin/trades/client-positions", anyOf: ["reports.client_positions"] },
  { prefix: "/admin/trades/live/create", anyOf: ["trading.intervene"] },
  { prefix: "/admin/trades", anyOf: ["trading.positions.read"] },
  { prefix: "/admin/risk-settings", anyOf: ["settings.risk"] },
  { prefix: "/admin/account-plan", anyOf: ["plans.manage"] },
  { prefix: "/admin/slippage-settings", anyOf: ["settings.slippage"] },
  { prefix: "/admin/users", anyOf: ["users.read"] },
  { prefix: "/admin/verification", anyOf: ["kyc.review"] },
  { prefix: "/admin/transactions/bank-details", anyOf: ["finance.payment_methods.manage"] },
  { prefix: "/admin/transactions/withdraw-methods", anyOf: ["finance.payment_methods.manage"] },
  { prefix: "/admin/transactions/withdraw-request", anyOf: WITHDRAWAL_READ },
  { prefix: "/admin/transactions/all-deposit", anyOf: DEPOSIT_READ },
  { prefix: "/admin/transactions/swap", anyOf: ["finance.transactions.read"] },
  { prefix: "/admin/dollar-rate", anyOf: CONVERSION_READ },
  { prefix: "/admin/activity-logs", anyOf: ["activity.read"] },
  { prefix: "/admin/notifications", anyOf: ["notifications.send"] },
  { prefix: "/admin/inquiry", anyOf: ["inquiry.manage"] },
  { prefix: "/admin/referral", anyOf: ["settings.referral"] },
  { prefix: "/admin/bonus", anyOf: ["settings.bonus"] },
];

/** Longest-prefix match so /admin/trades/client-positions wins over /admin/trades. */
export const canAccessAdminPath = (
  me: AdminMeLike,
  pathname: string,
): boolean => {
  if (!me) return false;
  if (isSuper(me)) return true;

  const path = pathname.replace(/\/+$/, "") || "/";
  let best: { prefix: string; anyOf: string[] } | null = null;
  for (const rule of PAGE_RULES) {
    if (path === rule.prefix || path.startsWith(rule.prefix + "/")) {
      if (!best || rule.prefix.length > best.prefix.length) best = rule;
    }
  }
  if (!best) return true; // unmapped page → allowed
  return hasAnyPermission(me, best.anyOf);
};
