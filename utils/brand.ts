export type BrandSource = {
  platformRole?: string | null;
  name?: string | null;
  brokerDisplayName?: string | null;
  memberships?: Array<{
    broker?: { displayName?: string; code?: string } | null;
  }> | null;
};

/** Visible product/admin brand for header + browser tab. */
export function resolveBrandName(source: BrandSource): string {
  if (source.platformRole === "SUPER_ADMIN") {
    return "Super Admin";
  }

  const fromBroker =
    source.brokerDisplayName ||
    source.memberships?.[0]?.broker?.displayName ||
    "";

  if (fromBroker.trim()) return fromBroker.trim();

  const fromName = String(source.name || "").trim();
  if (fromName) {
    // "Oceana Pro FX Admin" → "Oceana Pro FX"
    return fromName.replace(/\s+Admin$/i, "").trim() || fromName;
  }

  return "Admin";
}

export function resolveBrandSubtitle(source: BrandSource): string {
  if (source.platformRole === "SUPER_ADMIN") return "PLATFORM";
  return "ADMIN";
}

export function applyDocumentTitle(brand: string) {
  if (typeof document === "undefined") return;
  document.title = brand || "Admin";
}
