/** Permission that unlocks the Client Position report (backend enforces it too). */
export const CLIENT_POSITIONS_PERMISSION = "reports.client_positions";

/** Permission that allows modifying slippage execution settings. */
export const SLIPPAGE_SETTINGS_PERMISSION = "settings.slippage";

export type AdminMeLike = {
  platformRole?: string | null;
  permissions?: string[] | null;
} | null;

/** SuperAdmin always; broker admins only when granted the permission. */
export const canViewClientPositions = (me: AdminMeLike): boolean => {
  if (!me) return false;
  if (me.platformRole === "SUPER_ADMIN") return true;
  return (me.permissions ?? []).includes(CLIENT_POSITIONS_PERMISSION);
};

/** SuperAdmin always; broker admins only when granted settings.slippage. */
export const canManageSlippage = (me: AdminMeLike): boolean => {
  if (!me) return false;
  if (me.platformRole === "SUPER_ADMIN") return true;
  return (me.permissions ?? []).includes(SLIPPAGE_SETTINGS_PERMISSION);
};
