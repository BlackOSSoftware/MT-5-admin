/** Only this admin login sees the Oceana Client Position report (backend enforces it too). */
export const OCEANA_REPORT_ADMIN_EMAIL = "admin@oceanaprofx.com";

export const isOceanaReportAdmin = (email?: string | null) =>
  String(email || "").trim().toLowerCase() === OCEANA_REPORT_ADMIN_EMAIL;
