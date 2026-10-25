export type BrandSource = {
  platformRole?: string | null;
  name?: string | null;
  brokerDisplayName?: string | null;
  memberships?: Array<{
    broker?: { displayName?: string; code?: string } | null;
  }> | null;
};

/** Visible product/admin brand for header + browser tab. Always neutral. */
export function resolveBrandName(_source?: BrandSource): string {
  return "Admin";
}

export function resolveBrandSubtitle(_source?: BrandSource): string {
  return "ADMIN";
}

export function applyDocumentTitle(brand: string) {
  if (typeof document === "undefined") return;
  document.title = brand || "Admin";
}
